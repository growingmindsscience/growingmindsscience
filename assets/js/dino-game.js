/* Growing Minds Science — dino-game.js
   "Brain Sprint: Sprout Run" — the hidden endless runner on the Classes page.

   Trigger: the dead-center of the theme-toggle circle. Opening tears the page
   away (GMSArcade) then shows the game. The GMS brain-sprout mascot auto-runs,
   jumping book stacks and ducking flying toys.

   Built on window.GMSArcade (arcade-core.js) for the page-tear, the local
   leaderboard, the initials entry, and the mobile toolkit (wake lock,
   hidden-tab pause, viewport watcher, haptics). Self-contained otherwise: own
   overlay DOM, own rAF loop, full teardown on close. CSP-safe (no eval, no
   external assets; audio is Web Audio oscillator synth). Honors
   prefers-reduced-motion.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A) return;

  var GAME_KEY = "brain-sprint";
  var MUTE_KEY = "gms-dino-muted";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ---------- Palette (sampled from the GMS mark) ----------
  var INK = "#0E2A2D";
  var BRAIN = "#FD951F";
  var LEAF_TOP = "#9FCB43";
  var LEAF_SIDE = "#40C099";
  var WARM = "#D5BE98";
  var SAGE = "#517965";
  var BOOK_COLORS = ["#FD951F", "#40C099", "#9FCB43", "#D5BE98"];

  // ---------- Logical resolution ----------
  var W = 320, H = 120, GROUND_Y = 100;
  var STAND_W = 22, STAND_H = 28;
  var DUCK_W = 28, DUCK_H = 16;

  // ---------- Physics ----------
  var GRAVITY = 0.45;
  var JUMP_V = -5.6;
  var CHARGE_FRAMES = 12;     // how long a held jump keeps floating
  var COYOTE = 6;             // grace frames to jump after leaving ground
  var BUFFER = 7;             // grace frames to register an early jump press

  // ---------- Chapters (score gates + scene palette) ----------
  // Each: name, score floor, speed band [lo,hi], scene colors, night flag.
  // Gentle, slowly-rising difficulty: starts very easy and ramps gradually.
  var CHAPTERS = [
    { name: "Crib",       lo: 0,    sLo: 2.1, sHi: 2.7, bg: "#F4EFE3", far: "#E4DCC4", mid: "#C9D8C9", night: 0 },
    { name: "Toddler",    lo: 300,  sLo: 2.7, sHi: 3.4, bg: "#EAF2EA", far: "#CFE0D2", mid: "#A9C6B4", night: 0 },
    { name: "Preschool",  lo: 750,  sLo: 3.4, sHi: 4.2, bg: "#EDE8DC", far: "#D5BE98", mid: "#9FBFAB", night: 0 },
    { name: "Schoolyard", lo: 1400, sLo: 4.2, sHi: 5.1, bg: "#D9C9AE", far: "#B79B7B", mid: "#6F8F7B", night: 0.4 },
    { name: "Cosmos",     lo: 2300, sLo: 5.1, sHi: 6.0, bg: "#16242A", far: "#22323A", mid: "#33505A", night: 1 }
  ];

  // ---------- Small helpers ----------
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexToRgb(h) {
    return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
  }
  function rgbStr(c) { return "rgb(" + (c.r | 0) + "," + (c.g | 0) + "," + (c.b | 0) + ")"; }
  function hexLerp(h1, h2, t) {
    var a = hexToRgb(h1), b = hexToRgb(h2);
    return rgbStr({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });
  }

  function blockyRect(ctx, x, y, w, h, fill) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // ---------- Mascot sprite ----------
  function drawMascot(ctx, x, y, ducking, legState, bloom, squash) {
    x = Math.round(x); y = Math.round(y);
    var brainFill = bloom ? LEAF_TOP : BRAIN;
    if (ducking) {
      blockyRect(ctx, x + 4, y + 4, 20, 10, brainFill);
      ctx.fillStyle = INK;
      ctx.fillRect(x + 13, y + 5, 2, 8);
      blockyRect(ctx, x + 18, y, 6, 5, LEAF_TOP);
      blockyRect(ctx, x + 10, y + 1, 5, 4, LEAF_SIDE);
      blockyRect(ctx, x + 6, y + 13, 4, 3, INK);
      blockyRect(ctx, x + 17, y + 13, 4, 3, INK);
      return;
    }
    // legs (planted on the ground line, so they don't move with squash)
    if (legState === "tuck") {
      blockyRect(ctx, x + 6, y + 23, 3, 4, INK);
      blockyRect(ctx, x + 13, y + 23, 3, 4, INK);
    } else {
      var leftUp = legState === 1;
      blockyRect(ctx, x + 6, leftUp ? y + 22 : y + 24, 3, 4, INK);
      blockyRect(ctx, x + 13, leftUp ? y + 24 : y + 22, 3, 4, INK);
    }
    // Squash & stretch: integer width/height nudges only (never ctx.scale),
    // bottom-anchored so the feet stay planted. q>0 squashes (landing thud),
    // q<0 stretches (jump takeoff). Upper parts (stem/leaves) follow the body.
    var q = squash | 0;
    var bodyW = 16 + q * 2;
    var bodyH = 14 - q;
    var bodyX = x + 11 - Math.round(bodyW / 2);
    var bodyY = y + 24 - bodyH;
    var topD = q;
    blockyRect(ctx, x + 9, y + 6 + topD, 4, 5, INK);        // stem
    blockyRect(ctx, bodyX, bodyY, bodyW, bodyH, brainFill); // brain
    ctx.fillStyle = INK;
    ctx.fillRect(x + 10, bodyY + 1, 2, bodyH - 2);          // midline
    blockyRect(ctx, x + 9, y + topD, 4, 7, LEAF_TOP);       // top leaf
    blockyRect(ctx, x + 2, y + 3 + topD, 6, 5, LEAF_SIDE);  // side leaves
    blockyRect(ctx, x + 14, y + 3 + topD, 6, 5, LEAF_SIDE);
  }

  function drawBook(ctx, ob) {
    var x = Math.round(ob.x);
    var stack = ob.variant === 2 ? [13, 13] : [16];
    var y = GROUND_Y;
    for (var i = 0; i < stack.length; i++) {
      var bh = stack[i];
      y -= bh;
      blockyRect(ctx, x, y, 16, bh, BOOK_COLORS[(ob.colorSeed + i) % BOOK_COLORS.length]);
      ctx.fillStyle = INK;
      ctx.fillRect(x + 3, y, 2, bh);
    }
  }

  function drawToy(ctx, ob) {
    var x = Math.round(ob.x), y = Math.round(ob.y);
    blockyRect(ctx, x + 4, y + 2, 14, 6, "#FFFFFF");
    blockyRect(ctx, x, y + 3, 4, 4, "#FFFFFF");
    blockyRect(ctx, x + 14, y, 4, 9, LEAF_SIDE);
    ctx.fillStyle = LEAF_SIDE;
    ctx.fillRect(x + 4, y + 4, 14, 2);
  }

  // ======================================================================
  //  Game controller
  // ======================================================================
  function createGame(canvas, els) {
    var ctx = canvas.getContext("2d");
    var backingScale = 1; // hi-res backing store so text stays crisp when scaled up
    ctx.imageSmoothingEnabled = false;
    canvas.width = W;
    canvas.height = H;

    var reduce = A.prefersReducedMotion();
    // Shared juice: crisp shake + hit-stop, and a gentle dodge-streak
    // multiplier. Tiny maxPx keeps the shake subtle for a calm kids' game.
    // Audio-mute is deliberately independent of reduced-motion (a11y:
    // motion-sensitive players still get sound).
    var camera = A.makeCamera({ reduce: reduce, maxPx: 2 });
    var combo = A.makeCombo({ window: 150, max: 5 });

    // Mobile toolkit: the screen must not sleep mid-run, and a hidden tab
    // must not burn one. Both no-op where the platform lacks the API.
    var wake = A.makeWakeLock();
    var offHidden = null;

    var state = "idle"; // idle | running | paused | dying | gameover
    var player, obstacles, seeds, particles, floaters;
    var speed, score, groundOffset, parX, nextSpawn;
    var coyoteTimer, bufferTimer, chargeFrames, jumpHeld, jumpConsumed, downHeld;
    var legPhase, legTimer;
    var growthSeeds, bloomTimer, shieldArmed, shieldSeedCounter, invulnTimer;
    var chapterIdx, palT, palPrev, scene;
    var flashTimer;
    var squashTimer, squashPeak;
    var deathTimer, deathFlash, dyingScore;
    var milestoneText, milestoneTimer, nextMilestone;
    var blinkTimer;

    var PARTICLE_CAP = 28, FLOATER_CAP = 12;
    var SQUASH_MAX = 8;

    function resetWorld() {
      player = { x: 26, top: GROUND_Y - STAND_H, vy: 0, grounded: true, ducking: false };
      obstacles = [];
      seeds = [];
      particles = particles || [];
      floaters = floaters || [];
      particles.length = 0; floaters.length = 0;
      speed = CHAPTERS[0].sLo;
      score = 0;
      groundOffset = 0; parX = 0;
      nextSpawn = 95;
      coyoteTimer = 0; bufferTimer = 0; chargeFrames = 0;
      jumpHeld = false; jumpConsumed = false; downHeld = false;
      legPhase = 0; legTimer = 0;
      growthSeeds = 0; bloomTimer = 0; shieldArmed = true; shieldSeedCounter = 0; invulnTimer = 0;
      chapterIdx = 0; palT = 1; palPrev = CHAPTERS[0]; scene = sceneColors(CHAPTERS[0], CHAPTERS[0], 1);
      flashTimer = 0;
      squashTimer = 0; squashPeak = 0;
      deathTimer = 0; deathFlash = 0; dyingScore = 0;
      combo.reset(true);
      milestoneText = ""; milestoneTimer = 0; nextMilestone = 250;
      blinkTimer = 0;
    }

    function sceneColors(from, to, t) {
      return {
        bg: hexLerp(from.bg, to.bg, t),
        far: hexLerp(from.far, to.far, t),
        mid: hexLerp(from.mid, to.mid, t),
        night: lerp(from.night, to.night, t)
      };
    }

    function currentW() { return player.ducking ? DUCK_W : STAND_W; }
    function currentH() { return player.ducking ? DUCK_H : STAND_H; }

    // ---------- Audio (shared GMSArcade synth: compressor + noise + arp) ----------
    var audio = A.makeSynth({ muteKey: MUTE_KEY });
    function ensureAudio() { audio.ensure(); }
    var sfx = {
      jump: function () { audio.beep(220, 330, 0.08, "square", 0.5); },
      land: function () { audio.beep(150, 110, 0.05, "sine", 0.35); audio.noise(0.09, 500, 0.22); },
      seed: function () { audio.beep(660, 880, 0.05, "triangle", 0.4); },
      bloom: function () { audio.arp([440, 660, 880, 1100], 0.05, 0.16, "triangle", 0.45); },
      smash: function () { audio.beep(520, 200, 0.08, "square", 0.35); audio.noise(0.12, 800, 0.32); },
      shield: function () { audio.beep(300, 120, 0.12, "sawtooth", 0.4); },
      hit: function () { audio.beep(200, 70, 0.22, "sawtooth", 0.55); audio.noise(0.28, 700, 0.4); },
      milestone: function () { audio.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.45); }
    };

    // ---------- Particles / floaters (pooled) ----------
    function spawnParticle(x, y, vx, vy, life, color, size) {
      if (reduce) return;
      var p;
      for (var i = 0; i < particles.length; i++) { if (particles[i].life <= 0) { p = particles[i]; break; } }
      if (!p) { if (particles.length >= PARTICLE_CAP) return; p = {}; particles.push(p); }
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.maxLife = life; p.color = color; p.size = size || 2;
    }
    function spawnBurst(x, y, color, n) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 1.4;
        spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 0.5, 10 + Math.random() * 8, color, 2);
      }
    }
    function spawnFloater(x, y, text, color) {
      if (reduce) return;
      var f;
      for (var i = 0; i < floaters.length; i++) { if (floaters[i].life <= 0) { f = floaters[i]; break; } }
      if (!f) { if (floaters.length >= FLOATER_CAP) return; f = {}; floaters.push(f); }
      f.x = x; f.y = y; f.life = 26; f.maxLife = 26; f.text = text; f.color = color;
    }

    // ---------- Controls ----------
    function setJumpHeld(on) {
      jumpHeld = on;
      if (on) jump();
      else if (player.vy < 0) player.vy *= 0.45; // variable jump: cut on release
    }
    function jump() {
      if (state === "idle") { start(); return; }
      if (state === "paused") { resumeGame(); return; } // the resume tap must not also hop
      if (state === "dying") return;  // ignore input during the death animation
      if (state === "gameover") {
        if (document.activeElement && document.activeElement.tagName === "INPUT") return;
        restart();
        return;
      }
      if ((player.grounded || coyoteTimer > 0) && !jumpConsumed && !player.ducking) {
        player.vy = JUMP_V;
        player.grounded = false;
        jumpConsumed = true;
        chargeFrames = CHARGE_FRAMES;
        coyoteTimer = 0;
        squashPeak = -2; squashTimer = SQUASH_MAX;   // stretch on takeoff
        ensureAudio(); sfx.jump();
        A.haptics.tick();
      } else if (!player.grounded) {
        bufferTimer = BUFFER;
      }
    }
    function setDucking(on) {
      downHeld = on;
      if (state !== "running") return;
      if (!player.grounded) { if (on) player.vy = Math.max(player.vy, 4.0); return; } // fast-fall
      if (on === player.ducking) return;
      player.ducking = on;
      player.top = GROUND_Y - currentH();
      if (on) A.haptics.tick();
    }

    function start() { resetWorld(); state = "running"; hidePrompt(); }
    function restart() { resetWorld(); state = "running"; hidePrompt(); }

    // Held inputs are released before pausing: once the page is hidden the
    // matching touchend/keyup may never arrive.
    function pauseGame() {
      if (state !== "running") return;
      jumpHeld = false;
      setDucking(false);
      state = "paused";
      showPaused();
    }
    function resumeGame() {
      if (state !== "paused") return;
      state = "running";
      lastTime = 0; // rAF stalls while hidden; a stale timestamp would dt-jump
      hidePrompt();
    }

    function gameOver() {
      combo.reset();
      ensureAudio(); sfx.hit();
      A.haptics.crash(); // here so every input path (touch, key, button) buzzes
      dyingScore = Math.floor(score);
      camera.shake(0.9); camera.freeze(reduce ? 0 : 6);
      // Reduced-motion players skip the shatter and go straight to the card.
      if (reduce) { finalizeGameOver(); return; }
      state = "dying";
      deathTimer = 30; deathFlash = 6;
      spawnShatter(player.x + 11, player.top + 14);
    }
    function finalizeGameOver() {
      state = "gameover";
      showGameOver(dyingScore);
    }
    // Burst the mascot into ~13 blocky leaf/brain/warm fragments.
    function spawnShatter(cx, cy) {
      var cols = [LEAF_TOP, LEAF_SIDE, BRAIN, INK, WARM];
      for (var i = 0; i < 13; i++) {
        var a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 1.8;
        spawnParticle(cx + (Math.random() * 10 - 5), cy + (Math.random() * 14 - 7),
          Math.cos(a) * sp, Math.sin(a) * sp - 1.0, 16 + Math.random() * 10, cols[i % cols.length], 3);
      }
    }
    // Always-decrementing death animation (driven from the loop, since tick()'s
    // world-stepping is gated on state === "running").
    function tickDeath(dt) {
      if (deathFlash > 0) deathFlash -= dt;
      deathTimer -= dt;
      updateParticles(dt);
      if (deathTimer <= 0) finalizeGameOver();
    }

    // ---------- Spawning ----------
    function airTimeFrames() {
      // Approx frames airborne for a held jump: rise to apex + fall back.
      var v = -JUMP_V; // upward magnitude
      return (v / GRAVITY) * 2 + CHARGE_FRAMES * 0.5;
    }
    function minGapPx() { return Math.max(34, airTimeFrames() * speed * 0.42); }

    function spawnObstacle() {
      var ch = chapterIdx;
      var roll = Math.random();
      var madeToy = false;
      // Chapter-gated spawn table — very easy at first, building up gradually.
      if (ch === 0) {
        // Crib: single books only, wide gaps, the occasional gentle 2-stack.
        pushBook(roll < 0.1 ? 2 : 1);
      } else if (ch === 1) {
        // Toddler: introduce flying toys sparingly, a few 2-stacks.
        if (roll < 0.3) { pushToy(); madeToy = true; }
        else pushBook(roll < 0.65 ? 2 : 1);
      } else if (ch === 2) {
        // Preschool: more toys, first telegraphed combos.
        if (roll < 0.14) pushCombo();
        else if (roll < 0.46) { pushToy(); madeToy = true; }
        else pushBook(roll < 0.72 ? 2 : 1);
      } else {
        // Schoolyard / Cosmos: full mix.
        if (roll < 0.2) pushCombo();
        else if (roll < 0.5) { pushToy(); madeToy = true; }
        else pushBook(roll < 0.75 ? 2 : 1);
      }
      // Lay a teaching seed cluster along the safe line.
      maybeSeedCluster(madeToy);
      // Extra breathing room early; tightens as chapters advance.
      var gap = minGapPx() + 30 + Math.random() * 80 + (ch === 0 ? 34 : ch === 1 ? 16 : 0);
      nextSpawn = gap;
    }
    function pushBook(variant) {
      obstacles.push({ type: "book", x: W + 10, variant: variant, w: 16, h: variant === 2 ? 26 : 16,
        colorSeed: Math.floor(Math.random() * BOOK_COLORS.length), scored: false });
    }
    function pushToy() {
      obstacles.push({ type: "toy", x: W + 10, baseY: GROUND_Y - 30, y: GROUND_Y - 30, w: 18, h: 10,
        seed: Math.random() * 1000, scored: false });
    }
    function pushCombo() {
      // Book then a trailing toy at a fixed fair gap (jump-then-duck).
      pushBook(1);
      obstacles.push({ type: "toy", x: W + 10 + 40, baseY: GROUND_Y - 30, y: GROUND_Y - 30, w: 18, h: 10,
        seed: Math.random() * 1000, scored: false });
    }
    function maybeSeedCluster(duckLane) {
      if (seeds.length > 0) return;
      if (Math.random() > 0.7) return;
      var n = 3 + Math.floor(Math.random() * 3);
      var startX = W + 60;
      var laneY = duckLane ? GROUND_Y - 26 : GROUND_Y - 34;
      for (var i = 0; i < n; i++) {
        var sx = startX + i * 12;
        var sy = duckLane ? laneY : laneY - Math.round(Math.sin((i / (n - 1)) * Math.PI) * 12);
        seeds.push({ x: sx, y: sy, taken: false, glint: Math.random() * Math.PI * 2 });
      }
    }

    // ---------- Hitboxes ----------
    function playerHitbox() {
      var d = player.ducking;
      return { x: player.x + 3, y: player.top + (d ? 2 : 7), w: currentW() - 7, h: currentH() - (d ? 4 : 9) };
    }
    function obstacleHitbox(ob) {
      if (ob.type === "book") return { x: ob.x + 3, y: GROUND_Y - ob.h + 2, w: ob.w - 5, h: ob.h - 2 };
      return { x: ob.x + 3, y: ob.y + 2, w: ob.w - 5, h: ob.h - 4 };
    }
    function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

    // ---------- Update ----------
    function updateParticles(dt) {
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 0.12 * dt; pt.life -= dt;
      }
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        fl.y -= 0.35 * dt; fl.life -= dt;
      }
    }

    function tick(dt) {
      if (state === "dying") { tickDeath(dt); return; }
      combo.tick(dt);

      // Chapter + speed + palette
      var ci = 0;
      for (var c = CHAPTERS.length - 1; c >= 0; c--) { if (score >= CHAPTERS[c].lo) { ci = c; break; } }
      if (ci !== chapterIdx) {
        palPrev = scene;            // cross-fade from the currently-rendered colors
        chapterIdx = ci;
        palT = 0;
        triggerMilestone(CHAPTERS[ci].name);
      }
      if (palT < 1) {
        palT = Math.min(1, palT + dt / 30);
        var target = CHAPTERS[chapterIdx];
        scene = {
          bg: hexLerp(palPrev.bg, target.bg, palT),
          far: hexLerp(palPrev.far, target.far, palT),
          mid: hexLerp(palPrev.mid, target.mid, palT),
          night: lerp(palPrev.night, target.night, palT)
        };
      }
      var ch = CHAPTERS[chapterIdx];
      var bandT = clamp((score - ch.lo) / ((CHAPTERS[chapterIdx + 1] ? CHAPTERS[chapterIdx + 1].lo : ch.lo + 900) - ch.lo), 0, 1);
      speed = clamp(lerp(ch.sLo, ch.sHi, bandT), 2.1, 6.0);

      // Score
      var mult = bloomTimer > 0 ? 2 : 1;
      score += speed * dt * 0.1 * mult;

      // Milestone beats every 250
      if (score >= nextMilestone) { triggerMilestone(nextMilestone + " — keep growing!"); nextMilestone += 250; }

      // Timers
      if (bloomTimer > 0) bloomTimer -= dt;
      if (invulnTimer > 0) invulnTimer -= dt;
      if (coyoteTimer > 0) coyoteTimer -= dt;
      if (bufferTimer > 0) bufferTimer -= dt;
      if (flashTimer > 0) flashTimer -= dt;
      if (squashTimer > 0) squashTimer -= dt;
      if (milestoneTimer > 0) milestoneTimer -= dt;
      blinkTimer += dt;

      // Physics
      if (!player.grounded) {
        var wasUp = player.vy < 0;
        if (jumpHeld && wasUp && chargeFrames > 0) { player.vy += GRAVITY * 0.45 * dt; chargeFrames -= dt; }
        else player.vy += GRAVITY * dt;
        player.top += player.vy * dt;
        if (player.top + currentH() >= GROUND_Y) {
          player.top = GROUND_Y - currentH();
          player.vy = 0;
          player.grounded = true;
          jumpConsumed = false;
          squashPeak = 2; squashTimer = SQUASH_MAX;   // squash on the landing thud
          if (!reduce) for (var d = 0; d < 4; d++) spawnParticle(player.x + 4 + d * 3, GROUND_Y - 1, (Math.random() - 0.5) * 1.2, -Math.random() * 0.8, 10, WARM, 2);
          ensureAudio(); sfx.land();
          if (bufferTimer > 0) { bufferTimer = 0; jump(); }
          if (downHeld) setDucking(true);
        }
      } else {
        if (downHeld !== player.ducking) setDucking(downHeld);
      }

      // Leg cycle
      legTimer += dt;
      if (legTimer > 6) { legTimer = 0; legPhase = legPhase ? 0 : 1; }

      // Spawn
      nextSpawn -= speed * dt;
      if (nextSpawn <= 0) spawnObstacle();

      // Obstacles
      var box = playerHitbox();
      for (var i = obstacles.length - 1; i >= 0; i--) {
        var ob = obstacles[i];
        ob.x -= speed * dt;
        if (ob.type === "toy") ob.y = ob.baseY + Math.sin((ob.seed + ob.x) * 0.05) * 3;
        if (ob.x + ob.w < -12) { obstacles.splice(i, 1); continue; }
        if (!ob.scored && ob.x + ob.w < player.x) {
          // Dodge streak: cleanly clearing an obstacle extends the chain and
          // adds a small (gentle) multiplied bonus. A hit resets it.
          ob.scored = true;
          var dm = combo.hit();
          score += dm;
          if (dm > 1) spawnFloater(player.x + 22, player.top + 4, "x" + dm, LEAF_SIDE);
        }
        if (overlap(box, obstacleHitbox(ob))) handleHit(ob, i);
      }

      // Seeds
      for (var s = seeds.length - 1; s >= 0; s--) {
        var sd = seeds[s];
        sd.x -= speed * dt;
        sd.glint += dt * 0.3;
        if (sd.x < -8) { seeds.splice(s, 1); continue; }
        if (!sd.taken && overlap(box, { x: sd.x - 2, y: sd.y - 2, w: 7, h: 7 })) {
          sd.taken = true; seeds.splice(s, 1);
          score += 20;
          growthSeeds++; shieldSeedCounter++;
          spawnBurst(sd.x, sd.y, LEAF_TOP, 5);
          spawnFloater(sd.x, sd.y - 4, "+20", LEAF_SIDE);
          ensureAudio(); sfx.seed();
          if (growthSeeds >= 12) { growthSeeds = 0; bloomTimer = 300; spawnBurst(player.x + 11, player.top + 14, BRAIN, 10); camera.freeze(reduce ? 0 : 4); camera.shake(0.2); ensureAudio(); sfx.bloom(); A.haptics.pop(); }
          if (!shieldArmed && shieldSeedCounter >= 15) { shieldArmed = true; shieldSeedCounter = 0; }
        }
      }

      // World scroll
      groundOffset = (groundOffset + speed * dt) % 14;
      parX = (parX + speed * dt);

      // Particles / floaters
      updateParticles(dt);
    }

    function handleHit(ob, i) {
      if (bloomTimer > 0) {
        obstacles.splice(i, 1);
        score += 10;
        spawnBurst(ob.x + 8, (ob.type === "book" ? GROUND_Y - ob.h / 2 : ob.y + 4), BOOK_COLORS[Math.floor(Math.random() * 4)], 8);
        spawnFloater(ob.x + 4, GROUND_Y - 40, "+10", BRAIN);
        camera.freeze(reduce ? 0 : 2); camera.shake(0.12);   // smash crunch
        ensureAudio(); sfx.smash();
        return;
      }
      if (invulnTimer > 0) return;
      if (shieldArmed) {
        shieldArmed = false; invulnTimer = 60; growthSeeds = 0; shieldSeedCounter = 0;
        combo.reset();
        spawnBurst(player.x + 11, player.top + 12, LEAF_TOP, 6);
        if (!reduce) flashTimer = 4;
        camera.freeze(reduce ? 0 : 4); camera.shake(0.25);   // shield-break jolt
        ensureAudio(); sfx.shield();
        A.haptics.thump();
        return;
      }
      gameOver();
    }

    function triggerMilestone(text) {
      milestoneText = text;
      milestoneTimer = 90;
      camera.shake(0.2);   // gentle celebratory nudge (auto-zeroes under reduced motion)
      ensureAudio(); sfx.milestone();
      A.haptics.pop();
    }

    // ---------- Render ----------
    function render() {
      ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      var sh = camera.offset();
      ctx.translate(sh.x, sh.y);

      // Sky
      ctx.fillStyle = scene.bg;
      ctx.fillRect(-4, -4, W + 8, H + 8);

      // Stars at night
      if (scene.night > 0.05) {
        ctx.fillStyle = "rgba(255,255,255," + (0.5 * scene.night).toFixed(2) + ")";
        for (var st = 0; st < 14; st++) {
          var sxp = (st * 53 + 13) % W, syp = (st * 29 + 7) % 60;
          ctx.fillRect(sxp, syp, 1, 1);
        }
      }

      // Sun / moon
      var orbX = 250 - (reduce ? 0 : (parX * 0.05) % 360);
      ctx.fillStyle = scene.night > 0.5 ? "#E9E4D6" : "#F4D58A";
      ctx.beginPath(); ctx.arc(orbX, 26, 9, 0, Math.PI * 2); ctx.fill();

      // Parallax far hills
      var farOff = reduce ? 0 : (parX * 0.15) % 80;
      ctx.fillStyle = scene.far;
      for (var hx = -80 + (80 - farOff); hx < W + 40; hx += 80) {
        ctx.beginPath();
        ctx.moveTo(hx, 88); ctx.lineTo(hx + 40, 64); ctx.lineTo(hx + 80, 88); ctx.closePath(); ctx.fill();
      }
      // Parallax mid silhouettes (bookshelf blocks)
      var midOff = reduce ? 0 : (parX * 0.4) % 48;
      ctx.fillStyle = scene.mid;
      for (var mx = -48 + (48 - midOff); mx < W + 24; mx += 48) {
        ctx.fillRect(mx, 80, 10, 18);
        ctx.fillRect(mx + 16, 74, 8, 24);
        ctx.fillRect(mx + 30, 84, 12, 14);
      }

      // Ground
      ctx.fillStyle = INK;
      ctx.fillRect(-4, GROUND_Y, W + 8, 2);
      for (var gx = -14 + (W - groundOffset) % 14; gx < W; gx += 14) ctx.fillRect(gx, GROUND_Y + 4, 7, 2);

      // Seeds
      for (var s = 0; s < seeds.length; s++) {
        var sd = seeds[s];
        if (!reduce) A.pixelGlow(ctx, sd.x, sd.y, 3, LEAF_TOP, 0.14);
        blockyRect(ctx, sd.x - 1, sd.y - 1, 3, 3, LEAF_SIDE);
        var gx2 = sd.x + Math.round(Math.cos(sd.glint) * 2);
        var gy2 = sd.y + Math.round(Math.sin(sd.glint) * 2);
        ctx.fillStyle = LEAF_TOP; ctx.fillRect(gx2, gy2, 1, 1);
      }

      // Obstacles
      var nightGlow = scene.night > 0.4;
      for (var i = 0; i < obstacles.length; i++) {
        var ob = obstacles[i];
        if (nightGlow) { ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(Math.round(ob.x) - 2, (ob.type === "book" ? GROUND_Y - ob.h : ob.y) - 2, ob.w + 4, ob.h + 4); }
        if (ob.type === "book") drawBook(ctx, ob); else drawToy(ctx, ob);
      }

      // Mascot — drawn crisp at integer positions (no scale transform, so it
      // never looks fuzzy or jittery). Blinks briefly only during invuln.
      var blink = invulnTimer > 0 && (Math.floor(blinkTimer / 3) % 2 === 0);
      if (!blink && state !== "dying") {
        var ls = player.grounded ? legPhase : "tuck";
        var q = (!reduce && squashTimer > 0) ? Math.round(squashPeak * (squashTimer / SQUASH_MAX)) : 0;
        // Subtle warm living aura (brighter mid-bloom). Crisp pixel bloom only.
        if (!reduce) {
          var acx = player.x + 11, acy = player.top + Math.round(currentH() / 2);
          A.pixelGlow(ctx, acx, acy, bloomTimer > 0 ? 13 : 10, bloomTimer > 0 ? BRAIN : WARM, bloomTimer > 0 ? 0.12 : 0.07);
        }
        drawMascot(ctx, player.x, player.top, player.ducking, ls, bloomTimer > 0, q);
        // Shield aura
        if (shieldArmed && !player.ducking) {
          ctx.strokeStyle = "rgba(64,192,153,0.7)"; ctx.lineWidth = 1;
          ctx.strokeRect(player.x + 1, player.top + 8, 20, 18);
        }
        // Bloom aura
        if (bloomTimer > 0) {
          ctx.strokeStyle = "rgba(253,149,31," + (0.4 + 0.3 * Math.sin(blinkTimer * 0.4)).toFixed(2) + ")";
          ctx.lineWidth = 1;
          ctx.strokeRect(player.x - 1, player.top + 6, 24, 22);
        }
      }

      // Particles
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
      }
      ctx.globalAlpha = 1;

      // Floaters
      ctx.font = "7px monospace"; ctx.textAlign = "center";
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        ctx.globalAlpha = clamp(fl.life / fl.maxLife, 0, 1);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, Math.round(fl.x), Math.round(fl.y));
      }
      ctx.globalAlpha = 1; ctx.textAlign = "left";

      // Growth meter
      var meterW = 60, fillW = Math.round((growthSeeds / 12) * meterW);
      ctx.fillStyle = "rgba(14,42,45,0.25)"; ctx.fillRect(6, 6, meterW, 4);
      ctx.fillStyle = bloomTimer > 0 ? BRAIN : LEAF_TOP; ctx.fillRect(6, 6, fillW, 4);

      // Dodge-streak multiplier (top-right) with a thin draining window bar.
      var cm = combo.mult();
      if (cm > 1) {
        ctx.font = "bold 8px monospace"; ctx.textAlign = "right";
        ctx.fillStyle = cm >= 4 ? BRAIN : LEAF_SIDE;
        ctx.fillText("x" + cm, W - 6, 12);
        ctx.fillStyle = "rgba(64,192,153,0.5)";
        ctx.fillRect(W - 26, 15, Math.round(20 * combo.frac()), 1);
        ctx.textAlign = "left";
      }

      // Bloom vignette
      if (bloomTimer > 0) {
        ctx.strokeStyle = "rgba(159,203,67,0.5)"; ctx.lineWidth = 3;
        ctx.strokeRect(1, 1, W - 2, H - 2);
      }

      // Milestone banner
      if (milestoneTimer > 0) {
        ctx.globalAlpha = clamp(milestoneTimer / 90, 0, 1);
        ctx.fillStyle = INK; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        ctx.fillText(milestoneText, W / 2, 22);
        ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // Gentle shield-break flash (soft, brief).
      if (flashTimer > 0) {
        ctx.globalAlpha = clamp(flashTimer / 4, 0, 1) * 0.22;
        ctx.fillStyle = "#FFF8E7"; ctx.fillRect(-4, -4, W + 8, H + 8);
        ctx.globalAlpha = 1;
      }

      // Death shatter cream flash (brief, brighter pop as the mascot bursts).
      if (deathFlash > 0) {
        ctx.globalAlpha = clamp(deathFlash / 6, 0, 1) * 0.55;
        ctx.fillStyle = "#FFF8E7"; ctx.fillRect(-4, -4, W + 8, H + 8);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    // ---------- HUD bridge ----------
    function updateScoreHud() {
      if (els.score) els.score.textContent = String(Math.floor(score)).padStart(5, "0");
      if (els.best) els.best.textContent = String(A.leaderboard.best(GAME_KEY)).padStart(5, "0");
    }

    // ---------- Prompt screens ----------
    function hidePrompt() { if (els.prompt) els.prompt.hidden = true; }
    function showIdle() {
      if (!els.prompt) return;
      els.promptTitle.textContent = "Brain Sprint";
      els.promptText.textContent = "Hold to jump higher · ↓ / swipe down to duck";
      els.promptActions.textContent = "";
      A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores" });
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Start";
      btn.addEventListener("click", function () { start(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
      els.prompt.hidden = false;
    }
    // The hidden-tab pause card. Any stage tap resumes too (jump() routes
    // paused-state input here), so the button is a fallback, not the only way.
    function showPaused() {
      if (!els.prompt) return;
      els.promptTitle.textContent = "Paused";
      els.promptText.textContent = "Tap anywhere to resume";
      els.promptActions.textContent = "";
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Resume";
      btn.addEventListener("click", function () { resumeGame(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
      els.prompt.hidden = false;
    }
    function showGameOver(finalScore) {
      updateScoreHud();
      els.promptTitle.textContent = "Game over";
      els.promptText.textContent = "Score " + String(finalScore).padStart(5, "0") +
        (combo.best() > 1 ? " · best dodge streak " + combo.best() : "");
      els.promptActions.textContent = "";
      if (A.leaderboard.qualifies(GAME_KEY, finalScore)) {
        A.mountInitialsEntry(els.promptActions, {
          gameKey: GAME_KEY, score: finalScore,
          onDone: function (rank) {
            updateScoreHud();
            els.promptActions.textContent = "";
            A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores", highlightRank: rank });
            addPlayAgain("Play again");
            try { canvas.focus(); } catch (e) {}
          }
        });
        // Let the player bail out without saving and restart immediately.
        addPlayAgain("Skip & play again", "btn--ghost");
      } else {
        A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores" });
        addPlayAgain("Play again");
      }
      els.prompt.hidden = false;
    }
    function addPlayAgain(label, variant) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn " + (variant || "btn--primary");
      btn.textContent = label;
      btn.addEventListener("click", function () { restart(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
    }

    // ---------- Loop ----------
    var rafId = null, lastTime = 0;
    function loop(now) {
      if (!lastTime) lastTime = now;
      var dt = Math.min(2.5, (now - lastTime) / (1000 / 60));
      lastTime = now;
      camera.tick(dt);
      if ((state === "running" || state === "dying") && !camera.frozen()) tick(dt);
      render();
      updateScoreHud();
      rafId = window.requestAnimationFrame(loop);
    }

    return {
      jumpDown: function () { ensureAudio(); setJumpHeld(true); },
      jumpUp: function () { setJumpHeld(false); },
      duck: setDucking,
      resize: function (cssW, cssH) {
        var dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
        var nextW = Math.max(W, Math.round(cssW * dpr));
        var nextH = Math.max(H, Math.round(cssH * dpr));
        if (canvas.width !== nextW || canvas.height !== nextH) {
          canvas.width = nextW;
          canvas.height = nextH;
          ctx.imageSmoothingEnabled = false;
        }
        canvas.style.width = Math.round(cssW) + "px";
        canvas.style.height = Math.round(cssH) + "px";
        backingScale = nextW / W;
      },
      toggleMute: function () { return audio.toggleMute(); },
      isMuted: function () { return audio.isMuted(); },
      activate: function () {
        resetWorld(); state = "idle"; lastTime = 0;
        updateScoreHud(); showIdle();
        wake.acquire();
        offHidden = A.onHidden(pauseGame);
        rafId = window.requestAnimationFrame(loop);
      },
      deactivate: function () {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = null;
        wake.release();
        if (offHidden) { offHidden(); offHidden = null; }
        audio.close();
      }
    };
  }

  // ======================================================================
  //  Overlay scaffolding
  // ======================================================================
  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "gms-arcade-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Brain Sprint — a hidden mini game");
    overlay.innerHTML =
      '<div class="gms-arcade-backdrop" data-egg-close></div>' +
      '<div class="gms-arcade-panel">' +
        '<div class="gms-arcade-panel__head">' +
          '<p class="gms-arcade-title">Brain Sprint <span>— you found it!</span></p>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button type="button" class="gms-arcade-close" data-egg-mute aria-label="Toggle sound">♪</button>' +
            '<button type="button" class="gms-arcade-close" data-egg-close aria-label="Close game">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="gms-arcade-scores">' +
          '<span>SCORE <strong data-egg-score>00000</strong></span>' +
          '<span>BEST <strong data-egg-best>00000</strong></span>' +
        '</div>' +
        '<div class="gms-arcade-stage gms-arcade-stage--runner">' +
          '<canvas class="gms-arcade-canvas" tabindex="0"></canvas>' +
          '<div class="gms-arcade-prompt" data-egg-prompt hidden>' +
            '<p class="gms-arcade-prompt__title" data-egg-prompt-title></p>' +
            '<p class="gms-arcade-prompt__text" data-egg-prompt-text></p>' +
            '<div class="gms-arcade-prompt__actions" data-egg-prompt-actions></div>' +
          '</div>' +
        '</div>' +
        '<p class="gms-arcade-help">Space / tap to jump (hold = higher) · swipe down / hold ↓ to duck · M to mute</p>' +
        '<div class="gms-arcade-touchrow">' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-jump aria-label="Jump">JUMP</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-duckbtn aria-label="Duck">DUCK</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var canvas = overlay.querySelector(".gms-arcade-canvas");
    function fitCanvas() {
      var stage = overlay.querySelector(".gms-arcade-stage");
      if (!stage) return;
      var rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // Fractional scale is fine: the backing store is already rendered at
      // devicePixelRatio resolution, so this stays crisp while filling the
      // available space (no wasted margin from flooring to whole numbers).
      var scale = Math.max(0.5, Math.min(rect.width / W, rect.height / H));
      game.resize(W * scale, H * scale);
    }
    var game = createGame(canvas, {
      score: overlay.querySelector("[data-egg-score]"),
      best: overlay.querySelector("[data-egg-best]"),
      prompt: overlay.querySelector("[data-egg-prompt]"),
      promptTitle: overlay.querySelector("[data-egg-prompt-title]"),
      promptText: overlay.querySelector("[data-egg-prompt-text]"),
      promptActions: overlay.querySelector("[data-egg-prompt-actions]")
    });

    overlay.querySelectorAll("[data-egg-close]").forEach(function (el) {
      el.addEventListener("click", function () { closeOverlay(overlay); });
    });

    var muteBtn = overlay.querySelector("[data-egg-mute]");
    function syncMute() { muteBtn.textContent = game.isMuted() ? "♪̶" : "♪"; muteBtn.setAttribute("aria-pressed", game.isMuted() ? "true" : "false"); }
    muteBtn.addEventListener("click", function () { game.toggleMute(); syncMute(); });
    syncMute();

    // Pointer jump on the whole stage (mouse + touch), with hold for variable
    // jump. The stage, not the canvas: the letterbox margins around the canvas
    // must not be dead zones on small screens. Prompt buttons/forms keep their
    // own clicks (no preventDefault when the press lands on them).
    var stage = overlay.querySelector(".gms-arcade-stage");
    function onInteractive(e) {
      return !!(e.target && e.target.closest && e.target.closest("button, a, input, label, form"));
    }
    function findTouch(list, id) {
      for (var i = 0; i < list.length; i++) { if (list[i].identifier === id) return list[i]; }
      return null;
    }

    // One tracked touch: tap = jump (hold = higher). If the same finger moves
    // >= SWIPE_PX downward before SWIPE_PX in another dominant direction, the
    // pending jump is cut (jumpUp before any hop registers) and the touch
    // becomes a duck-hold; release stands back up.
    var SWIPE_PX = 24;
    var suppressMouse = 0;
    var touchId = null, touchOX = 0, touchOY = 0, touchDuck = false, touchLocked = false;
    stage.addEventListener("touchstart", function (e) {
      if (onInteractive(e)) return;
      e.preventDefault();
      suppressMouse = Date.now() + 500;
      if (touchId !== null) return; // one gesture at a time
      var t = e.changedTouches[0];
      touchId = t.identifier; touchOX = t.clientX; touchOY = t.clientY;
      touchDuck = false; touchLocked = false;
      game.jumpDown();
    }, { passive: false });
    stage.addEventListener("touchmove", function (e) {
      if (touchId === null) return;
      var t = findTouch(e.changedTouches, touchId);
      if (!t) return;
      if (e.cancelable) e.preventDefault();
      if (touchDuck || touchLocked) return;
      var dx = t.clientX - touchOX, dy = t.clientY - touchOY;
      if (dy >= SWIPE_PX && dy >= Math.abs(dx)) {
        game.jumpUp();      // cancel the pending jump so no micro-hop fires
        game.duck(true);
        touchDuck = true;
      } else if (Math.abs(dx) >= SWIPE_PX || dy <= -SWIPE_PX) {
        touchLocked = true; // dominant direction was not down: stays a jump
      }
    }, { passive: false });
    function endStageTouch(e) {
      if (touchId === null) return;
      var t = findTouch(e.changedTouches, touchId);
      if (!t) return;
      if (e.cancelable) e.preventDefault();
      if (touchDuck) game.duck(false); else game.jumpUp();
      touchId = null; touchDuck = false; touchLocked = false;
    }
    stage.addEventListener("touchend", endStageTouch, { passive: false });
    stage.addEventListener("touchcancel", endStageTouch, { passive: false });
    stage.addEventListener("mousedown", function (e) {
      if (onInteractive(e)) return;
      if (Date.now() < suppressMouse) return;
      e.preventDefault();
      game.jumpDown();
    });
    window.addEventListener("mouseup", function () { game.jumpUp(); });

    // Touch buttons (own pointer). Pressed styling is JS-driven ("is-held"):
    // :active is unreliable on touch once preventDefault is in play.
    function bindHoldBtn(btn, onDown, onUp) {
      function down(e) { e.preventDefault(); btn.classList.add("is-held"); onDown(); }
      function up(e) { if (e.cancelable) e.preventDefault(); btn.classList.remove("is-held"); onUp(); }
      function drop() { btn.classList.remove("is-held"); onUp(); }
      btn.addEventListener("touchstart", down, { passive: false });
      btn.addEventListener("touchend", up, { passive: false });
      btn.addEventListener("touchcancel", drop);
      btn.addEventListener("mousedown", down);
      btn.addEventListener("mouseup", up);
      btn.addEventListener("mouseleave", drop);
    }
    bindHoldBtn(overlay.querySelector("[data-egg-jump]"),
      function () { game.jumpDown(); }, function () { game.jumpUp(); });
    bindHoldBtn(overlay.querySelector("[data-egg-duckbtn]"),
      function () { game.duck(true); }, function () { game.duck(false); });

    function onKeydown(e) {
      // While typing initials, leave all keys (incl. Escape/Enter) to the form
      // so a stray Escape never reloads the page and drops the high score.
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "Escape") { closeOverlay(overlay); return; }
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (!e.repeat) game.jumpDown();
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault(); game.duck(true);
      } else if (e.key === "m" || e.key === "M") {
        game.toggleMute(); syncMute();
      }
    }
    function onKeyup(e) {
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") game.jumpUp();
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") game.duck(false);
    }

    overlay.game = game;
    overlay._onKeydown = onKeydown;
    overlay._onKeyup = onKeyup;
    overlay._canvas = canvas;
    overlay._fitCanvas = fitCanvas;
    return overlay;
  }

  function closeOverlay(overlay) {
    if (overlay._offViewport) { overlay._offViewport(); overlay._offViewport = null; }
    overlay.game.deactivate();
    window.location.reload();
  }
  function openOverlay(overlay) {
    overlay.classList.add("is-open");
    document.body.classList.add("gms-arcade-lock");
    overlay._fitCanvas();
    document.addEventListener("keydown", overlay._onKeydown);
    document.addEventListener("keyup", overlay._onKeyup);
    // Bare window.resize misses iOS URL-bar collapse and rotation; the shared
    // watcher covers visualViewport + orientationchange too.
    overlay._offViewport = A.onViewportChange(overlay._fitCanvas);
    overlay.game.activate();
    window.requestAnimationFrame(function () { overlay._canvas.focus(); });
  }

  ready(function () {
    var toggle = document.querySelector(".theme-toggle");
    if (!toggle) return;

    var hotspot = document.createElement("span");
    hotspot.className = "gms-arcade-hotspot";
    hotspot.setAttribute("aria-hidden", "true");
    toggle.appendChild(hotspot);

    var overlay = null, opening = false;
    function open() {
      if (opening) return;
      opening = true;
      if (!overlay) overlay = buildOverlay();
      A.tearPageAway(function () { openOverlay(overlay); });
    }

    ["click", "mousedown", "touchstart"].forEach(function (evt) {
      hotspot.addEventListener(evt, function (e) {
        e.stopPropagation();
        if (evt === "click") { e.preventDefault(); open(); }
      }, evt === "touchstart" ? { passive: false } : false);
    });
  });
})();
