/* Growing Minds Science — breakout-game.js
   "Myth Buster" on the Arcade page: a card-breaker. The wall is a pinboard of
   index cards, and the double-wide ones carry common parenting myths. Bounce
   the ball off a wooden ruler to bust them. A myth card cracks on the first
   hit; on the second it flips over to show a short, plain truth, then falls
   away. Eight walls, each a family of myths, end in a boss card that moves.

   Core v2 game (see docs/arcade/game-brief.md): reads the live brand tokens
   through A.theme(), draws through the shell's canvas, uses makeShell for the
   overlay, makeStory for the walls, makePowerups for timed effects and
   runSummary for the end card. CSP-safe: no eval, no external assets, audio
   is the shared Web Audio synth. Honors prefers-reduced-motion.

   Power-ups: Calm (the ball slows, research blue), Patience (a wider ruler,
   sage), Curiosity (the ball splits, ochre), Sticky (catch and aim, forest),
   Pointed Question (Space fires a bolt that busts one card, clay, 3 uses),
   Magnet (the ball bends toward the ruler, research blue). They last through
   a lost ball and clear when the wall does.

   Collision: the ball moves in sub-steps no longer than half its radius, so
   a fast ball never tunnels through a card, and it can hit several cards in
   one frame.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "myth-buster";
  var MUTE_KEY = "gms-breakout-muted";

  // ---------- Field ----------
  // Landscape 480 x 320 with eight columns; a portrait phone gets 320 x 480
  // with the same rows and six columns (chosen when the game opens).
  var W = 480, H = 320, COLS = 8, BRICK_W = 52, FIELD_X = 18, FIELD_Y = 56, PADDLE_Y = 292, PADDLE_W = 80;
  var BRICK_H = 20, GAP = 4, ROW_H = 25, PADDLE_H = 10, R = 4.5;
  var BOSS_H = 40;
  function setField(portrait) {
    var margin;
    if (portrait) { W = 320; H = 480; COLS = 6; margin = 12; PADDLE_W = 72; FIELD_Y = 76; }
    else { W = 480; H = 320; COLS = 8; margin = 18; PADDLE_W = 80; FIELD_Y = 56; }
    BRICK_W = Math.floor((W - margin * 2 - (COLS - 1) * GAP) / COLS);
    FIELD_X = Math.round((W - (COLS * BRICK_W + (COLS - 1) * GAP)) / 2);
    PADDLE_Y = H - 28;
  }
  function fieldW() { return COLS * BRICK_W + (COLS - 1) * GAP; }

  // ---------- Speed curve (the old one, scaled to the larger field) ----------
  var SPEED_SCALE = 1.6;
  function wallSpeed(wall) { return Math.min(2.1 + (wall - 1) * 0.25, 3.2) * SPEED_SCALE; }
  var SPEED_STEP = 0.045 * SPEED_SCALE, SPEED_MAX = 3.6 * SPEED_SCALE;

  // ---------- Myths and truths ----------
  var MYTHS = ["spoiling", "sugar high", "terrible 2s", "just a phase", "genius apps", "too young", "bad habits", "cry it out"];
  var TRUTHS = {
    "spoiling": "Responding builds trust",
    "sugar high": "Studies don't find a sugar high",
    "terrible 2s": "Big feelings, small bodies",
    "just a phase": "Phases still deserve support",
    "genius apps": "Talk beats apps",
    "too young": "Learning starts at birth",
    "bad habits": "Habits can change",
    "cry it out": "Comfort isn't a habit",
    "perfect parent": "Good enough is good enough"
  };
  var BOSS_MYTH = "perfect parent";

  // ---------- Story: eight walls, each a family of myths ----------
  var CHAPTERS = [
    { name: "Sleep", at: 1, text: "Myths about nights and naps.", myths: ["cry it out", "spoiling", "bad habits"] },
    { name: "Food", at: 2, text: "Myths from the kitchen table.", myths: ["sugar high", "bad habits", "just a phase"] },
    { name: "Feelings", at: 3, text: "Myths about big feelings.", myths: ["terrible 2s", "just a phase", "spoiling"] },
    { name: "Screens", at: 4, text: "Myths about apps and screens.", myths: ["genius apps", "too young", "just a phase"] },
    { name: "Play", at: 5, text: "Myths about how play teaches.", myths: ["genius apps", "bad habits", "too young"] },
    { name: "Talk", at: 6, text: "Myths about first words.", myths: ["too young", "genius apps", "cry it out"] },
    { name: "Limits", at: 7, text: "Myths about rules and kindness.", myths: ["spoiling", "terrible 2s", "bad habits"] },
    { name: "The Boss Wall", at: 8, text: "One big myth. It moves. Six hits.", myths: ["cry it out", "sugar high"], boss: true }
  ];

  var POWERUPS = {
    calm: { label: "Calm", color: "research", duration: 360, text: "The ball slows down" },
    patience: { label: "Patience", color: "sage", duration: 600, text: "A wider ruler" },
    curiosity: { label: "Curiosity", color: "ochre", duration: 1, text: "The ball splits" },
    sticky: { label: "Sticky", color: "forest", duration: 720, text: "Catch the ball, then aim. Space lets go" },
    question: { label: "Question", name: "Pointed Question", color: "clay", uses: 3, text: "Space fires a question that busts a card" },
    magnet: { label: "Magnet", color: "research", duration: 480, text: "The ball bends toward the ruler" }
  };
  var POWER_ORDER = ["calm", "patience", "curiosity", "sticky", "question", "magnet"];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ---------- Layouts ----------
  // Each returns bricks { c, r, span, hp, myth }. Written against COLS so the
  // portrait field gets the same shapes with fewer columns. The first four are
  // the old game's walls; arch and split are new. The boss wall is its own.
  function layoutFor(idx, mythList) {
    var bricks = [];
    var bag = mythList.slice();
    function nextMyth() {
      if (bag.length) return bag.shift();
      return MYTHS[Math.floor(Math.random() * MYTHS.length)];
    }
    function myth(c, r) { bricks.push({ c: c, r: r, span: 2, hp: 2, myth: nextMyth() }); }
    function plain(c, r) { bricks.push({ c: c, r: r, span: 1, hp: 1 }); }
    function drop(fn) { bricks = bricks.filter(function (b) { return !fn(b); }); }
    var c, r, mid = Math.floor(COLS / 2) - 1;
    if (idx === 0) {
      // Full wall, two myths seeded mid-field.
      for (r = 0; r < 4; r++) for (c = 0; c < COLS; c++) plain(c, r);
      drop(function (b) { return b.r === 2 && (b.c === 1 || b.c === 2 || b.c === COLS - 3 || b.c === COLS - 2); });
      myth(1, 2); myth(COLS - 3, 2);
    } else if (idx === 1) {
      // Checkerboard with a myth beam across the top.
      for (c = 0; c + 1 < COLS; c += 3) myth(c, 0);
      for (r = 1; r < 5; r++) for (c = 0; c < COLS; c++) { if ((c + r) % 2 === 0) plain(c, r); }
    } else if (idx === 2) {
      // Pyramid; myths form the base corners and a keystone below.
      for (r = 0; r < 4; r++) for (c = r; c < COLS - r; c++) plain(c, 3 - r);
      drop(function (b) { return b.r === 3 && (b.c <= 1 || b.c >= COLS - 2); });
      myth(0, 3); myth(COLS - 2, 3); myth(mid, 4);
    } else if (idx === 3) {
      // Fortress: a hollow centre guarded by myth lintels.
      for (r = 0; r < 5; r++) for (c = 0; c < COLS; c++) {
        if (r >= 1 && r <= 3 && c >= 2 && c <= COLS - 3) continue;
        plain(c, r);
      }
      drop(function (b) { return b.r === 2 && (b.c <= 1 || b.c >= COLS - 2); });
      myth(0, 2); myth(COLS - 2, 2); myth(mid, 2);
    } else if (idx === 4) {
      // Arch: a two-row lintel with a keystone myth, two pillars, myth feet.
      for (r = 0; r < 2; r++) for (c = 0; c < COLS; c++) {
        if (r === 0 && (c === mid || c === mid + 1)) continue;
        plain(c, r);
      }
      myth(mid, 0);
      for (r = 2; r < 4; r++) { plain(0, r); plain(1, r); plain(COLS - 2, r); plain(COLS - 1, r); }
      plain(2, 2); plain(COLS - 3, 2);
      myth(0, 4); myth(COLS - 2, 4);
    } else {
      // Split wall: two blocks with myths stacked in the gap between them.
      for (r = 0; r < 5; r++) for (c = 0; c < COLS; c++) {
        if (c === mid || c === mid + 1) continue;
        plain(c, r);
      }
      myth(mid, 1); myth(mid, 3);
    }
    return bricks;
  }
  function bossLayout(mythList) {
    var bricks = [];
    for (var c = 0; c < COLS; c += 2) bricks.push({ c: c + 1, r: 3, span: 1, hp: 1 });
    bricks.push({ c: 0, r: 4, span: 2, hp: 2, myth: mythList[0] });
    bricks.push({ c: COLS - 2, r: 4, span: 2, hp: 2, myth: mythList[1] });
    bricks.push({ boss: true, hp: 6, myth: BOSS_MYTH });
    return bricks;
  }

  // ======================================================================
  //  Game
  // ======================================================================
  function createGame(shell) {
    var cv = shell.canvas, ctx = cv.ctx, draw = A.draw;
    var pal = A.theme();
    var offTheme = A.onThemeChange(function (p) { pal = p; });
    var reduce = A.prefersReducedMotion();

    var camera = A.makeCamera({ reduce: reduce, maxPx: 4 });
    var combo = A.makeCombo({ window: 150, max: 5 });
    var particles = A.makeParticles({ cap: 120, reduce: reduce });
    var floaters = A.makeFloaters({ cap: 12, reduce: reduce });
    var wake = A.makeWakeLock();
    var unsubHidden = null;
    var synth = A.makeSynth({ muteKey: MUTE_KEY });
    shell.bindSynth(synth);

    var story = A.makeStory(CHAPTERS, { bannerFrames: 170 });
    var powers = A.makePowerups(POWERUPS, { onExpire: onPowerExpire });

    var state = "idle"; // idle | running | paused | dying | gameover
    var wall, lives, score, best, time;
    var paddleCX, balls, bricks, flips, drops, bolts;
    var wallTotal, clearT, deathTimer, boltCool, bossT;
    var runStats;
    var touchLastX = null;
    var buzzed = false; // haptic budget: one card pop per frame, multiball included

    best = A.leaderboard.best(GAME_KEY);

    // ---------- Audio ----------
    var sfx = {
      paddle: function () { synth.beep(220, 330, 0.05, "square", 0.32); },
      wall: function () { synth.beep(170, 160, 0.035, "square", 0.2); },
      card: function (chain) { var c = Math.min(chain || 0, 14); synth.beep(480 + c * 70, 660 + c * 70, 0.06, "triangle", 0.42); },
      crack: function () { synth.beep(320, 240, 0.07, "square", 0.34); },
      bust: function (chain) { var c = Math.min(chain || 0, 12); synth.beep(520 + c * 60, 1040 + c * 60, 0.18, "triangle", 0.48); synth.noise(0.14, 1600, 0.24); },
      boss: function () { synth.beep(260, 180, 0.12, "sawtooth", 0.3); synth.noise(0.1, 700, 0.22); },
      drop: function () { synth.arp([659, 880, 1318], 0.045, 0.12, "triangle", 0.4); },
      bolt: function () { synth.beep(900, 1400, 0.07, "triangle", 0.3); },
      catchIt: function () { synth.beep(300, 260, 0.05, "sine", 0.3); },
      lose: function () { synth.beep(220, 70, 0.3, "sawtooth", 0.5); synth.noise(0.3, 900, 0.36); },
      chainBroken: function () { synth.beep(440, 150, 0.16, "square", 0.28); },
      level: function () { synth.arp([523, 659, 784, 988], 0.09, 0.2, "triangle", 0.44); }
    };

    // ---------- Geometry ----------
    function paddleW() { return PADDLE_W * (powers.active("patience") ? 1.5 : 1); }
    function paddleX() { return paddleCX - paddleW() / 2; }
    function clampPaddle() { var hw = paddleW() / 2; paddleCX = clamp(paddleCX, hw + 2, W - hw - 2); }
    function placeBrick(b) {
      if (b.boss) {
        b.w = 3 * BRICK_W + 2 * GAP; b.h = BOSS_H; b.y = FIELD_Y;
        b.x = FIELD_X + (fieldW() - b.w) / 2;
        return;
      }
      b.x = FIELD_X + b.c * (BRICK_W + GAP);
      b.y = FIELD_Y + b.r * ROW_H;
      b.w = BRICK_W * b.span + GAP * (b.span - 1);
      b.h = BRICK_H;
    }
    function tintFor(r) {
      var k = r % 4;
      return k === 0 ? pal.sageMist : k === 1 ? pal.sage : k === 2 ? pal.sageDeep : pal.forest;
    }

    // ---------- World ----------
    function resetWorld() {
      wall = 1; lives = 3; score = 0; time = 0;
      paddleCX = W / 2;
      flips = []; drops = []; bolts = [];
      clearT = 0; deathTimer = 0; boltCool = 0; bossT = 0;
      combo.reset(true); powers.clear(); story.reset();
      particles.clear(); floaters.clear();
      runStats = { chapter: 0, myths: 0, powers: 0, boss: false };
      buildWall();
      spawnBall();
      syncHud();
    }
    function buildWall() {
      var ch = CHAPTERS[(wall - 1) % CHAPTERS.length];
      bricks = ch.boss ? bossLayout(ch.myths) : layoutFor((wall - 1) % 6, ch.myths);
      for (var i = 0; i < bricks.length; i++) { placeBrick(bricks[i]); bricks[i].maxHp = bricks[i].hp; bricks[i].cracks = []; bricks[i].hitT = 0; }
      wallTotal = bricks.length;
      drops = []; bolts = [];
      bossT = 0;
    }
    function spawnBall() {
      balls = [{ x: paddleCX, y: PADDLE_Y - R - 0.5, vx: 0, vy: 0, stuck: true, off: 0, caught: false, speed: wallSpeed(wall), trail: [] }];
    }
    function enterWall(announce) {
      var idx = (wall - 1) % CHAPTERS.length;
      // Story on wall number: the first lap advances through the chapters;
      // later laps (after the boss) set the chapter directly.
      if (!(wall <= CHAPTERS.length && story.advance(wall))) story.set(idx);
      runStats.chapter = Math.max(runStats.chapter, Math.min(wall - 1, CHAPTERS.length - 1));
      var ch = CHAPTERS[idx];
      if (announce) A.announce("Wall " + wall + ", " + ch.name + ". " + ch.text);
    }

    function syncHud() {
      shell.hud.set("score", Math.floor(score));
      shell.hud.set("best", Math.max(best, Math.floor(score)));
      shell.hud.set("wall", wall);
      shell.hud.set("lives", lives);
    }

    // ---------- Flow ----------
    function showStart() {
      var p = A.progress.get(GAME_KEY);
      shell.prompt.show({
        kicker: "Myth Buster",
        title: p.plays ? "Back to the wall" : "Bust the myths, card by card.",
        text: "Move the ruler with the mouse, the arrow keys or a drag. Space, a click or a tap launches the ball. Myth cards take two hits, then flip to show what is true.",
        actions: [{ label: "Start", primary: true, onClick: start }],
        board: p.plays ? function (m) { A.renderLeaderboard(m, GAME_KEY, {}); } : null
      });
    }
    function start() {
      synth.ensure();
      resetWorld();
      state = "running";
      shell.prompt.hide();
      wake.acquire();
      enterWall(false);
      shell.setHelp("Mouse, arrows or drag move · Space, click or tap launches · P pauses · M mutes · Esc closes");
      A.announce("Go. Wall one, Sleep. " + CHAPTERS[0].text);
      try { cv.el.focus({ preventScroll: true }); } catch (e) {}
    }
    function pause() {
      if (state !== "running") return;
      state = "paused";
      wake.release();
      input.release();
      shell.prompt.show({ kicker: "Paused", title: CHAPTERS[story.index()].name, text: "The myths will wait. Score " + Math.floor(score) + " · wall " + wall + " · " + lives + (lives === 1 ? " ball" : " balls") + " left.",
        actions: [{ label: "Resume", primary: true, onClick: resume }, { label: "Quit", onClick: function () { A.closeGame(); } }], compact: true });
    }
    function resume() {
      if (state !== "paused") return;
      synth.ensure();
      state = "running"; shell.prompt.hide(); wake.acquire();
      try { cv.el.focus({ preventScroll: true }); } catch (e) {}
    }
    function gameOver() {
      state = "gameover";
      wake.release();
      var final = Math.floor(score);
      var placed = final > 0 && final >= best;
      if (final > best) best = final;
      A.progress.record(GAME_KEY, { score: final, chapter: runStats.chapter, badges: runStats.boss ? ["boss-wall"] : [] });
      syncHud();
      var ch = CHAPTERS[story.index()];
      shell.prompt.show({
        kicker: "The wall held, this time",
        title: placed ? "A new best: " + final : "Score " + final,
        text: "You reached wall " + wall + ", " + ch.name + ", and busted " + runStats.myths + (runStats.myths === 1 ? " myth." : " myths."),
        board: function (m) {
          A.runSummary(m, { gameKey: GAME_KEY, score: final, lines: [["Wall", wall + " · " + ch.name], ["Myths busted", runStats.myths], ["Best chain", combo.best() + "x"], ["Power-ups", runStats.powers]],
            onSaved: function () { best = A.leaderboard.best(GAME_KEY); syncHud(); } });
        },
        actions: [{ label: "Play again", primary: true, onClick: start }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
      A.announce("Game over. Score " + final + ".");
    }

    // ---------- Actions ----------
    function launchBalls() {
      var any = false;
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i];
        if (!b.stuck) continue;
        b.stuck = false;
        var rel = clamp(b.off / (paddleW() / 2), -1, 1);
        var a = b.caught ? -Math.PI / 2 + rel * (Math.PI * 0.36) : -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
        b.vx = Math.cos(a) * b.speed; b.vy = Math.sin(a) * b.speed;
        b.caught = false; b.off = 0;
        any = true;
      }
      if (any) { sfx.paddle(); A.haptics.tick(); }
      return any;
    }
    function fireBolt() {
      if (boltCool > 0 || !powers.active("question")) return false;
      powers.use("question");
      bolts.push({ x: paddleCX, y: PADDLE_Y - 4 });
      boltCool = 14;
      sfx.bolt(); A.haptics.tick();
      return true;
    }
    function act() {
      if (state === "idle" || state === "gameover") { start(); return; }
      if (state === "paused") { resume(); return; }
      if (state !== "running") return;
      synth.ensure();
      if (!launchBalls()) fireBolt();
    }
    function togglePause() {
      if (state === "running") pause();
      else if (state === "paused") resume();
      else if (state === "idle" || state === "gameover") start();
    }

    // ---------- Input ----------
    var input = A.makeInput(cv.el, {
      canvas: cv,
      keys: { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", " ": "action", ArrowUp: "action", w: "action", Enter: "action", p: "pause" },
      onAction: function (a, repeat, e) {
        if (e && e.preventDefault) e.preventDefault();
        if (repeat) return;
        if (a === "action") act();
        else if (a === "pause") togglePause();
      },
      onMove: function (p, e) {
        if (!e || e.pointerType !== "mouse" || state !== "running") return;
        paddleCX = p.x; clampPaddle();
      },
      onDown: function (p, e) {
        touchLastX = p.x;
        if (e && e.pointerType === "mouse") act();
      },
      // Touch steers relative, touchpad-style: the ruler moves by the finger's
      // travel, so a thumb never has to cover it.
      onDrag: function (p, d, e) {
        if (!e || e.pointerType === "mouse" || touchLastX == null) return;
        if (state === "running") { paddleCX += (p.x - touchLastX) * 1.4; clampPaddle(); }
        touchLastX = p.x;
      },
      onUp: function () { touchLastX = null; },
      onTap: function (p, e) { if (e && e.pointerType !== "mouse") act(); }
    });
    shell.onTap(function (id) {
      if (id === "launch") act();
      else if (id === "pause") togglePause();
    });

    // ---------- Power-ups ----------
    function onPowerExpire(id) {
      if (id === "sticky") {
        var caught = balls.some(function (b) { return b.caught; });
        if (caught) launchBalls();
      }
      if (id === "patience") clampPaddle();
    }
    function splitBalls() {
      var free = balls.filter(function (b) { return !b.stuck; });
      if (!free.length) { launchBalls(); free = balls.slice(); }
      var extra = [];
      for (var i = 0; i < free.length && balls.length + extra.length < 4; i++) {
        var b = free[i];
        for (var s = -1; s <= 1 && balls.length + extra.length < 4; s += 2) {
          var a = Math.atan2(b.vy, b.vx) + s * 0.5;
          extra.push({ x: b.x, y: b.y, vx: Math.cos(a) * b.speed, vy: Math.sin(a) * b.speed, stuck: false, off: 0, caught: false, speed: b.speed, trail: [] });
        }
      }
      for (var k = 0; k < extra.length; k++) { steady(extra[k]); balls.push(extra[k]); }
    }
    function applyPower(id, x, y) {
      var def = POWERUPS[id];
      runStats.powers += 1;
      sfx.drop(); A.haptics.thump();
      particles.burst(x, y, { n: 14, color: [pal[def.color], pal.surface], speed: 2, life: 24, size: 2.4, kind: ["ring", "dot"] });
      floaters.spawn(x, y - 12, def.name || def.label, pal[def.color] === pal.sage ? pal.sageDeep : pal[def.color], { size: 13, font: "display" });
      if (id === "curiosity") splitBalls();
      else powers.grant(id, def.uses || 1);
      if (id === "patience") clampPaddle();
      shell.toast((def.name || def.label) + ": " + def.text, 1700);
      A.announce((def.name || def.label) + ". " + def.text + ".");
    }
    function maybeDrop(x, y, chance) {
      if (Math.random() >= chance) return;
      var pool = POWER_ORDER.filter(function (id) { return !(id === "curiosity" && balls.length >= 4); });
      drops.push({ x: x, y: y, id: pool[Math.floor(Math.random() * pool.length)], bob: Math.random() * 6 });
    }

    // ---------- Cards ----------
    function addCrack(br) {
      var cx = br.x + br.w * (0.25 + Math.random() * 0.5);
      br.cracks.push({ x: cx - br.x, k: Math.random() < 0.5 ? -1 : 1 });
    }
    function damage(br, full) {
      if (br.boss) {
        br.hp -= 1; br.hitT = reduce ? 0 : 8;
        addCrack(br);
        score += 30 * combo.mult();
        sfx.boss(); camera.shake(0.3);
        floaters.spawn(br.x + br.w / 2, br.y + br.h + 8, br.hp > 0 ? br.hp + " to go" : "busted", pal.clayText, { size: 11 });
        maybeDrop(br.x + br.w / 2, br.y + br.h, 0.35);
        if (br.hp <= 0) bust(br);
        return;
      }
      br.hp = full ? 0 : br.hp - 1;
      if (br.hp > 0) {
        if (!br.cracks.length) addCrack(br);
        br.hitT = reduce ? 0 : 6;
        sfx.crack();
        particles.burst(br.x + br.w / 2, br.y + br.h / 2, { n: 4, color: pal.inkMuted, speed: 1, life: 14, size: 1.6, kind: "square", gravity: 0.06 });
        return;
      }
      bust(br);
    }
    function bust(br) {
      var i = bricks.indexOf(br);
      if (i === -1) return;
      bricks.splice(i, 1);
      var mult = combo.hit(), chain = combo.count();
      var cx = br.x + br.w / 2, cy = br.y + br.h / 2;
      var base = br.boss ? 300 : br.myth ? 50 : 10 + (3 - Math.min(br.r, 3)) * 5;
      var pts = base * mult;
      score += pts;
      if (!buzzed) { A.haptics.pop(); buzzed = true; }
      if (br.myth) {
        runStats.myths += 1;
        if (br.boss) { runStats.boss = true; A.haptics.win(); camera.shake(0.8); camera.freeze(reduce ? 0 : 6); }
        else { camera.shake(0.45); camera.freeze(reduce ? 0 : 3); }
        sfx.bust(chain);
        flips.push({ x: br.x, y: br.y, w: br.w, h: br.h, label: br.myth, truth: TRUTHS[br.myth] || "", t: 40, max: 40, boss: !!br.boss });
        floaters.spawn(cx, br.y - 6, "busted +" + pts + (mult > 1 ? " ×" + mult : ""), pal.forest, { size: 11 });
        A.announce("Busted: " + br.myth + ". " + (TRUTHS[br.myth] || "") + ".");
        if (!br.boss) maybeDrop(cx, cy, 0.55);
      } else {
        sfx.card(chain);
        camera.shake(0.1);
        particles.burst(cx, cy, { n: 7, color: [tintFor(br.r), pal.surface], speed: 1.4, life: 20, size: 2.2, kind: ["square", "dot"], gravity: 0.08 });
        floaters.spawn(cx, br.y, "+" + pts + (mult > 1 ? " ×" + mult : ""), mult > 1 ? pal.forest : pal.inkSoft, { size: mult > 1 ? 11 : 10 });
        maybeDrop(cx, cy, 0.08);
      }
      syncHud(); shell.hud.flash("score");
    }

    // ---------- Ball physics ----------
    // Keep a ball from settling into a near-horizontal loop.
    function steady(b) {
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
      b.vx = b.vx / sp * b.speed; b.vy = b.vy / sp * b.speed;
      var minVy = b.speed * 0.3;
      if (Math.abs(b.vy) < minVy) {
        b.vy = (b.vy < 0 ? -1 : 1) * minVy;
        b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(Math.max(0, b.speed * b.speed - minVy * minVy));
      }
    }
    function overlaps(b, br) {
      var nx = clamp(b.x, br.x, br.x + br.w), ny = clamp(b.y, br.y, br.y + br.h);
      var dx = b.x - nx, dy = b.y - ny;
      return dx * dx + dy * dy < R * R;
    }
    // One sub-step for one ball. Returns "lost" when it leaves the floor.
    function subStep(b, s) {
      var px = b.x, py = b.y;
      b.x += b.vx * s; b.y += b.vy * s;
      // walls
      if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); sfx.wall(); }
      else if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); sfx.wall(); }
      if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); sfx.wall(); }
      // the ruler
      var pw = paddleW(), pl = paddleCX - pw / 2;
      if (b.vy > 0 && py + R <= PADDLE_Y + 2 && b.y + R >= PADDLE_Y && b.x >= pl - R && b.x <= pl + pw + R) {
        b.y = PADDLE_Y - R;
        if (combo.active() && combo.count() > 1) sfx.chainBroken(); else sfx.paddle();
        combo.reset();
        A.haptics.tick();
        if (powers.active("sticky")) {
          b.stuck = true; b.caught = true; b.off = clamp(b.x - paddleCX, -pw / 2 + R, pw / 2 - R);
          b.vx = 0; b.vy = 0; sfx.catchIt();
          return null;
        }
        var rel = clamp((b.x - paddleCX) / (pw / 2), -1, 1);
        var ang = -Math.PI / 2 + rel * (Math.PI * 0.36);
        b.speed = Math.min(b.speed + SPEED_STEP, SPEED_MAX);
        b.vx = Math.cos(ang) * b.speed; b.vy = Math.sin(ang) * b.speed;
        return null;
      }
      // cards: every card the ball touches this sub-step takes a hit, and
      // each axis flips at most once.
      var flipX = false, flipY = false, hits = null;
      for (var i = 0; i < bricks.length; i++) {
        var br = bricks[i];
        if (!overlaps(b, br)) continue;
        var wasOutX = px + R <= br.x || px - R >= br.x + br.w;
        var wasOutY = py + R <= br.y || py - R >= br.y + br.h;
        if (wasOutX && !wasOutY) {
          if (!flipX) { b.vx = b.x < br.x + br.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx); b.x = px; flipX = true; }
        } else if (!flipY) {
          b.vy = b.y < br.y + br.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy); b.y = py; flipY = true;
        }
        (hits || (hits = [])).push(br);
      }
      if (hits) {
        for (var h = 0; h < hits.length; h++) damage(hits[h], false);
        steady(b);
      }
      if (b.y > H + 12) return "lost";
      return null;
    }
    function moveBalls(dt) {
      var speedScale = powers.active("calm") ? 0.65 : 1;
      var magnet = powers.active("magnet");
      for (var i = balls.length - 1; i >= 0; i--) {
        var b = balls[i];
        if (b.stuck) {
          b.x = paddleCX + b.off; b.y = PADDLE_Y - R - 0.5;
          b.trail.length = 0;
          continue;
        }
        if (magnet && b.vy > 0 && b.y > H * 0.35) {
          b.vx += clamp((paddleCX - b.x) * 0.0016, -0.07, 0.07) * dt;
          steady(b);
        }
        var dist = b.speed * speedScale * dt;
        var steps = Math.max(1, Math.ceil(dist / (R / 2)));
        var s = speedScale * dt / steps;
        var lost = false;
        for (var k = 0; k < steps; k++) {
          if (subStep(b, s) === "lost") { lost = true; break; }
          if (b.stuck) break;
        }
        b.trail.unshift({ x: b.x, y: b.y });
        if (b.trail.length > 6) b.trail.length = 6;
        if (lost) { balls.splice(i, 1); onBallGone(); if (state !== "running") return; }
      }
    }
    function onBallGone() {
      if (balls.length || clearT > 0) { if (!balls.length) spawnBall(); return; }
      lives -= 1;
      sfx.lose(); A.haptics.crash();
      combo.reset();
      camera.shake(0.6); camera.freeze(reduce ? 0 : 4);
      syncHud();
      if (lives <= 0) {
        state = "dying"; deathTimer = 40; wake.release();
        A.announce("Last ball lost.");
        return;
      }
      A.announce(lives + (lives === 1 ? " ball" : " balls") + " left.");
      spawnBall();
    }

    function nextWall() {
      score += 100 + wall * 50;
      floaters.spawn(W / 2, H / 2, "Wall cleared +" + (100 + wall * 50), pal.forest, { size: 16, font: "display", life: 60 });
      wall += 1;
      sfx.level(); A.haptics.win();
      powers.clear();
      buildWall();
      spawnBall();
      enterWall(true);
      syncHud();
    }

    // ---------- Tick ----------
    function tick(dt) {
      time += dt;
      buzzed = false;
      camera.tick(dt); particles.tick(dt); floaters.tick(dt); story.tick(dt);
      tickFlips(dt);
      if (state === "dying") {
        deathTimer -= dt;
        if (deathTimer <= 0) gameOver();
        return;
      }
      if (state !== "running") return;
      if (camera.frozen()) return;
      combo.tick(dt); powers.tick(dt);
      shell.renderPips(powers.list(), pal);
      if (boltCool > 0) boltCool -= dt;

      // ruler: keys and touch holds
      var left = input.held.left || shell.held.left, right = input.held.right || shell.held.right;
      if (left) paddleCX -= 6.4 * dt;
      if (right) paddleCX += 6.4 * dt;
      clampPaddle();

      // the boss slides along the top row, quicker as it weakens
      for (var bi = 0; bi < bricks.length; bi++) {
        var bb = bricks[bi];
        if (bb.hitT > 0) bb.hitT -= dt;
        if (!bb.boss) continue;
        bossT += dt * (0.014 + (6 - bb.hp) * 0.004);
        var span = (fieldW() - bb.w) / 2;
        bb.x = FIELD_X + span + Math.sin(bossT) * span;
      }

      moveBalls(dt);
      if (state !== "running") return;

      // pointed questions
      for (var q = bolts.length - 1; q >= 0; q--) {
        var bo = bolts[q];
        bo.y -= 8 * dt;
        var hit = null;
        for (var j = 0; j < bricks.length; j++) {
          var br = bricks[j];
          if (bo.x >= br.x && bo.x <= br.x + br.w && bo.y - 10 <= br.y + br.h && bo.y >= br.y) { hit = br; break; }
        }
        if (hit) {
          particles.burst(bo.x, hit.y + hit.h, { n: 6, color: pal.clay, speed: 1.2, life: 14, size: 1.8, kind: "spark" });
          damage(hit, true);
          bolts.splice(q, 1);
        } else if (bo.y < -12) bolts.splice(q, 1);
      }

      // drops
      var pw = paddleW(), pl = paddleCX - pw / 2;
      for (var d = drops.length - 1; d >= 0; d--) {
        var dr = drops[d];
        dr.y += 1.4 * dt;
        if (dr.y > H + 10) { drops.splice(d, 1); continue; }
        if (dr.y + 8 >= PADDLE_Y && dr.y - 8 <= PADDLE_Y + PADDLE_H && dr.x >= pl - 8 && dr.x <= pl + pw + 8) {
          applyPower(dr.id, dr.x, PADDLE_Y);
          drops.splice(d, 1);
        }
      }

      // wall clear: a short beat so the last flip plays out, then the next wall
      if (!bricks.length) {
        if (clearT <= 0) clearT = 50;
        clearT -= dt;
        if (clearT <= 0) { clearT = 0; nextWall(); }
      }
    }
    function tickFlips(dt) {
      for (var i = flips.length - 1; i >= 0; i--) {
        var f = flips[i];
        f.t -= dt;
        if (f.t <= 0) {
          flips.splice(i, 1);
          var cx = f.x + f.w / 2, cy = f.y + f.h / 2;
          particles.burst(cx, cy, { n: f.boss ? 30 : 14, color: [pal.surface, pal.forest, pal.sage, pal.ochre], speed: f.boss ? 2.6 : 1.7, life: 34, size: 2.6, kind: ["square", "leaf", "dot"], gravity: 0.09 });
        }
      }
    }

    // ---------- Render ----------
    function cardPath(c, x, y, w, h, f) {
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x + w - f, y); c.lineTo(x + w, y + f); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath();
    }
    // An index card: surface (or a row tint), ink outline, 2 px shadow, a
    // folded corner and a light rule line near the top.
    function drawCard(x, y, w, h, fill, ruleColor) {
      var f = Math.min(7, h * 0.35);
      draw.shape(ctx, function (c) { cardPath(c, x, y, w, h, f); }, { fill: fill, stroke: pal.ink, lineWidth: 1.3, shadow: 2, shadowColor: pal.shadow });
      ctx.strokeStyle = ruleColor; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 3, y + 5.5); ctx.lineTo(x + w - f - 1, y + 5.5); ctx.stroke();
      // the fold
      draw.shape(ctx, function (c) { c.beginPath(); c.moveTo(x + w - f, y); c.lineTo(x + w - f, y + f); c.lineTo(x + w, y + f); c.closePath(); },
        { fill: pal.mix(fill, pal.ink, 0.16), stroke: pal.ink, lineWidth: 1 });
    }
    function drawCracks(br) {
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2;
      for (var i = 0; i < br.cracks.length; i++) {
        var cr = br.cracks[i], x = br.x + cr.x, k = cr.k;
        var y0 = br.y + 1, y1 = br.y + br.h * 0.5, y2 = br.y + br.h - 1;
        ctx.beginPath();
        ctx.moveTo(x, y0); ctx.lineTo(x + 3 * k, y1 - 2); ctx.lineTo(x - 1 * k, y1 + 2); ctx.lineTo(x + 2 * k, y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 1 * k, y1 + 2); ctx.lineTo(x - 7 * k, y1 + 5);
        ctx.stroke();
      }
    }
    function drawBrick(br) {
      var flash = br.hitT > 0 ? 0.35 : 0;
      if (br.boss) {
        var fill = flash ? pal.mix(pal.surface, pal.clay, flash) : pal.surface;
        drawCard(br.x, br.y, br.w, br.h, fill, pal.alpha(pal.clay, 0.55));
        ctx.strokeStyle = pal.alpha(pal.research, 0.25); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(br.x + 4, br.y + 30.5); ctx.lineTo(br.x + br.w - 4, br.y + 30.5); ctx.stroke();
        draw.label(ctx, br.myth, br.x + br.w / 2, br.y + 17, { font: "display", size: 15, weight: 600, color: pal.ink });
        // hit points as six small dots
        var n = br.maxHp, gap = 9, sx = br.x + br.w / 2 - (n - 1) * gap / 2;
        for (var i = 0; i < n; i++) {
          draw.circle(ctx, sx + i * gap, br.y + 31, 2.6, i < br.hp ? { fill: pal.clay, stroke: pal.ink, lineWidth: 1 } : { fill: pal.surface, stroke: pal.inkMuted, lineWidth: 1 });
        }
        drawCracks(br);
        return;
      }
      if (br.myth) {
        drawCard(br.x, br.y, br.w, br.h, flash ? pal.mix(pal.surface, pal.ochre, flash) : pal.surface, pal.alpha(pal.clay, 0.5));
        draw.label(ctx, br.myth, br.x + br.w / 2, br.y + br.h / 2 + 2.5, { size: 11, weight: 600, color: pal.ink, maxWidth: br.w - 10 });
        drawCracks(br);
        return;
      }
      var tint = tintFor(br.r);
      var dark = (br.r % 4) === 3;
      drawCard(br.x, br.y, br.w, br.h, tint, dark ? pal.alpha(pal.onForest, 0.35) : pal.alpha(pal.ink, 0.16));
      // two faint writing lines so a plain card still reads as a card
      ctx.strokeStyle = dark ? pal.alpha(pal.onForest, 0.22) : pal.alpha(pal.ink, 0.1); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(br.x + 4, br.y + 11.5); ctx.lineTo(br.x + br.w - 6, br.y + 11.5);
      ctx.moveTo(br.x + 4, br.y + 15.5); ctx.lineTo(br.x + br.w * 0.6, br.y + 15.5); ctx.stroke();
    }
    function drawFlip(f) {
      // 0..8 frames: the front squashes shut; then the truth side opens and holds.
      var age = f.max - f.t;
      var front = age < 8 && !reduce;
      var sy = reduce ? 1 : front ? 1 - age / 8 : Math.min(1, (age - 8) / 8);
      var fade = Math.min(1, f.t / 6);
      ctx.save();
      ctx.globalAlpha = fade;
      var cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      ctx.translate(cx, cy); ctx.scale(1, Math.max(0.05, sy)); ctx.translate(-cx, -cy);
      if (front) {
        drawCard(f.x, f.y, f.w, f.h, pal.surface, pal.alpha(pal.clay, 0.5));
        draw.label(ctx, f.label, cx, cy + 2.5, { size: 11, weight: 600, color: pal.ink, maxWidth: f.w - 10 });
      } else {
        ctx.font = "italic 500 11px " + pal.fontDisplay;
        var tw = Math.min(W - 8, Math.max(f.w, ctx.measureText(f.truth).width + 18));
        var th = f.boss ? f.h : f.h + 4;
        var tx = clamp(cx - tw / 2, 4, W - 4 - tw), ty = cy - th / 2;
        draw.box(ctx, tx, ty, tw, th, 3, { fill: pal.forest, stroke: pal.ink, lineWidth: 1.3, shadow: 2, shadowColor: pal.shadow });
        draw.label(ctx, f.truth, tx + tw / 2, ty + th / 2 + 0.5, { font: "display", size: f.boss ? 13 : 11, italic: true, weight: 500, color: pal.onForest, maxWidth: tw - 10 });
      }
      ctx.restore();
    }
    function drawRuler() {
      var pw = paddleW(), px = paddleCX - pw / 2, py = PADDLE_Y;
      var wood = pal.mix(pal.ochre, pal.paper, 0.4);
      if (powers.active("magnet")) {
        // a quiet field under the ruler: two short research-blue arcs
        ctx.strokeStyle = pal.alpha(pal.research, 0.55); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(paddleCX, py + PADDLE_H / 2, pw / 2 + 4, PADDLE_H / 2 + 4, 0, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(paddleCX, py + PADDLE_H / 2, pw / 2 + 8, PADDLE_H / 2 + 7, 0, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
      }
      draw.pill(ctx, px, py, pw, PADDLE_H, { fill: wood, stroke: pal.ink, lineWidth: 1.3, shadow: 2.5, shadowColor: pal.shadow });
      // tick marks along the top edge, a long one every fifth
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1;
      ctx.beginPath();
      var n = 0;
      for (var x = px + 6; x <= px + pw - 6; x += 4, n++) {
        var len = n % 5 === 0 ? 4.5 : 2.4;
        ctx.moveTo(Math.round(x) + 0.5, py + 1.2); ctx.lineTo(Math.round(x) + 0.5, py + 1.2 + len);
      }
      ctx.stroke();
      if (powers.active("sticky")) {
        ctx.strokeStyle = pal.forest; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px + 5, py + PADDLE_H - 2.2); ctx.lineTo(px + pw - 5, py + PADDLE_H - 2.2); ctx.stroke();
      }
      if (powers.active("question")) {
        draw.circle(ctx, paddleCX, py - 1, 2.2, { fill: pal.clay, stroke: pal.ink, lineWidth: 1 });
      }
    }
    function drawBall(b, calm) {
      for (var i = b.trail.length - 1; i >= 1; i--) {
        var tp = b.trail[i], k = i / 6;
        ctx.fillStyle = pal.alpha(pal.ink, 0.28 * (1 - k));
        ctx.beginPath(); ctx.arc(tp.x, tp.y, R * (1 - k * 0.55), 0, Math.PI * 2); ctx.fill();
      }
      if (calm) draw.circle(ctx, b.x, b.y, R + 3, { stroke: pal.alpha(pal.research, 0.7), lineWidth: 1.4 });
      ctx.fillStyle = pal.shadow; ctx.beginPath(); ctx.arc(b.x, b.y + 2, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pal.alpha(pal.surface, 0.55); ctx.beginPath(); ctx.arc(b.x - R * 0.35, b.y - R * 0.35, R * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    function drawDrop(dr) {
      var def = POWERUPS[dr.id], col = pal[def.color];
      var y = dr.y + (reduce ? 0 : Math.sin(time * 0.12 + dr.bob) * 1.2);
      var light = def.color === "sage" || def.color === "ochre";
      draw.circle(ctx, dr.x, y, 8, { fill: col, stroke: pal.ink, lineWidth: 1.3, shadow: 2, shadowColor: pal.shadow });
      draw.label(ctx, (def.name || def.label).charAt(0), dr.x, y + 0.5, { font: "display", size: 11, weight: 600, color: light ? pal.ink : pal.surface });
    }

    function render() {
      cv.begin(camera);
      draw.paper(ctx, W, H, pal, { step: 16, dot: 0.9 });
      ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      var i;
      for (i = 0; i < bricks.length; i++) drawBrick(bricks[i]);
      for (i = 0; i < drops.length; i++) drawDrop(drops[i]);
      for (i = 0; i < bolts.length; i++) {
        var bo = bolts[i];
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(bo.x, bo.y); ctx.lineTo(bo.x, bo.y - 10); ctx.stroke();
        ctx.strokeStyle = pal.clay; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(bo.x, bo.y); ctx.lineTo(bo.x, bo.y - 10); ctx.stroke();
      }
      drawRuler();
      var calm = powers.active("calm");
      ctx.save();
      if (state === "dying") ctx.globalAlpha = 0.4;
      for (i = 0; i < balls.length; i++) drawBall(balls[i], calm);
      ctx.restore();
      for (i = 0; i < flips.length; i++) drawFlip(flips[i]);

      particles.render(ctx);
      floaters.render(ctx);

      // aim hint while a ball waits on the ruler
      if (state === "running" && balls.length && balls[0].stuck && !story.banner()) {
        draw.label(ctx, balls[0].caught ? "Space or tap lets go" : "Space or tap to launch", W / 2, PADDLE_Y - 26, { size: 11, weight: 500, color: pal.inkMuted });
      }

      // chain readout, top right
      if (state === "running" && combo.count() > 1) {
        var cm = combo.mult();
        draw.label(ctx, "Chain ×" + cm + " · " + combo.count(), W - 12, 16, { size: 11, weight: 600, color: cm >= 3 ? pal.forest : pal.inkSoft, align: "right" });
        ctx.fillStyle = pal.alpha(pal.forest, 0.5); ctx.fillRect(W - 72, 25, 60 * combo.frac(), 2);
      }

      // wall banner
      var bn = story.banner();
      if (bn && state === "running") {
        var a = Math.min(1, bn.frac * 3) * Math.min(1, (1 - bn.frac) * 6 + 0.2);
        ctx.save(); ctx.globalAlpha = a;
        var ty = 24 + (reduce ? 0 : (1 - Math.min(1, (1 - bn.frac) * 4)) * -10);
        var bw = Math.min(W - 24, 300);
        draw.box(ctx, W / 2 - bw / 2, ty - 20, bw, 54, 6, { fill: pal.alpha(pal.paper, 0.92), stroke: pal.rule, lineWidth: 1 });
        draw.label(ctx, "Wall " + wall + " · " + bn.name, W / 2, ty, { font: "display", size: 22, color: pal.ink, weight: 500 });
        draw.label(ctx, bn.text, W / 2, ty + 21, { size: 11, color: pal.inkMuted, weight: 500 });
        ctx.restore();
      }

      // wall progress along the bottom rule
      if (state === "running" || state === "paused") {
        var prog = wallTotal ? (wallTotal - bricks.length) / wallTotal : 0;
        ctx.fillStyle = pal.alpha(pal.forest, 0.55); ctx.fillRect(0, H - 2, W * prog, 2);
      }

      cv.end();
    }

    var loop = A.makeLoop(function (dt) { tick(dt); input.consume(); }, render);

    function onHidden() { if (state === "running") pause(); }

    A.debug("breakout", {
      state: function () { return state; },
      score: function () { return Math.floor(score); },
      info: function () { return { wall: wall, lives: lives, balls: balls.length, cards: bricks.length, flips: flips.length, drops: drops.length, powers: powers.list().map(function (p) { return p.id; }), size: [W, H], cols: COLS }; },
      grant: function (id) { if (!POWERUPS[id]) return false; applyPower(id, paddleCX, PADDLE_Y); return true; },
      skipToWall: function (n) {
        if (state !== "running") start();
        wall = Math.max(1, Math.floor(n) || 1);
        powers.clear(); flips = [];
        buildWall(); spawnBall(); enterWall(true); syncHud();
        return wall;
      },
      clearWall: function () { if (state !== "running") return false; bricks.length = 0; return true; },
      loseBall: function () { if (state !== "running") return false; balls.length = 0; onBallGone(); return true; },
      launch: function () { act(); },
      // put the ruler under a logical x (for aiming in tests)
      aim: function (x) { paddleCX = x; clampPaddle(); return paddleCX; },
      cards: function () { return bricks.map(function (b) { return { x: b.x + b.w / 2, y: b.y, myth: b.myth || null, hp: b.hp, boss: !!b.boss }; }); }
    });

    return {
      held: input.held,
      activate: function () {
        pal = A.theme();
        cv.fit();
        setField(cv.aspect() < 0.9);
        cv.setSize(W, H);
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
    A.defineGame("breakout", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Myth Buster",
        tagline: "Bust the myths, card by card.",
        label: "Myth Buster game",
        canvas: { w: W, h: H, label: "Myth Buster play field", smooth: true },
        hud: [{ id: "score", label: "Score", value: 0 }, { id: "best", label: "Best", value: A.leaderboard.best(GAME_KEY) }, { id: "wall", label: "Wall", value: 1 }, { id: "lives", label: "Balls", value: 3 }],
        help: "Mouse, arrows or drag move · Space, click or tap launches · P pauses · M mutes · Esc closes",
        touch: [
          { id: "left", label: "◀", aria: "Move left" },
          { id: "launch", label: "Launch", aria: "Launch or fire", wide: true, tap: true },
          { id: "right", label: "▶", aria: "Move right" },
          { id: "pause", label: "Pause", aria: "Pause or resume", tap: true }
        ]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
