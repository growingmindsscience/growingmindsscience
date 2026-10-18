/* Growing Minds Science — dino-game.js
   "Brain Sprint" on the Arcade page: an endless runner. A little sprout runs
   from the crib to the cosmos, hopping book stacks, blocks and wagons and
   ducking kites and comets. Seeds feed it; spell each chapter's word for a
   bonus.

   Core v2 game (see docs/arcade/game-brief.md): reads the live brand tokens
   through A.theme(), draws at device resolution through the shell's canvas,
   uses makeShell for the overlay, makeStory for chapters, makePowerups for
   timed and counted effects, runSummary for the end card. CSP-safe: no eval,
   no external assets, audio is the shared Web Audio synth. Honors
   prefers-reduced-motion (no shake, no particles, no flashing, still
   scenery).

   Feel kept from the first version: variable jump (hold for height, cut on
   release), coyote time, an input buffer, fast-fall, duck, chapter speed
   bands, the Bloom window and the shield.

   Power-ups: Magnet (seeds drift in, research blue), Double Jump (one air
   jump, sage), Shield (one hit, forest), Bloom (2x score and smash through,
   ochre).
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "brain-sprint";
  var MUTE_KEY = "gms-dino-muted";

  // ---------- Field ----------
  // Landscape by default; a portrait phone gets a taller, narrower field with
  // the ground line lower (chosen when the game opens, see activate()).
  var W = 640, H = 360, G = 300, PX = 84, SPEED_SCALE = 1;
  function setLayout(portrait) {
    if (portrait) { W = 360; H = 480; G = 404; PX = 50; SPEED_SCALE = 0.85; }
    else { W = 640; H = 360; G = 300; PX = 84; SPEED_SCALE = 1; }
  }

  // ---------- Physics (the first version's feel, at twice the scale) ----------
  var GRAVITY = 0.9;
  var JUMP_V = -11.2;
  var AIR_JUMP_V = -10;
  var CHARGE_FRAMES = 12;   // how long a held jump keeps floating
  var COYOTE = 6;           // grace frames to jump after leaving the ground
  var BUFFER = 7;           // grace frames to register an early jump press
  var FAST_FALL = 8;
  var STAND_H = 40, DUCK_H = 22;

  // ---------- Story: five chapters, gated on score ----------
  // sLo/sHi are the first version's speed bands (doubled for the doubled field).
  var CHAPTERS = [
    { name: "Crib", at: 0, text: "Everything is new. Hop over the books.", sLo: 4.2, sHi: 5.4, word: "CRIB", flyer: "kite" },
    { name: "Toddler", at: 300, text: "Up on two feet. Blocks and kites ahead.", sLo: 5.4, sHi: 6.8, word: "GROW", flyer: "kite" },
    { name: "Preschool", at: 750, text: "The garden gate is open. Mind the wagons.", sLo: 6.8, sHi: 8.4, word: "PLAY", flyer: "kite" },
    { name: "Schoolyard", at: 1400, text: "Recess. Swings, slides and a lot more speed.", sLo: 8.4, sHi: 10.2, word: "LEARN", flyer: "kite" },
    { name: "Cosmos", at: 2300, text: "Big questions under a big sky.", sLo: 10.2, sHi: 12, word: "STARS", flyer: "comet" }
  ];

  var POWERUPS = {
    magnet: { label: "Magnet", color: "research", duration: 360, text: "Seeds drift your way" },
    double: { label: "Double Jump", color: "sage", uses: 1, text: "One jump in mid-air" },
    shield: { label: "Shield", color: "forest", uses: 1, text: "One bump forgiven" },
    bloom: { label: "Bloom", color: "ochre", duration: 300, text: "Double score, smash through" }
  };

  var SEEDS_FOR_BLOOM = 12, SEEDS_FOR_SHIELD = 15;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  // Stable pseudo-random per scenery tile, so a tile looks the same each pass.
  function hash(i, salt) { var s = Math.sin(i * 12.9898 + (salt || 0) * 78.233) * 43758.5453; return s - Math.floor(s); }

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

    var story = A.makeStory(CHAPTERS, { onEnter: onChapter, bannerFrames: 170 });
    var powers = A.makePowerups(POWERUPS, {});

    var state = "idle"; // idle | running | paused | dying | gameover
    var player, obstacles, seeds, pickups, letters;
    var speed, score, parX, groundOff, nextSpawn, spawnCount, nextPowerAt;
    var coyoteTimer, bufferTimer, chargeFrames, jumpHeld, jumpConsumed, downHeld;
    var squashT, squashAmt, legT, invulnT, trailT, time;
    var growthSeeds, shieldSeeds, letterIdx, wordsDone;
    var sceneFrom, sceneTo, fadeT;
    var deathTimer, best, runStats, debugStill;
    // input latches
    var jumpLatch = false, prevJump = false, prevDuck = false, ptrJump = false, ptrDuck = false;

    best = A.leaderboard.best(GAME_KEY);

    // ---------- Audio ----------
    var sfx = {
      jump: function () { synth.beep(330, 495, 0.08, "triangle", 0.4); },
      air: function () { synth.beep(495, 740, 0.09, "triangle", 0.4); },
      land: function () { synth.beep(150, 110, 0.05, "sine", 0.3); synth.noise(0.07, 500, 0.16); },
      seed: function (m) { synth.beep(660 + m * 40, 900 + m * 40, 0.05, "triangle", 0.36); },
      letter: function () { synth.beep(784, 1046, 0.08, "triangle", 0.4); },
      word: function () { synth.arp([523, 659, 784, 1046, 1318], 0.06, 0.16, "triangle", 0.42); },
      power: function () { synth.arp([659, 880, 1318], 0.045, 0.12, "triangle", 0.4); },
      bloom: function () { synth.arp([440, 660, 880, 1100], 0.05, 0.16, "triangle", 0.45); },
      smash: function () { synth.beep(520, 200, 0.08, "square", 0.3); synth.noise(0.12, 800, 0.28); },
      shield: function () { synth.beep(300, 120, 0.12, "sawtooth", 0.35); },
      chapter: function () { synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.42); },
      hit: function () { synth.beep(200, 70, 0.24, "sawtooth", 0.5); synth.noise(0.3, 700, 0.38); }
    };

    // ---------- World ----------
    function resetWorld() {
      player = { x: PX, feet: G, vy: 0, grounded: true, ducking: false, apex: 0 };
      obstacles = []; seeds = []; pickups = []; letters = [];
      speed = CHAPTERS[0].sLo * SPEED_SCALE; score = 0;
      parX = 0; groundOff = 0; nextSpawn = 200; spawnCount = 0; nextPowerAt = 5;
      coyoteTimer = 0; bufferTimer = 0; chargeFrames = 0;
      jumpHeld = false; jumpConsumed = false; downHeld = false;
      jumpLatch = false; prevJump = false; prevDuck = false; ptrJump = false; ptrDuck = false;
      squashT = 0; squashAmt = 0; legT = 0; invulnT = 0; trailT = 0; time = 0;
      growthSeeds = 0; shieldSeeds = 0; letterIdx = 0; wordsDone = 0;
      sceneFrom = 0; sceneTo = 0; fadeT = 1;
      deathTimer = 0; debugStill = false;
      combo.reset(true); powers.clear(); story.reset();
      powers.grant("shield"); // a gentle start: the first bump is forgiven
      particles.clear(); floaters.clear();
      runStats = { chapter: 0, seeds: 0, words: 0, powers: 0, smashes: 0 };
      syncHud();
    }

    // Floater colours that stay readable on the Cosmos ink field.
    function inCosmos() { return sceneTo === 4; }
    function fgForest() { return inCosmos() && !pal.isDark ? pal.sage : pal.forest; }
    function fgSoft() { return inCosmos() ? pal.onInkMuted : pal.inkSoft; }
    function chapter() { return CHAPTERS[story.index()]; }
    function word() { return chapter().word; }

    function onChapter(ch, idx) {
      sceneFrom = sceneTo; sceneTo = idx; fadeT = 0;
      letterIdx = 0; letters.length = 0;
      runStats.chapter = Math.max(runStats.chapter, idx);
      if (idx > 0) {
        sfx.chapter(); A.haptics.win(); camera.shake(0.2);
        A.announce("Chapter " + (idx + 1) + ", " + ch.name + ". " + ch.text + " Spell " + ch.word.split("").join(" ") + ".");
      }
      syncHud();
    }

    function syncHud() {
      var s = Math.floor(score);
      shell.hud.set("score", s);
      shell.hud.set("best", Math.max(best, s));
      shell.hud.set("seeds", runStats ? runStats.seeds : 0);
      shell.hud.set("chapter", chapter().name);
    }

    // ---------- Flow ----------
    function showStart() {
      var p = A.progress.get(GAME_KEY);
      shell.prompt.show({
        kicker: "Brain Sprint",
        title: p.plays ? "Off you go again, little sprout" : "From the crib to the cosmos",
        text: "Space, Up or a tap jumps; hold it to jump higher. Down or a swipe down ducks. Gather seeds, spell each chapter's word, and keep growing.",
        actions: [{ label: "Start", primary: true, onClick: start }],
        board: p.plays ? function (m) { A.renderLeaderboard(m, GAME_KEY, {}); } : null
      });
    }
    function focusField() { try { cv.el.focus({ preventScroll: true }); } catch (e) {} }
    // Landscape track, or a tall one for a portrait phone; chosen on open and
    // at every start so a phone turned between runs gets the right field.
    function layoutField() {
      setLayout(cv.aspect() < 0.9);
      cv.setSize(W, H);
    }
    function start() {
      synth.ensure();
      layoutField();
      resetWorld();
      state = "running";
      shell.prompt.hide();
      wake.acquire();
      focusField();
      shell.setHelp("Space, Up or W jumps (hold for height) · Down or S ducks · P pauses · M mutes · Esc closes");
      A.announce("Go. Chapter one, Crib. Spell C R I B.");
    }
    function releaseHolds() {
      input.release(); ptrJump = false; ptrDuck = false; jumpLatch = false;
      if (shell.held) { shell.held.jump = false; shell.held.duck = false; }
      jumpHeld = false; downHeld = false; prevJump = false; prevDuck = false;
      if (player && player.ducking) { player.ducking = false; }
    }
    function pause() {
      if (state !== "running") return;
      state = "paused";
      releaseHolds();
      wake.release();
      shell.prompt.show({ kicker: "Paused", title: chapter().name, text: "Score " + Math.floor(score) + " · " + runStats.seeds + " seeds.",
        actions: [{ label: "Resume", primary: true, onClick: resume }, { label: "Quit", onClick: function () { A.closeGame(); } }], compact: true });
    }
    function resume() {
      if (state !== "paused") return;
      synth.ensure();
      state = "running"; shell.prompt.hide(); wake.acquire(); focusField();
    }
    function die() {
      if (state !== "running") return;
      combo.reset();
      sfx.hit(); A.haptics.crash();
      wake.release();
      camera.shake(0.9); camera.freeze(6);
      if (reduce) { state = "dying"; deathTimer = 1; return; }
      state = "dying"; deathTimer = 48;
      var b = playerBox();
      particles.burst(b.x + b.w / 2, b.y + b.h / 2, { n: 16, color: [pal.forest, pal.sage, pal.ochre, pal.sageDeep], speed: 2.6, life: 34, size: 3.2, kind: ["dot", "leaf"], gravity: 0.08 });
    }
    function gameOver() {
      state = "gameover";
      shell.renderPips([], pal);
      var final = Math.floor(score);
      var placed = final > 0 && final >= best;
      if (final > best) best = final;
      A.progress.record(GAME_KEY, { score: final, chapter: runStats.chapter, badges: runStats.chapter >= 4 ? ["cosmos"] : [] });
      syncHud();
      var ch = chapter();
      shell.prompt.show({
        kicker: "A little tumble",
        title: placed ? "A new best: " + final : "Score " + final,
        text: "You reached " + ch.name + " with " + runStats.seeds + " seeds" + (runStats.words ? " and spelled " + runStats.words + (runStats.words === 1 ? " word." : " words.") : "."),
        board: function (m) {
          A.runSummary(m, { gameKey: GAME_KEY, score: final,
            lines: [["Chapter", ch.name], ["Seeds", runStats.seeds], ["Words", runStats.words], ["Best dodge chain", combo.best()], ["Power-ups", runStats.powers]],
            onSaved: function () { best = A.leaderboard.best(GAME_KEY); syncHud(); } });
        },
        actions: [{ label: "Play again", primary: true, onClick: start }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
      A.announce("Game over. Score " + final + ".");
    }

    // ---------- Controls ----------
    function heightAbove() { return G - player.feet; }
    function jumpPress() {
      if (state === "idle") { start(); return; }
      if (state === "paused") { resume(); return; } // the resume tap must not also hop
      if (state !== "running") return;
      jumpHeld = true;
      if ((player.grounded || coyoteTimer > 0) && !jumpConsumed && !player.ducking) {
        player.vy = JUMP_V; player.grounded = false; jumpConsumed = true;
        chargeFrames = CHARGE_FRAMES; coyoteTimer = 0; player.apex = 0;
        squashAmt = -0.8; squashT = 1;      // stretch on takeoff
        sfx.jump(); A.haptics.tick();
      } else if (!player.grounded && powers.active("double") && heightAbove() > 24) {
        powers.use("double");
        player.vy = AIR_JUMP_V; chargeFrames = CHARGE_FRAMES * 0.6; player.apex = 0;
        squashAmt = -0.8; squashT = 1;
        particles.burst(player.x + 20, player.feet, { n: 10, color: [pal.sage, pal.surface], speed: 1.8, life: 18, size: 2.4, kind: "ring", spread: Math.PI, angle: Math.PI / 2 });
        sfx.air(); A.haptics.tick();
      } else if (!player.grounded) {
        bufferTimer = BUFFER;
      }
    }
    function jumpRelease() {
      jumpHeld = false;
      if (player && player.vy < 0) player.vy *= 0.45; // variable jump: cut on release
    }
    function setDucking(on) {
      downHeld = on;
      if (state !== "running") return;
      if (!player.grounded) { if (on) player.vy = Math.max(player.vy, FAST_FALL); return; } // fast-fall
      if (on === player.ducking) return;
      player.ducking = on;
      if (on) A.haptics.tick();
    }
    function pollInput() {
      var wantJump = !!(input.held.jump || shell.held.jump || ptrJump);
      if ((wantJump || jumpLatch) && !prevJump) { jumpPress(); prevJump = true; }
      else if (!wantJump && prevJump) { prevJump = false; jumpRelease(); }
      jumpLatch = false;
      var wantDuck = !!(input.held.duck || shell.held.duck || ptrDuck);
      if (wantDuck !== prevDuck) { prevDuck = wantDuck; setDucking(wantDuck); }
    }
    function togglePause() { if (state === "running") pause(); else if (state === "paused") resume(); else if (state === "idle") start(); }

    var input = A.makeInput(cv.el, {
      canvas: cv,
      keys: { " ": "jump", ArrowUp: "jump", w: "jump", ArrowDown: "duck", s: "duck", p: "pause", Enter: "start" },
      onAction: function (a, repeat, e) {
        if (e && e.preventDefault) e.preventDefault();
        if (a === "jump" && !repeat) jumpLatch = true;
        else if (a === "pause" && !repeat) togglePause();
        else if (a === "start" && !repeat && state === "idle") start();
      },
      onDown: function () { ptrJump = true; jumpLatch = true; },
      onUp: function () { ptrJump = false; ptrDuck = false; },
      onSwipe: function (d) { if (d === "down") { ptrJump = false; ptrDuck = true; } }
    });
    shell.onTap(function (id) { if (id === "pause") togglePause(); });

    // ---------- Spawning ----------
    function airTime() { return (-JUMP_V / GRAVITY) * 2 + CHARGE_FRAMES * 0.5; }
    function minGap() { return Math.max(68, airTime() * speed * 0.42); }
    var GROUND_KINDS = {
      books1: { w: 36, h: 30 }, books2: { w: 36, h: 50 },
      block: { w: 34, h: 34 }, wagon: { w: 66, h: 26 }
    };
    function pushGround(type, x) {
      var k = GROUND_KINDS[type];
      var ob = { type: type, x: x == null ? W + 20 : x, y: G - k.h, w: k.w, h: k.h, seed: Math.random(), scored: false, ground: true };
      obstacles.push(ob); return ob;
    }
    function pushFlyer(x) {
      var ob = { type: chapter().flyer, x: x == null ? W + 20 : x, y: G - 58, w: 30, h: 24, seed: Math.random() * 1000, scored: false, ground: false };
      obstacles.push(ob); return ob;
    }
    function spawnObstacle() {
      var ch = story.index(), roll = Math.random(), flying = false, last;
      if (ch === 0) last = pushGround(roll < 0.12 ? "books2" : "books1");
      else if (ch === 1) {
        if (roll < 0.28) { last = pushFlyer(); flying = true; }
        else if (roll < 0.55) last = pushGround("block");
        else last = pushGround(roll < 0.8 ? "books2" : "books1");
      } else {
        var cRate = ch === 2 ? 0.14 : 0.2, fRate = ch === 2 ? 0.42 : 0.48;
        if (roll < cRate) { pushGround("books1"); last = pushFlyer(W + 20 + 120 + speed * 18); flying = true; }
        else if (roll < fRate) { last = pushFlyer(); flying = true; }
        else if (roll < fRate + 0.15) last = pushGround("wagon");
        else if (roll < fRate + 0.31) last = pushGround("block");
        else last = pushGround(roll < 0.88 ? "books2" : "books1");
      }
      spawnCount += 1;
      var gap = minGap() + 60 + Math.random() * 160 + (ch === 0 ? 68 : ch === 1 ? 32 : 0) + (last.w - 34) + (last.x - (W + 20));
      nextSpawn = gap;
      var placedLetter = maybeSeeds(last, flying);
      if (!placedLetter) maybePickup(last, gap);
    }
    function maybeSeeds(ob, duckLane) {
      if (seeds.length > 2 || Math.random() > 0.72) return false;
      var n = 3 + Math.floor(Math.random() * 3);
      var startX = ob.x + ob.w + (duckLane ? -46 : 46), sx, sy;
      for (var i = 0; i < n; i++) {
        sx = startX + i * 22;
        sy = duckLane ? G - 14 : G - 46 - Math.round(Math.sin((i / (n - 1)) * Math.PI) * 34);
        seeds.push({ x: sx, y: sy, bob: Math.random() * 6.28 });
      }
      // a letter of the chapter word, one at a time, at the end of the run of seeds
      if (letterIdx < word().length && letters.length === 0 && Math.random() < 0.55) {
        letters.push({ x: sx + 30, y: duckLane ? G - 18 : G - 52, ch: word().charAt(letterIdx), bob: Math.random() * 6.28 });
        return true;
      }
      return false;
    }
    function maybePickup(ob, gap) {
      if (pickups.length || spawnCount < nextPowerAt) return;
      var pool = ["magnet", "double", "magnet", "double"];
      if (!powers.active("shield")) pool.push("shield", "shield");
      if (story.index() >= 1 && !powers.active("bloom")) pool.push("bloom");
      var id = pool[Math.floor(Math.random() * pool.length)];
      pickups.push({ id: id, x: ob.x + ob.w + Math.max(40, (gap - ob.w) / 2), y: G - 84, bob: 0 });
      nextPowerAt = spawnCount + 5 + Math.floor(Math.random() * 4);
    }

    // ---------- Hitboxes ----------
    function playerBox() {
      if (player.ducking) return { x: player.x + 2, y: player.feet - DUCK_H, w: 38, h: DUCK_H - 2 };
      return { x: player.x + 8, y: player.feet - STAND_H, w: 24, h: STAND_H - 2 };
    }
    function obstacleBox(ob) {
      if (ob.ground) return { x: ob.x + 3, y: ob.y + 2, w: ob.w - 6, h: ob.h - 2 };
      return { x: ob.x + 2, y: ob.y + 2, w: ob.w - 4, h: ob.h - 2 };
    }
    function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
    function touches(box, x, y, r) {
      var nx = clamp(x, box.x, box.x + box.w), ny = clamp(y, box.y, box.y + box.h);
      var dx = x - nx, dy = y - ny; return dx * dx + dy * dy < r * r;
    }

    // ---------- Pickups ----------
    function grantPower(id) {
      var def = POWERUPS[id];
      powers.grant(id);
      runStats.powers += 1;
      if (id === "bloom") { sfx.bloom(); camera.freeze(4); camera.shake(0.2); A.haptics.pop(); }
      else { sfx.power(); A.haptics.thump(); camera.shake(0.12); }
      floaters.spawn(player.x + 20, player.feet - 64, def.label, (inCosmos() && !pal.isDark ? pal.mix(pal[def.color], pal.onInk, 0.5) : pal[def.color === "sage" ? "sageDeep" : def.color]), { size: 14, font: "display", life: 44 });
      shell.toast(def.label + ": " + def.text, 1600);
      A.announce(def.label + ". " + def.text + ".");
    }
    function scoreMult() { return powers.active("bloom") ? 2 : 1; }
    function takeSeed(sd) {
      var m = scoreMult(), pts = 20 * m;
      score += pts; runStats.seeds += 1; growthSeeds += 1; shieldSeeds += 1;
      particles.burst(sd.x, sd.y, { n: 6, color: [pal.ochre, pal.sageDeep], speed: 1.4, life: 18, size: 2.2, kind: ["dot", "leaf"] });
      floaters.spawn(sd.x, sd.y - 10, "+" + pts, m > 1 ? pal.ochre : fgSoft(), { size: 11 });
      sfx.seed(m);
      if (growthSeeds >= SEEDS_FOR_BLOOM) { growthSeeds = 0; grantPower("bloom"); }
      if (shieldSeeds >= SEEDS_FOR_SHIELD && !powers.active("shield")) {
        shieldSeeds = 0; powers.grant("shield");
        floaters.spawn(player.x + 20, player.feet - 80, "Shield back", fgForest(), { size: 12, font: "display" });
        A.announce("Shield back.");
      }
      syncHud(); shell.hud.flash("seeds");
    }
    function takeLetter(lt) {
      letterIdx += 1;
      sfx.letter(); A.haptics.pop();
      particles.burst(lt.x, lt.y, { n: 10, color: [pal.ochre, pal.surface], speed: 1.8, life: 22, size: 2.4, kind: ["ring", "dot"] });
      var w = word();
      if (letterIdx >= w.length) {
        var bonus = 150 * scoreMult();
        score += bonus; wordsDone += 1; runStats.words += 1;
        floaters.spawn(W / 2, G - 150, w + "  +" + bonus, fgForest(), { size: 22, font: "display", life: 70 });
        sfx.word(); A.haptics.win(); camera.shake(0.25);
        A.announce("You spelled " + w + ". Plus " + bonus + ".");
        syncHud(); shell.hud.flash("score");
      } else {
        floaters.spawn(lt.x, lt.y - 16, lt.ch, pal.ochre, { size: 16, font: "display" });
        A.announce("Letter " + lt.ch + ".");
      }
    }

    function handleHit(ob, i) {
      if (powers.active("bloom")) {
        obstacles.splice(i, 1);
        var pts = 10 * scoreMult();
        score += pts; runStats.smashes += 1;
        var b = obstacleBox(ob);
        particles.burst(b.x + b.w / 2, b.y + b.h / 2, { n: 12, color: [pal.clay, pal.surface, pal.ochre, pal.research], speed: 2.4, life: 26, size: 2.8, kind: ["square", "dot"], gravity: 0.1 });
        floaters.spawn(b.x + b.w / 2, b.y - 10, "+" + pts, pal.ochre, { size: 12 });
        camera.freeze(2); camera.shake(0.14);
        sfx.smash();
        return;
      }
      if (invulnT > 0) return;
      if (powers.use("shield")) {
        invulnT = 60; combo.reset(); shieldSeeds = 0;
        var pb = playerBox();
        particles.burst(pb.x + pb.w / 2, pb.y + pb.h / 2, { n: 12, color: [pal.forest, pal.sage], speed: 2.2, life: 22, size: 2.4, kind: ["ring", "leaf"] });
        floaters.spawn(pb.x + pb.w / 2, pb.y - 14, "Shield used", fgForest(), { size: 12, font: "display" });
        camera.freeze(4); camera.shake(0.3);
        sfx.shield(); A.haptics.thump();
        A.announce("Shield used.");
        return;
      }
      die();
    }

    // ---------- Tick ----------
    function tick(dt) {
      time += dt;
      pollInput();
      camera.tick(dt); particles.tick(dt); floaters.tick(dt); story.tick(dt);
      if (fadeT < 1) fadeT = Math.min(1, fadeT + dt / 60);
      if (state === "dying") {
        deathTimer -= dt;
        if (deathTimer <= 0) gameOver();
        return;
      }
      if (state !== "running" || debugStill) return;
      if (camera.frozen()) return;
      combo.tick(dt); powers.tick(dt);
      shell.renderPips(powers.list(), pal);

      // chapter and speed band
      story.advance(score);
      var ci = story.index(), ch = CHAPTERS[ci], nx = CHAPTERS[ci + 1];
      var bandT = clamp((score - ch.at) / ((nx ? nx.at : ch.at + 900) - ch.at), 0, 1);
      speed = lerp(ch.sLo, ch.sHi, bandT) * SPEED_SCALE;

      // distance score
      score += speed * dt * 0.05 * scoreMult();

      if (invulnT > 0) invulnT -= dt;
      if (coyoteTimer > 0) coyoteTimer -= dt;
      if (bufferTimer > 0) bufferTimer -= dt;
      if (squashT > 0) squashT = Math.max(0, squashT - dt / 10);

      // physics
      if (!player.grounded) {
        var rising = player.vy < 0;
        if (jumpHeld && rising && chargeFrames > 0) { player.vy += GRAVITY * 0.45 * dt; chargeFrames -= dt; }
        else player.vy += GRAVITY * dt;
        player.feet += player.vy * dt;
        if (rising && player.vy >= 0) player.apex = 10; // stretch at the top of the arc
        if (player.feet >= G) {
          player.feet = G; player.vy = 0; player.grounded = true; jumpConsumed = false;
          squashAmt = 1; squashT = 1;   // squash on the landing thud
          particles.burst(player.x + 20, G - 2, { n: 6, color: pal.sage, speed: 1.4, life: 18, size: 2.6, kind: "dot", spread: Math.PI * 0.9, angle: -Math.PI / 2, gravity: 0.05 });
          sfx.land();
          if (bufferTimer > 0) { bufferTimer = 0; jumpPress(); }
          if (downHeld && player.grounded) player.ducking = true;
        }
      } else if (downHeld !== player.ducking) {
        setDucking(downHeld);
      }
      if (player.apex > 0) player.apex = Math.max(0, player.apex - dt);
      legT += dt * speed * 0.06;

      // spawn
      nextSpawn -= speed * dt;
      if (nextSpawn <= 0) spawnObstacle();

      var box = playerBox();
      var pcx = box.x + box.w / 2, pcy = box.y + box.h / 2;
      var magnet = powers.active("magnet");

      // obstacles
      for (var i = obstacles.length - 1; i >= 0; i--) {
        var ob = obstacles[i];
        ob.x -= speed * dt;
        if (!ob.ground) ob.y = G - 58 + Math.sin((ob.seed + ob.x) * 0.04) * 3;
        if (ob.x + ob.w < -60) { obstacles.splice(i, 1); continue; }
        if (!ob.scored && ob.x + ob.w < player.x) {
          // dodge chain: cleanly clearing an obstacle extends it and adds a small bonus
          ob.scored = true;
          var dm = combo.hit();
          score += dm;
          if (dm > 1) floaters.spawn(player.x + 24, player.feet - 58, "×" + dm, fgForest(), { size: 12 });
        }
        if (overlap(box, obstacleBox(ob))) { handleHit(ob, i); if (state !== "running") return; }
      }

      // seeds, letters, pickups
      function drift(it) {
        it.x -= speed * dt;
        if (magnet) {
          var dx = pcx - it.x, dy = pcy - it.y;
          if (dx > -40 && dx < 240) { it.x += dx * 0.12 * dt; it.y += dy * 0.12 * dt; }
        }
      }
      for (var s = seeds.length - 1; s >= 0; s--) {
        var sd = seeds[s]; drift(sd);
        if (sd.x < -12) { seeds.splice(s, 1); continue; }
        if (touches(box, sd.x, sd.y, 9)) { seeds.splice(s, 1); takeSeed(sd); }
      }
      for (var l = letters.length - 1; l >= 0; l--) {
        var lt = letters[l]; drift(lt);
        if (lt.x < -16) { letters.splice(l, 1); continue; }
        if (touches(box, lt.x, lt.y, 13)) { letters.splice(l, 1); takeLetter(lt); }
      }
      for (var k = pickups.length - 1; k >= 0; k--) {
        var pu = pickups[k]; pu.x -= speed * dt;
        if (pu.x < -16) { pickups.splice(k, 1); continue; }
        if (touches(box, pu.x, pu.y, 14)) {
          pickups.splice(k, 1);
          particles.burst(pu.x, pu.y, { n: 14, color: [pal[POWERUPS[pu.id].color], pal.surface], speed: 2.2, life: 24, size: 2.6, kind: ["ring", "dot"] });
          grantPower(pu.id);
        }
      }

      // bloom leaf trail
      if (powers.active("bloom")) {
        trailT -= dt;
        if (trailT <= 0) {
          trailT = 3;
          particles.spawn(player.x + 4, player.feet - 16 - Math.random() * 18, { vx: -1.2 - Math.random() * 1.4, vy: -0.4 + Math.random() * 0.8, life: 32, color: Math.random() < 0.5 ? pal.ochre : pal.sage, size: 3, kind: "leaf", spin: 0.12, drag: 0.98 });
        }
      }

      parX += speed * dt;
      groundOff = (groundOff + speed * dt) % 28;
      syncHud();
    }

    // ---------- Scenery ----------
    // The sky is paper, nudged per chapter with pal.mix; Cosmos is the ink field.
    // These derived tints are the only colours here not read straight from a token.
    function tones(i) {
      var p = pal, sky;
      if (i === 4) {
        sky = p.fieldInk;
        return { sky: sky, back: p.mix(sky, p.onInk, 0.07), mid: p.mix(sky, p.onInk, 0.12), near: p.mix(sky, p.onInk, 0.18),
          ground: p.mix(sky, p.onInk, 0.06), line: p.onInkMuted, text: p.onInk, muted: p.onInkMuted, edge: p.onInk, cosmos: true };
      }
      if (i === 0) sky = p.mix(p.paper, p.surface, 0.6);          // crib: lightest paper
      else if (i === 1) sky = p.mix(p.paper, p.paper2, 0.7);      // toddler: a warmer paper
      else if (i === 2) sky = p.mix(p.paper, p.sageMist, 0.55);   // preschool: garden green tint
      else sky = p.mix(p.paper, p.research, p.isDark ? 0.16 : 0.1); // schoolyard: a sky tint from research blue
      var deep = p.isDark ? p.sage : p.sageDeep;
      return { sky: sky, back: p.mix(sky, deep, 0.22), mid: p.mix(sky, deep, 0.4), near: p.mix(sky, p.forest, p.isDark ? 0.22 : 0.3),
        ground: p.mix(sky, p.paper2, 0.5), line: p.ink, text: p.ink, muted: p.inkMuted, edge: p.ink, cosmos: false };
    }

    // layer(tileW, factor, fn): repeats fn(x, index) across the field, scrolled by parallax.
    function layer(tileW, factor, fn) {
      var dist = reduce ? 0 : parX * factor;
      var first = Math.floor(dist / tileW), off = dist - first * tileW;
      for (var j = 0, x = -off; x < W + tileW; x += tileW, j++) fn(x, first + j);
    }
    function fillPath(col) { ctx.fillStyle = col; ctx.fill(); }
    function rect(x, y, w, h, r, col) { draw.roundRect(ctx, x, y, w, h, r); fillPath(col); }
    function disc(x, y, r, col) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fillPath(col); }
    function line(x1, y1, x2, y2, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    function crescent(x, y, r, col, sky) { disc(x, y, r, col); disc(x + r * 0.42, y - r * 0.22, r * 0.86, sky); }
    function hump(x, w, h, col) { ctx.beginPath(); ctx.moveTo(x, G); ctx.bezierCurveTo(x + w * 0.15, G - h, x + w * 0.85, G - h, x + w, G); ctx.closePath(); fillPath(col); }

    var SCENES = [
      // Crib: a mobile overhead, crib rails, quilt humps and a teddy.
      function (c) {
        layer(520, 0.06, function (x, i) {
          var mx = x + 150, sway = reduce ? 0 : Math.sin(time * 0.02 + i) * 0.08;
          line(mx, 0, mx, 36, 2, c.back);
          ctx.save(); ctx.translate(mx, 36); ctx.rotate(sway);
          line(-60, 0, 60, 0, 3, c.back);
          line(-50, 0, -50, 26, 1.5, c.back); draw.star(ctx, -50, 36, 11, 5, 0.45, { fill: c.back });
          line(0, 0, 0, 40, 1.5, c.back); crescent(0, 52, 11, c.back, c.sky);
          line(50, 0, 50, 22, 1.5, c.back); disc(50, 32, 9, c.back);
          ctx.restore();
          disc(x + 380, 118, 24, c.back); disc(x + 410, 108, 30, c.back); disc(x + 442, 120, 20, c.back); rect(x + 358, 118, 104, 22, 11, c.back);
        });
        layer(240, 0.3, function (x) {
          rect(x - 2, G - 122, 244, 9, 4.5, c.mid);
          rect(x - 2, G - 34, 244, 7, 3.5, c.mid);
          for (var b = 14; b < 240; b += 22) rect(x + b, G - 114, 6, 82, 3, c.mid);
          rect(x, G - 138, 13, 138, 5, c.mid); disc(x + 6.5, G - 142, 9, c.mid);
        });
        layer(320, 0.6, function (x, i) {
          hump(x, 200, 34, c.near);
          draw.dashes(ctx, x + 36, G - 20, x + 164, G - 20, 4, 5, { stroke: c.sky, lineWidth: 1.4 });
          if (hash(i, 1) > 0.4) {
            var tx = x + 258;
            disc(tx, G - 14, 14, c.near); disc(tx, G - 36, 11, c.near); disc(tx - 9, G - 45, 4.5, c.near); disc(tx + 9, G - 45, 4.5, c.near);
          }
        });
      },
      // Toddler: nursery shelves, block towers, a ball and a stacking cone.
      function (c) {
        layer(320, 0.06, function (x, i) {
          rect(x + 20, 96, 190, 6, 2, c.back); rect(x + 20, 170, 190, 6, 2, c.back);
          for (var b = 0; b < 9; b++) {
            var bh = 30 + hash(i * 9 + b, 2) * 26, bw = 12 + hash(i * 9 + b, 3) * 8;
            rect(x + 26 + b * 20, 96 - bh, bw, bh, 2, c.back);
            if (b < 7) rect(x + 30 + b * 24, 170 - bh * 0.8, bw + 2, bh * 0.8, 2, c.back);
          }
          ctx.strokeStyle = c.back; ctx.lineWidth = 4; draw.roundRect(ctx, x + 240, 70, 52, 64, 4); ctx.stroke();
        });
        layer(240, 0.3, function (x, i) {
          var n = 2 + Math.floor(hash(i, 4) * 3);
          for (var k = 0; k < n; k++) rect(x + 30, G - 30 - k * 30, 28, 28, 3, c.mid);
          rect(x + 120, G - 30, 28, 28, 3, c.mid); rect(x + 150, G - 30, 28, 28, 3, c.mid); rect(x + 135, G - 60, 28, 28, 3, c.mid);
          ctx.beginPath(); ctx.moveTo(x + 133, G - 62); ctx.lineTo(x + 149, G - 84); ctx.lineTo(x + 165, G - 62); ctx.closePath(); fillPath(c.mid);
        });
        layer(300, 0.6, function (x, i) {
          disc(x + 60, G - 15, 15, c.near);
          line(x + 46, G - 15, x + 74, G - 15, 3, c.sky);
          if (hash(i, 5) > 0.35) {
            ctx.beginPath(); ctx.moveTo(x + 190, G); ctx.lineTo(x + 196, G - 40); ctx.lineTo(x + 208, G - 40); ctx.lineTo(x + 214, G); ctx.closePath(); fillPath(c.near);
            disc(x + 202, G - 44, 6, c.near);
          }
        });
      },
      // Preschool: garden trees, a picket fence, sprouts.
      function (c) {
        layer(300, 0.06, function (x, i) {
          var tx = x + 80 + hash(i, 6) * 80, th = 70 + hash(i, 7) * 40;
          rect(tx - 5, G - th, 10, th, 3, c.back);
          disc(tx, G - th - 18, 34, c.back); disc(tx - 26, G - th + 2, 24, c.back); disc(tx + 26, G - th + 2, 24, c.back);
          hump(x - 40, 380, 50, c.back);
        });
        layer(220, 0.3, function (x) {
          rect(x - 2, G - 52, 224, 7, 2, c.mid); rect(x - 2, G - 24, 224, 7, 2, c.mid);
          for (var p = 6; p < 220; p += 22) {
            ctx.beginPath(); ctx.moveTo(x + p, G); ctx.lineTo(x + p, G - 62); ctx.lineTo(x + p + 6, G - 70); ctx.lineTo(x + p + 12, G - 62); ctx.lineTo(x + p + 12, G); ctx.closePath(); fillPath(c.mid);
          }
        });
        layer(190, 0.6, function (x, i) {
          for (var k = 0; k < 3; k++) {
            var sx = x + 30 + k * 56 + hash(i * 3 + k, 8) * 20, sh = 14 + hash(i * 3 + k, 9) * 14;
            line(sx, G, sx, G - sh, 2.4, c.near);
            draw.leaf(ctx, sx, G - sh, 13, -Math.PI / 2 - 0.8, { fill: c.near });
            draw.leaf(ctx, sx, G - sh, 13, -Math.PI / 2 + 0.8, { fill: c.near });
          }
        });
      },
      // Schoolyard: a far kite and roofline, a swing set and a slide, grass.
      function (c) {
        layer(620, 0.05, function (x, i) {
          var kx = x + 180, ky = 76 + (reduce ? 0 : Math.sin(time * 0.03 + i) * 6);
          ctx.beginPath(); ctx.moveTo(kx, ky - 22); ctx.lineTo(kx + 15, ky); ctx.lineTo(kx, ky + 24); ctx.lineTo(kx - 15, ky); ctx.closePath(); fillPath(c.back);
          ctx.strokeStyle = c.back; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(kx, ky + 24); ctx.quadraticCurveTo(kx + 40, ky + 90, kx - 10, G - 60); ctx.stroke();
          rect(x + 400, G - 96, 160, 96, 2, c.back);
          ctx.beginPath(); ctx.moveTo(x + 392, G - 96); ctx.lineTo(x + 480, G - 136); ctx.lineTo(x + 568, G - 96); ctx.closePath(); fillPath(c.back);
          rect(x + 466, G - 168, 28, 40, 2, c.back);
          ctx.beginPath(); ctx.moveTo(x + 460, G - 168); ctx.lineTo(x + 480, G - 186); ctx.lineTo(x + 500, G - 168); ctx.closePath(); fillPath(c.back);
        });
        layer(440, 0.28, function (x, i) {
          line(x + 40, G, x + 70, G - 132, 6, c.mid); line(x + 100, G, x + 70, G - 132, 6, c.mid);
          line(x + 170, G, x + 200, G - 132, 6, c.mid); line(x + 230, G, x + 200, G - 132, 6, c.mid);
          line(x + 66, G - 132, x + 204, G - 132, 7, c.mid);
          for (var s = 0; s < 2; s++) {
            var sx = x + 108 + s * 44, sw = reduce ? 0 : Math.sin(time * 0.05 + s * 1.7 + i) * 10;
            line(sx, G - 130, sx + sw, G - 44, 2, c.mid); line(sx + 20, G - 130, sx + 20 + sw, G - 44, 2, c.mid);
            rect(sx - 3 + sw, G - 46, 26, 6, 2, c.mid);
          }
          line(x + 290, G, x + 290, G - 104, 4, c.mid); line(x + 312, G, x + 312, G - 104, 4, c.mid);
          for (var r = 1; r < 6; r++) line(x + 290, G - r * 18, x + 312, G - r * 18, 3, c.mid);
          ctx.strokeStyle = c.mid; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x + 312, G - 102); ctx.bezierCurveTo(x + 360, G - 96, x + 370, G - 8, x + 430, G - 8); ctx.stroke();
        });
        layer(170, 0.6, function (x, i) {
          for (var k = 0; k < 4; k++) {
            var gx = x + 20 + k * 40 + hash(i * 4 + k, 10) * 14, gh = 8 + hash(i * 4 + k, 11) * 8;
            ctx.beginPath(); ctx.moveTo(gx - 6, G); ctx.lineTo(gx - 3, G - gh); ctx.lineTo(gx, G - 2); ctx.lineTo(gx + 3, G - gh - 3); ctx.lineTo(gx + 6, G); ctx.closePath(); fillPath(c.near);
          }
        });
      },
      // Cosmos: dot stars, a crescent, far hills with a ringed planet, moon rocks.
      function (c) {
        for (var st = 0; st < 64; st++) {
          var sx = hash(st, 12) * W, sy = 8 + hash(st, 13) * (G - 60);
          var tw = reduce ? 0.7 : 0.45 + 0.4 * Math.sin(time * 0.04 + st * 1.3);
          disc(sx, sy, hash(st, 14) < 0.15 ? 1.8 : 1.1, pal.alpha(pal.onInk, tw));
        }
        crescent(W * 0.78, 70, 22, pal.alpha(pal.onInk, 0.9), c.sky);
        layer(360, 0.2, function (x, i) {
          disc(x + 180, G + 150, 190, c.mid);
          if (hash(i, 15) > 0.4) {
            var px = x + 70, py = 120 + hash(i, 16) * 50;
            disc(px, py, 13, c.mid);
            ctx.strokeStyle = c.near; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, 24, 6, -0.3, 0, Math.PI * 2); ctx.stroke();
          }
        });
        layer(220, 0.55, function (x, i) {
          hump(x + 10, 120, 22, c.near);
          disc(x + 50, G - 8, 4, c.mid); disc(x + 82, G - 12, 3, c.mid);
          if (hash(i, 17) > 0.5) hump(x + 150, 50, 12, c.near);
        });
      }
    ];

    function drawScene(i, c) {
      draw.paper(ctx, W, G, pal, { fill: c.sky, step: 20, dot: 1, grid: !c.cosmos, gridColor: pal.alpha(c.edge, pal.isDark ? 0.08 : 0.05) });
      SCENES[i](c);
      // ground strip
      ctx.fillStyle = c.ground; ctx.fillRect(0, G, W, H - G);
      ctx.fillStyle = c.line; ctx.fillRect(0, G - 0.75, W, 1.5);
      ctx.fillStyle = pal.alpha(c.line, 0.35);
      for (var gx = -groundOff; gx < W; gx += 28) ctx.fillRect(gx, G + 7, 12, 1.5);
    }

    // ---------- Art: obstacles ----------
    function bookColors(seed) {
      var cols = [pal.forest, pal.research, pal.clay, pal.sageDeep];
      var s = Math.floor(seed * 97);
      return [cols[s % 4], cols[(s + 1) % 4], cols[(s + 2) % 4]];
    }
    function drawBooks(ob, c) {
      var cols = bookColors(ob.seed);
      var heights = ob.type === "books2" ? [17, 16, 17] : [16, 14];
      var y = G, x = ob.x;
      for (var b = 0; b < heights.length; b++) {
        var bh = heights[b], inset = b === 0 ? 0 : (b % 2 ? 3 : -1), bw = ob.w - Math.abs(inset) * 2 - (b === 2 ? 4 : 0);
        y -= bh;
        var bx = x + (ob.w - bw) / 2 + inset;
        draw.box(ctx, bx, y, bw, bh, 2, { fill: cols[b], stroke: c.edge, lineWidth: 1.4, shadow: b === 0 ? 2.5 : 0, shadowColor: pal.shadow });
        ctx.fillStyle = pal.surface; ctx.fillRect(bx + bw - 6, y + 3, 4, bh - 6); // pages
        ctx.fillStyle = pal.alpha(pal.surface, 0.55); ctx.fillRect(bx + 5, y + 3, 2, bh - 6); // spine band
      }
    }
    function drawBlock(ob, c) {
      var x = ob.x, y = ob.y;
      draw.box(ctx, x, y, ob.w, ob.h, 4, { fill: pal.surface, stroke: c.edge, lineWidth: 1.5, shadow: 2.5, shadowColor: pal.shadow });
      ctx.strokeStyle = pal.clay; ctx.lineWidth = 1.5; draw.roundRect(ctx, x + 4, y + 4, ob.w - 8, ob.h - 8, 3); ctx.stroke();
      draw.label(ctx, "ABC".charAt(Math.floor(ob.seed * 3)), x + ob.w / 2, y + ob.h / 2 + 1, { font: "display", size: 18, weight: 600, color: pal.clayText });
    }
    function drawWagon(ob, c) {
      var x = ob.x;
      line(x + 2, G - 18, x - 14, G - 36, 2, c.edge);
      draw.circle(ctx, x - 14, G - 37, 3, { fill: pal.surface, stroke: c.edge, lineWidth: 1.4 });
      draw.box(ctx, x, G - 27, ob.w, 16, 3, { fill: pal.clay, stroke: c.edge, lineWidth: 1.5, shadow: 2.5, shadowColor: pal.shadow });
      ctx.fillStyle = pal.alpha(pal.surface, 0.45); ctx.fillRect(x + 5, G - 23, ob.w - 10, 2);
      var spin = reduce ? 0 : -parX * 0.12;
      for (var wI = 0; wI < 2; wI++) {
        var wx = x + 15 + wI * 36;
        draw.circle(ctx, wx, G - 7, 7, { fill: c.cosmos ? pal.onInkMuted : pal.inkSoft, stroke: c.edge, lineWidth: 1.4 });
        disc(wx, G - 7, 2.2, pal.surface);
        line(wx + Math.cos(spin) * 2.5, G - 7 + Math.sin(spin) * 2.5, wx + Math.cos(spin) * 5.5, G - 7 + Math.sin(spin) * 5.5, 1.2, pal.surface);
      }
    }
    function drawKite(ob, c) {
      var cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2, tilt = reduce ? 0 : Math.sin(time * 0.08 + ob.seed) * 0.12;
      // the tail streams behind, to the right
      ctx.strokeStyle = c.edge; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx, cy + 16);
      ctx.bezierCurveTo(cx + 18, cy + 30, cx + 30, cy + 10, cx + 52, cy + 22); ctx.stroke();
      for (var b = 0; b < 3; b++) {
        var bx = cx + 14 + b * 14, by = cy + 22 - b * 2 + (b === 1 ? -4 : 0);
        ctx.beginPath(); ctx.moveTo(bx - 4, by - 3); ctx.lineTo(bx + 4, by + 3); ctx.lineTo(bx + 4, by - 3); ctx.lineTo(bx - 4, by + 3); ctx.closePath(); fillPath(pal.sageDeep);
      }
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
      draw.shape(ctx, function (k) { k.beginPath(); k.moveTo(0, -18); k.lineTo(15, -2); k.lineTo(0, 17); k.lineTo(-15, -2); k.closePath(); },
        { fill: pal.clay, stroke: c.edge, lineWidth: 1.5, shadow: 2.5, shadowColor: pal.shadow });
      line(0, -17, 0, 16, 1.2, pal.surface); line(-14, -2, 14, -2, 1.2, pal.surface);
      ctx.restore();
    }
    function drawComet(ob, c) {
      var cx = ob.x + 13, cy = ob.y + ob.h / 2;
      for (var t = 0; t < 3; t++) {
        ctx.strokeStyle = pal.alpha(t === 1 ? pal.ochre : pal.onInk, 0.5 - t * 0.12); ctx.lineWidth = 5 - t * 1.2;
        ctx.beginPath(); ctx.moveTo(cx + 8, cy - 5 + t * 5); ctx.lineTo(cx + 46 + t * 8, cy - 9 + t * 7); ctx.stroke();
      }
      draw.circle(ctx, cx, cy, 11, { fill: pal.clay, stroke: c.edge, lineWidth: 1.5 });
      disc(cx - 3, cy - 3, 3, pal.alpha(pal.surface, 0.6));
      disc(cx + 3, cy + 4, 2, pal.alpha(pal.ink, 0.25));
    }

    // ---------- Art: the sprout ----------
    function drawSprout(c) {
      var p = player, duck = p.ducking;
      var sq = squashT > 0 && !reduce ? squashAmt * squashT : 0;
      if (p.apex > 0 && !reduce) sq = Math.min(sq, -0.35 * (p.apex / 10));
      var rx = duck ? 23 : 18, ry = duck ? 12 : 19;
      rx *= 1 + 0.16 * sq; ry *= 1 - 0.16 * sq;
      var cx = p.x + 20, bottom = p.feet - 4, cy = bottom - ry;
      // ground shadow, smaller when high
      var ht = clamp((G - p.feet) / 140, 0, 1);
      ctx.fillStyle = pal.alpha(c.cosmos ? pal.onInk : pal.ink, (pal.isDark || c.cosmos ? 0.18 : 0.12) * (1 - ht * 0.6));
      ctx.beginPath(); ctx.ellipse(cx, G + 1, rx * (1 - ht * 0.5), 3.5, 0, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      if (invulnT > 0) ctx.globalAlpha = reduce ? 0.6 : (Math.floor(invulnT / 4) % 2 ? 0.35 : 0.9);
      // feet
      var feetY = p.feet - 2;
      if (p.grounded) {
        var ph = Math.sin(legT * Math.PI * 2);
        disc(cx - 7, feetY - Math.max(0, ph) * 3, 3.6, c.edge); disc(cx + 7, feetY - Math.max(0, -ph) * 3, 3.6, c.edge);
      } else { disc(cx - 5, feetY - 2, 3.4, c.edge); disc(cx + 6, feetY - 3, 3.4, c.edge); }
      // leaves on top
      var top = cy - ry + 2, flutter = reduce ? 0 : Math.sin(time * 0.2) * 0.08;
      var back = duck ? -0.9 : 0;
      line(cx - 1, top + 3, cx - 1, top - 5, 2, c.edge);
      draw.leaf(ctx, cx - 1, top - 4, 17, -Math.PI / 2 - 0.75 + back + flutter, { fill: pal.sage, stroke: c.edge, lineWidth: 1.3 });
      draw.leaf(ctx, cx - 1, top - 4, 19, -Math.PI / 2 + 0.55 + back * 0.6 - flutter, { fill: pal.sageDeep, stroke: c.edge, lineWidth: 1.3 });
      // body: a round seed
      var bloom = powers.active("bloom");
      draw.shape(ctx, function (k) { k.beginPath(); k.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); },
        { fill: pal.forest, stroke: c.edge, lineWidth: 1.5, shadow: 2.5, shadowColor: pal.shadow });
      ctx.fillStyle = pal.alpha(pal.sage, pal.isDark ? 0.35 : 0.4);
      ctx.beginPath(); ctx.ellipse(cx - rx * 0.32, cy - ry * 0.38, rx * 0.36, ry * 0.26, -0.4, 0, Math.PI * 2); ctx.fill();
      // eyes look forward, widen in the air
      var air = !p.grounded, er = air ? 5.2 : 4.2;
      var blink = !reduce && p.grounded && (Math.floor(time / 100) % 5 === 0) && (time % 100) < 6 ? 1 : 0;
      var white = pal.isDark ? pal.ink : pal.surface, pupil = pal.isDark ? pal.fieldInk : pal.ink;
      draw.eyes(ctx, cx + rx * 0.3, cy - ry * (duck ? 0.05 : 0.15), duck ? 10 : 11, er, 1, clamp(p.vy / 10, -0.6, 0.8), pal, { blink: blink, white: white, ink: pupil });
      // cheek
      disc(cx + rx * 0.62, cy + ry * 0.35, 2.4, pal.alpha(pal.clay, 0.45));
      ctx.restore();

      // auras
      if (powers.active("shield")) {
        ctx.fillStyle = pal.alpha(pal.forest, 0.07); ctx.beginPath(); ctx.arc(cx, cy - 2, Math.max(rx, ry) + 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = pal.alpha(pal.forest, 0.6); ctx.lineWidth = 1.4; ctx.stroke();
      }
      if (bloom) {
        var pulse = reduce ? 0 : Math.sin(time * 0.2) * 1.5;
        draw.circle(ctx, cx, cy - 2, Math.max(rx, ry) + 16 + pulse, { stroke: pal.alpha(pal.ochre, 0.8), lineWidth: 2 });
        var bf = powers.frac("bloom");
        draw.ring(ctx, cx, cy - 2, Math.max(rx, ry) + 20 + pulse, bf, { stroke: pal.ochre, lineWidth: 1.4 });
      }
      if (powers.active("magnet")) {
        ctx.strokeStyle = pal.alpha(pal.research, 0.55); ctx.lineWidth = 1.4;
        var mph = reduce ? 0 : (time * 0.6) % 14;
        for (var m = 0; m < 2; m++) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(rx, ry) + 26 + m * 14 - mph, -0.7, 0.7); ctx.stroke(); }
      }
      if (powers.active("double") && !p.grounded) {
        draw.leaf(ctx, cx - rx - 2, cy, 12, Math.PI + 0.4, { fill: pal.alpha(pal.sage, 0.8), stroke: c.edge, lineWidth: 1 });
      }
    }

    // ---------- Art: pickups ----------
    function onColor(key) {
      var light = { forest: 1, research: 1 };
      if (pal.isDark) return key === "sage" ? pal.onInk : pal.fieldInk;
      return light[key] ? pal.surface : pal.fieldInk;
    }
    function drawPickup(pu, c) {
      var def = POWERUPS[pu.id], col = pal[def.color];
      var y = pu.y + (reduce ? 0 : Math.sin(time * 0.1) * 3);
      draw.circle(ctx, pu.x, y, 13, { fill: col, stroke: c.edge, lineWidth: 1.5, shadow: 2.5, shadowColor: pal.shadow });
      draw.circle(ctx, pu.x, y, 17 + (reduce ? 0 : Math.sin(time * 0.1) * 1.5), { stroke: pal.alpha(col, 0.6), lineWidth: 1.2 });
      draw.label(ctx, def.label.charAt(0), pu.x, y + 0.5, { font: "display", size: 15, weight: 600, color: onColor(def.color) });
    }
    function drawLetter(lt, c) {
      var y = lt.y + (reduce ? 0 : Math.sin(time * 0.09 + lt.bob) * 2.5);
      draw.box(ctx, lt.x - 11, y - 12, 22, 24, 4, { fill: pal.surface, stroke: pal.ochre, lineWidth: 1.8, shadow: 2.5, shadowColor: pal.shadow });
      draw.label(ctx, lt.ch, lt.x, y + 1, { font: "display", size: 16, weight: 600, color: pal.ink });
    }

    // ---------- Ground HUD: the word, the bloom meter, the dodge chain ----------
    function drawGroundHud(c) {
      var y = G + (H - G) / 2 + 4, w = word(), x0 = 14;
      for (var i = 0; i < w.length; i++) {
        var got = i < letterIdx, tx = x0 + i * 20;
        draw.box(ctx, tx, y - 9, 17, 18, 3, got ? { fill: pal.ochre, stroke: c.edge, lineWidth: 1.2 } : { stroke: pal.alpha(c.line, 0.4), lineWidth: 1.2 });
        draw.label(ctx, w.charAt(i), tx + 8.5, y + 1, { font: "display", size: 12, weight: 600, color: got ? pal.fieldInk : c.muted });
      }
      var mx = x0 + w.length * 20 + 14, mw = W < 400 ? 70 : 96;
      draw.label(ctx, "Bloom", mx, y - 1, { size: 10, color: c.muted, align: "left" });
      var bx = mx + 38;
      draw.pill(ctx, bx, y - 3, mw, 6, { fill: pal.alpha(c.line, 0.14) });
      var frac = powers.active("bloom") ? powers.frac("bloom") : growthSeeds / SEEDS_FOR_BLOOM;
      if (frac > 0) draw.pill(ctx, bx, y - 3, Math.max(6, mw * frac), 6, { fill: pal.ochre });
      if (combo.active() && combo.mult() > 1) {
        draw.label(ctx, "Chain ×" + combo.mult(), W - 14, y - 4, { size: 11, color: c.text, align: "right" });
        draw.pill(ctx, W - 64, y + 5, 50, 3, { fill: pal.alpha(c.line, 0.14) });
        draw.pill(ctx, W - 64, y + 5, 50 * combo.frac(), 3, { fill: c.cosmos ? pal.sage : pal.forest });
      }
    }

    // ---------- Render ----------
    function render() {
      cv.begin(camera);
      var from = tones(sceneFrom), to = tones(sceneTo);
      if (fadeT < 1 && sceneFrom !== sceneTo) {
        drawScene(sceneFrom, from);
        ctx.save(); ctx.globalAlpha = fadeT; drawScene(sceneTo, to); ctx.restore();
      } else drawScene(sceneTo, to);
      var c = fadeT > 0.5 ? to : from;

      for (var s = 0; s < seeds.length; s++) {
        var sd = seeds[s], sb = reduce ? 0 : Math.sin(time * 0.1 + sd.bob) * 1.5;
        draw.seed(ctx, sd.x, sd.y + sb, 5.5, pal);
      }
      for (var l = 0; l < letters.length; l++) drawLetter(letters[l], c);
      for (var k = 0; k < pickups.length; k++) drawPickup(pickups[k], c);
      for (var i = 0; i < obstacles.length; i++) {
        var ob = obstacles[i];
        if (ob.type === "books1" || ob.type === "books2") drawBooks(ob, c);
        else if (ob.type === "block") drawBlock(ob, c);
        else if (ob.type === "wagon") drawWagon(ob, c);
        else if (ob.type === "comet") drawComet(ob, c);
        else drawKite(ob, c);
      }
      if (state !== "dying" && state !== "gameover") drawSprout(c);

      particles.render(ctx);
      floaters.render(ctx);

      if (state !== "idle") drawGroundHud(c);

      // chapter banner
      var bn = story.banner();
      if (bn && state === "running") {
        var a = Math.min(1, bn.frac * 3) * Math.min(1, (1 - bn.frac) * 6 + 0.2);
        ctx.save(); ctx.globalAlpha = a;
        var ty = 34 + (reduce ? 0 : (1 - Math.min(1, (1 - bn.frac) * 4)) * -10);
        draw.label(ctx, bn.name, W / 2, ty, { font: "display", size: 28, color: c.text, weight: 500 });
        draw.label(ctx, bn.text, W / 2, ty + 25, { size: 12, color: c.muted, weight: 500, maxWidth: W - 32 });
        ctx.restore();
      }

      // chapter progress along the bottom rule
      if (state === "running" || state === "paused") {
        ctx.fillStyle = pal.alpha(pal.forest, 0.6); ctx.fillRect(0, H - 3, W * story.progress(score), 3);
      }
      cv.end();
    }

    var loop = A.makeLoop(tick, render);
    function onHidden() { if (state === "running") pause(); }

    A.debug("dino", {
      state: function () { return state; },
      score: function () { return Math.floor(score); },
      addScore: function (n) { score += n || 0; syncHud(); },
      grant: function (id) { if (POWERUPS[id]) grantPower(id); },
      skipTo: function (i) {
        i = clamp(i | 0, 0, CHAPTERS.length - 1);
        if (state !== "running") start();
        score = Math.max(score, CHAPTERS[i].at + 1);
        story.advance(score); fadeT = 1; syncHud();
      },
      die: die,
      // test helpers: hold the world still for a screenshot, or drop a thing in front
      still: function (on) { debugStill = !!on; },
      invuln: function (frames) { invulnT = frames || 600; },
      spawn: function (type, x) {
        if (type === "flyer") pushFlyer(x); else if (type === "letter") letters.push({ x: x || W - 60, y: G - 52, ch: word().charAt(letterIdx), bob: 0 });
        else if (POWERUPS[type]) pickups.push({ id: type, x: x || W - 60, y: G - 84, bob: 0 });
        else if (type === "seeds") { for (var q = 0; q < 4; q++) seeds.push({ x: (x || W - 120) + q * 22, y: G - 46 - Math.sin(q / 3 * Math.PI) * 34, bob: 0 }); }
        else pushGround(GROUND_KINDS[type] ? type : "books1", x);
      },
      jump: function () { jumpLatch = true; },
      world: function () { return { speed: speed, chapter: story.index(), obstacles: obstacles.length, feet: player.feet, W: W, H: H, G: G }; }
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
      // The phone turned: a run pauses; an idle field is laid out again.
      onViewport: function () {
        if (state === "running") pause();
        else if (state === "idle") { layoutField(); resetWorld(); render(); }
      },
      deactivate: function () {
        loop.stop();
        if (unsubHidden) { unsubHidden(); unsubHidden = null; }
        wake.release();
        synth.close();
        releaseHolds();
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
    A.defineGame("dino", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Brain Sprint",
        tagline: "From the crib to the cosmos.",
        label: "Brain Sprint game",
        canvas: { w: W, h: H, label: "Brain Sprint play field. Space or Up jumps, Down ducks." },
        hud: [{ id: "score", label: "Score", value: 0 }, { id: "best", label: "Best", value: A.leaderboard.best(GAME_KEY) }, { id: "seeds", label: "Seeds", value: 0 }, { id: "chapter", label: "Chapter", value: "Crib" }],
        help: "Space, Up or W jumps (hold for height) · Down or S ducks · P pauses · M mutes · Esc closes",
        touch: [
          { id: "jump", label: "Jump", aria: "Jump (hold for height)", wide: true },
          { id: "duck", label: "Duck", aria: "Duck" },
          { id: "pause", label: "Pause", aria: "Pause or resume", tap: true }
        ]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
