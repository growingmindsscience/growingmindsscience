/* Growing Minds Science — hopper-game.js
   "Special Delivery" — the hidden Frogger-style easter egg on the Contact page.

   Trigger: a pixel-envelope glyph tucked into the Contact hero. Opening tears
   the page away (GMSArcade) then shows the game. You carry a letter from the
   bottom of the screen to one of five mailboxes at the top: first across a
   playroom floor of rolling toys, then across a story stream you can only
   cross by hopping along drifting books. Deliver all five letters to move to
   the next, slightly busier round.

   Built on window.GMSArcade (arcade-core.js) for the page-tear, the local
   leaderboard, and the initials entry. Self-contained otherwise: own overlay
   DOM, own rAF loop, full teardown on close. CSP-safe (no eval, no external
   assets; audio is Web Audio oscillator synth). Honors prefers-reduced-motion.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A) return;

  var GAME_KEY = "special-delivery";
  var MUTE_KEY = "gms-hopper-muted";

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
  var CREAM = "#F4EFE3";
  var STREAM_BG = "#D8EAE2";
  var FLOOR_BG = "#EDE6D6";

  // ---------- Grid ----------
  var CELL = 16, COLS = 13, ROWS = 14;
  var W = COLS * CELL, H = ROWS * CELL;
  var HOME_ROW = 0, STREAM_ROWS = [1, 2, 3, 4, 5], MEDIAN_ROW = 6;
  var TOY_ROWS = [7, 8, 9, 10, 11], SAFE_ROW = 12, START_ROW = 13;
  var SLOT_COLS = [0, 3, 6, 9, 12];
  var PAD = CELL * 3; // off-screen margin so lane items enter/exit smoothly
  var LETTER_TIME = 3600; // ~60s per letter

  // Lane recipes: [row, dir, speed, item width (cells), kind]
  var STREAM_LANES = [
    [1, 1, 0.50, 3, "book"],
    [2, -1, 0.38, 2, "book"],
    [3, 1, 0.62, 3, "book"],
    [4, -1, 0.45, 2, "book"],
    [5, 1, 0.42, 3, "book"]
  ];
  var TOY_LANES = [
    [7, -1, 0.72, 2, "wagon"],
    [8, 1, 0.48, 1, "ball"],
    [9, -1, 0.60, 2, "train"],
    [10, 1, 0.85, 1, "car"],
    [11, -1, 0.42, 2, "blocks"]
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function blockyRect(ctx, x, y, w, h, fill) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
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
    // Shared juice: crisp shake + hit-stop, delivery streak multiplier. Audio-mute
    // is deliberately independent of reduced-motion (a11y: motion-sensitive players
    // still get sound).
    var camera = A.makeCamera({ reduce: reduce, maxPx: 3 });
    var combo = A.makeCombo({ window: 200, max: 5 });

    var state = "idle"; // idle | running | gameover
    var player, lanes, slots, wave, lives, score, bestRow, letterTimer;
    var deathTimer, deathText, hopQ, edgeWarn;
    var particles, floaters, tickCount;
    var PARTICLE_CAP = 28, FLOATER_CAP = 10;

    function speedMul() { return Math.min(1 + (wave - 1) * 0.16, 2); }

    function buildLane(recipe) {
      var row = recipe[0], dir = recipe[1], speed = recipe[2], wCells = recipe[3], kind = recipe[4];
      var isStream = kind === "book";
      var items = [];
      var pos = Math.random() * CELL * 3;
      // Fill one loop of items; gaps stay hoppable (streams) / passable (toys).
      var loopTarget = W + PAD * 2;
      while (pos < loopTarget) {
        var iw = wCells * CELL;
        items.push({ start: pos, w: iw });
        var gapCells = isStream
          ? 2 + Math.floor(Math.random() * 2)          // 2-3 cells of water
          : 3 + Math.floor(Math.random() * 3);         // 3-5 cells of floor
        pos += iw + gapCells * CELL;
      }
      return {
        row: row, dir: dir, kind: kind, isStream: isStream,
        speed: speed, loop: pos, items: items, offset: 0,
        colorSeed: Math.floor(Math.random() * 4)
      };
    }

    function buildWave() {
      lanes = [];
      var i;
      for (i = 0; i < STREAM_LANES.length; i++) lanes.push(buildLane(STREAM_LANES[i]));
      for (i = 0; i < TOY_LANES.length; i++) lanes.push(buildLane(TOY_LANES[i]));
    }

    function itemScreenX(lane, item) {
      var x = (item.start + lane.offset) % lane.loop;
      if (x < 0) x += lane.loop;
      return x - PAD;
    }

    function resetPlayer() {
      player = {
        px: Math.floor(COLS / 2) * CELL, row: START_ROW,
        hopT: 0, fromX: 0, fromY: 0, ride: null
      };
      bestRow = START_ROW;
      letterTimer = LETTER_TIME;
      hopQ = null;
      edgeWarn = 0;
    }

    function resetWorld() {
      wave = 1; lives = 3; score = 0;
      slots = [false, false, false, false, false];
      deathTimer = 0; deathText = ""; edgeWarn = 0;
      combo.reset(true);
      particles = particles || []; floaters = floaters || [];
      particles.length = 0; floaters.length = 0;
      tickCount = 0;
      buildWave();
      resetPlayer();
    }

    // ---------- Audio (shared GMSArcade synth: compressor + noise + arp) ----------
    var audio = A.makeSynth({ muteKey: MUTE_KEY });
    function ensureAudio() { audio.ensure(); }
    var sfx = {
      hop: function () { audio.beep(300, 420, 0.05, "square", 0.35); },
      forward: function () { audio.beep(420, 560, 0.05, "triangle", 0.4); },
      // each successive ring in a round climbs a step so deliveries feel like a scale
      deliver: function (step) {
        var b = 1 + (Math.max(1, step || 1) - 1) * 0.08;
        audio.arp([523 * b, 659 * b, 784 * b], 0.06, 0.16, "triangle", 0.5);
      },
      wave: function () { audio.arp([392, 523, 659, 784, 1046], 0.07, 0.2, "triangle", 0.5); },
      splash: function () { audio.noise(0.3, 520, 0.5, 2); audio.beep(260, 80, 0.22, "sine", 0.4); },
      squish: function () { audio.noise(0.26, 300, 0.55, 4); audio.beep(200, 70, 0.2, "sawtooth", 0.45); }
    };

    // ---------- Particles / floaters (pooled) ----------
    function spawnParticle(x, y, vx, vy, life, color) {
      if (reduce) return;
      var p;
      for (var i = 0; i < particles.length; i++) { if (particles[i].life <= 0) { p = particles[i]; break; } }
      if (!p) { if (particles.length >= PARTICLE_CAP) return; p = {}; particles.push(p); }
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.maxLife = life; p.color = color;
    }
    function spawnBurst(x, y, color, n) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 1.2;
        spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 10 + Math.random() * 8, color);
      }
    }
    function spawnFloater(x, y, text, color) {
      if (reduce) return;
      var f;
      for (var i = 0; i < floaters.length; i++) { if (floaters[i].life <= 0) { f = floaters[i]; break; } }
      if (!f) { if (floaters.length >= FLOATER_CAP) return; f = {}; floaters.push(f); }
      f.x = x; f.y = y; f.life = 30; f.maxLife = 30; f.text = text; f.color = color;
    }
    // Low, sideways puff kicked up when the envelope touches down — sells weight.
    function spawnDust(cx, cy) {
      if (reduce) return;
      for (var i = 0; i < 4; i++) {
        var vx = (Math.random() * 2 - 1) * 0.9;
        spawnParticle(cx + (Math.random() * 6 - 3), cy, vx, -0.1 - Math.random() * 0.2,
          7 + Math.random() * 4, WARM);
      }
    }

    // ---------- Lifecycle ----------
    function start() { resetWorld(); state = "running"; hidePrompt(); ensureAudio(); }

    function loseLetter(reason) {
      lives--;
      deathTimer = 45;
      deathText = reason;
      combo.reset();
      edgeWarn = 0;
      ensureAudio();
      if (reason === "splash") sfx.splash(); else sfx.squish();
      camera.shake(reason === "splash" ? 0.5 : 0.6);
      camera.freeze(reduce ? 0 : 5);
      spawnBurst(player.px + CELL / 2, player.row * CELL + CELL / 2,
        reason === "splash" ? LEAF_SIDE : BRAIN, 12);
    }
    function afterDeath() {
      if (lives <= 0) {
        state = "gameover";
        showEnd(Math.floor(score));
        return;
      }
      resetPlayer();
    }

    function deliver(slotIdx) {
      slots[slotIdx] = true;
      var mult = combo.hit();
      var bonus = (50 * wave + Math.floor(letterTimer / 120) * 2) * mult;
      score += bonus;
      var filled = 0, allDone = true;
      for (var i = 0; i < slots.length; i++) { if (slots[i]) filled++; else allDone = false; }
      spawnFloater(SLOT_COLS[slotIdx] * CELL + CELL / 2, CELL,
        "+" + bonus + (mult > 1 ? " x" + mult : ""), BRAIN);
      spawnBurst(SLOT_COLS[slotIdx] * CELL + CELL / 2, CELL / 2, LEAF_TOP, 10);
      camera.shake(0.2); camera.freeze(reduce ? 0 : 2);   // small celebratory pop
      ensureAudio(); sfx.deliver(filled);
      if (allDone) {
        score += 150;
        wave++;
        slots = [false, false, false, false, false];
        buildWave();
        camera.shake(0.5); camera.freeze(reduce ? 0 : 5);  // medium round-clear
        ensureAudio(); sfx.wave();
        spawnFloater(W / 2, H / 2, "round " + wave + "!", LEAF_SIDE);
      }
      resetPlayer();
    }

    // ---------- Input ----------
    function hop(dx, dy) {
      if (state === "idle") { start(); return; }
      if (state !== "running") return;
      if (deathTimer > 0) return;
      if (player.hopT > 0) { hopQ = { x: dx, y: dy }; return; }

      var targetRow = player.row + dy;
      if (targetRow > START_ROW) return;
      var targetX = clamp(player.px + dx * CELL, -CELL / 2, W - CELL / 2);
      if (dy === 0 && targetX === player.px && dx !== 0) return;

      if (targetRow === HOME_ROW) {
        // only an open mailbox accepts the hop
        var col = Math.round(targetX / CELL);
        var slotIdx = SLOT_COLS.indexOf(col);
        if (slotIdx === -1 || slots[slotIdx]) return;
        deliver(slotIdx);
        return;
      }

      player.fromX = player.px;
      player.fromY = player.row * CELL;
      player.px = dy === 0 ? targetX : (isStream(targetRow) || isStream(player.row) ? targetX : Math.round(targetX / CELL) * CELL);
      player.row = targetRow;
      player.ride = null;
      player.hopT = 5;
      ensureAudio();
      if (dy < 0 && targetRow < bestRow) {
        bestRow = targetRow;
        score += 10;
        sfx.forward();
      } else {
        sfx.hop();
      }
    }
    function isStream(row) { return STREAM_ROWS.indexOf(row) !== -1; }
    function isToyRow(row) { return TOY_ROWS.indexOf(row) !== -1; }

    // ---------- Update ----------
    function tick(dt) {
      tickCount += dt;
      combo.tick(dt);
      if (edgeWarn > 0) edgeWarn -= dt;

      // lanes always drift
      for (var l = 0; l < lanes.length; l++) {
        var lane = lanes[l];
        lane.offset += lane.dir * lane.speed * speedMul() * dt;
      }

      if (deathTimer > 0) {
        deathTimer -= dt;
        if (deathTimer <= 0) afterDeath();
        updateParticles(dt);
        return;
      }

      letterTimer -= dt;
      if (letterTimer <= 0) { loseLetter("squish"); return; }

      // hop tween
      if (player.hopT > 0) {
        player.hopT -= dt;
        if (player.hopT <= 0) {
          player.hopT = 0;
          spawnDust(player.px + CELL / 2, player.row * CELL + 14);
          if (hopQ) { var q = hopQ; hopQ = null; hop(q.x, q.y); }
        }
      }

      var row = player.row;
      var centerX = player.px + CELL / 2;

      if (isStream(row) && player.hopT <= 0) {
        // must be standing on a book
        var lane1 = laneAt(row);
        var on = null;
        for (var i = 0; i < lane1.items.length; i++) {
          var x = itemScreenX(lane1, lane1.items[i]);
          if (centerX >= x - 2 && centerX <= x + lane1.items[i].w + 2) { on = lane1; break; }
        }
        if (!on) { loseLetter("splash"); return; }
        player.px += on.dir * on.speed * speedMul() * dt;
        // telegraph the "drift off the edge" death — flash before it's fatal
        if (player.px < 1 || player.px > W - CELL - 1) { if (!reduce) edgeWarn = 8; }
        if (player.px < -CELL * 0.7 || player.px > W - CELL * 0.3) { loseLetter("splash"); return; }
      }

      if (isToyRow(row) && player.hopT <= 0) {
        var lane2 = laneAt(row);
        for (var t = 0; t < lane2.items.length; t++) {
          var tx = itemScreenX(lane2, lane2.items[t]);
          if (centerX + 5 > tx && centerX - 5 < tx + lane2.items[t].w) { loseLetter("squish"); return; }
        }
      }

      updateParticles(dt);
    }

    function laneAt(row) {
      for (var i = 0; i < lanes.length; i++) { if (lanes[i].row === row) return lanes[i]; }
      return null;
    }

    function updateParticles(dt) {
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
      }
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        fl.y -= 0.3 * dt; fl.life -= dt;
      }
    }

    // ---------- Drawing ----------
    function drawToy(x, y, w, kind, seed) {
      if (kind === "wagon") {
        blockyRect(ctx, x + 2, y + 4, w - 4, 7, BRAIN);
        ctx.fillStyle = INK;
        ctx.fillRect(Math.round(x) + 5, Math.round(y) + 11, 3, 3);
        ctx.fillRect(Math.round(x + w) - 8, Math.round(y) + 11, 3, 3);
      } else if (kind === "train") {
        blockyRect(ctx, x + 1, y + 3, w * 0.55, 9, LEAF_SIDE);
        blockyRect(ctx, x + w * 0.6, y + 5, w * 0.36, 7, WARM);
        ctx.fillStyle = INK;
        ctx.fillRect(Math.round(x) + 4, Math.round(y) + 12, 2, 2);
        ctx.fillRect(Math.round(x + w) - 6, Math.round(y) + 12, 2, 2);
      } else if (kind === "car") {
        blockyRect(ctx, x + 1, y + 5, w - 2, 7, LEAF_TOP);
        blockyRect(ctx, x + 4, y + 2, w - 8, 4, LEAF_TOP);
        ctx.fillStyle = INK;
        ctx.fillRect(Math.round(x) + 3, Math.round(y) + 12, 3, 3);
        ctx.fillRect(Math.round(x + w) - 6, Math.round(y) + 12, 3, 3);
      } else if (kind === "ball") {
        blockyRect(ctx, x + 3, y + 4, 9, 9, BRAIN);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(Math.round(x) + 5, Math.round(y) + 6, 3, 2);
      } else { // blocks
        var colors = [BRAIN, LEAF_SIDE, LEAF_TOP, WARM];
        blockyRect(ctx, x + 1, y + 4, 10, 10, colors[seed % 4]);
        blockyRect(ctx, x + 13, y + 6, 8, 8, colors[(seed + 1) % 4]);
      }
    }

    function drawBook(x, y, w, seed) {
      var colors = [WARM, BRAIN, LEAF_SIDE, LEAF_TOP];
      blockyRect(ctx, x, y + 4, w, 9, colors[seed % 4]);
      ctx.fillStyle = INK;
      ctx.fillRect(Math.round(x) + 3, Math.round(y) + 4, 2, 9);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(Math.round(x) + 6, Math.round(y) + 6, Math.round(w) - 9, 1);
    }

    function drawPlayer() {
      var groundX = player.px, groundY = player.row * CELL;
      var baseX = groundX, baseY = groundY, lift = 0;
      if (player.hopT > 0) {
        var t = player.hopT / 5;
        baseX = groundX + (player.fromX - groundX) * t;
        baseY = groundY + (player.fromY - groundY) * t;
        lift = Math.sin((1 - t) * Math.PI) * 4; // arc apex height
      }

      // cast shadow — stays on the ground line and SHRINKS/fades as the hop rises
      if (!reduce) {
        var shW = Math.max(4, Math.round(10 - lift * 1.4));
        var shX = Math.round(baseX + 8 - shW / 2);
        var shY = Math.round(baseY) + 14;
        ctx.globalAlpha = clamp(0.22 * (1 - lift / 6), 0.05, 0.22);
        ctx.fillStyle = INK;
        ctx.fillRect(shX + 1, shY, shW - 2, 2);
        ctx.fillRect(shX, shY + 1, shW, 1);
        ctx.globalAlpha = 1;
      }

      // idle bob when stationary — a gentle 1px lift, never during a hop/death
      var idleBob = 0;
      if (!reduce && player.hopT <= 0 && deathTimer <= 0 && state === "running") {
        idleBob = Math.sin(tickCount * 0.12) < -0.4 ? -1 : 0;
      }

      var px = Math.round(baseX);
      var py = Math.round(baseY - lift) + idleBob;

      // squash & stretch (integer px): tall+thin at the apex, wide+short near the
      // ground; the envelope base edge is held fixed so it never floats.
      var dw = 0, dh = 0;
      if (!reduce && player.hopT > 0) {
        if (lift > 2.2) { dw = -2; dh = 2; }   // stretched at apex
        else { dw = 2; dh = -1; }              // squashed at take-off / landing
      }
      var ew = 12 + dw, eh = 8 + dh;
      var ex = px + 2 - dw / 2, ey = py + 6 - dh; // hold the base edge (ey + eh)

      // envelope
      blockyRect(ctx, ex, ey, ew, eh, "#FFFFFF");
      // edge-drift warning outline while riding a book near the brink
      if (!reduce && edgeWarn > 0 && Math.floor(edgeWarn / 3) % 2 === 0) {
        ctx.strokeStyle = BRAIN; ctx.lineWidth = 1;
        ctx.strokeRect(ex - 1.5, ey - 1.5, ew + 3, eh + 3);
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ex, ey); ctx.lineTo(ex + ew / 2, ey + eh - 3); ctx.lineTo(ex + ew, ey);
      ctx.stroke();
      // sprout carrier peeking over the top
      blockyRect(ctx, px + 5, py + 1, 6, 5, BRAIN);
      blockyRect(ctx, px + 7, py - 2, 3, 3, LEAF_TOP);
    }

    function render() {
      ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      var sh = camera.offset();
      ctx.translate(sh.x, sh.y);

      // bands
      ctx.fillStyle = CREAM;
      ctx.fillRect(-4, -4, W + 8, H + 8);
      ctx.fillStyle = STREAM_BG;
      ctx.fillRect(0, CELL, W, CELL * 5);
      ctx.fillStyle = FLOOR_BG;
      ctx.fillRect(0, CELL * 7, W, CELL * 5);

      // stream ripples
      if (!reduce) {
        ctx.fillStyle = "rgba(64,192,153,0.35)";
        for (var rp = 0; rp < 18; rp++) {
          var rx = (rp * 47 + Math.floor(tickCount * 0.4) * (rp % 2 ? 1 : -1)) % W;
          if (rx < 0) rx += W;
          ctx.fillRect(rx, CELL + (rp % 5) * CELL + 8, 4, 1);
        }
      }

      // median + start grass dots
      ctx.fillStyle = "rgba(81,121,101,0.4)";
      for (var g = 0; g < COLS; g++) {
        ctx.fillRect(g * CELL + 5, MEDIAN_ROW * CELL + 10, 2, 2);
        ctx.fillRect(g * CELL + 10, SAFE_ROW * CELL + 8, 2, 2);
        ctx.fillRect(g * CELL + 4, START_ROW * CELL + 11, 2, 2);
      }

      // lane separators on the floor
      ctx.fillStyle = "rgba(14,42,45,0.12)";
      for (var lr = 8; lr <= 11; lr++) {
        for (var dsh = 0; dsh < W; dsh += 12) ctx.fillRect(dsh, lr * CELL, 6, 1);
      }

      // home row: hedge + mailboxes
      ctx.fillStyle = "#9FBF9B";
      ctx.fillRect(0, 0, W, CELL);
      for (var s = 0; s < SLOT_COLS.length; s++) {
        var sx = SLOT_COLS[s] * CELL;
        ctx.fillStyle = STREAM_BG;
        ctx.fillRect(sx, 0, CELL, CELL);
        if (slots[s]) {
          blockyRect(ctx, sx + 2, 4, 12, 8, "#FFFFFF");
          ctx.fillStyle = LEAF_SIDE;
          ctx.fillRect(sx + 4, 6, 8, 1);
        } else {
          // open mailbox = a live objective — soft crisp halo so it reads clearly
          if (!reduce) A.pixelGlow(ctx, sx + CELL / 2, CELL / 2 + 1, 6, BRAIN, 0.14);
          blockyRect(ctx, sx + 3, 3, 10, 9, WARM);
          ctx.fillStyle = BRAIN;
          ctx.fillRect(sx + 11, 1, 2, 5);
          ctx.fillStyle = INK;
          ctx.fillRect(sx + 5, 6, 6, 2);
        }
      }

      // lanes
      for (var l = 0; l < lanes.length; l++) {
        var lane = lanes[l];
        var ly = lane.row * CELL;
        for (var i = 0; i < lane.items.length; i++) {
          var x = itemScreenX(lane, lane.items[i]);
          if (x + lane.items[i].w < -4 || x > W + 4) continue;
          if (lane.isStream) drawBook(x, ly, lane.items[i].w, lane.colorSeed + i);
          else drawToy(x, ly, lane.items[i].w, lane.kind, lane.colorSeed + i);
        }
      }

      // player (blink during death pause)
      if (deathTimer > 0) {
        if (Math.floor(deathTimer / 4) % 2 === 0) drawPlayer();
      } else {
        drawPlayer();
      }

      // death banner — finally surfaces deathText as a punchy SPLASH!/SQUISH!
      if (deathTimer > 0 && deathText) {
        var label = deathText === "splash" ? "SPLASH!" : "SQUISH!";
        var lcol = deathText === "splash" ? LEAF_SIDE : BRAIN;
        var bx = clamp(player.px + CELL / 2, 34, W - 34);
        var by = clamp(player.row * CELL - 3, 16, H - 22);
        ctx.globalAlpha = clamp(deathTimer / 40, 0, 1);
        ctx.font = "bold 15px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = INK;
        ctx.fillText(label, bx - 1, by + 1);
        ctx.fillText(label, bx + 1, by + 1);
        ctx.fillStyle = lcol;
        ctx.fillText(label, bx, by);
        ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // particles
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 2);
      }
      ctx.globalAlpha = 1;

      // floaters
      ctx.font = "7px monospace"; ctx.textAlign = "center";
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        ctx.globalAlpha = clamp(fl.life / fl.maxLife, 0, 1);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, Math.round(fl.x), Math.round(fl.y));
      }
      ctx.globalAlpha = 1; ctx.textAlign = "left";

      // delivery streak readout on the empty median band (DOM HUD only shows
      // SCORE/ROUND/BEST, so the multiplier lives on-canvas).
      var cmult = combo.mult();
      if (cmult > 1) {
        var ccx = W / 2, ccy = MEDIAN_ROW * CELL + 11;
        ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = INK;
        ctx.fillText("x" + cmult, ccx + 1, ccy + 1);
        ctx.fillStyle = cmult >= 4 ? BRAIN : LEAF_SIDE;
        ctx.fillText("x" + cmult, ccx, ccy);
        ctx.textAlign = "left";
        // thin draining window bar under it
        ctx.fillStyle = "rgba(64,192,153,0.55)";
        ctx.fillRect(Math.round(ccx - 8), ccy + 3, Math.round(16 * combo.frac()), 1);
      }

      // letter timer (bottom bar)
      var tw = Math.round((letterTimer / LETTER_TIME) * (W - 12));
      ctx.fillStyle = "rgba(14,42,45,0.2)";
      ctx.fillRect(6, H - 4, W - 12, 2);
      ctx.fillStyle = letterTimer < 600 ? BRAIN : LEAF_SIDE;
      ctx.fillRect(6, H - 4, Math.max(0, tw), 2);

      // lives (envelope pips, bottom-left above the bar)
      for (var lv = 0; lv < lives; lv++) {
        blockyRect(ctx, 5 + lv * 10, H - 13, 7, 5, "#FFFFFF");
      }

      ctx.restore();
    }

    // ---------- HUD / prompt ----------
    function updateHud() {
      if (els.score) els.score.textContent = String(Math.floor(score)).padStart(5, "0");
      if (els.best) els.best.textContent = String(A.leaderboard.best(GAME_KEY)).padStart(5, "0");
      if (els.wave) els.wave.textContent = String(wave || 1);
    }
    function hidePrompt() { if (els.prompt) els.prompt.hidden = true; }
    function showIdle() {
      els.promptTitle.textContent = "Special Delivery";
      els.promptText.textContent = "Carry your message past the toys, hop the books, reach a mailbox.";
      els.promptActions.textContent = "";
      A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores" });
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Start";
      btn.addEventListener("click", function () { start(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
      els.prompt.hidden = false;
    }
    function showEnd(finalScore) {
      updateHud();
      els.promptTitle.textContent = "The letters got lost";
      els.promptText.textContent = "Score " + String(finalScore).padStart(5, "0") + " · round " + wave;
      els.promptActions.textContent = "";
      if (A.leaderboard.qualifies(GAME_KEY, finalScore)) {
        A.mountInitialsEntry(els.promptActions, {
          gameKey: GAME_KEY, score: finalScore,
          onDone: function (rank) {
            updateHud();
            els.promptActions.textContent = "";
            A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores", highlightRank: rank });
            addPlayAgain("Play again");
            try { canvas.focus(); } catch (e) {}
          }
        });
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
      btn.addEventListener("click", function () { start(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
    }

    // ---------- Loop ----------
    var rafId = null, lastTime = 0;
    function loop(now) {
      if (!lastTime) lastTime = now;
      var dt = Math.min(2.5, (now - lastTime) / (1000 / 60));
      lastTime = now;
      camera.tick(dt);
      if (state === "running" && !camera.frozen()) tick(dt);
      render();
      updateHud();
      rafId = window.requestAnimationFrame(loop);
    }

    return {
      hop: hop,
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
      tapStart: function () {
        ensureAudio();
        if (state === "idle") { start(); return; }
        if (state === "gameover") {
          if (document.activeElement && document.activeElement.tagName === "INPUT") return;
          start();
        }
      },
      toggleMute: function () { return audio.toggleMute(); },
      isMuted: function () { return audio.isMuted(); },
      activate: function () {
        resetWorld(); state = "idle"; lastTime = 0;
        updateHud(); showIdle();
        rafId = window.requestAnimationFrame(loop);
      },
      deactivate: function () {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = null;
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
    overlay.setAttribute("aria-label", "Special Delivery — a hidden mini game");
    overlay.innerHTML =
      '<div class="gms-arcade-backdrop" data-egg-close></div>' +
      '<div class="gms-arcade-panel">' +
        '<div class="gms-arcade-panel__head">' +
          '<p class="gms-arcade-title">Special Delivery <span>— you found it!</span></p>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button type="button" class="gms-arcade-close" data-egg-mute aria-label="Toggle sound">♪</button>' +
            '<button type="button" class="gms-arcade-close" data-egg-close aria-label="Close game">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="gms-arcade-scores">' +
          '<span>SCORE <strong data-egg-score>00000</strong></span>' +
          '<span>ROUND <strong data-egg-wave>1</strong></span>' +
          '<span>BEST <strong data-egg-best>00000</strong></span>' +
        '</div>' +
        '<div class="gms-arcade-stage gms-arcade-stage--hopper">' +
          '<canvas class="gms-arcade-canvas" tabindex="0"></canvas>' +
          '<div class="gms-arcade-prompt" data-egg-prompt hidden>' +
            '<p class="gms-arcade-prompt__title" data-egg-prompt-title></p>' +
            '<p class="gms-arcade-prompt__text" data-egg-prompt-text></p>' +
            '<div class="gms-arcade-prompt__actions" data-egg-prompt-actions></div>' +
          '</div>' +
        '</div>' +
        '<p class="gms-arcade-help">Arrows / WASD hop · swipe on touch · ride the books across the stream · M to mute</p>' +
        '<div class="gms-arcade-touchrow">' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-hop="-1,0" aria-label="Hop left">◀</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-hop="0,-1" aria-label="Hop forward">▲</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-hop="0,1" aria-label="Hop back">▼</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-hop="1,0" aria-label="Hop right">▶</button>' +
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

    // D-pad buttons.
    overlay.querySelectorAll("[data-egg-hop]").forEach(function (el) {
      var parts = el.getAttribute("data-egg-hop").split(",");
      var dx = parseInt(parts[0], 10), dy = parseInt(parts[1], 10);
      var press = function (e) { e.preventDefault(); game.hop(dx, dy); };
      el.addEventListener("touchstart", press, { passive: false });
      el.addEventListener("mousedown", press);
    });

    // Canvas: tap starts/restarts; a quick swipe hops that way.
    var swipe = null, suppressMouse = 0;
    canvas.addEventListener("touchstart", function (e) {
      e.preventDefault();
      suppressMouse = Date.now() + 500;
      var t = e.touches[0];
      swipe = { x: t.clientX, y: t.clientY, used: false };
      game.tapStart();
    }, { passive: false });
    canvas.addEventListener("touchmove", function (e) {
      e.preventDefault();
      if (!swipe || swipe.used || !e.touches.length) return;
      var t = e.touches[0];
      var dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
      if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
      if (Math.abs(dx) > Math.abs(dy)) game.hop(dx > 0 ? 1 : -1, 0);
      else game.hop(0, dy > 0 ? 1 : -1);
      swipe.used = true;
    }, { passive: false });
    canvas.addEventListener("touchend", function (e) {
      e.preventDefault();
      // a plain tap (no swipe) hops forward — the most common move
      if (swipe && !swipe.used) game.hop(0, -1);
      swipe = null;
    }, { passive: false });
    canvas.addEventListener("mousedown", function (e) {
      if (Date.now() < suppressMouse) return;
      e.preventDefault();
      game.tapStart();
    });

    function onKeydown(e) {
      // While typing initials, leave all keys (incl. Escape/Enter) to the form
      // so a stray Escape never reloads the page and drops the high score.
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "Escape") { closeOverlay(overlay); return; }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); game.hop(-1, 0); }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); game.hop(1, 0); }
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); if (!e.repeat) game.hop(0, -1); }
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); if (!e.repeat) game.hop(0, 1); }
      else if (e.code === "Space" || e.key === " ") { e.preventDefault(); game.tapStart(); }
      else if (e.key === "m" || e.key === "M") { game.toggleMute(); syncMute(); }
    }

    overlay.game = game;
    overlay._onKeydown = onKeydown;
    overlay._canvas = canvas;
    overlay._fitCanvas = fitCanvas;
    return overlay;
  }

  function closeOverlay(overlay) {
    overlay.game.deactivate();
    window.location.reload();
  }
  function openOverlay(overlay) {
    overlay.classList.add("is-open");
    document.body.classList.add("gms-arcade-lock");
    overlay._fitCanvas();
    document.addEventListener("keydown", overlay._onKeydown);
    window.addEventListener("resize", overlay._fitCanvas);
    overlay.game.activate();
    window.requestAnimationFrame(function () { overlay._canvas.focus(); });
  }

  // Pixel-envelope trigger, tucked into the Contact hero.
  function buildTrigger() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gms-arcade-envelope-trigger";
    btn.setAttribute("aria-label", "Hidden game");
    btn.title = "✉";
    btn.innerHTML =
      '<svg viewBox="0 0 12 9" aria-hidden="true" shape-rendering="crispEdges">' +
      '<g fill="currentColor">' +
      '<rect x="0" y="0" width="12" height="1"/>' +
      '<rect x="0" y="1" width="1" height="7"/><rect x="11" y="1" width="1" height="7"/>' +
      '<rect x="1" y="2" width="2" height="1"/><rect x="9" y="2" width="2" height="1"/>' +
      '<rect x="3" y="3" width="2" height="1"/><rect x="7" y="3" width="2" height="1"/>' +
      '<rect x="5" y="4" width="2" height="1"/>' +
      '<rect x="0" y="8" width="12" height="1"/>' +
      '</g></svg>';
    return btn;
  }

  ready(function () {
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
