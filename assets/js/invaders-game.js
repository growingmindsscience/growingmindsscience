/* Growing Minds Science — invaders-game.js
   "GMS Invaders" on the Arcade page: little questions march down the page
   in lockstep, and a small lens at the bottom answers them before they reach
   the floor. Six waves, named for developmental moments, end on The Headline,
   a folded newspaper that opens wider with every answer.

   Core v2 game (see docs/arcade/game-brief.md): reads the live brand tokens
   through A.theme(), draws at device resolution through the shell's canvas,
   uses makeShell for the overlay, makeStory for the waves, makePowerups for
   timed effects, runSummary for the end card. CSP-safe: no eval, no external
   assets, audio is the shared Web Audio synth. Honors prefers-reduced-motion.

   Kept from the first version: the per-wave tables, the four-note march that
   quickens as the formation thins, bookshelf shields that chip cell by cell,
   the crossing bonus target (now a paper plane), the boss with 10 HP, three
   lives, and touch hold-to-autofire with slide-to-steer.

   Power-ups: Spread (three bolts, sage), Rapid (fire rate x2, ochre),
   Bubble (absorbs one hit, forest), Pause for Thought (the world runs at half
   speed, research blue; this is the old FOCUS capsule).
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "gms-invaders";
  var MUTE_KEY = "gms-invaders-muted";

  // ---------- Field ----------
  // Portrait 360 x 440 fits both a phone held upright and a landscape
  // desktop stage, so there is no orientation switch.
  var W = 360, H = 440;
  var SCALE = 1.6;                 // the old field was 220 wide; speeds scale with it
  var FLOOR_Y = 418;               // a question touching this line ends the run
  var WARN_Y = FLOOR_Y - 36;
  var SHIP_Y = 386, SHIP_R = 11;   // lens centre and radius
  var SHELF_Y = 326;
  var MARGIN_L = 10, MARGIN_R = W - 10;
  var COLS = 7, ROWS = 5;
  var CELL_W = 42, CELL_H = 30;
  var FORM_X = (W - (COLS - 1) * CELL_W) / 2;  // centre of column 0
  var FORM_Y = 78;                              // centre of row 0
  var HALF_W = 15, HALF_H = 11;                 // the widest tag's half extents
  var STEP_X = 10, STEP_Y = 12;
  var PLANE_Y = 50;

  // Tiers: 0 is the bottom rows (smallest, sage), 2 the top row (largest, forest).
  var TIERS = [
    { w: 24, h: 18, fill: "sage", glyph: "…", size: 15, ink: "ink", pts: 10 },
    { w: 27, h: 20, fill: "sageDeep", glyph: "!", size: 16, ink: "ink", pts: 20 },
    { w: 30, h: 22, fill: "forest", glyph: "?", size: 18, ink: "onForest", pts: 30 }
  ];

  // ---------- The wave tables (unchanged from the first version) ----------
  var BASE_INTERVAL = [46, 40, 34, 29, 24, 22];
  var MIN_INTERVAL = 9;
  var BOLT_SPEED = [1.6, 1.8, 2.0, 2.2, 2.4, 2.6];
  var MAX_BOLTS = [2, 2, 3, 3, 4, 4];
  var DROP_CHANCE = [0.09, 0.104, 0.118, 0.132, 0.146, 0.16];
  var MARCH_NOTES = [98, 87, 78, 73];
  var BOSS_HP = 10;

  // ---------- Story: six waves ----------
  var WAVES = [
    { name: "Object Permanence", at: 1, text: "Out of sight is not out of mind. Answer the first questions." },
    { name: "First Words", at: 2, text: "The questions come a little faster now." },
    { name: "Why Stage", at: 3, text: "Why? Why? Why? Some questions swoop down to ask in person." },
    { name: "Theory of Mind", at: 4, text: "They guess where you will be. Keep moving." },
    { name: "Big Feelings", at: 5, text: "Loud, fast and all at once. Breathe, then answer." },
    { name: "The Headline", at: 6, text: "One big claim, folded tight. Every answer opens it up." }
  ];

  var POWERUPS = {
    spread: { label: "Spread", color: "sage", duration: 480, text: "Three bolts at once", mark: "S" },
    rapid: { label: "Rapid", color: "ochre", duration: 480, text: "Fire twice as fast", mark: "R" },
    bubble: { label: "Bubble", color: "forest", uses: 1, text: "The next hit is absorbed", mark: "B" },
    slow: { label: "Pause for Thought", color: "research", duration: 300, text: "The questions slow to half speed", mark: "P" }
  };
  var POWER_ORDER = ["spread", "rapid", "bubble", "slow"];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function overlap(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }

  // ======================================================================
  //  Game
  // ======================================================================
  function createGame(shell) {
    var cv = shell.canvas, ctx = cv.ctx, draw = A.draw;
    var pal = A.theme();
    var offTheme = A.onThemeChange(function (p) { pal = p; });
    var reduce = A.prefersReducedMotion();

    var camera = A.makeCamera({ reduce: reduce, maxPx: 4 });
    var combo = A.makeCombo({ window: 90, max: 5 });
    var particles = A.makeParticles({ cap: 120, reduce: reduce });
    var floaters = A.makeFloaters({ cap: 14, reduce: reduce });
    var wake = A.makeWakeLock();
    var unsubHidden = null;
    var synth = A.makeSynth({ muteKey: MUTE_KEY });
    shell.bindSynth(synth);

    var story = A.makeStory(WAVES, { bannerFrames: 170 });
    var powers = A.makePowerups(POWERUPS, {});

    var state = "idle"; // idle | running | paused | dying | won | gameover
    var ship, shots, bolts, enemies, shelves, capsules, plane, boss;
    var offsetX, offsetY, dir, stepTimer, wobble, aliveCount, totalCount;
    var wave, lives, score, best, fireCooldown, planeTimer, diveTimer, introTimer;
    var warnTimer, marchNote, endTimer, time, volleyId, fireLock, pointerFire, cause;
    var runStats;

    best = A.leaderboard.best(GAME_KEY);

    // ---------- Audio ----------
    var sfx = {
      fire: function () { synth.beep(660, 720, 0.05, "square", 0.32); },
      answer: function (tier, mult) { synth.beep(520 + tier * 120 + (mult - 1) * 70, 220, 0.08, "triangle", 0.5); synth.noise(0.12, 1400 + tier * 300, 0.3); },
      march: function () { synth.beep(MARCH_NOTES[marchNote % 4], 0, 0.09, "square", 0.45); marchNote++; },
      hit: function () { synth.beep(200, 70, 0.2, "sawtooth", 0.6); synth.noise(0.28, 700, 0.42); },
      pop: function () { synth.beep(500, 900, 0.12, "sine", 0.4); },
      chip: function () { synth.noise(0.05, 2400, 0.12); },
      boss: function () { synth.beep(300, 90, 0.1, "sawtooth", 0.45); synth.noise(0.16, 1000, 0.35); },
      bossDie: function () { synth.arp([392, 523, 659, 880], 0.06, 0.18, "triangle", 0.5); synth.noise(0.4, 1600, 0.5); },
      plane: function () { synth.beep(880, 660, 0.3, "sine", 0.4); synth.noise(0.2, 1800, 0.3); },
      power: function () { synth.arp([659, 880, 1318], 0.045, 0.12, "triangle", 0.4); },
      swoop: function () { synth.beep(700, 260, 0.35, "sine", 0.22); },
      wave: function () { synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.42); },
      win: function () { synth.arp([523, 659, 784, 988], 0.08, 0.4, "triangle", 0.5); },
      warn: function () { synth.beep(330, 200, 0.18, "sawtooth", 0.35); }
    };
    // Kill pops are rate-capped so a chain reads as separate pops.
    var lastPopAt = 0;
    function killBuzz() { var t = Date.now(); if (t - lastPopAt < 80) return; lastPopAt = t; A.haptics.pop(); }

    // ---------- World ----------
    function resetWorld() {
      ship = { x: W / 2, tx: null, invuln: 0 };
      shots = []; bolts = []; capsules = []; plane = null; boss = null;
      wave = 1; lives = 3; score = 0; time = 0;
      fireCooldown = 0; planeTimer = rand(16, 26) * 60; warnTimer = 0; marchNote = 0; endTimer = 0;
      volleyId = 0; fireLock = false; pointerFire = false; cause = null;
      combo.reset(true); powers.clear(); story.reset();
      particles.clear(); floaters.clear();
      runStats = { answered: 0, powers: 0, shelfBonus: 0, swoops: 0 };
      buildShelves();
      buildWave(1);
      syncHud();
    }

    // Three small bookshelves. Each cell holds one book spine; the colour index
    // is fixed per cell so the shelf reads the same frame to frame.
    function buildShelves() {
      shelves = [];
      var cols = 9, rows = 4, cw = 6, ch = 7;
      var bw = cols * cw, gap = (W - 3 * bw) / 4;
      for (var b = 0; b < 3; b++) {
        var grid = [], spines = [];
        for (var gy = 0; gy < rows; gy++) {
          grid.push([]); spines.push([]);
          for (var gx = 0; gx < cols; gx++) {
            grid[gy].push(1);
            var h = (gx * 7 + gy * 13 + b * 5) % 17;
            spines[gy].push({ c: h < 6 ? 0 : h < 11 ? 1 : h < 14 ? 2 : h < 15 ? 3 : h < 16 ? 4 : 5, tall: (gx + gy + b) % 3 !== 0 });
          }
        }
        shelves.push({ x: Math.round(gap + b * (bw + gap)), y: SHELF_Y, cols: cols, rows: rows, cw: cw, ch: ch, grid: grid, spines: spines, hit: false });
      }
    }

    function buildWave(w) {
      enemies = [];
      offsetX = 0; offsetY = (w - 1) * 10; dir = 1; wobble = 0;
      stepTimer = BASE_INTERVAL[w - 1];
      diveTimer = rand(260, 400);
      introTimer = 80;
      boss = null;
      if (w === 6) {
        boss = { cx: W / 2, y: 68, w: 72, h: 44, hp: BOSS_HP, dir: 1, fireTimer: 90, flash: 0 };
        for (var c = 0; c < COLS; c++) enemies.push({ col: c, row: 0, tier: 2, alive: true, dive: null, phase: Math.random() * 6 });
      } else {
        for (var row = 0; row < ROWS; row++) {
          for (var col = 0; col < COLS; col++) {
            var tier = row === 0 ? 2 : (row <= 2 ? 1 : 0);
            enemies.push({ col: col, row: row, tier: tier, alive: true, dive: null, phase: Math.random() * 6 });
          }
        }
      }
      totalCount = enemies.length; aliveCount = totalCount;
      for (var i = 0; i < shelves.length; i++) shelves[i].hit = false;
    }

    function slot(e) { return { x: FORM_X + e.col * CELL_W + offsetX, y: FORM_Y + e.row * CELL_H + offsetY }; }
    // Where an enemy is right now: its formation slot, plus the dive arc when it is swooping.
    function enemyPos(e) {
      var s = slot(e);
      if (!e.dive) return s;
      var d = e.dive, k = Math.sin(Math.PI * d.t);
      return { x: s.x + d.tx * k + d.side * 34 * Math.sin(Math.PI * 2 * d.t), y: s.y + d.depth * k };
    }
    function bossBox() { return { x: boss.cx - boss.w / 2, y: boss.y, w: boss.w, h: boss.h }; }

    function syncHud() {
      shell.hud.set("score", Math.floor(score));
      shell.hud.set("best", Math.max(best, Math.floor(score)));
      shell.hud.set("wave", Math.min(wave, 6) + " of 6");
    }

    // ---------- Flow ----------
    function controlsLine() {
      return A.isCoarsePointer()
        ? "Hold the field to fire and slide to steer, or use the buttons below."
        : "Arrows or A and D move, Space or W fires. The mouse works too: move to steer, click to fire.";
    }
    function showStart() {
      var p = A.progress.get(GAME_KEY);
      shell.prompt.show({
        kicker: "GMS Invaders",
        title: p.plays ? "The questions are back" : "Answer the questions before they land",
        text: "Little questions are marching down the page. Answer them with your lens before they reach the floor. Six waves, ending with The Headline. " + controlsLine(),
        actions: [{ label: "Start", primary: true, onClick: start }],
        board: p.plays ? function (m) { A.renderLeaderboard(m, GAME_KEY, {}); } : null
      });
    }
    function start() {
      synth.ensure();
      resetWorld();
      state = "running";
      story.set(0);
      shell.prompt.hide();
      wake.acquire();
      fireLock = true; // the key or tap that started the run is not a shot
      A.announce("Go. Wave one, " + WAVES[0].name + ". " + WAVES[0].text);
    }
    function pause() {
      if (state !== "running") return;
      state = "paused";
      wake.release();
      input.release(); pointerFire = false;
      shell.prompt.show({ kicker: "Paused", title: WAVES[wave - 1].name,
        text: "Score " + Math.floor(score) + " · wave " + wave + " of 6 · " + lives + (lives === 1 ? " lens" : " lenses") + " left. The questions hold their fire.",
        actions: [{ label: "Resume", primary: true, onClick: resume }, { label: "Quit", onClick: function () { A.closeGame(); } }], compact: true });
    }
    function resume() {
      if (state !== "paused") return;
      synth.ensure();
      state = "running"; shell.prompt.hide(); wake.acquire();
      fireLock = true; // resuming must never cost the player a shot or their aim
    }
    function loseLife() {
      if (state !== "running") return;
      lives--;
      sfx.hit(); A.haptics.crash();
      combo.reset();
      camera.shake(0.85); camera.freeze(5);
      particles.burst(ship.x, SHIP_Y, { n: 16, color: [pal.forest, pal.sage, pal.clay], speed: 2, life: 28, size: 2.6, kind: ["dot", "square"], gravity: 0.05 });
      if (lives <= 0) { die("lenses"); return; }
      ship.invuln = 90;
      A.announce(lives + (lives === 1 ? " lens" : " lenses") + " left.");
    }
    function die(why) {
      if (state !== "running") return;
      cause = why || "lenses";
      state = "dying"; endTimer = 54;
      wake.release();
      A.haptics.crash(); camera.shake(0.9);
    }
    function win() {
      if (state !== "running") return;
      var cells = 0;
      for (var i = 0; i < shelves.length; i++) for (var gy = 0; gy < shelves[i].rows; gy++) for (var gx = 0; gx < shelves[i].cols; gx++) cells += shelves[i].grid[gy][gx];
      var bonus = lives * 200 + cells * 2;
      score += bonus;
      floaters.spawn(W / 2, H / 2, "Every question answered +" + bonus, pal.forest, { size: 13, font: "display", life: 70 });
      sfx.win(); A.haptics.win();
      state = "won"; endTimer = 80;
      wake.release();
      syncHud();
    }
    function finish(won) {
      state = "gameover";
      var final = Math.floor(score);
      var placed = final > 0 && final >= best;
      if (final > best) best = final;
      var reached = Math.min(wave, 6);
      A.progress.record(GAME_KEY, { score: final, chapter: reached - 1, badges: won ? ["headline"] : [] });
      syncHud();
      var name = WAVES[reached - 1].name;
      shell.prompt.show({
        kicker: won ? "Every question answered" : (cause === "floor" ? "A question reached the floor" : "Out of lenses"),
        title: placed ? "A new best: " + final : "Score " + final,
        text: won ? "You opened The Headline all the way and kept " + lives + (lives === 1 ? " lens." : " lenses.") : "You reached wave " + reached + ", " + name + ", and answered " + runStats.answered + " questions.",
        board: function (m) {
          A.runSummary(m, { gameKey: GAME_KEY, score: final,
            lines: [["Wave", reached + " · " + name], ["Answered", runStats.answered], ["Best streak", combo.best() + (combo.best() === 1 ? " answer" : " answers")], ["Power-ups", runStats.powers], ["Shelf bonus", runStats.shelfBonus]],
            onSaved: function () { best = A.leaderboard.best(GAME_KEY); syncHud(); } });
        },
        actions: [{ label: "Play again", primary: true, onClick: start }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
      A.announce((won ? "You win. " : "Game over. ") + "Score " + final + ".");
    }

    function nextWave() {
      var bonus = 100 * wave, untouched = 0;
      for (var i = 0; i < shelves.length; i++) if (!shelves[i].hit && shelfCells(shelves[i]) > 0) untouched++;
      var shelfBonus = untouched * 25 * wave;
      score += bonus + shelfBonus;
      runStats.shelfBonus += shelfBonus;
      floaters.spawn(W / 2, SHELF_Y - 40, "Wave clear +" + bonus, pal.forest, { size: 13, font: "display", life: 60 });
      if (shelfBonus) floaters.spawn(W / 2, SHELF_Y - 20, untouched + (untouched === 1 ? " shelf" : " shelves") + " untouched +" + shelfBonus, pal.inkSoft, { size: 11, life: 60 });
      wave++;
      bolts.length = 0;
      buildWave(wave);
      story.set(wave - 1);
      sfx.wave(); A.haptics.thump();
      var wv = WAVES[wave - 1];
      A.announce("Wave " + wave + ", " + wv.name + ". " + wv.text);
      syncHud(); shell.hud.flash("wave");
    }

    // ---------- Firing ----------
    function fireRequest() {
      if (state !== "running" || fireCooldown > 0) return;
      var rapid = powers.active("rapid"), spread = powers.active("spread");
      var cap = (wave >= 3 ? 2 : 1) * (rapid ? 2 : 1);
      var live = {};
      var n = 0;
      for (var i = 0; i < shots.length; i++) { if (!live[shots[i].v]) { live[shots[i].v] = true; n++; } }
      if (n >= cap) return;
      volleyId++;
      var sy = SHIP_Y - SHIP_R - 4;
      shots.push({ x: ship.x, y: sy, px: ship.x, py: sy, vx: 0, v: volleyId, side: false });
      if (spread) {
        shots.push({ x: ship.x - 3, y: sy, px: ship.x - 3, py: sy, vx: -1.2, v: volleyId, side: true });
        shots.push({ x: ship.x + 3, y: sy, px: ship.x + 3, py: sy, vx: 1.2, v: volleyId, side: true });
      }
      fireCooldown = rapid ? 6.5 : 13;
      for (var m = 0; m < 4; m++) {
        var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1, sp = 0.8 + Math.random() * 1.1;
        particles.spawn(ship.x, sy, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 9, color: m % 2 ? pal.ochre : pal.sage, size: 1.6 });
      }
      sfx.fire();
    }

    // ---------- Shelves ----------
    function cellSolid(sh, gx, gy) { return gx >= 0 && gx < sh.cols && gy >= 0 && gy < sh.rows && sh.grid[gy][gx] === 1; }
    function shelfCells(sh) { var n = 0; for (var gy = 0; gy < sh.rows; gy++) for (var gx = 0; gx < sh.cols; gx++) n += sh.grid[gy][gx]; return n; }
    function chipAt(px, py) {
      for (var i = 0; i < shelves.length; i++) {
        var sh = shelves[i];
        if (px < sh.x || px >= sh.x + sh.cols * sh.cw || py < sh.y || py >= sh.y + sh.rows * sh.ch) continue;
        var gx = Math.floor((px - sh.x) / sh.cw), gy = Math.floor((py - sh.y) / sh.ch);
        if (cellSolid(sh, gx, gy)) {
          sh.grid[gy][gx] = 0; sh.hit = true;
          if (cellSolid(sh, gx + 1, gy) && Math.random() < 0.5) sh.grid[gy][gx + 1] = 0;
          if (cellSolid(sh, gx - 1, gy) && Math.random() < 0.5) sh.grid[gy][gx - 1] = 0;
          particles.burst(sh.x + gx * sh.cw + sh.cw / 2, sh.y + gy * sh.ch + sh.ch / 2, { n: 4, color: [pal.surface, pal.sageDeep], speed: 1, life: 16, size: 1.6, kind: "square", gravity: 0.06 });
          sfx.chip();
          return true;
        }
      }
      return false;
    }
    // Knock out every cell under a box (a question marching or swooping through).
    function chipBox(x, y, w, h) {
      for (var i = 0; i < shelves.length; i++) {
        var sh = shelves[i];
        if (!overlap(x, y, w, h, sh.x, sh.y, sh.cols * sh.cw, sh.rows * sh.ch)) continue;
        for (var gy = 0; gy < sh.rows; gy++) for (var gx = 0; gx < sh.cols; gx++) {
          if (sh.grid[gy][gx] && overlap(x, y, w, h, sh.x + gx * sh.cw, sh.y + gy * sh.ch, sh.cw, sh.ch)) { sh.grid[gy][gx] = 0; sh.hit = true; }
        }
      }
    }

    // ---------- Formation ----------
    function doMarchStep() {
      var minX = 1e9, maxX = -1e9, any = false;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i]; if (!e.alive) continue; any = true;
        var sx = FORM_X + e.col * CELL_W + offsetX;
        if (sx - HALF_W < minX) minX = sx - HALF_W;
        if (sx + HALF_W > maxX) maxX = sx + HALF_W;
      }
      if (any) {
        if ((dir > 0 && maxX + STEP_X > MARGIN_R) || (dir < 0 && minX - STEP_X < MARGIN_L)) { offsetY += STEP_Y; dir = -dir; }
        else offsetX += dir * STEP_X;
      }
      wobble = wobble ? 0 : 1;
      for (var j = 0; j < enemies.length; j++) {
        var en = enemies[j]; if (!en.alive || en.dive) continue;
        var s = slot(en), t = TIERS[en.tier];
        chipBox(s.x - t.w / 2, s.y - t.h / 2, t.w, t.h);
      }
      tryEnemyFire();
      sfx.march();
      stepTimer = clamp(BASE_INTERVAL[wave - 1] * (0.30 + 0.70 * (aliveCount / Math.max(1, totalCount))), MIN_INTERVAL, BASE_INTERVAL[wave - 1]);
    }
    function frontEnemyInCol(col) {
      var found = null, maxRow = -1;
      for (var i = 0; i < enemies.length; i++) { var e = enemies[i]; if (e.alive && !e.dive && e.col === col && e.row > maxRow) { maxRow = e.row; found = e; } }
      return found;
    }
    function tryEnemyFire() {
      if (bolts.length >= MAX_BOLTS[wave - 1]) return;
      var cols = [];
      for (var c = 0; c < COLS; c++) if (frontEnemyInCol(c)) cols.push(c);
      if (!cols.length) return;
      if (Math.random() < DROP_CHANCE[wave - 1]) {
        var e = frontEnemyInCol(cols[Math.floor(Math.random() * cols.length)]);
        var s = slot(e);
        bolts.push({ x: s.x, y: s.y + TIERS[e.tier].h / 2 + 4, v: BOLT_SPEED[wave - 1] * SCALE, vx: 0 });
      }
    }
    function lowestEnemyBottom() {
      var low = 0;
      for (var i = 0; i < enemies.length; i++) { var e = enemies[i]; if (!e.alive || e.dive) continue; var b = slot(e).y + TIERS[e.tier].h / 2; if (b > low) low = b; }
      if (boss && boss.hp > 0) low = Math.max(low, boss.y + boss.h);
      return low;
    }

    // Dive runs from wave 3: one question peels off, swoops in an arc toward
    // where the lens was, fires once, then climbs back to its slot.
    function startDive() {
      var maxDives = wave >= 5 ? 2 : 1, diving = 0, pool = [];
      for (var i = 0; i < enemies.length; i++) { var e = enemies[i]; if (!e.alive) continue; if (e.dive) diving++; else pool.push(e); }
      if (diving >= maxDives || !pool.length) return;
      var en = pool[Math.floor(Math.random() * pool.length)];
      var s = slot(en);
      en.dive = { t: 0, dur: Math.max(120, 175 - wave * 8), tx: clamp(ship.x, 30, W - 30) - s.x, side: Math.random() < 0.5 ? -1 : 1, depth: Math.max(60, (SHIP_Y - 4) - s.y), fired: false };
      sfx.swoop();
    }
    function tickDives(dt, world) {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i]; if (!e.alive || !e.dive) continue;
        var d = e.dive;
        // From Theory of Mind on, the swoop keeps guessing where the lens is going.
        if (wave >= 4 && d.t < 0.45) { var s = slot(e); d.tx += ((clamp(ship.x, 30, W - 30) - s.x) - d.tx) * 0.025 * dt * world; }
        d.t += dt * world / d.dur;
        var p = enemyPos(e), t = TIERS[e.tier];
        if (!d.fired && d.t >= 0.3) { d.fired = true; bolts.push({ x: p.x, y: p.y + t.h / 2 + 4, v: BOLT_SPEED[wave - 1] * SCALE * 1.1, vx: 0 }); }
        chipBox(p.x - t.w / 2, p.y - t.h / 2, t.w, t.h);
        if (ship.invuln <= 0 && overlap(p.x - t.w / 2, p.y - t.h / 2, t.w, t.h, ship.x - SHIP_R, SHIP_Y - SHIP_R, SHIP_R * 2, SHIP_R * 2 + 10)) {
          e.alive = false; aliveCount--;
          particles.burst(p.x, p.y, { n: 10, color: [pal[t.fill], pal.surface], speed: 1.8, life: 22, size: 2.2, kind: "square" });
          shipHit();
          if (state !== "running") return;
          continue;
        }
        if (d.t >= 1) e.dive = null;
      }
    }
    function shipHit() {
      if (powers.use("bubble")) {
        ship.invuln = 40;
        sfx.pop(); A.haptics.thump(); camera.shake(0.2);
        particles.burst(ship.x, SHIP_Y, { n: 14, color: pal.forest, speed: 2, life: 22, size: 2.4, kind: "ring" });
        floaters.spawn(ship.x, SHIP_Y - 26, "Bubble popped", pal.forest, { size: 11 });
        A.announce("Bubble popped. The hit was absorbed.");
        return;
      }
      loseLife();
    }

    // ---------- Power-ups ----------
    function dropCapsule(x, y) {
      if (capsules.length >= 3) return;
      var pool = POWER_ORDER.filter(function (id) { return !(id === "bubble" && powers.active("bubble")); });
      capsules.push({ x: x, y: y, id: pool[Math.floor(Math.random() * pool.length)], bob: Math.random() * 6 });
    }
    function collect(id, x, y) {
      var def = POWERUPS[id];
      powers.grant(id);
      runStats.powers += 1;
      sfx.power(); A.haptics.thump();
      particles.burst(x, y, { n: 14, color: [pal[def.color], pal.surface], speed: 2, life: 24, size: 2.4, kind: ["ring", "dot"] });
      floaters.spawn(x, y - 18, def.label, pal[def.color], { size: 13, font: "display" });
      shell.toast(def.label + ": " + def.text, 1600);
      A.announce(def.label + ". " + def.text + ".");
    }

    // ---------- Hits ----------
    function shotHits(sp) {
      if (chipAt(sp.x, sp.y - 6) || chipAt(sp.x - 1.5, sp.y - 4) || chipAt(sp.x + 1.5, sp.y - 4)) return true;
      if (boss && boss.hp > 0) {
        var bb = bossBox();
        if (overlap(sp.x - 2, sp.y - 6, 4, 12, bb.x, bb.y, bb.w, bb.h)) {
          boss.hp--; boss.flash = 5;
          var unfold = 1 - boss.hp / BOSS_HP;
          boss.w = 72 + unfold * 64;
          boss.cx = clamp(boss.cx, MARGIN_L + boss.w / 2, MARGIN_R - boss.w / 2);
          particles.burst(sp.x, sp.y - 6, { n: 8, color: [pal.surface, pal.inkMuted, pal.ochre], speed: 1.6, life: 20, size: 2, kind: "square", gravity: 0.05 });
          camera.shake(0.3); camera.freeze(2);
          if (boss.hp <= 0) {
            score += 300; runStats.answered += 1;
            floaters.spawn(boss.cx, boss.y + boss.h / 2, "The Headline, answered +300", pal.forest, { size: 13, font: "display", life: 60 });
            for (var k = 0; k < 6; k++) particles.burst(bb.x + Math.random() * bb.w, bb.y + Math.random() * bb.h, { n: 6, color: [pal.surface, pal.inkMuted, pal.sage, pal.ochre], speed: 2.2, life: 34, size: 2.6, kind: ["square", "leaf"], gravity: 0.05 });
            camera.shake(1); camera.freeze(7);
            sfx.bossDie(); A.haptics.thump();
            A.announce("The Headline is answered.");
          } else sfx.boss();
          syncHud();
          return true;
        }
      }
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i]; if (!e.alive) continue;
        var p = enemyPos(e), t = TIERS[e.tier];
        if (!overlap(sp.x - 2, sp.y - 6, 4, 12, p.x - t.w / 2, p.y - t.h / 2, t.w, t.h)) continue;
        e.alive = false; aliveCount--;
        var mult = combo.hit();
        var swoop = !!e.dive;
        var pts = t.pts * mult * (swoop ? 2 : 1);
        score += pts; runStats.answered += 1; if (swoop) runStats.swoops += 1;
        particles.burst(p.x, p.y, { n: 9, color: [pal[t.fill], pal.surface, pal.ochre], speed: 1.7, life: 22, size: 2.2, kind: ["square", "dot"], gravity: 0.03 });
        floaters.spawn(p.x, p.y - 12, (swoop ? "Swoop +" : "+") + pts + (mult > 1 ? " ×" + mult : ""), mult > 1 || swoop ? pal.forest : pal.inkSoft, { size: mult > 1 ? 12 : 11, stroke: pal.paper });
        camera.freeze(1); camera.shake(0.08 + mult * 0.03);
        sfx.answer(e.tier, mult); killBuzz();
        if (e.tier === 0 && Math.random() < 0.12) dropCapsule(p.x, p.y);
        syncHud(); shell.hud.flash("score");
        return true;
      }
      if (plane && overlap(sp.x - 2, sp.y - 6, 4, 12, plane.x - 15, plane.y - 8, 30, 15)) {
        score += plane.val;
        floaters.spawn(plane.x, plane.y + 14, "Paper plane +" + plane.val, pal.forest, { size: 12 });
        particles.burst(plane.x, plane.y, { n: 12, color: [pal.surface, pal.sage, pal.inkMuted], speed: 1.8, life: 26, size: 2.2, kind: ["leaf", "square"], gravity: 0.04 });
        dropCapsule(plane.x, plane.y);
        plane = null; planeTimer = rand(16, 26) * 60;
        camera.shake(0.4); camera.freeze(2);
        sfx.plane(); killBuzz();
        syncHud();
        return true;
      }
      return false;
    }

    // ---------- Input ----------
    function fireHeld() { return !!(input.held.fire || shell.held.fire || pointerFire); }
    function onFireAction() {
      if (state === "idle") { start(); return; }
      if (state === "paused") { resume(); return; }
      if (state === "running" && !fireLock) fireRequest();
    }
    var input = A.makeInput(cv.el, {
      canvas: cv,
      keys: { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", " ": "fire", ArrowUp: "fire", w: "fire", p: "pause", Enter: "pause" },
      onAction: function (a, repeat, e) {
        if (e && e.preventDefault) e.preventDefault();
        if (a === "left" || a === "right") { if (ship) ship.tx = null; }
        else if (a === "fire") { if (!repeat) onFireAction(); }
        else if (a === "pause") { if (state === "running") pause(); else if (state === "paused") resume(); else if (state === "idle") start(); }
      },
      onDown: function (pt) {
        if (state === "paused") { resume(); return; }
        if (state !== "running") return;
        pointerFire = true;
        ship.tx = pt.x;
        if (!fireLock) fireRequest();
      },
      onDrag: function (pt) { if (state === "running") ship.tx = pt.x; },
      onMove: function (pt, e) { if (state === "running" && e && e.pointerType === "mouse") ship.tx = pt.x; },
      onUp: function () { pointerFire = false; }
    });
    shell.onTap(function (id) {
      if (id === "pause") { if (state === "running") pause(); else if (state === "paused") resume(); else if (state === "idle") start(); }
      else if (id === "fire") onFireAction();
    });

    // ---------- Tick ----------
    function tick(dt) {
      time += dt;
      camera.tick(dt); particles.tick(dt); floaters.tick(dt); story.tick(dt);
      if (state === "dying" || state === "won") {
        endTimer -= dt;
        if (endTimer <= 0) finish(state === "won");
        return;
      }
      if (state !== "running") return;
      shell.renderPips(powers.list(), pal);
      if (camera.frozen()) return;
      combo.tick(dt); powers.tick(dt);
      var world = powers.active("slow") ? 0.5 : 1;

      // the lens
      var left = input.held.left || shell.held.left, right = input.held.right || shell.held.right;
      var sv = 2.0 * SCALE;
      if (left || right) { ship.tx = null; if (left) ship.x -= sv * dt; if (right) ship.x += sv * dt; }
      else if (ship.tx != null) { var dx = ship.tx - ship.x; ship.x += clamp(dx, -7 * dt, 7 * dt); }
      ship.x = clamp(ship.x, MARGIN_L + SHIP_R, MARGIN_R - SHIP_R);
      if (ship.invuln > 0) ship.invuln -= dt;
      if (fireCooldown > 0) fireCooldown -= dt;
      if (warnTimer > 0) warnTimer -= dt;
      if (fireLock && !fireHeld()) fireLock = false;
      if (fireHeld() && !fireLock) fireRequest();

      // formation
      if (introTimer > 0) introTimer -= dt;
      else {
        stepTimer -= dt * world;
        if (stepTimer <= 0) doMarchStep();
        if (wave >= 3) { diveTimer -= dt * world; if (diveTimer <= 0) { startDive(); diveTimer = rand(220, 380) - (wave - 3) * 30; } }
      }
      tickDives(dt, world);
      if (state !== "running") return;

      if (boss && boss.hp > 0) tickBoss(dt * world);

      // our bolts
      for (var s = shots.length - 1; s >= 0; s--) {
        var sp = shots[s];
        sp.px = sp.x; sp.py = sp.y;
        sp.y -= 4.2 * SCALE * dt; sp.x += sp.vx * dt;
        if (sp.y < -10 || sp.x < -10 || sp.x > W + 10) { shots.splice(s, 1); if (!sp.side) combo.reset(); continue; }
        if (shotHits(sp)) shots.splice(s, 1);
      }

      // their bolts
      for (var b = bolts.length - 1; b >= 0; b--) {
        var bo = bolts[b];
        bo.y += bo.v * dt * world; bo.x += bo.vx * dt * world;
        if (bo.y > H + 10) { bolts.splice(b, 1); continue; }
        if (chipAt(bo.x, bo.y + 6)) { bolts.splice(b, 1); continue; }
        if (ship.invuln <= 0 && overlap(bo.x - 2, bo.y - 6, 4, 12, ship.x - SHIP_R + 2, SHIP_Y - SHIP_R + 2, SHIP_R * 2 - 4, SHIP_R * 2 + 8)) {
          bolts.splice(b, 1); shipHit();
          if (state !== "running") return;
        }
      }

      // capsules
      for (var c = capsules.length - 1; c >= 0; c--) {
        var cap = capsules[c];
        cap.y += 1.4 * dt * world;
        if (cap.y > H + 10) { capsules.splice(c, 1); continue; }
        if (overlap(cap.x - 9, cap.y - 9, 18, 18, ship.x - SHIP_R - 2, SHIP_Y - SHIP_R - 2, SHIP_R * 2 + 4, SHIP_R * 2 + 14)) {
          capsules.splice(c, 1); collect(cap.id, cap.x, cap.y);
        }
      }

      // paper plane
      planeTimer -= dt;
      if (!plane && planeTimer <= 0 && introTimer <= 0) {
        var pd = Math.random() < 0.5 ? 1 : -1;
        plane = { x: pd > 0 ? -20 : W + 20, y: PLANE_Y, dir: pd, val: [50, 100, 150][Math.floor(Math.random() * 3)] };
      }
      if (plane) {
        plane.x += plane.dir * 1.3 * SCALE * dt * world;
        if (plane.x < -30 || plane.x > W + 30) { plane = null; planeTimer = rand(16, 26) * 60; }
      }

      // formation touching the lens costs a life; touching the floor ends the run
      if (ship.invuln <= 0) {
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i]; if (!e.alive || e.dive) continue;
          var p = slot(e), t = TIERS[e.tier];
          if (overlap(p.x - t.w / 2, p.y - t.h / 2, t.w, t.h, ship.x - SHIP_R, SHIP_Y - SHIP_R, SHIP_R * 2, SHIP_R * 2)) { e.alive = false; aliveCount--; shipHit(); if (state !== "running") return; break; }
        }
      }
      var lowest = lowestEnemyBottom();
      if (lowest >= WARN_Y && warnTimer <= 0) { warnTimer = 40; sfx.warn(); }
      if (lowest >= FLOOR_Y) { die("floor"); return; }

      if (aliveCount <= 0 && (!boss || boss.hp <= 0)) {
        if (wave >= 6) { win(); return; }
        nextWave();
      }
    }

    function tickBoss(dt) {
      boss.cx += boss.dir * 1.2 * SCALE * dt;
      if (boss.cx - boss.w / 2 < MARGIN_L) { boss.cx = MARGIN_L + boss.w / 2; boss.dir = 1; }
      if (boss.cx + boss.w / 2 > MARGIN_R) { boss.cx = MARGIN_R - boss.w / 2; boss.dir = -1; }
      if (boss.flash > 0) boss.flash -= dt;
      boss.fireTimer -= dt;
      if (boss.fireTimer <= 0) {
        var unfold = 1 - boss.hp / BOSS_HP;
        boss.fireTimer = 80 - unfold * 20;
        var spread = boss.hp <= 4 ? 2 : 1;
        for (var i = -spread; i <= spread; i++) {
          if (bolts.length < MAX_BOLTS[wave - 1] + 2 + spread) bolts.push({ x: boss.cx + i * 14, y: boss.y + boss.h + 4, v: BOLT_SPEED[wave - 1] * SCALE, vx: i * 0.12 });
        }
      }
    }

    // ---------- Render ----------
    var SPINES = ["sage", "sageDeep", "sageMist2", "forest", "ochre", "research"];
    function drawShelf(sh) {
      var gx, gy, x, y;
      // shadow, then the surface cells
      ctx.fillStyle = pal.shadow;
      for (gy = 0; gy < sh.rows; gy++) for (gx = 0; gx < sh.cols; gx++) if (sh.grid[gy][gx]) ctx.fillRect(sh.x + gx * sh.cw, sh.y + gy * sh.ch + 2.5, sh.cw, sh.ch);
      for (gy = 0; gy < sh.rows; gy++) for (gx = 0; gx < sh.cols; gx++) {
        if (!sh.grid[gy][gx]) continue;
        x = sh.x + gx * sh.cw; y = sh.y + gy * sh.ch;
        ctx.fillStyle = pal.surface; ctx.fillRect(x, y, sh.cw, sh.ch);
        var sp = sh.spines[gy][gx];
        ctx.fillStyle = pal[SPINES[sp.c]];
        var bh = sp.tall ? sh.ch - 2 : sh.ch - 3.5;
        ctx.fillRect(x + 1, y + sh.ch - bh, sh.cw - 2, bh);
      }
      // ink: the outline wherever a cell meets a gap, and three shelf rules
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2; ctx.lineCap = "square";
      ctx.beginPath();
      for (gy = 0; gy < sh.rows; gy++) for (gx = 0; gx < sh.cols; gx++) {
        if (!sh.grid[gy][gx]) continue;
        x = sh.x + gx * sh.cw; y = sh.y + gy * sh.ch;
        ctx.moveTo(x, y); ctx.lineTo(x + sh.cw, y); // outline on top, or a shelf rule between rows
        if (!cellSolid(sh, gx, gy + 1)) { ctx.moveTo(x, y + sh.ch); ctx.lineTo(x + sh.cw, y + sh.ch); }
        if (!cellSolid(sh, gx - 1, gy)) { ctx.moveTo(x, y); ctx.lineTo(x, y + sh.ch); }
        if (!cellSolid(sh, gx + 1, gy)) { ctx.moveTo(x + sh.cw, y); ctx.lineTo(x + sh.cw, y + sh.ch); }
      }
      ctx.stroke();
      ctx.lineCap = "round";
    }

    function drawTag(e, p) {
      var t = TIERS[e.tier];
      var bob = reduce ? 0 : Math.sin(time * 0.08 + e.phase) * 1.6;
      var tilt = reduce ? 0 : (wobble ? 0.05 : -0.05) * (e.col % 2 ? 1 : -1);
      if (e.dive) tilt = reduce ? 0 : Math.cos(Math.PI * e.dive.t) * 0.35 * -e.dive.side;
      ctx.save();
      ctx.translate(p.x, p.y + bob); ctx.rotate(tilt);
      draw.tag(ctx, -t.w / 2, -t.h / 2, t.w, t.h, pal, { fill: pal[t.fill], stroke: pal.ink, lineWidth: 1.3, shadow: 2.5 });
      // the tag's string hole
      draw.circle(ctx, -t.w / 2 + 4.5, 0, 1.8, { fill: pal.paper, stroke: pal.ink, lineWidth: 1 });
      draw.label(ctx, t.glyph, 2, e.tier === 0 ? -2 : 1, { font: "display", size: t.size, weight: 600, color: pal[t.ink] });
      ctx.restore();
    }

    function drawBoss() {
      var bb = bossBox(), unfold = 1 - boss.hp / BOSS_HP;
      var flash = boss.flash > 0 && !reduce;
      draw.box(ctx, bb.x, bb.y, bb.w, bb.h, 2, { fill: flash ? pal.sageMist : pal.surface, stroke: pal.ink, lineWidth: 1.5, shadow: 3, shadowColor: pal.shadow });
      // masthead: the name over a heavy rule
      draw.label(ctx, "The Headline", bb.x + bb.w / 2, bb.y + 10, { font: "display", size: 11, weight: 600, color: pal.ink, maxWidth: bb.w - 8 });
      ctx.fillStyle = pal.ink; ctx.fillRect(bb.x + 4, bb.y + 17, bb.w - 8, 1.6);
      ctx.fillRect(bb.x + 4, bb.y + 20, bb.w - 8, 0.6);
      // columns of grey text lines; more columns open up as it unfolds
      var colsN = 2 + Math.floor(unfold * 2.99);
      var inner = bb.w - 8, colW = (inner - (colsN - 1) * 4) / colsN;
      ctx.fillStyle = pal.alpha(pal.inkMuted, 0.55);
      for (var c = 0; c < colsN; c++) {
        var cx0 = bb.x + 4 + c * (colW + 4);
        for (var l = 0; l < 5; l++) {
          var lw = colW * (l === 4 ? 0.6 : (0.85 + ((c + l) % 3) * 0.05));
          ctx.fillRect(cx0, bb.y + 24 + l * 3.6, Math.min(colW, lw), 1.4);
        }
      }
      // creases where it was folded
      ctx.strokeStyle = pal.rule; ctx.lineWidth = 1;
      for (var k = 1; k < colsN; k++) { var fx = bb.x + 4 + k * (colW + 4) - 2; ctx.beginPath(); ctx.moveTo(fx, bb.y + 22); ctx.lineTo(fx, bb.y + bb.h - 2); ctx.stroke(); }
      // HP as sage beads above
      var pipW = 6, tot = BOSS_HP * pipW + (BOSS_HP - 1) * 2, px0 = boss.cx - tot / 2;
      for (var h = 0; h < BOSS_HP; h++) {
        draw.pill(ctx, px0 + h * (pipW + 2), bb.y - 7, pipW, 3, { fill: h < boss.hp ? pal.sageDeep : pal.alpha(pal.ink, 0.12) });
      }
    }

    function drawPlane(pl) {
      var x = pl.x, y = pl.y + (reduce ? 0 : Math.sin(time * 0.1) * 2), d = pl.dir;
      // a dashed wake
      draw.dashes(ctx, x - d * 18, y + 2, x - d * 60, y + 4, 3, 4, { stroke: pal.rule, lineWidth: 1.2 });
      ctx.lineJoin = "round";
      // under-wing
      ctx.beginPath(); ctx.moveTo(x + d * 15, y); ctx.lineTo(x - d * 6, y + 2); ctx.lineTo(x - d * 14, y + 7); ctx.closePath();
      ctx.fillStyle = pal.surface2; ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.3; ctx.stroke();
      // top wing
      ctx.beginPath(); ctx.moveTo(x + d * 15, y); ctx.lineTo(x - d * 15, y - 8); ctx.lineTo(x - d * 6, y + 2); ctx.closePath();
      ctx.fillStyle = pal.surface; ctx.fill(); ctx.stroke();
    }

    function drawLens(x, y, r, opts) {
      opts = opts || {};
      var lw = r > 7 ? 1.5 : 1.1;
      draw.box(ctx, x - r * 0.24, y + r * 0.8, r * 0.48, r * 1.15, r * 0.24, { fill: pal.forestDeep, stroke: pal.ink, lineWidth: lw, shadow: opts.shadow ? 2.5 : 0, shadowColor: pal.shadow });
      draw.circle(ctx, x, y, r, { fill: pal.forest, stroke: pal.ink, lineWidth: lw, shadow: opts.shadow ? 2.5 : 0, shadowColor: pal.shadow });
      draw.circle(ctx, x, y, r * 0.62, { fill: pal.sageMist, stroke: pal.ink, lineWidth: lw * 0.8 });
      ctx.strokeStyle = pal.alpha(pal.surface, 0.9); ctx.lineWidth = Math.max(1, r * 0.13);
      ctx.beginPath(); ctx.arc(x, y, r * 0.38, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
    }

    function render() {
      cv.begin(camera);
      draw.paper(ctx, W, H, pal, { step: 20, dot: 1 });
      ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      var live = state === "running" || state === "paused" || state === "dying" || state === "won";

      // the floor: a quiet rule that turns clay when the formation gets close
      var warn = live && warnTimer > 0 && (reduce || Math.floor(warnTimer / 5) % 2 === 0);
      var close = live && lowestEnemyBottom() >= WARN_Y;
      ctx.fillStyle = warn || close ? pal.clay : pal.rule;
      ctx.fillRect(MARGIN_L, FLOOR_Y, W - MARGIN_L * 2, warn || close ? 1.5 : 1);

      for (var i = 0; i < shelves.length; i++) drawShelf(shelves[i]);

      // questions: formation first, swoopers on top
      for (var e2 = 0; e2 < enemies.length; e2++) { var en = enemies[e2]; if (en.alive && !en.dive) drawTag(en, slot(en)); }
      for (var e3 = 0; e3 < enemies.length; e3++) { var ed = enemies[e3]; if (ed.alive && ed.dive) drawTag(ed, enemyPos(ed)); }

      if (boss && boss.hp > 0) drawBoss();
      if (plane) drawPlane(plane);

      // capsules
      for (var c = 0; c < capsules.length; c++) {
        var cp = capsules[c], def = POWERUPS[cp.id], col = pal[def.color];
        var cyb = cp.y + (reduce ? 0 : Math.sin(time * 0.12 + cp.bob) * 1.2);
        draw.circle(ctx, cp.x, cyb, 12 + (reduce ? 0 : Math.sin(time * 0.1 + cp.bob) * 1.2), { stroke: pal.alpha(col, 0.5), lineWidth: 1.2 });
        draw.circle(ctx, cp.x, cyb, 8.5, { fill: col, stroke: pal.ink, lineWidth: 1.4, shadow: 2, shadowColor: pal.shadow });
        var dark = def.color === "forest" || def.color === "research";
        draw.label(ctx, def.mark, cp.x, cyb + 0.5, { font: "display", size: 12, weight: 600, color: dark ? pal.onForest : pal.ink });
      }

      // their bolts: clay dashes with a small halo
      for (var b = 0; b < bolts.length; b++) {
        var bo = bolts[b];
        draw.circle(ctx, bo.x, bo.y, 7, { fill: pal.alpha(pal.clay, pal.isDark ? 0.26 : 0.16) });
        draw.pill(ctx, bo.x - 2, bo.y - 6, 4, 12, { fill: pal.clay, stroke: pal.ink, lineWidth: 1.2 });
      }

      // our bolts: ochre dashes with a short trail
      for (var s = 0; s < shots.length; s++) {
        var sp = shots[s];
        if (!reduce) {
          ctx.strokeStyle = pal.alpha(pal.ochre, 0.35); ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(sp.x, sp.y + 6); ctx.lineTo(sp.px - sp.vx * 2, sp.py + 14); ctx.stroke();
        }
        ctx.save(); ctx.translate(sp.x, sp.y); if (sp.vx) ctx.rotate(Math.atan2(sp.vx, 4.2 * SCALE));
        draw.pill(ctx, -1.75, -6, 3.5, 12, { fill: pal.ochre, stroke: pal.ink, lineWidth: 1.2 });
        ctx.restore();
      }

      // the lens
      if (ship && state !== "idle" && state !== "dying" && state !== "gameover") {
        var blinkOff = ship.invuln > 0 && !reduce && Math.floor(ship.invuln / 4) % 2 === 0;
        ctx.save();
        if (ship.invuln > 0 && reduce) ctx.globalAlpha = 0.5;
        if (!blinkOff) drawLens(ship.x, SHIP_Y, SHIP_R, { shadow: true });
        ctx.restore();
        if (powers.active("bubble")) {
          var br = SHIP_R + 9 + (reduce ? 0 : Math.sin(time * 0.1) * 1);
          draw.circle(ctx, ship.x, SHIP_Y + 4, br, { fill: pal.alpha(pal.forest, 0.08), stroke: pal.alpha(pal.forest, 0.6), lineWidth: 1.4 });
        }
      } else if (ship && state === "idle") {
        drawLens(ship.x, SHIP_Y, SHIP_R, { shadow: true });
      }

      particles.render(ctx);
      floaters.render(ctx);

      // lives as small lenses, top left
      if (live || state === "gameover") {
        for (var lv = 0; lv < 3; lv++) {
          ctx.save(); if (lv >= lives) ctx.globalAlpha = 0.22;
          drawLens(16 + lv * 18, 14, 5.5, {});
          ctx.restore();
        }
      }
      // streak readout, top right
      var cm = combo.mult();
      if (cm > 1 && state === "running") {
        draw.label(ctx, "×" + cm + " streak", W - 12, 14, { size: 11, weight: 600, color: cm >= 4 ? pal.forest : pal.inkSoft, align: "right" });
        draw.pill(ctx, W - 62, 22, 50, 3, { fill: pal.alpha(pal.ink, 0.12) });
        draw.pill(ctx, W - 62, 22, 50 * combo.frac(), 3, { fill: pal.forest });
      }
      // Pause for Thought: a faint research wash at the edges
      if (powers.active("slow") && state === "running") {
        ctx.strokeStyle = pal.alpha(pal.research, 0.35); ctx.lineWidth = 3; ctx.strokeRect(3, 3, W - 6, H - 6);
      }

      // wave banner
      var bn = story.banner();
      if (bn && live) {
        var a = Math.min(1, bn.frac * 3) * Math.min(1, (1 - bn.frac) * 6 + 0.2);
        ctx.save(); ctx.globalAlpha = a;
        var ty = 26 + (reduce ? 0 : (1 - Math.min(1, (1 - bn.frac) * 4)) * -10);
        draw.label(ctx, bn.name, W / 2, ty, { font: "display", size: 24, color: pal.ink, weight: 500 });
        draw.label(ctx, bn.text, W / 2, ty + 21, { size: 11, color: pal.inkMuted, weight: 500, maxWidth: W - 24 });
        ctx.restore();
      }

      // run progress along the bottom rule: waves done plus this wave's share
      if (live) {
        var frac = boss ? (BOSS_HP - Math.max(0, boss.hp) + (totalCount - aliveCount)) / (BOSS_HP + totalCount) : (totalCount - aliveCount) / Math.max(1, totalCount);
        var prog = clamp((wave - 1 + frac) / 6, 0, 1);
        ctx.fillStyle = pal.alpha(pal.forest, 0.55); ctx.fillRect(0, H - 2, W * prog, 2);
      }

      cv.end();
    }

    var loop = A.makeLoop(tick, render);
    function onHidden() { if (state === "running") pause(); }

    A.debug("invaders", {
      state: function () { return state; },
      score: function () { return Math.floor(score); },
      wave: function () { return wave; },
      lives: function () { return lives; },
      grant: function (id) { if (POWERUPS[id]) collect(id, ship.x, SHIP_Y - 20); },
      skipToWave: function (n) {
        if (state !== "running") start();
        wave = clamp(n | 0, 1, 6); bolts.length = 0; shots.length = 0;
        buildWave(wave); story.set(wave - 1); syncHud();
        A.announce("Wave " + wave + ", " + WAVES[wave - 1].name + ".");
      },
      clearWave: function () {
        for (var i = 0; i < enemies.length; i++) if (enemies[i].alive) { enemies[i].alive = false; aliveCount--; }
        if (boss) boss.hp = 0;
      },
      hitBoss: function (n) { if (!boss) return; for (var i = 0; i < (n || 1) && boss.hp > 1; i++) { boss.hp--; boss.w = 72 + (1 - boss.hp / BOSS_HP) * 64; } },
      dive: function () { startDive(); },
      plane: function () { planeTimer = 0; introTimer = 0; },
      die: function () { ship.invuln = 0; loseLife(); },
      lose: function () { die("lenses"); },
      win: function () { wave = 6; win(); }
    });

    return {
      held: input.held,
      activate: function () {
        pal = A.theme();
        cv.fit();
        state = "idle"; resetWorld();
        render();
        loop.start();
        unsubHidden = A.onHidden(onHidden);
        showStart();
      },
      deactivate: function () {
        loop.stop();
        if (unsubHidden) { unsubHidden(); unsubHidden = null; }
        wake.release();
        synth.close();
        input.release(); pointerFire = false;
        state = "idle";
      },
      onKeydown: function (e) { if (input.onKeydown(e)) e.preventDefault(); },
      onKeyup: function (e) { input.onKeyup(e); },
      destroy: function () { offTheme(); input.destroy(); }
    };
  }

  // ======================================================================
  //  Overlay
  // ======================================================================
  A.ready(function () {
    A.defineGame("invaders", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "GMS Invaders",
        tagline: "Answer the questions before they land.",
        label: "GMS Invaders game",
        canvas: { w: W, h: H, label: "GMS Invaders play field" },
        hud: [{ id: "score", label: "Score", value: 0 }, { id: "best", label: "Best", value: A.leaderboard.best(GAME_KEY) }, { id: "wave", label: "Wave", value: "1 of 6" }],
        help: A.isCoarsePointer()
          ? "Hold the field to fire, slide to steer · or use the buttons · Pause pauses"
          : "Arrows or A D move · Space or W fires · mouse steers, click fires · P pauses · M mutes · Esc closes",
        touch: [
          { id: "left", label: "◀", aria: "Move left" },
          { id: "fire", label: "Fire", aria: "Fire", wide: true, alsoTap: true },
          { id: "right", label: "▶", aria: "Move right" },
          { id: "pause", label: "Pause", aria: "Pause or resume", tap: true }
        ]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
