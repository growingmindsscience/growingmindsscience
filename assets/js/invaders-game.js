/* Growing Minds Science — invaders-game.js
   "GMS Invaders: Curiosity Drift" — the hidden Space-Invaders easter egg on the
   Articles page.

   A themed pixel-invader glyph tucked into the hero is the trigger. Opening
   tears the page away (GMSArcade) then shows the game. The GMS mascot-ship
   sits at the bottom of a 220x260 canvas and fires "sparks of insight" upward
   to answer a descending lockstep formation of childlike question marks before
   they reach the nursery floor. Six escalating waves end on a "Headline" boss.

   Built on window.GMSArcade (arcade-core.js) for the page-tear, local
   leaderboard, and initials entry. CSP-safe (no eval/external assets; audio is
   Web Audio oscillator synth). Honors prefers-reduced-motion.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A) return;

  var GAME_KEY = "gms-invaders";
  var MUTE_KEY = "gms-invaders-muted";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ---------- Palette ----------
  var INK = "#0E2A2D";
  var BRAIN = "#FD951F";
  var LEAF_TOP = "#9FCB43";
  var LEAF_SIDE = "#40C099";
  var WARM = "#D5BE98";

  // ---------- Logical resolution / layout ----------
  var W = 220, H = 260;
  var CRIB_Y = 236;       // lose line
  var WARN_Y = 216;       // crib-line warning
  var SHIP_Y = 222, SHIP_W = 18, SHIP_H = 12;
  var SHIELD_Y = 188;
  var MARGIN_L = 8, MARGIN_R = 212;
  var COLS = 6, ROWS = 5;
  var CELL_W = 26, CELL_H = 16, FORM_START_X = 22;
  var SPRITE_W = 14, SPRITE_H = 10;
  var STEP_X = 6, STEP_Y = 8;

  var WAVE_NAMES = ["Object Permanence", "First Words", "Why Stage", "Theory of Mind", "Big Feelings", "The Headline"];
  var BASE_INTERVAL = [46, 40, 34, 29, 24, 22];
  var MIN_INTERVAL = 9;
  var BOLT_SPEED = [1.6, 1.8, 2.0, 2.2, 2.4, 2.6];
  var MAX_BOLTS = [2, 2, 3, 3, 4, 4];
  var DROP_CHANCE = [0.09, 0.104, 0.118, 0.132, 0.146, 0.16];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function blockyRect(ctx, x, y, w, h, fill) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // GMS mark, bottom-anchored ~18x12.
  function drawShip(ctx, x, y) {
    x = Math.round(x); y = Math.round(y);
    blockyRect(ctx, x + 3, y + 3, 12, 8, BRAIN);     // brain
    ctx.fillStyle = INK; ctx.fillRect(x + 8, y + 4, 1, 7);
    blockyRect(ctx, x + 7, y, 3, 3, LEAF_TOP);        // top leaf / muzzle
    blockyRect(ctx, x + 2, y + 1, 3, 3, LEAF_SIDE);
    blockyRect(ctx, x + 12, y + 1, 3, 3, LEAF_SIDE);
  }

  // Three enemy glyph shapes (distinct silhouettes for colorblind safety).
  function drawEnemy(ctx, e, wob) {
    var x = Math.round(e.x), y = Math.round(e.y);
    if (e.tier === 2) { // Big Why? — teal bold ?
      blockyRect(ctx, x + 3, y, 8, 3, LEAF_SIDE);
      blockyRect(ctx, x + 8, y + 2, 3, 3, LEAF_SIDE);
      blockyRect(ctx, x + 5, y + 5, 3, 2, LEAF_SIDE);
      ctx.fillStyle = INK; ctx.fillRect(x + 6, y + 8 + (wob ? 0 : 0), 2, 2);
      // legs wobble
      ctx.fillStyle = LEAF_SIDE; ctx.fillRect(x + 2 + (wob ? 1 : 0), y + 8, 2, 2); ctx.fillRect(x + 10 - (wob ? 1 : 0), y + 8, 2, 2);
    } else if (e.tier === 1) { // How? — orange curl
      blockyRect(ctx, x + 2, y + 1, 10, 3, BRAIN);
      blockyRect(ctx, x + 2, y + 4, 3, 4, BRAIN);
      blockyRect(ctx, x + 9, y + 4, 3, 4, BRAIN);
      ctx.fillStyle = BRAIN; ctx.fillRect(x + 4 + (wob ? 1 : 0), y + 8, 2, 2); ctx.fillRect(x + 8 - (wob ? 1 : 0), y + 8, 2, 2);
    } else { // What? — green dot-and-stem
      blockyRect(ctx, x + 4, y, 4, 4, LEAF_TOP);
      blockyRect(ctx, x + 5, y + 4, 2, 3, LEAF_TOP);
      ctx.fillStyle = LEAF_TOP; ctx.fillRect(x + 3 + (wob ? 1 : 0), y + 7, 2, 2); ctx.fillRect(x + 7 - (wob ? 1 : 0), y + 7, 2, 2);
    }
  }

  // ======================================================================
  //  Game controller
  // ======================================================================
  function createGame(canvas, els) {
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    canvas.width = W;
    canvas.height = H;

    var reduce = A.prefersReducedMotion();
    var muted;
    try { muted = window.localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { muted = false; }

    var state = "idle"; // idle | running | banner | won | gameover
    var held = { left: false, right: false, fire: false };

    var ship, sparks, enemies, bolts, shields, particles, floaters, capsules, ufo, boss;
    var offsetX, offsetY, dir, stepTimer, wobble, aliveCount, totalCount;
    var wave, lives, score, fireCooldown, focusTimer, ufoTimer, bannerTimer, bannerText;
    var warnTimer, marchNote, shakeMag, shakeTimer;
    var PARTICLE_CAP = 32, FLOATER_CAP = 12;

    function baseX(col) { return FORM_START_X + col * CELL_W; }
    function baseY(row) { return 26 + row * CELL_H; }

    function resetWorld() {
      ship = { x: W / 2 - SHIP_W / 2, invuln: 0 };
      sparks = []; bolts = []; particles = particles || []; floaters = floaters || []; capsules = [];
      particles.length = 0; floaters.length = 0;
      ufo = null; boss = null;
      wave = 1; lives = 3; score = 0;
      fireCooldown = 0; focusTimer = 0; ufoTimer = randRange(16, 26) * 60;
      shakeMag = 0; shakeTimer = 0; warnTimer = 0; marchNote = 0;
      buildWave(1);
      buildShields();
    }

    function randRange(a, b) { return a + Math.random() * (b - a); }

    function buildShields() {
      shields = [];
      var cells = 7, rows = 4, cell = 4;
      var bw = cells * cell, gap = (W - 3 * bw) / 4;
      for (var b = 0; b < 3; b++) {
        var grid = [];
        for (var gy = 0; gy < rows; gy++) { grid.push([]); for (var gx = 0; gx < cells; gx++) grid[gy].push(1); }
        shields.push({ x: Math.round(gap + b * (bw + gap)), y: SHIELD_Y, cols: cells, rows: rows, cell: cell, grid: grid });
      }
    }

    function buildWave(w) {
      enemies = [];
      offsetX = 0; offsetY = (w - 1) * 6; dir = 1; wobble = 0;
      stepTimer = BASE_INTERVAL[w - 1];
      if (w === 6) {
        boss = { x: W / 2 - 22, y: 24, w: 44, h: 16, hp: 10, dir: 1, fireTimer: 80, flash: 0 };
        // thin support row of Why? enemies
        for (var c = 0; c < COLS; c++) {
          enemies.push({ col: c, row: 0, tier: 2, alive: true });
        }
      } else {
        for (var row = 0; row < ROWS; row++) {
          for (var col = 0; col < COLS; col++) {
            var tier = row === 0 ? 2 : (row <= 2 ? 1 : 0);
            enemies.push({ col: col, row: row, tier: tier, alive: true });
          }
        }
      }
      totalCount = enemies.length;
      aliveCount = totalCount;
    }

    // ---------- Audio ----------
    var audioCtx = null, masterGain = null;
    function ensureAudio() {
      if (muted) return;
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.08;
        masterGain.connect(audioCtx.destination);
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
    }
    function beep(f0, f1, dur, type, vol) {
      if (muted || !audioCtx) return;
      var t = audioCtx.currentTime;
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.6, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(masterGain);
      o.start(t); o.stop(t + dur + 0.02);
    }
    var MARCH_NOTES = [98, 87, 78, 73];
    var sfx = {
      fire: function () { beep(660, 720, 0.05, "square", 0.4); },
      answer: function (tier) { beep(520 + tier * 120, 220, 0.08, "triangle", 0.5); },
      march: function () { beep(MARCH_NOTES[marchNote % 4], 0, 0.09, "square", 0.5); marchNote++; },
      hit: function () { beep(200, 70, 0.2, "sawtooth", 0.6); },
      ufo: function () { beep(880, 660, 0.3, "sine", 0.4); },
      capsule: function () { beep(440, 660, 0.18, "triangle", 0.4); },
      wave: function () { beep(523, 1046, 0.25, "triangle", 0.5); },
      win: function () { beep(523, 784, 0.4, "triangle", 0.5); setTimeout(function(){ beep(659,988,0.4,"triangle",0.4); }, 140); },
      warn: function () { beep(330, 200, 0.18, "sawtooth", 0.4); }
    };

    // ---------- Particles / floaters ----------
    function spawnParticle(x, y, vx, vy, life, color) {
      if (reduce) return;
      var p;
      for (var i = 0; i < particles.length; i++) { if (particles[i].life <= 0) { p = particles[i]; break; } }
      if (!p) { if (particles.length >= PARTICLE_CAP) return; p = {}; particles.push(p); }
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.maxLife = life; p.color = color;
    }
    function sparkle(x, y, color) {
      for (var i = 0; i < 4; i++) { var a = Math.random() * Math.PI * 2, s = 0.4 + Math.random(); spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, 12, color); }
    }
    function spawnFloater(x, y, text, color) {
      if (reduce) return;
      var f;
      for (var i = 0; i < floaters.length; i++) { if (floaters[i].life <= 0) { f = floaters[i]; break; } }
      if (!f) { if (floaters.length >= FLOATER_CAP) return; f = {}; floaters.push(f); }
      f.x = x; f.y = y; f.life = 24; f.maxLife = 24; f.text = text; f.color = color;
    }

    // ---------- Lifecycle ----------
    function start() { resetWorld(); state = "running"; hidePrompt(); ensureAudio(); }
    function startBanner(text) { bannerText = text; bannerTimer = 110; state = "banner"; }
    function fireRequest() {
      var cap = wave >= 3 ? 2 : 1;
      if (sparks.length >= cap || fireCooldown > 0) return;
      sparks.push({ x: ship.x + SHIP_W / 2 - 1, y: SHIP_Y - 4 });
      fireCooldown = 13;
      ensureAudio(); sfx.fire();
    }

    function loseLife() {
      lives--;
      ensureAudio(); sfx.hit();
      if (!reduce) { shakeMag = 3; shakeTimer = 10; }
      if (lives <= 0) { endGame(false); return; }
      ship.invuln = 60;
    }

    function endGame(won) {
      // end-of-game bonuses on a win
      if (won) {
        score += lives * 200;
        var cells = 0; for (var i = 0; i < shields.length; i++) for (var gy = 0; gy < shields[i].rows; gy++) for (var gx = 0; gx < shields[i].cols; gx++) cells += shields[i].grid[gy][gx];
        score += cells * 2;
        ensureAudio(); sfx.win();
      }
      state = won ? "won" : "gameover";
      showEnd(won, Math.floor(score));
    }

    // ---------- Update ----------
    function tick(dt) {
      if (state === "banner") {
        bannerTimer -= dt;
        if (bannerTimer <= 0) state = "running";
        return;
      }

      // Ship movement
      var sv = 2.0;
      if (held.left) ship.x -= sv * dt;
      if (held.right) ship.x += sv * dt;
      ship.x = clamp(ship.x, MARGIN_L, MARGIN_R - SHIP_W);
      if (ship.invuln > 0) ship.invuln -= dt;
      if (fireCooldown > 0) fireCooldown -= dt;
      if (focusTimer > 0) focusTimer -= dt;
      if (warnTimer > 0) warnTimer -= dt;
      if (shakeTimer > 0) { shakeTimer -= dt; if (shakeTimer <= 0) shakeMag = 0; }
      if (held.fire) fireRequest();

      // Formation march (lockstep)
      stepTimer -= dt;
      if (stepTimer <= 0) doMarchStep();

      // Boss
      if (boss) updateBoss(dt);

      // Sparks
      for (var s = sparks.length - 1; s >= 0; s--) {
        var sp = sparks[s];
        sp.y -= 4.2 * dt;
        if (sp.y < -6) { sparks.splice(s, 1); continue; }
        if (sparkHits(sp, s)) continue;
      }

      // Enemy bolts
      for (var b = bolts.length - 1; b >= 0; b--) {
        var bo = bolts[b];
        bo.y += bo.v * dt;
        if (bo.y > H + 6) { bolts.splice(b, 1); continue; }
        if (boltHitsShield(bo)) { bolts.splice(b, 1); continue; }
        if (ship.invuln <= 0 && overlap({ x: bo.x, y: bo.y, w: 2, h: 6 }, { x: ship.x + 4, y: SHIP_Y, w: 10, h: SHIP_H })) {
          bolts.splice(b, 1); loseLife();
          if (state !== "running") return;
        }
      }

      // Capsules
      for (var c = capsules.length - 1; c >= 0; c--) {
        var cap = capsules[c];
        cap.y += 1.0 * dt;
        if (cap.y > H) { capsules.splice(c, 1); continue; }
        if (overlap({ x: cap.x, y: cap.y, w: 6, h: 6 }, { x: ship.x, y: SHIP_Y, w: SHIP_W, h: SHIP_H })) {
          capsules.splice(c, 1); focusTimer = 360;
          spawnFloater(ship.x, SHIP_Y - 6, "FOCUS", LEAF_TOP);
          ensureAudio(); sfx.capsule();
        }
      }

      // UFO
      ufoTimer -= dt;
      if (!ufo && ufoTimer <= 0 && state === "running") { ufo = { x: -14, y: 14, val: [50, 100, 150][Math.floor(Math.random() * 3)] }; }
      if (ufo) {
        ufo.x += 1.3 * dt;
        if (ufo.x > W + 14) { ufo = null; ufoTimer = randRange(16, 26) * 60; }
      }

      // Particles / floaters
      for (var p = 0; p < particles.length; p++) { var pt = particles[p]; if (pt.life <= 0) continue; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
      for (var f = 0; f < floaters.length; f++) { var fl = floaters[f]; if (fl.life <= 0) continue; fl.y -= 0.4 * dt; fl.life -= dt; }

      // Crib-line warning + lose check
      var lowest = lowestEnemyBottom();
      if (lowest >= WARN_Y && warnTimer <= 0) { warnTimer = 40; ensureAudio(); sfx.warn(); }
      if (lowest >= CRIB_Y) { endGame(false); return; }

      // Wave clear
      if (aliveCount <= 0 && (!boss || boss.hp <= 0)) {
        if (wave >= 6) { endGame(true); return; }
        score += 100 * wave;
        wave++;
        buildWave(wave);
        ensureAudio(); sfx.wave();
        startBanner("Wave " + wave + " — " + WAVE_NAMES[wave - 1]);
      }
    }

    function doMarchStep() {
      // find live horizontal extent
      var minX = 1e9, maxX = -1e9, any = false;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i]; if (!e.alive) continue; any = true;
        var ex = baseX(e.col) + offsetX;
        if (ex < minX) minX = ex; if (ex + SPRITE_W > maxX) maxX = ex + SPRITE_W;
      }
      if (any) {
        if ((dir > 0 && maxX + STEP_X > MARGIN_R) || (dir < 0 && minX - STEP_X < MARGIN_L)) {
          offsetY += STEP_Y; dir = -dir;
        } else {
          offsetX += dir * STEP_X;
        }
      }
      wobble = wobble ? 0 : 1;
      // enemy fire from front-most of a random eligible column
      tryEnemyFire();
      ensureAudio(); sfx.march();
      var focusMul = focusTimer > 0 ? 1.5 : 1;
      stepTimer = clamp(BASE_INTERVAL[wave - 1] * (0.30 + 0.70 * (aliveCount / Math.max(1, totalCount))), MIN_INTERVAL, BASE_INTERVAL[wave - 1]) * focusMul;
    }

    function frontEnemyInCol(col) {
      var found = null, maxRow = -1;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.alive && e.col === col && e.row > maxRow) { maxRow = e.row; found = e; }
      }
      return found;
    }
    function tryEnemyFire() {
      if (bolts.length >= MAX_BOLTS[wave - 1]) return;
      var cols = [];
      for (var c = 0; c < COLS; c++) { if (frontEnemyInCol(c)) cols.push(c); }
      if (!cols.length) return;
      var col = cols[Math.floor(Math.random() * cols.length)];
      if (Math.random() < DROP_CHANCE[wave - 1]) {
        var e = frontEnemyInCol(col);
        var ex = baseX(e.col) + offsetX + SPRITE_W / 2 - 1;
        var ey = baseY(e.row) + offsetY + SPRITE_H;
        bolts.push({ x: ex, y: ey, v: BOLT_SPEED[wave - 1] });
      }
    }

    function enemyScreenBox(e) {
      return { x: baseX(e.col) + offsetX, y: baseY(e.row) + offsetY, w: SPRITE_W, h: SPRITE_H };
    }
    function lowestEnemyBottom() {
      var low = 0;
      for (var i = 0; i < enemies.length; i++) { var e = enemies[i]; if (!e.alive) continue; var b = baseY(e.row) + offsetY + SPRITE_H; if (b > low) low = b; }
      if (boss && boss.hp > 0) low = Math.max(low, boss.y + boss.h);
      return low;
    }

    function sparkHits(sp, sIdx) {
      var sbox = { x: sp.x, y: sp.y, w: 2, h: 6 };
      // shields
      if (sparkHitsShield(sp)) { sparks.splice(sIdx, 1); return true; }
      // boss
      if (boss && boss.hp > 0 && overlap(sbox, { x: boss.x, y: boss.y, w: boss.w, h: boss.h })) {
        boss.hp--; boss.flash = 4; sparks.splice(sIdx, 1);
        sparkle(sp.x, sp.y, BRAIN); ensureAudio(); sfx.answer(2);
        if (boss.hp <= 0) { score += 300; spawnFloater(boss.x + boss.w / 2, boss.y, "+300", BRAIN); for (var k = 0; k < 12; k++) sparkle(boss.x + Math.random() * boss.w, boss.y + Math.random() * boss.h, LEAF_TOP); }
        return true;
      }
      // enemies
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!e.alive) continue;
        if (overlap(sbox, enemyScreenBox(e))) {
          e.alive = false; aliveCount--;
          var pts = e.tier === 2 ? 30 : (e.tier === 1 ? 20 : 10);
          score += pts;
          var ex = baseX(e.col) + offsetX, ey = baseY(e.row) + offsetY;
          sparkle(ex + SPRITE_W / 2, ey + SPRITE_H / 2, e.tier === 2 ? LEAF_SIDE : (e.tier === 1 ? BRAIN : LEAF_TOP));
          spawnFloater(ex, ey, "+" + pts, e.tier === 2 ? LEAF_SIDE : (e.tier === 1 ? BRAIN : LEAF_TOP));
          ensureAudio(); sfx.answer(e.tier);
          if (Math.random() < 0.07) capsules.push({ x: ex + SPRITE_W / 2 - 3, y: ey });
          sparks.splice(sIdx, 1);
          return true;
        }
      }
      // UFO
      if (ufo && overlap(sbox, { x: ufo.x, y: ufo.y, w: 12, h: 8 })) {
        score += ufo.val; spawnFloater(ufo.x, ufo.y, "+" + ufo.val, LEAF_SIDE);
        for (var u = 0; u < 8; u++) sparkle(ufo.x + Math.random() * 12, ufo.y + Math.random() * 8, LEAF_SIDE);
        ufo = null; ufoTimer = randRange(16, 26) * 60;
        sparks.splice(sIdx, 1); ensureAudio(); sfx.ufo();
        return true;
      }
      return false;
    }

    function cellSolid(sh, gx, gy) { return gx >= 0 && gx < sh.cols && gy >= 0 && gy < sh.rows && sh.grid[gy][gx]; }
    function erodeShieldAt(px, py) {
      for (var i = 0; i < shields.length; i++) {
        var sh = shields[i];
        if (px < sh.x || px >= sh.x + sh.cols * sh.cell || py < sh.y || py >= sh.y + sh.rows * sh.cell) continue;
        var gx = Math.floor((px - sh.x) / sh.cell), gy = Math.floor((py - sh.y) / sh.cell);
        if (cellSolid(sh, gx, gy)) {
          sh.grid[gy][gx] = 0;
          // chip a small neighborhood for a frayed look
          if (cellSolid(sh, gx + 1, gy)) sh.grid[gy][gx + 1] = Math.random() < 0.5 ? 0 : 1;
          if (cellSolid(sh, gx - 1, gy)) sh.grid[gy][gx - 1] = Math.random() < 0.5 ? 0 : 1;
          return true;
        }
      }
      return false;
    }
    function sparkHitsShield(sp) { return erodeShieldAt(sp.x, sp.y) || erodeShieldAt(sp.x + 1, sp.y); }
    function boltHitsShield(bo) { return erodeShieldAt(bo.x, bo.y + 5) || erodeShieldAt(bo.x + 1, bo.y + 5); }

    function updateBoss(dt) {
      if (boss.hp <= 0) return;
      boss.x += boss.dir * 1.2 * dt;
      if (boss.x < MARGIN_L) { boss.x = MARGIN_L; boss.dir = 1; }
      if (boss.x + boss.w > MARGIN_R) { boss.x = MARGIN_R - boss.w; boss.dir = -1; }
      if (boss.flash > 0) boss.flash -= dt;
      boss.fireTimer -= dt;
      if (boss.fireTimer <= 0) {
        boss.fireTimer = 80;
        for (var i = -1; i <= 1; i++) {
          if (bolts.length < MAX_BOLTS[wave - 1] + 2) bolts.push({ x: boss.x + boss.w / 2 + i * 8, y: boss.y + boss.h, v: BOLT_SPEED[wave - 1] });
        }
      }
    }

    // ---------- Render ----------
    function render() {
      var ox = 0, oy = 0;
      if (shakeMag > 0 && shakeTimer > 0) { ox = (Math.random() - 0.5) * shakeMag * 2; oy = (Math.random() - 0.5) * shakeMag * 2; }
      ctx.save();
      ctx.translate(Math.round(ox), Math.round(oy));

      ctx.fillStyle = "#F8F6F1";
      ctx.fillRect(-4, -4, W + 8, H + 8);

      // backdrop dots (parallax)
      if (!reduce) {
        for (var d = 0; d < 18; d++) {
          var dx = (d * 41 + 11) % W;
          var dy = ((d * 53 + (performance.now ? 0 : 0)) + (driftY)) % H;
          ctx.fillStyle = d % 2 ? "rgba(213,190,152,0.5)" : "rgba(64,192,153,0.35)";
          ctx.fillRect(dx, Math.round(dy), 1, 1);
        }
      }

      // crib line
      var warnOn = warnTimer > 0 && (Math.floor(warnTimer / 5) % 2 === 0);
      ctx.fillStyle = warnOn ? BRAIN : "rgba(14,42,45,0.25)";
      ctx.fillRect(0, CRIB_Y, W, 1);

      // shields
      for (var i = 0; i < shields.length; i++) {
        var sh = shields[i];
        for (var gy = 0; gy < sh.rows; gy++) for (var gx = 0; gx < sh.cols; gx++) {
          if (sh.grid[gy][gx]) blockyRect(ctx, sh.x + gx * sh.cell, sh.y + gy * sh.cell, sh.cell, sh.cell, WARM);
        }
      }

      // enemies
      for (var e2 = 0; e2 < enemies.length; e2++) { var en = enemies[e2]; if (!en.alive) continue; en.x = baseX(en.col) + offsetX; en.y = baseY(en.row) + offsetY; drawEnemy(ctx, en, wobble); }

      // boss
      if (boss && boss.hp > 0) {
        var bf = boss.flash > 0 ? "#FFFFFF" : WARM;
        blockyRect(ctx, boss.x, boss.y, boss.w, boss.h, bf);
        ctx.fillStyle = INK;
        for (var t = 0; t < 4; t++) ctx.fillRect(boss.x + 4 + t * 9, boss.y + 4, 6, 2);
        ctx.fillStyle = BRAIN; ctx.fillRect(boss.x + 3, boss.y + boss.h - 3, boss.w - 6, 2);
        // hp pips
        ctx.fillStyle = LEAF_TOP;
        for (var hp = 0; hp < boss.hp; hp++) ctx.fillRect(boss.x + hp * 4, boss.y - 4, 3, 2);
      }

      // capsules
      for (var c = 0; c < capsules.length; c++) blockyRect(ctx, capsules[c].x, capsules[c].y, 6, 6, LEAF_TOP);

      // ufo
      if (ufo) { blockyRect(ctx, ufo.x, ufo.y, 12, 6, "#FFFFFF"); ctx.fillStyle = LEAF_SIDE; ctx.fillRect(ufo.x + 2, ufo.y + 2, 8, 2); }

      // sparks
      ctx.fillStyle = LEAF_TOP;
      for (var s = 0; s < sparks.length; s++) { ctx.fillStyle = LEAF_TOP; ctx.fillRect(Math.round(sparks[s].x), Math.round(sparks[s].y), 2, 6); ctx.fillStyle = LEAF_SIDE; ctx.fillRect(Math.round(sparks[s].x), Math.round(sparks[s].y), 2, 1); }

      // bolts
      for (var b = 0; b < bolts.length; b++) blockyRect(ctx, bolts[b].x, bolts[b].y, 2, 6, BRAIN);

      // ship (blink during invuln)
      var blink = ship.invuln > 0 && (Math.floor(ship.invuln / 4) % 2 === 0);
      if (!blink) drawShip(ctx, ship.x, SHIP_Y);

      // particles
      for (var p = 0; p < particles.length; p++) { var pt = particles[p]; if (pt.life <= 0) continue; ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1); ctx.fillStyle = pt.color; ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 2); }
      ctx.globalAlpha = 1;

      // floaters
      ctx.font = "7px monospace"; ctx.textAlign = "center";
      for (var f = 0; f < floaters.length; f++) { var fl = floaters[f]; if (fl.life <= 0) continue; ctx.globalAlpha = clamp(fl.life / fl.maxLife, 0, 1); ctx.fillStyle = fl.color; ctx.fillText(fl.text, Math.round(fl.x), Math.round(fl.y)); }
      ctx.globalAlpha = 1; ctx.textAlign = "left";

      // lives (brain pips, top-left)
      for (var lv = 0; lv < lives; lv++) blockyRect(ctx, 6 + lv * 10, 6, 7, 5, BRAIN);

      // FOCUS indicator
      if (focusTimer > 0) { ctx.fillStyle = LEAF_SIDE; ctx.font = "7px monospace"; ctx.fillText("FOCUS", W - 40, 11); }

      // banner
      if (state === "banner" && bannerTimer > 0) {
        ctx.globalAlpha = clamp(bannerTimer / 110, 0, 1);
        ctx.fillStyle = "rgba(248,246,241,0.85)"; ctx.fillRect(0, H / 2 - 16, W, 32);
        ctx.fillStyle = INK; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
        ctx.fillText(bannerText, W / 2, H / 2 + 2);
        ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      ctx.restore();
    }

    // ---------- HUD / prompt ----------
    function updateHud() {
      if (els.score) els.score.textContent = String(Math.floor(score)).padStart(6, "0");
      if (els.best) els.best.textContent = String(A.leaderboard.best(GAME_KEY)).padStart(6, "0");
      if (els.wave) els.wave.textContent = String(Math.min(wave, 6));
    }
    function hidePrompt() { if (els.prompt) els.prompt.hidden = true; }
    function showIdle() {
      els.promptTitle.textContent = "GMS Invaders";
      els.promptText.textContent = "Answer the questions before they reach the floor. ← → move · Space fire.";
      els.promptActions.textContent = "";
      A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores" });
      var hint = document.createElement("p"); hint.className = "gms-arcade-help"; hint.textContent = "Press Space or tap FIRE to begin";
      els.promptActions.appendChild(hint);
      els.prompt.hidden = false;
    }
    function showEnd(won, finalScore) {
      updateHud();
      els.promptTitle.textContent = won ? "All questions answered!" : "A question reached the nursery";
      els.promptText.textContent = "Score " + String(finalScore).padStart(6, "0");
      els.promptActions.textContent = "";
      if (A.leaderboard.qualifies(GAME_KEY, finalScore)) {
        A.mountInitialsEntry(els.promptActions, {
          gameKey: GAME_KEY, score: finalScore,
          onDone: function (rank) {
            updateHud();
            els.promptActions.textContent = "";
            A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores", highlightRank: rank });
            addPlayAgain();
            try { canvas.focus(); } catch (e) {}
          }
        });
      } else {
        A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores" });
        addPlayAgain();
      }
      els.prompt.hidden = false;
    }
    function addPlayAgain() {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Play again";
      btn.addEventListener("click", function () { start(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
    }

    // ---------- Loop ----------
    var rafId = null, lastTime = 0, driftY = 0;
    function loop(now) {
      if (!lastTime) lastTime = now;
      var dt = Math.min(2.5, (now - lastTime) / (1000 / 60));
      lastTime = now;
      if (!reduce) driftY = (driftY + dt * 0.3) % H;
      if (state === "running" || state === "banner") tick(dt);
      render();
      updateHud();
      rafId = window.requestAnimationFrame(loop);
    }

    return {
      held: held,
      fire: function () { ensureAudio(); if (state === "idle") { start(); return; } if (state === "gameover" || state === "won") { if (document.activeElement && document.activeElement.tagName === "INPUT") return; start(); return; } fireRequest(); },
      moveShipTo: function (lx) { if (state === "running") { ship.x = clamp(lx - SHIP_W / 2, MARGIN_L, MARGIN_R - SHIP_W); } },
      toggleMute: function () { muted = !muted; try { window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) {} if (!muted) ensureAudio(); return muted; },
      isMuted: function () { return muted; },
      activate: function () { resetWorld(); state = "idle"; lastTime = 0; updateHud(); showIdle(); rafId = window.requestAnimationFrame(loop); },
      deactivate: function () { if (rafId) window.cancelAnimationFrame(rafId); rafId = null; if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; } }
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
    overlay.setAttribute("aria-label", "GMS Invaders — a hidden mini game");
    overlay.innerHTML =
      '<div class="gms-arcade-backdrop" data-egg-close></div>' +
      '<div class="gms-arcade-panel">' +
        '<div class="gms-arcade-panel__head">' +
          '<p class="gms-arcade-title">GMS Invaders <span>— you found it!</span></p>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button type="button" class="gms-arcade-close" data-egg-mute aria-label="Toggle sound">♪</button>' +
            '<button type="button" class="gms-arcade-close" data-egg-close aria-label="Close game">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="gms-arcade-scores">' +
          '<span>SCORE <strong data-egg-score>000000</strong></span>' +
          '<span>WAVE <strong data-egg-wave>1</strong></span>' +
          '<span>BEST <strong data-egg-best>000000</strong></span>' +
        '</div>' +
        '<div class="gms-arcade-stage gms-arcade-stage--invaders">' +
          '<canvas class="gms-arcade-canvas" tabindex="0"></canvas>' +
          '<div class="gms-arcade-prompt" data-egg-prompt hidden>' +
            '<p class="gms-arcade-prompt__title" data-egg-prompt-title></p>' +
            '<p class="gms-arcade-prompt__text" data-egg-prompt-text></p>' +
            '<div class="gms-arcade-prompt__actions" data-egg-prompt-actions></div>' +
          '</div>' +
        '</div>' +
        '<p class="gms-arcade-help">← → / A D move · Space / ↑ fire · M to mute</p>' +
        '<div class="gms-arcade-touchrow">' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-left aria-label="Move left">◀</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-fire aria-label="Fire">FIRE</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-right aria-label="Move right">▶</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var canvas = overlay.querySelector(".gms-arcade-canvas");
    var game = createGame(canvas, {
      score: overlay.querySelector("[data-egg-score]"),
      best: overlay.querySelector("[data-egg-best]"),
      wave: overlay.querySelector("[data-egg-wave]"),
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

    // Canvas pointer: tap fires; mouse-over eases ship toward pointer.
    var suppressMouse = 0;
    canvas.addEventListener("touchstart", function (e) { e.preventDefault(); suppressMouse = Date.now() + 500; game.fire(); }, { passive: false });
    canvas.addEventListener("mousedown", function (e) { if (Date.now() < suppressMouse) return; e.preventDefault(); game.fire(); });
    canvas.addEventListener("mousemove", function (e) {
      // The canvas is object-fit:contain, so the drawn area is letterboxed
      // inside the element box — map the pointer through that transform.
      var rect = canvas.getBoundingClientRect();
      var scale = Math.min(rect.width / W, rect.height / H);
      var offX = (rect.width - W * scale) / 2;
      var lx = (e.clientX - rect.left - offX) / scale;
      game.moveShipTo(lx);
    });

    // Touch buttons (held-set), each owns its pointer.
    function holdBtn(sel, key) {
      var el = overlay.querySelector(sel);
      var down = function (e) { e.preventDefault(); game.held[key] = true; };
      var up = function (e) { e.preventDefault(); game.held[key] = false; };
      el.addEventListener("touchstart", down, { passive: false });
      el.addEventListener("touchend", up, { passive: false });
      el.addEventListener("touchcancel", up, { passive: false });
      el.addEventListener("mousedown", down);
      el.addEventListener("mouseup", up);
      el.addEventListener("mouseleave", up);
    }
    holdBtn("[data-egg-left]", "left");
    holdBtn("[data-egg-right]", "right");
    // FIRE button: held + a fire each press (auto-repeat via held.fire in tick)
    var fireBtn = overlay.querySelector("[data-egg-fire]");
    var fdown = function (e) { e.preventDefault(); game.held.fire = true; game.fire(); };
    var fup = function (e) { e.preventDefault(); game.held.fire = false; };
    fireBtn.addEventListener("touchstart", fdown, { passive: false });
    fireBtn.addEventListener("touchend", fup, { passive: false });
    fireBtn.addEventListener("touchcancel", fup, { passive: false });
    fireBtn.addEventListener("mousedown", fdown);
    fireBtn.addEventListener("mouseup", fup);
    fireBtn.addEventListener("mouseleave", fup);

    function onKeydown(e) {
      // While typing initials, leave all keys (incl. Escape/Enter) to the form
      // so a stray Escape never reloads the page and drops the high score.
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "Escape") { closeOverlay(overlay); return; }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); game.held.left = true; }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); game.held.right = true; }
      else if (e.code === "Space" || e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); game.held.fire = true; if (!e.repeat) game.fire(); }
      else if (e.key === "m" || e.key === "M") { game.toggleMute(); syncMute(); }
    }
    function onKeyup(e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") game.held.left = false;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") game.held.right = false;
      else if (e.code === "Space" || e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") game.held.fire = false;
    }

    overlay.game = game;
    overlay._onKeydown = onKeydown;
    overlay._onKeyup = onKeyup;
    overlay._canvas = canvas;
    return overlay;
  }

  function closeOverlay(overlay) {
    overlay.game.deactivate();
    window.location.reload();
  }
  function openOverlay(overlay) {
    overlay.classList.add("is-open");
    document.body.classList.add("gms-arcade-lock");
    document.addEventListener("keydown", overlay._onKeydown);
    document.addEventListener("keyup", overlay._onKeyup);
    overlay.game.activate();
    window.requestAnimationFrame(function () { overlay._canvas.focus(); });
  }

  // Themed pixel-invader trigger, tucked into the Articles hero.
  function buildTrigger() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gms-arcade-invader-trigger";
    btn.setAttribute("aria-label", "Hidden game");
    btn.title = "?";
    btn.innerHTML =
      '<svg viewBox="0 0 11 9" aria-hidden="true" shape-rendering="crispEdges">' +
      '<g fill="currentColor">' +
      '<rect x="2" y="0" width="1" height="1"/><rect x="8" y="0" width="1" height="1"/>' +
      '<rect x="3" y="1" width="1" height="1"/><rect x="7" y="1" width="1" height="1"/>' +
      '<rect x="2" y="2" width="7" height="1"/>' +
      '<rect x="1" y="3" width="2" height="1"/><rect x="4" y="3" width="3" height="1"/><rect x="8" y="3" width="2" height="1"/>' +
      '<rect x="0" y="4" width="11" height="1"/>' +
      '<rect x="0" y="5" width="1" height="1"/><rect x="3" y="5" width="5" height="1"/><rect x="10" y="5" width="1" height="1"/>' +
      '<rect x="0" y="6" width="1" height="1"/><rect x="2" y="6" width="1" height="1"/><rect x="8" y="6" width="1" height="1"/><rect x="10" y="6" width="1" height="1"/>' +
      '<rect x="3" y="7" width="1" height="1"/><rect x="7" y="7" width="1" height="1"/>' +
      '</g></svg>';
    return btn;
  }

  ready(function () {
    // Anchor the trigger into the first hero container (Articles page).
    var hero = document.querySelector(".page-hero .container") || document.querySelector("main .container");
    if (!hero) return;
    var cs = window.getComputedStyle(hero);
    if (cs.position === "static") hero.style.position = "relative";

    var trigger = buildTrigger();
    hero.appendChild(trigger);

    var overlay = null, opening = false;
    function open() {
      if (opening) return;
      opening = true;
      if (!overlay) overlay = buildOverlay();
      A.tearPageAway(function () { openOverlay(overlay); });
    }

    trigger.addEventListener("click", function (e) { e.preventDefault(); open(); });
    trigger.addEventListener("touchstart", function (e) { e.preventDefault(); open(); }, { passive: false });
  });
})();
