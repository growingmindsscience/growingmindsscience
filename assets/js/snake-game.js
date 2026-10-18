/* Growing Minds Science — snake-game.js
   "Synapse Snake" on the Arcade page: steer a growing neural pathway through
   five developmental fields, linking sparks of curiosity. Each spark makes the
   pathway longer; every field is a little faster and busier. Tangle the
   pathway or hit a distraction and the run ends.

   Core v2 reference game (see docs/arcade/plan.md): reads the live brand
   tokens through A.theme(), draws at device resolution through the shell's
   canvas, uses makeShell for the overlay, makeStory for chapters,
   makePowerups for timed effects, runSummary for the end card. Everything
   else is gameplay and art. CSP-safe: no eval, no external assets, audio is
   the shared Web Audio synth. Honors prefers-reduced-motion.

   Power-ups: Myelin (pass through your own path for a while, research blue),
   Prune (drop three segments, sage), Bridge (a pair of portals, ochre),
   Focus (the clock slows, forest).
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "synapse-snake";
  var MUTE_KEY = "gms-snake-muted";

  // ---------- Grid ----------
  // Landscape by default; a portrait phone gets the same grid turned on end
  // (chosen when the game opens, see activate()).
  var CELL = 20, COLS = 28, ROWS = 18;
  var W = COLS * CELL, H = ROWS * CELL;
  function setGrid(cols, rows) { COLS = cols; ROWS = rows; W = COLS * CELL; H = ROWS * CELL; }

  // ---------- Story: five fields, gated on sparks ----------
  var CHAPTERS = [
    { name: "Crib", at: 0, text: "Sparks everywhere. Link them up.", interval: 10, blocks: 0, movers: 0 },
    { name: "First Steps", at: 6, text: "A little faster now.", interval: 9, blocks: 0, movers: 0 },
    { name: "First Words", at: 14, text: "Distractions appear. Steer around them.", interval: 8, blocks: 3, movers: 0 },
    { name: "Why Stage", at: 24, text: "More questions, more clutter.", interval: 7, blocks: 6, movers: 0 },
    { name: "Big Ideas", at: 36, text: "Some distractions wander. Keep your line.", interval: 6, blocks: 9, movers: 3 }
  ];

  var POWERUPS = {
    myelin: { label: "Myelin", color: "research", duration: 330, text: "Pass through your own path" },
    focus: { label: "Focus", color: "forest", duration: 270, text: "The clock slows" },
    bridge: { label: "Bridge", color: "ochre", duration: 1200, text: "Two portals, one path" },
    prune: { label: "Prune", color: "sageDeep", duration: 1, text: "Three segments shorter" }
  };
  var POWER_ORDER = ["myelin", "focus", "bridge", "prune"];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function cx(c) { return c.x * CELL + CELL / 2; }
  function cy(c) { return c.y * CELL + CELL / 2; }

  // ======================================================================
  //  Game
  // ======================================================================
  function createGame(shell) {
    var cv = shell.canvas, ctx = cv.ctx, draw = A.draw;
    var pal = A.theme();
    var offTheme = A.onThemeChange(function (p) { pal = p; });
    var reduce = A.prefersReducedMotion();

    var camera = A.makeCamera({ reduce: reduce, maxPx: 5 });
    var combo = A.makeCombo({ window: 110, max: 5 });
    var particles = A.makeParticles({ cap: 90, reduce: reduce });
    var floaters = A.makeFloaters({ cap: 10, reduce: reduce });
    var wake = A.makeWakeLock();
    var unsubHidden = null;
    var synth = A.makeSynth({ muteKey: MUTE_KEY });
    shell.bindSynth(synth);

    var story = A.makeStory(CHAPTERS, { onEnter: onChapter, bannerFrames: 160 });
    var powers = A.makePowerups(POWERUPS, { onExpire: function (id) { if (id === "bridge") portals = null; } });

    var state = "idle"; // idle | running | paused | dying | gameover
    var snake, prevSnake, dirQ, dir, growth, moveTimer, moveInterval;
    var spark, book, bookTimer, blocks, sparksEaten, score, best;
    var pickup, pickupTimer, sinceDrop, portals;
    var deathTimer, time;
    var runStats;

    best = A.leaderboard.best(GAME_KEY);

    // ---------- Audio ----------
    var sfx = {
      spark: function (mult) { synth.beep(620 + mult * 50, 920 + mult * 50, 0.07, "triangle", 0.42); },
      book: function () { synth.arp([523, 784, 1046], 0.05, 0.14, "triangle", 0.4); },
      power: function () { synth.arp([659, 880, 1318], 0.045, 0.12, "triangle", 0.4); },
      portal: function () { synth.beep(300, 900, 0.12, "sine", 0.35); },
      chapter: function () { synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.42); },
      turn: function () { synth.beep(240, 220, 0.025, "square", 0.08); },
      hit: function () { synth.beep(200, 70, 0.26, "sawtooth", 0.5); synth.noise(0.32, 900, 0.4); }
    };

    // ---------- World ----------
    function resetWorld() {
      var sx = 7, sy = Math.floor(ROWS / 2);
      snake = [{ x: sx, y: sy }, { x: sx - 1, y: sy }, { x: sx - 2, y: sy }, { x: sx - 3, y: sy }];
      prevSnake = snake.map(function (c) { return { x: c.x, y: c.y }; });
      dir = { x: 1, y: 0 }; dirQ = [];
      growth = 0;
      moveInterval = CHAPTERS[0].interval; moveTimer = moveInterval;
      blocks = []; book = null; bookTimer = 0;
      pickup = null; pickupTimer = 0; sinceDrop = 0; portals = null;
      sparksEaten = 0; score = 0; time = 0;
      combo.reset(true); powers.clear(); story.reset();
      particles.clear(); floaters.clear();
      deathTimer = 0;
      runStats = { chapter: 0, bestChain: 0, powers: 0 };
      spark = null; placeSpark();
      syncHud();
    }

    function occupied(x, y) {
      var i;
      for (i = 0; i < snake.length; i++) if (snake[i].x === x && snake[i].y === y) return true;
      for (i = 0; i < blocks.length; i++) if (blocks[i].x === x && blocks[i].y === y) return true;
      if (spark && spark.x === x && spark.y === y) return true;
      if (book && book.x === x && book.y === y) return true;
      if (pickup && pickup.x === x && pickup.y === y) return true;
      if (portals && ((portals[0].x === x && portals[0].y === y) || (portals[1].x === x && portals[1].y === y))) return true;
      return false;
    }
    function randomFreeCell(minHeadDist) {
      var head = snake[0];
      for (var tries = 0; tries < 300; tries++) {
        var x = Math.floor(Math.random() * COLS), y = Math.floor(Math.random() * ROWS);
        if (occupied(x, y)) continue;
        if (minHeadDist) {
          var dx = Math.abs(x - head.x), dy = Math.abs(y - head.y);
          if (Math.min(dx, COLS - dx) + Math.min(dy, ROWS - dy) < minHeadDist) continue;
        }
        return { x: x, y: y };
      }
      return null;
    }
    function placeSpark() {
      var c = randomFreeCell(2);
      spark = c ? { x: c.x, y: c.y, bob: Math.random() * Math.PI * 2 } : null;
    }
    function maybePlaceBook() {
      if (book || sparksEaten === 0 || sparksEaten % 6 !== 0) return;
      var c = randomFreeCell(4);
      if (c) { book = { x: c.x, y: c.y }; bookTimer = 320; }
    }
    function maybePlacePickup() {
      if (pickup) return;
      sinceDrop += 1;
      if (sinceDrop < 4 || Math.random() > 0.45) return;
      var c = randomFreeCell(4);
      if (!c) return;
      var pool = POWER_ORDER.filter(function (id) { return !(id === "bridge" && portals) && !(id === "prune" && snake.length < 8); });
      pickup = { x: c.x, y: c.y, id: pool[Math.floor(Math.random() * pool.length)] };
      pickupTimer = 480; sinceDrop = 0;
    }
    function placePortals() {
      var a = randomFreeCell(3); if (!a) return;
      var b = null;
      for (var t = 0; t < 40 && !b; t++) {
        var c = randomFreeCell(3);
        if (c && (Math.abs(c.x - a.x) + Math.abs(c.y - a.y)) >= 8) b = c;
      }
      if (!b) return;
      portals = [a, b];
    }
    function onChapter(ch, idx) {
      moveInterval = ch.interval;
      if (idx > 0) {
        score += 100;
        floaters.spawn(cx(snake[0]), cy(snake[0]) - 14, "+100", pal.forest, { size: 12 });
        sfx.chapter(); A.haptics.win();
        A.announce("Field " + (idx + 1) + ", " + ch.name + ". " + ch.text);
      }
      runStats.chapter = Math.max(runStats.chapter, idx);
      var head = snake[0];
      while (blocks.length < ch.blocks) {
        var cell = randomFreeCell(5);
        if (!cell) break;
        if ((cell.y === head.y && dir.y === 0) || (cell.x === head.x && dir.x === 0)) continue; // never straight ahead
        blocks.push({ x: cell.x, y: cell.y, mover: false, t: 0 });
      }
      var movers = 0;
      for (var i = 0; i < blocks.length; i++) if (blocks[i].mover) movers++;
      for (var j = blocks.length - 1; j >= 0 && movers < ch.movers; j--) { if (!blocks[j].mover) { blocks[j].mover = true; blocks[j].t = 40 + j * 7; movers++; } }
    }

    function syncHud() {
      shell.hud.set("score", score);
      shell.hud.set("best", Math.max(best, score));
      shell.hud.set("sparks", sparksEaten);
      shell.hud.set("field", CHAPTERS[story.index()].name);
    }

    // ---------- Flow ----------
    function showStart() {
      var p = A.progress.get(GAME_KEY);
      shell.prompt.show({
        kicker: "Synapse Snake",
        title: p.plays ? "Link the sparks again" : "Link the sparks. Grow the pathway.",
        text: "Steer with the arrow keys or a swipe. Every spark makes you longer; every field is a little faster. Don't cross your own line.",
        actions: [{ label: "Start", primary: true, onClick: start }],
        board: p.plays ? function (m) { A.renderLeaderboard(m, GAME_KEY, {}); } : null
      });
    }
    // Landscape grid, or the same grid on end for a portrait phone. Chosen on
    // open and again at every start, so a phone turned between runs gets the
    // right field.
    function layoutField() {
      if (cv.aspect() < 0.9) setGrid(18, 28); else setGrid(28, 18);
      cv.setSize(W, H);
    }
    function start() {
      synth.ensure();
      layoutField();
      resetWorld();
      state = "running";
      shell.prompt.hide();
      wake.acquire();
      shell.setHelp("Arrows or WASD steer · swipe on the field · Space pauses · M mutes · Esc closes");
      A.announce("Go. Field one, Crib.");
    }
    function pause() {
      if (state !== "running") return;
      state = "paused";
      wake.release();
      shell.prompt.show({ kicker: "Paused", title: CHAPTERS[story.index()].name, text: "Score " + score + " · " + snake.length + " segments long.",
        actions: [{ label: "Resume", primary: true, onClick: resume }, { label: "Quit", onClick: function () { A.closeGame(); } }], compact: true });
    }
    function resume() {
      if (state !== "paused") return;
      synth.ensure();
      state = "running"; shell.prompt.hide(); wake.acquire();
    }
    function die() {
      if (state !== "running") return;
      state = "dying"; deathTimer = 54;
      wake.release();
      sfx.hit(); A.haptics.crash();
      camera.shake(0.9); camera.freeze(6);
      for (var i = 0; i < snake.length; i += 2) {
        particles.burst(cx(snake[i]), cy(snake[i]), { n: 3, color: [pal.forest, pal.sage, pal.clay], speed: 1.6, life: 30, size: 3, kind: ["dot", "leaf"], gravity: 0.04 });
      }
    }
    function gameOver() {
      state = "gameover";
      var placed = score > 0 && score >= best;
      if (score > best) best = score;
      runStats.bestChain = combo.best();
      A.progress.record(GAME_KEY, { score: score, chapter: runStats.chapter, badges: runStats.chapter >= 4 ? ["big-ideas"] : [] });
      syncHud();
      var ch = CHAPTERS[story.index()];
      shell.prompt.show({
        kicker: "The pathway tangled",
        title: placed ? "A new best: " + score : "Score " + score,
        text: "You reached " + ch.name + " with " + sparksEaten + " sparks and a pathway " + snake.length + " segments long.",
        board: function (m) {
          A.runSummary(m, { gameKey: GAME_KEY, score: score, lines: [["Field", ch.name], ["Sparks", sparksEaten], ["Best chain", runStats.bestChain + "x"], ["Power-ups", runStats.powers]],
            onSaved: function () { best = A.leaderboard.best(GAME_KEY); syncHud(); } });
        },
        actions: [{ label: "Play again", primary: true, onClick: start }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
      A.announce("Game over. Score " + score + ".");
    }

    // ---------- Input ----------
    function queueDir(x, y) {
      if (state === "idle" || state === "gameover") { start(); }
      if (state !== "running") return;
      var last = dirQ.length ? dirQ[dirQ.length - 1] : dir;
      if ((last.x === x && last.y === y) || (last.x === -x && last.y === -y)) return;
      if (dirQ.length >= 2) dirQ.shift();
      dirQ.push({ x: x, y: y });
      if (!reduce) sfx.turn();
      A.haptics.tick();
    }
    var input = A.makeInput(cv.el, {
      canvas: cv,
      keys: { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", " ": "action", p: "pause", Enter: "action" },
      onAction: function (a, repeat, e) {
        if (e && e.preventDefault) e.preventDefault();
        if (a === "left") queueDir(-1, 0);
        else if (a === "right") queueDir(1, 0);
        else if (a === "up") queueDir(0, -1);
        else if (a === "down") queueDir(0, 1);
        else if (a === "action") { if (state === "idle" || state === "gameover") start(); else if (state === "running") pause(); else if (state === "paused") resume(); }
        else if (a === "pause") { if (state === "running") pause(); else if (state === "paused") resume(); }
      },
      onSwipe: function (d) { if (d === "left") queueDir(-1, 0); else if (d === "right") queueDir(1, 0); else if (d === "up") queueDir(0, -1); else queueDir(0, 1); },
      onTap: function () { if (state === "idle" || state === "gameover") start(); else if (state === "paused") resume(); }
    });
    shell.onTap(function (id) {
      if (id === "left") queueDir(-1, 0); else if (id === "right") queueDir(1, 0); else if (id === "up") queueDir(0, -1); else if (id === "down") queueDir(0, 1);
      else if (id === "pause") { if (state === "running") pause(); else if (state === "paused") resume(); else start(); }
    });

    // ---------- Step ----------
    function step() {
      if (dirQ.length) dir = dirQ.shift();
      prevSnake = snake.map(function (c) { return { x: c.x, y: c.y }; });
      var head = snake[0];
      var nx = (head.x + dir.x + COLS) % COLS, ny = (head.y + dir.y + ROWS) % ROWS;

      // portals
      if (portals) {
        for (var p = 0; p < 2; p++) {
          if (portals[p].x === nx && portals[p].y === ny) {
            var o = portals[1 - p];
            nx = (o.x + dir.x + COLS) % COLS; ny = (o.y + dir.y + ROWS) % ROWS;
            sfx.portal(); particles.burst(cx(o), cy(o), { n: 10, color: pal.ochre, speed: 1.4, life: 22, size: 2.4, kind: "ring" });
            particles.burst(cx(portals[p]), cy(portals[p]), { n: 8, color: pal.ochre, speed: 1.2, life: 18, size: 2 });
            break;
          }
        }
      }
      // tangle
      var tailIdx = growth > 0 ? snake.length : snake.length - 1; // the tail cell will move away unless we grow
      for (var i = 0; i < tailIdx; i++) {
        if (snake[i].x === nx && snake[i].y === ny) {
          if (powers.active("myelin")) break;
          die(); return;
        }
      }
      for (var b = 0; b < blocks.length; b++) { if (blocks[b].x === nx && blocks[b].y === ny) { die(); return; } }

      snake.unshift({ x: nx, y: ny });
      if (growth > 0) growth--; else snake.pop();

      var hx = nx, hy = ny, mult;
      if (spark && spark.x === hx && spark.y === hy) {
        mult = combo.hit();
        var pts = 10 * mult;
        score += pts; sparksEaten += 1; growth += 1;
        sfx.spark(mult); A.haptics.pop();
        particles.burst(cx(spark), cy(spark), { n: 9, color: [pal.ochre, pal.sageDeep, pal.surface], speed: 1.6, life: 20, size: 2.4, kind: ["dot", "leaf"] });
        floaters.spawn(cx(spark), cy(spark) - 10, "+" + pts + (mult > 1 ? " ×" + mult : ""), mult > 1 ? pal.forest : pal.inkSoft, { size: mult > 1 ? 12 : 10 });
        if (mult >= 3) camera.shake(0.12);
        placeSpark(); maybePlaceBook(); maybePlacePickup();
        story.advance(sparksEaten);
        syncHud(); shell.hud.flash("score");
      }
      if (book && book.x === hx && book.y === hy) {
        score += 50; growth += 2; book = null;
        sfx.book(); A.haptics.thump(); camera.shake(0.2);
        particles.burst(cx({ x: hx, y: hy }), cy({ x: hx, y: hy }), { n: 14, color: [pal.research, pal.surface, pal.sage], speed: 2, life: 26, size: 2.6, kind: "square", gravity: 0.05 });
        floaters.spawn(cx({ x: hx, y: hy }), cy({ x: hx, y: hy }) - 12, "Picture book +50", pal.research, { size: 11 });
        syncHud();
      }
      if (pickup && pickup.x === hx && pickup.y === hy) {
        var def = POWERUPS[pickup.id];
        runStats.powers += 1;
        sfx.power(); A.haptics.thump(); camera.shake(0.15);
        particles.burst(cx(pickup), cy(pickup), { n: 16, color: [pal[def.color], pal.surface], speed: 2.2, life: 26, size: 2.6, kind: ["ring", "dot"] });
        floaters.spawn(cx(pickup), cy(pickup) - 12, def.label, pal[def.color], { size: 13, font: "display" });
        if (pickup.id === "prune") {
          var drop = Math.min(3, snake.length - 4);
          for (var k = 0; k < drop; k++) { var t = snake.pop(); particles.burst(cx(t), cy(t), { n: 4, color: pal.sageDeep, speed: 1, life: 18, size: 2, kind: "leaf" }); }
          score += 15; shell.toast("Prune: three segments shorter", 1400);
        } else {
          powers.grant(pickup.id);
          if (pickup.id === "bridge") placePortals();
          shell.toast(def.label + ": " + def.text, 1600);
        }
        A.announce(def.label + ". " + def.text + ".");
        pickup = null;
      }
    }

    // ---------- Tick ----------
    function tick(dt) {
      time += dt;
      camera.tick(dt); particles.tick(dt); floaters.tick(dt); story.tick(dt);
      if (state === "dying") {
        deathTimer -= dt;
        if (deathTimer <= 0) gameOver();
        return;
      }
      if (state !== "running") return;
      if (camera.frozen()) return;
      combo.tick(dt); powers.tick(dt);
      shell.renderPips(powers.list(), pal);

      var speed = powers.active("focus") ? 0.6 : 1;
      moveTimer -= dt * speed;
      while (moveTimer <= 0 && state === "running") { step(); moveTimer += moveInterval; }

      if (book) { bookTimer -= dt; if (bookTimer <= 0) book = null; }
      if (pickup) { pickupTimer -= dt; if (pickupTimer <= 0) pickup = null; }
      if (!spark) placeSpark();

      // wandering distractions
      for (var i = 0; i < blocks.length; i++) {
        var bl = blocks[i]; if (!bl.mover) continue;
        bl.t -= dt * speed;
        if (bl.t <= 0) {
          bl.t = 46;
          var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          var d = dirs[Math.floor(Math.random() * 4)];
          var nx = (bl.x + d[0] + COLS) % COLS, ny = (bl.y + d[1] + ROWS) % ROWS;
          var head = snake[0];
          var tooClose = Math.abs(nx - head.x) + Math.abs(ny - head.y) < 3;
          if (!tooClose && !occupied(nx, ny)) { bl.x = nx; bl.y = ny; }
        }
      }
    }

    // ---------- Render ----------
    function segPos(i, t) {
      var c = snake[i], p = prevSnake[i];
      if (!p) return { x: cx(c), y: cy(c) };
      if (Math.abs(c.x - p.x) > 1 || Math.abs(c.y - p.y) > 1) return { x: cx(c), y: cy(c) }; // wrapped: no lerp
      return { x: cx(p) + (cx(c) - cx(p)) * t, y: cy(p) + (cy(c) - cy(p)) * t };
    }
    function render() {
      cv.begin(camera);
      draw.paper(ctx, W, H, pal, { step: CELL, dot: 1 });

      // field frame: a quiet rule just inside the edge
      ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      var t = state === "running" ? clamp(1 - moveTimer / moveInterval, 0, 1) : 1;
      var dying = state === "dying";
      var dyingFrac = dying ? clamp(deathTimer / 54, 0, 1) : 1;

      // portals
      if (portals) {
        for (var p = 0; p < 2; p++) {
          var px = cx(portals[p]), py = cy(portals[p]);
          var spin = time * 0.05 + p * Math.PI;
          ctx.save(); ctx.translate(px, py); ctx.rotate(spin);
          draw.circle(ctx, 0, 0, CELL * 0.42, { fill: pal.alpha(pal.ochre, 0.18), stroke: pal.ochre, lineWidth: 1.6 });
          draw.dashes(ctx, -CELL * 0.3, 0, CELL * 0.3, 0, 3, 3, { stroke: pal.ochre, lineWidth: 1.4 });
          draw.dashes(ctx, 0, -CELL * 0.3, 0, CELL * 0.3, 3, 3, { stroke: pal.ochre, lineWidth: 1.4 });
          ctx.restore();
          var frac = powers.frac("bridge");
          draw.ring(ctx, px, py, CELL * 0.46, frac, { stroke: pal.ink, lineWidth: 1.2 });
        }
      }

      // distractions: small clay-rimmed blocks with an X
      for (var b = 0; b < blocks.length; b++) {
        var bl = blocks[b], bx = bl.x * CELL, by = bl.y * CELL;
        var wob = bl.mover && !reduce ? Math.sin(time * 0.15 + b) * 1.2 : 0;
        draw.box(ctx, bx + 3, by + 3 + wob, CELL - 6, CELL - 6, 4, { fill: pal.surface, stroke: pal.clay, lineWidth: 1.5, shadow: 2, shadowColor: pal.shadow });
        ctx.strokeStyle = pal.clay; ctx.lineWidth = 1.6; ctx.beginPath();
        ctx.moveTo(bx + 7, by + 7 + wob); ctx.lineTo(bx + CELL - 7, by + CELL - 7 + wob);
        ctx.moveTo(bx + CELL - 7, by + 7 + wob); ctx.lineTo(bx + 7, by + CELL - 7 + wob); ctx.stroke();
      }

      // picture book
      if (book) {
        var bkx = book.x * CELL, bky = book.y * CELL;
        var blink = bookTimer < 90 && !reduce && Math.floor(bookTimer / 8) % 2 === 0;
        if (!blink) {
          draw.box(ctx, bkx + 3, bky + 4, CELL - 6, CELL - 8, 2, { fill: pal.research, stroke: pal.ink, lineWidth: 1.3, shadow: 2, shadowColor: pal.shadow });
          ctx.fillStyle = pal.surface; ctx.fillRect(bkx + CELL / 2 - 0.6, bky + 5, 1.2, CELL - 10);
          ctx.strokeStyle = pal.alpha(pal.surface, 0.8); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(bkx + 6, bky + 9); ctx.lineTo(bkx + CELL / 2 - 3, bky + 9); ctx.moveTo(bkx + 6, bky + 12); ctx.lineTo(bkx + CELL / 2 - 3, bky + 12); ctx.stroke();
        }
      }

      // power-up pickup: coloured disc with its initial
      if (pickup) {
        var def = POWERUPS[pickup.id], col = pal[def.color];
        var pux = cx(pickup), puy = cy(pickup) + (reduce ? 0 : Math.sin(time * 0.12) * 1.5);
        var fade = pickupTimer < 90 && !reduce && Math.floor(pickupTimer / 8) % 2 === 0;
        if (!fade) {
          draw.circle(ctx, pux, puy, CELL * 0.42, { fill: col, stroke: pal.ink, lineWidth: 1.5, shadow: 2.5, shadowColor: pal.shadow });
          draw.circle(ctx, pux, puy, CELL * 0.42 + 3 + (reduce ? 0 : Math.sin(time * 0.1) * 1.5), { stroke: pal.alpha(col, 0.5), lineWidth: 1.2 });
          draw.label(ctx, def.label.charAt(0), pux, puy + 0.5, { font: "display", size: 13, color: pal.surface, weight: 600 });
        }
      }

      // spark
      if (spark) {
        var sbob = reduce ? 0 : Math.sin(time * 0.1 + spark.bob) * 1.4;
        var glowR = CELL * 0.6 + (reduce ? 0 : Math.sin(time * 0.08 + spark.bob) * 2);
        ctx.fillStyle = pal.alpha(pal.ochre, pal.isDark ? 0.22 : 0.16);
        ctx.beginPath(); ctx.arc(cx(spark), cy(spark) + sbob, glowR, 0, Math.PI * 2); ctx.fill();
        draw.seed(ctx, cx(spark), cy(spark) + sbob, CELL * 0.3, pal);
      }

      // the pathway
      var n = snake.length;
      var pos = [];
      for (var i = 0; i < n; i++) pos.push(segPos(i, t));
      var myelin = powers.active("myelin");
      var bodyFill = myelin ? pal.research : pal.forest;
      var baseR = CELL * 0.4;
      function radiusAt(i) { var k = n > 6 ? Math.max(0, (i - (n - 6)) / 6) : i / Math.max(1, n); return baseR * (1 - 0.55 * k); }
      function connected(i) { var a = pos[i], c = pos[i + 1]; return c && Math.abs(a.x - c.x) <= CELL * 1.5 && Math.abs(a.y - c.y) <= CELL * 1.5; }
      ctx.save();
      if (dying) ctx.globalAlpha = 0.35 + 0.65 * dyingFrac;
      // glow trail when myelin is on
      if (myelin) {
        ctx.strokeStyle = pal.alpha(pal.research, 0.22);
        for (var g = 0; g < n - 1; g++) { if (!connected(g)) continue; ctx.lineWidth = radiusAt(g) * 2 + 10; ctx.beginPath(); ctx.moveTo(pos[g].x, pos[g].y); ctx.lineTo(pos[g + 1].x, pos[g + 1].y); ctx.stroke(); }
      }
      // shadow pass
      ctx.fillStyle = pal.shadow; ctx.strokeStyle = pal.shadow;
      for (var s1 = 0; s1 < n; s1++) {
        var r1 = radiusAt(s1);
        if (connected(s1)) { ctx.lineWidth = r1 * 2; ctx.beginPath(); ctx.moveTo(pos[s1].x, pos[s1].y + 2.5); ctx.lineTo(pos[s1 + 1].x, pos[s1 + 1].y + 2.5); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(pos[s1].x, pos[s1].y + 2.5, r1, 0, Math.PI * 2); ctx.fill();
      }
      // ink pass
      ctx.fillStyle = pal.ink; ctx.strokeStyle = pal.ink;
      for (var s2 = 0; s2 < n; s2++) {
        var r2 = radiusAt(s2) + 1.5;
        if (connected(s2)) { ctx.lineWidth = r2 * 2; ctx.beginPath(); ctx.moveTo(pos[s2].x, pos[s2].y); ctx.lineTo(pos[s2 + 1].x, pos[s2 + 1].y); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(pos[s2].x, pos[s2].y, r2, 0, Math.PI * 2); ctx.fill();
      }
      // fill pass
      ctx.fillStyle = bodyFill; ctx.strokeStyle = bodyFill;
      for (var s3 = 0; s3 < n; s3++) {
        var r3 = radiusAt(s3);
        if (connected(s3)) { ctx.lineWidth = r3 * 2; ctx.beginPath(); ctx.moveTo(pos[s3].x, pos[s3].y); ctx.lineTo(pos[s3 + 1].x, pos[s3 + 1].y); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(pos[s3].x, pos[s3].y, r3, 0, Math.PI * 2); ctx.fill();
      }
      // a lighter spine along the top edge, so the body reads as a rounded tube
      ctx.strokeStyle = myelin ? pal.alpha(pal.surface, 0.5) : pal.alpha(pal.sage, pal.isDark ? 0.5 : 0.7);
      for (var s5 = 0; s5 < n - 1; s5++) {
        if (!connected(s5)) continue;
        var r5 = radiusAt(s5);
        ctx.lineWidth = Math.max(1, r5 * 0.42);
        ctx.beginPath(); ctx.moveTo(pos[s5].x, pos[s5].y - r5 * 0.38); ctx.lineTo(pos[s5 + 1].x, pos[s5 + 1].y - radiusAt(s5 + 1) * 0.38); ctx.stroke();
      }
      // myelin sheath marks: a sage bead every other segment
      ctx.fillStyle = myelin ? pal.alpha(pal.surface, 0.85) : pal.sageMist;
      for (var s4 = 2; s4 < n; s4 += 2) { var r4 = radiusAt(s4) * 0.3; ctx.beginPath(); ctx.arc(pos[s4].x, pos[s4].y + 1, r4, 0, Math.PI * 2); ctx.fill(); }
      // head: a touch larger, with a sprout leaf and eyes that look where it goes
      var hd = pos[0], hr = baseR * 1.18;
      ctx.beginPath(); ctx.arc(hd.x, hd.y + 2.5, hr + 1.5, 0, Math.PI * 2); ctx.fillStyle = pal.shadow; ctx.fill();
      ctx.beginPath(); ctx.arc(hd.x, hd.y, hr + 1.5, 0, Math.PI * 2); ctx.fillStyle = pal.ink; ctx.fill();
      ctx.beginPath(); ctx.arc(hd.x, hd.y, hr, 0, Math.PI * 2); ctx.fillStyle = myelin ? pal.research : pal.forest; ctx.fill();
      ctx.beginPath(); ctx.arc(hd.x - hr * 0.25, hd.y - hr * 0.3, hr * 0.45, 0, Math.PI * 2); ctx.fillStyle = pal.alpha(pal.sage, 0.35); ctx.fill();
      var leafAng = -Math.PI / 2 - 0.55 + (dir.x * 0.35);
      draw.leaf(ctx, hd.x - dir.x * 2, hd.y - hr * 0.95, CELL * 0.55, leafAng, { fill: pal.sageDeep, stroke: pal.ink, lineWidth: 1.1 });
      var eyeGap = dir.x !== 0 ? CELL * 0.3 : CELL * 0.52;
      var eyeOffX = dir.x * CELL * 0.16, eyeOffY = dir.y * CELL * 0.16;
      var blinkNow = !reduce && (Math.floor(time / 90) % 7 === 0) && (time % 90) < 6 ? 1 : 0;
      if (dir.x !== 0) draw.eyes(ctx, hd.x + eyeOffX, hd.y - CELL * 0.06, eyeGap, CELL * 0.14, dir.x, 0, pal, { blink: blinkNow });
      else draw.eyes(ctx, hd.x, hd.y + eyeOffY, eyeGap, CELL * 0.14, 0, dir.y, pal, { blink: blinkNow });
      ctx.restore();

      // combo meter under the head when a chain is live
      if (combo.active() && combo.mult() > 1 && state === "running") {
        var cf = combo.frac();
        draw.pill(ctx, hd.x - 14, hd.y + hr + 5, 28, 4, { fill: pal.alpha(pal.ink, 0.12) });
        draw.pill(ctx, hd.x - 14, hd.y + hr + 5, 28 * cf, 4, { fill: pal.forest });
      }

      particles.render(ctx);
      floaters.render(ctx);

      // chapter banner
      var bn = story.banner();
      if (bn && state === "running") {
        var a = Math.min(1, bn.frac * 3) * Math.min(1, (1 - bn.frac) * 6 + 0.2);
        ctx.save(); ctx.globalAlpha = a;
        var ty = 26 + (reduce ? 0 : (1 - Math.min(1, (1 - bn.frac) * 4)) * -10);
        draw.label(ctx, bn.name, W / 2, ty, { font: "display", size: 26, color: pal.ink, weight: 500 });
        draw.label(ctx, bn.text, W / 2, ty + 22, { size: 11, color: pal.inkMuted, weight: 500 });
        ctx.restore();
      }

      // field progress along the bottom rule
      if (state === "running" || state === "paused") {
        var prog = story.progress(sparksEaten);
        ctx.fillStyle = pal.alpha(pal.forest, 0.55); ctx.fillRect(0, H - 2, W * prog, 2);
      }

      cv.end();
    }

    var loop = A.makeLoop(tick, render);

    function onHidden() { if (state === "running") pause(); }

    A.debug("snake", {
      state: function () { return state; },
      die: die,
      grant: function (id) { powers.grant(id); if (id === "bridge") placePortals(); },
      eat: function (n) { for (var i = 0; i < (n || 1); i++) { if (!spark) placeSpark(); var h = snake[0]; var d = dir; spark.x = (h.x + d.x + COLS) % COLS; spark.y = (h.y + d.y + ROWS) % ROWS; moveTimer = 0; tick(0.01); } },
      score: function () { return score; }
    });

    return {
      held: input.held,
      activate: function () {
        pal = A.theme();
        cv.fit();
        layoutField();
        state = "idle"; resetWorld();
        render();
        loop.start();
        unsubHidden = A.onHidden(onHidden);
        showStart();
      },
      // The phone turned: a run pauses (the field refits as is); an idle
      // field is laid out again for the new shape.
      onViewport: function () {
        if (state === "running") pause();
        else if (state === "idle") { layoutField(); resetWorld(); render(); }
      },
      deactivate: function () {
        loop.stop();
        if (unsubHidden) { unsubHidden(); unsubHidden = null; }
        wake.release();
        synth.close();
        input.release();
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
    A.defineGame("snake", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Synapse Snake",
        tagline: "Link the sparks. Grow the pathway.",
        label: "Synapse Snake game",
        canvas: { w: W, h: H, label: "Synapse Snake play field" },
        hud: [{ id: "score", label: "Score", value: 0 }, { id: "best", label: "Best", value: A.leaderboard.best(GAME_KEY) }, { id: "sparks", label: "Sparks", value: 0 }, { id: "field", label: "Field", value: "Crib" }],
        help: "Arrows or WASD steer · swipe on the field · Space starts and pauses · M mutes · Esc closes",
        touch: [
          { id: "left", label: "◀", aria: "Turn left", tap: true },
          { id: "up", label: "▲", aria: "Turn up", tap: true },
          { id: "down", label: "▼", aria: "Turn down", tap: true },
          { id: "right", label: "▶", aria: "Turn right", tap: true },
          { id: "pause", label: "Pause", aria: "Pause or resume", tap: true }
        ]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
