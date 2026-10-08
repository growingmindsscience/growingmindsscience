/* Growing Minds Science — echo-game.js
   "Serve & Return" — a pattern-echo memory game in the Arcade.

   A little sprout-haired baby "serves" a pattern by lighting four pads in
   turn, each with its own note. You "return" it by pressing the same pads in
   the same order. Every good return adds one more step, so the conversation
   gets longer and a little quicker. A nod to two ideas from developmental
   science: serve and return (a baby coos or points, the caregiver answers)
   and rupture and repair (a missed cue is normal: the baby simply serves the
   same pattern again so you can repair it).

   Trigger: arcade-only. The "Serve & Return" card on /arcade/ opens it; no
   hidden trigger elsewhere. Opening tears the page away (GMSArcade) then
   shows the game.

   Built on window.GMSArcade (arcade-core.js) for the page-tear, the local
   leaderboard, and the initials entry. Self-contained otherwise: own overlay
   DOM, own rAF loop, full teardown on close. CSP-safe (no eval, no external
   assets; audio is Web Audio oscillator synth). Honors prefers-reduced-motion
   (no shake, ripples, particles or bobbing; the pads still light up, because
   that is the information, not decoration).

   Mobile (shared toolkit): tap the pads right on the canvas (pointerdown, so
   a pad answers the instant a finger lands) or use the four-button touch row;
   wake lock while open; auto-pause on tab-hide; haptics degrade to no-ops.
   No per-press timer: the player can take their time on their turn.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A) return;

  var GAME_KEY = "serve-and-return";
  var MUTE_KEY = "gms-echo-muted";

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
  var SKIN = "#F7D9BC";
  var ROSE = "#EE8577";
  var MOUTH = "#B9493F";

  function hexRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // Blend hex a toward hex b by t (0..1). Used once at load for the muted /
  // shaded pad tones so every tint stays inside the brand palette.
  function mix(a, b, t) {
    var x = hexRgb(a), y = hexRgb(b), out = "#";
    for (var i = 0; i < 3; i++) {
      var v = Math.round(x[i] + (y[i] - x[i]) * t);
      out += (v < 16 ? "0" : "") + v.toString(16);
    }
    return out;
  }
  var RUG_OUT = mix(LEAF_SIDE, CREAM, 0.78);
  var RUG_IN = mix(LEAF_SIDE, CREAM, 0.86);
  var ONESIE = "#FFFDF7";
  var HEART_EMPTY = mix(INK, CREAM, 0.86);
  var HEART_EDGE = mix(INK, CREAM, 0.55);
  var PIP_EMPTY = mix(INK, CREAM, 0.8);

  // ---------- Board ----------
  var W = 200, H = 200;
  var CX = 100;                              // the baby sits dead-center
  var PAD_W = 46, PAD_H = 42, LIP = 3, PAD_R = 7;
  var HIT_SLOP = 6;                          // forgiving taps around each pad
  var MAX_HEARTS = 3;

  // Frame budgets (60fps frames; the loop's dt is in these units).
  var LEAD_IN = 24, LEAD_REPAIR = 34;        // pause before the baby serves
  var CHEER_FRAMES = 74, HAPPY_FRAMES = 42;  // giggle, then a short breath
  var OOPS_FRAMES = 70, SURPRISE_FRAMES = 44;

  // Four pads in a diamond: 0 top, 1 left, 2 right, 3 bottom (= keys 1-4).
  // Each has its own colour AND its own icon, so colour is never the only
  // cue. Notes are A-minor pentatonic (A4 C5 E5 G5): any order sounds musical.
  var PADS = [
    { cx: 100, cy: 39, color: BRAIN, icon: "note", freq: 523.25 },
    { cx: 40, cy: 100, color: LEAF_SIDE, icon: "heart", freq: 659.25 },
    { cx: 160, cy: 100, color: LEAF_TOP, icon: "star", freq: 783.99 },
    { cx: 100, cy: 161, color: WARM, icon: "sun", freq: 440 }
  ];
  PADS.forEach(function (p) {
    p.x = p.cx - PAD_W / 2;
    p.y = p.cy - Math.floor((PAD_H + LIP) / 2);
    p.muted = mix(p.color, CREAM, 0.6);
    p.lip = mix(p.color, INK, 0.3);
    p.mutedLip = mix(p.muted, INK, 0.2);
    p.iconDim = mix(p.color, INK, 0.42); // unlit icon: a deeper shade of the pad
  });

  // 1-bit pixel icons (drawn at 2px per cell).
  var ICONS = {
    note: [
      "....XX...",
      "....XXX..",
      "....X.XX.",
      "....X..X.",
      "....X....",
      "..XXX....",
      ".XXXX....",
      ".XXXX....",
      "..XX....."
    ],
    heart: [
      ".XX...XX.",
      "XXXX.XXXX",
      "XXXXXXXXX",
      "XXXXXXXXX",
      ".XXXXXXX.",
      "..XXXXX..",
      "...XXX...",
      "....X...."
    ],
    star: [
      "....X....",
      "...XXX...",
      "...XXX...",
      "XXXXXXXXX",
      ".XXXXXXX.",
      "..XXXXX..",
      "..XXXXX..",
      ".XXX.XXX.",
      ".XX...XX."
    ],
    sun: [
      ".....X.....",
      ".X...X...X.",
      "..X.....X..",
      "....XXX....",
      "...XXXXX...",
      "XX.XXXXX.XX",
      "...XXXXX...",
      "....XXX....",
      "..X.....X..",
      ".X...X...X.",
      ".....X....."
    ]
  };
  var HEART_HUD = [
    ".XX.XX.",
    "XXXXXXX",
    "XXXXXXX",
    ".XXXXX.",
    "..XXX..",
    "...X..."
  ];

  function blockyRect(ctx, x, y, w, h, fill) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // ---------- Stepped (pixel) rounding ----------
  // Quarter-circle corners as whole-pixel steps: never an anti-aliased arc.
  var cornerCache = {};
  function cornerInsets(r) {
    if (cornerCache[r]) return cornerCache[r];
    var out = [];
    for (var i = 0; i < r; i++) {
      var d = r - i - 0.5;
      out.push(r - Math.round(Math.sqrt(r * r - d * d)));
    }
    cornerCache[r] = out;
    return out;
  }
  // Left/right inset of row j in a block h tall with corner radius r
  // (-1 when the row is outside the block).
  function rowInset(h, r, j) {
    if (j < 0 || j >= h) return -1;
    var c = cornerInsets(r);
    if (j < r) return c[j];
    if (j >= h - r) return c[h - 1 - j];
    return 0;
  }
  // blockyRect's rounded cousin: nested full-height spans (so rows never
  // abut and seam), with an optional 1px edge that hugs every step (the
  // block dilated by one pixel), like blockyRect's ink outline.
  function roundBlock(ctx, x, y, w, h, r, fill, edge) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    r = Math.max(0, Math.min(r, Math.floor(w / 2), Math.floor(h / 2)));
    var j, l, a, mid = Math.floor((h - 1) / 2);
    if (edge) {
      ctx.fillStyle = edge;
      for (j = -1; j <= mid; j++) {
        l = 1e9;
        a = rowInset(h, r, j); if (a >= 0) l = Math.min(l, a - 1);
        a = rowInset(h, r, j - 1); if (a >= 0) l = Math.min(l, a);
        a = rowInset(h, r, j + 1); if (a >= 0) l = Math.min(l, a);
        ctx.fillRect(x + l, y + j, w - 2 * l, h - 2 * j);
        if (l < 0) break; // every later span sits inside this one
      }
    }
    ctx.fillStyle = fill;
    for (j = 0; j <= mid; j++) {
      l = rowInset(h, r, j);
      ctx.fillRect(x + l, y + j, w - 2 * l, h - 2 * j);
      if (l === 0) break;
    }
  }
  // 1px outline of the same stepped shape (ripple rings).
  function roundRing(ctx, x, y, w, h, r, color) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    r = Math.max(0, Math.min(r, Math.floor(w / 2), Math.floor(h / 2)));
    ctx.fillStyle = color;
    for (var j = 0; j < h; j++) {
      var l = rowInset(h, r, j);
      if (j === 0 || j === h - 1) { ctx.fillRect(x + l, y + j, w - 2 * l, 1); continue; }
      var span = Math.max(1, Math.max(rowInset(h, r, j - 1), rowInset(h, r, j + 1)) - l);
      ctx.fillRect(x + l, y + j, span, 1);
      ctx.fillRect(x + w - l - span, y + j, span, 1);
    }
  }
  // 1-bit bitmap, horizontal runs merged; optional 1px edge around the cells.
  function drawBitmap(ctx, rows, x, y, cell, color, edge) {
    x = Math.round(x); y = Math.round(y);
    var pass, r, c, run;
    for (pass = edge ? 0 : 1; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? edge : color;
      var grow = pass === 0 ? 1 : 0;
      for (r = 0; r < rows.length; r++) {
        c = 0;
        while (c < rows[r].length) {
          if (rows[r].charAt(c) !== "X") { c++; continue; }
          run = 0;
          while (c + run < rows[r].length && rows[r].charAt(c + run) === "X") run++;
          ctx.fillRect(x + c * cell - grow, y + r * cell - grow, run * cell + grow * 2, cell + grow * 2);
          c += run;
        }
      }
    }
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

    // Pixel layer: all the art is drawn 1:1 into this W×H buffer and then
    // blitted up nearest-neighbour, so steps and icons stay razor-sharp at
    // any fractional scale (no seams between rows). Text goes on top at full
    // backing resolution.
    var buf = document.createElement("canvas");
    buf.width = W; buf.height = H;
    var g = buf.getContext("2d");
    g.imageSmoothingEnabled = false;

    var reduce = A.prefersReducedMotion();
    // Shared juice: crisp shake + hit-stop. Audio-mute is deliberately
    // independent of reduced-motion (a11y: motion-sensitive players still get
    // sound, which is half of this game).
    var camera = A.makeCamera({ reduce: reduce, maxPx: 3 });
    var wake = A.makeWakeLock();
    var offHidden = null;

    var state = "idle"; // idle | serving | returning | cheer | oops | paused | gameover
    var pausedFrom = null;
    var pattern, len, inputIdx, hearts, score, bestLen, roundClean;
    var serveIdx, serveOn, serveTimer;          // serving sub-state
    var phaseTimer, phaseAge, phaseSfx, bigCheer, cheerText;
    var padLit, lastLit, bounceT, happyT, surpriseT, heartBlinkT;
    var particles, floaters, ripples, animT = 0, endGuard = 0;
    var PARTICLE_CAP = 28, FLOATER_CAP = 10, RIPPLE_CAP = 8;

    // The conversation quickens with length: ~430ms light / ~170ms gap at
    // first, easing to a floor of ~200ms / ~90ms.
    function lightFrames() { return Math.max(200, 430 - (len - 1) * 23) * 0.06; }
    function gapFrames() { return Math.max(90, 170 - (len - 1) * 8) * 0.06; }

    function isActive(s) { return s === "serving" || s === "returning" || s === "cheer" || s === "oops"; }

    function nextPad() {
      var n = Math.floor(Math.random() * 4);
      var L = pattern.length;
      // allow doubles, but never three of the same in a row
      if (L >= 2 && pattern[L - 1] === n && pattern[L - 2] === n) n = (n + 1 + Math.floor(Math.random() * 3)) % 4;
      return n;
    }

    function resetWorld() {
      pattern = []; len = 0; inputIdx = 0;
      hearts = MAX_HEARTS; score = 0; bestLen = 0; roundClean = true;
      serveIdx = -1; serveOn = false; serveTimer = 0;
      phaseTimer = 0; phaseAge = 0; phaseSfx = 0; bigCheer = false; cheerText = "";
      padLit = [0, 0, 0, 0]; lastLit = -1;
      bounceT = 0; happyT = 0; surpriseT = 0; heartBlinkT = 0;
      pausedFrom = null;
      particles = particles || []; floaters = floaters || []; ripples = ripples || [];
      particles.length = 0; floaters.length = 0; ripples.length = 0;
    }

    // ---------- Audio (shared GMSArcade synth: compressor + noise + arp) ----------
    var audio = A.makeSynth({ muteKey: MUTE_KEY });
    function ensureAudio() { audio.ensure(); }
    var sfx = {
      // each pad's note, held about as long as the pad stays lit
      tone: function (i, frames) {
        var f = PADS[i].freq, dur = Math.max(0.18, frames / 60 + 0.06);
        audio.beep(f, f, dur, "triangle", 0.55);
        audio.beep(f * 2, f * 2, dur * 0.6, "sine", 0.1); // soft octave shimmer
      },
      returned: function () { audio.arp([523.25, 659.25, 783.99, 1046.5], 0.07, 0.18, "triangle", 0.42); },
      giggle: function () { audio.arp([1174.66, 1318.51, 1174.66, 1318.51], 0.065, 0.06, "sine", 0.16); },
      big: function () { audio.arp([440, 523.25, 659.25, 783.99, 1046.5, 1318.51], 0.075, 0.22, "triangle", 0.45); },
      // a gentle, low "uh-oh" (two falling sine notes), never a buzzer
      miss: function () { audio.arp([349.23, 293.66], 0.16, 0.3, "sine", 0.4); }
    };

    // ---------- Screen-reader turn cues ----------
    var liveFlip = false;
    function announce(text) {
      if (!els.live) return;
      // a trailing nbsp flip makes a repeated phrase announce again
      liveFlip = !liveFlip;
      els.live.textContent = text + (liveFlip ? " " : "");
    }

    // ---------- Particles / floaters / ripples (pooled) ----------
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
    function spawnFloater(x, y, text, color, big) {
      if (reduce) return;
      var f;
      for (var i = 0; i < floaters.length; i++) { if (floaters[i].life <= 0) { f = floaters[i]; break; } }
      if (!f) { if (floaters.length >= FLOATER_CAP) return; f = {}; floaters.push(f); }
      f.x = x; f.y = y; f.life = 40; f.maxLife = 40; f.text = text; f.color = color; f.big = !!big;
    }
    // Expanding pixel ring from a pressed pad: the "return" travelling out.
    function spawnRipple(i) {
      if (reduce) return;
      var rp;
      for (var k = 0; k < ripples.length; k++) { if (ripples[k].life <= 0) { rp = ripples[k]; break; } }
      if (!rp) { if (ripples.length >= RIPPLE_CAP) return; rp = {}; ripples.push(rp); }
      rp.pad = i; rp.life = 20; rp.maxLife = 20;
    }

    function lightPad(i, frames) { padLit[i] = frames; lastLit = i; }

    // ---------- Lifecycle ----------
    function start() {
      resetWorld();
      pattern.push(nextPad());
      len = 1;
      hidePrompt();
      ensureAudio();
      beginServe(LEAD_IN);
    }

    function beginServe(lead) {
      state = "serving";
      serveIdx = -1; serveOn = false; serveTimer = lead;
      inputIdx = 0;
      announce("Baby's turn");
    }
    function beginReturn() {
      state = "returning";
      inputIdx = 0;
      announce("Your turn — " + len + (len === 1 ? " step" : " steps"));
    }

    // Auto-pause freezes everything: every timer is frame-driven inside
    // tick(), which only runs while the state is active.
    function pause() {
      if (!isActive(state)) return;
      pausedFrom = state;
      state = "paused";
      showPaused();
    }
    function resume() {
      if (state !== "paused") return;
      state = pausedFrom || "returning";
      pausedFrom = null;
      hidePrompt();
      lastTime = 0; // hidden tabs stall rAF — don't let the first dt span the pause
      try { canvas.focus(); } catch (e) {}
    }

    // Player input: light + sound first (feedback before judgement), then check.
    function press(i) {
      if (state === "idle") { start(); return; }
      if (state === "paused") { resume(); return; }
      if (state !== "returning") return;
      ensureAudio();
      var lf = Math.max(14, lightFrames());
      lightPad(i, lf);
      sfx.tone(i, lf);
      spawnRipple(i);
      A.haptics.tick();
      if (i === pattern[inputIdx]) {
        inputIdx++;
        score += 10 * len;
        spawnBurst(PADS[i].cx, PADS[i].cy, PADS[i].color, 6);
        if (inputIdx >= len) roundComplete();
      } else {
        missedCue();
      }
    }

    function roundComplete() {
      var bonus = 25 * len + (roundClean ? 10 * len : 0);
      score += bonus;
      if (len > bestLen) bestLen = len;
      state = "cheer";
      phaseTimer = CHEER_FRAMES; phaseAge = 0; phaseSfx = 0;
      happyT = HAPPY_FRAMES;
      bigCheer = len % 5 === 0;
      cheerText = bigCheer ? len + " in a row!" : (roundClean ? "lovely!" : "repaired!");
      spawnFloater(152, 70, "+" + bonus, BRAIN); // up-right diagonal: open floor
      spawnBurst(CX, 90, LEAF_TOP, 10);
      A.haptics.pop();
      if (bigCheer) {
        // every fifth return: the whole rug celebrates
        spawnFloater(CX, 136, len + " in a row!", LEAF_SIDE, true);
        for (var i = 0; i < PADS.length; i++) spawnBurst(PADS[i].cx, PADS[i].cy, PADS[i].color, 4);
        camera.shake(0.5);
        A.haptics.win(); // overrides the pop — vibrate() replaces, not queues
        announce("Lovely — " + len + " in a row");
      }
    }

    // A missed cue is a rupture, not a failure: the baby looks surprised (not
    // sad), a heart goes, and the same pattern is served again to repair.
    function missedCue() {
      roundClean = false;
      hearts--;
      heartBlinkT = 36;
      state = "oops";
      phaseTimer = OOPS_FRAMES; phaseAge = 0; phaseSfx = 0;
      surpriseT = SURPRISE_FRAMES;
      happyT = 0;
      camera.shake(0.55);
      camera.freeze(4);
      A.haptics.thump();
      spawnFloater(48, 70, "repair!", ROSE); // up-left diagonal, by the hearts
      if (hearts > 0) announce("Missed cue — try that one again");
    }

    function gameOver() {
      state = "gameover";
      endGuard = Date.now() + 700; // a late pad tap must not skip the end card
      announce("The conversation took a nap");
      showEnd(Math.floor(score));
    }

    // ---------- Update ----------
    function tick(dt) {
      for (var i = 0; i < 4; i++) if (padLit[i] > 0) padLit[i] = Math.max(0, padLit[i] - dt);
      if (bounceT > 0) bounceT -= dt;
      if (happyT > 0) happyT -= dt;
      if (surpriseT > 0) surpriseT -= dt;
      if (heartBlinkT > 0) heartBlinkT -= dt;

      if (state === "serving") tickServe(dt);
      else if (state === "cheer") tickCheer(dt);
      else if (state === "oops") tickOops(dt);
      updateFx(dt);
    }

    function tickServe(dt) {
      serveTimer -= dt;
      // "while" + accumulate (not assign) keeps the rhythm steady on long frames
      while (serveTimer <= 0 && state === "serving") {
        if (serveOn) {
          serveOn = false;
          if (serveIdx >= pattern.length - 1) { beginReturn(); return; }
          serveTimer += gapFrames();
        } else {
          serveIdx++;
          serveOn = true;
          var p = pattern[serveIdx], lf = lightFrames();
          lightPad(p, lf);
          serveTimer += lf;
          bounceT = 8;
          sfx.tone(p, lf);
        }
      }
    }

    function tickCheer(dt) {
      phaseAge += dt;
      // stinger lands just after the last note instead of on top of it
      if (phaseSfx === 0 && phaseAge >= 8) { phaseSfx = 1; if (bigCheer) sfx.big(); else sfx.returned(); }
      if (phaseSfx === 1 && phaseAge >= 26) { phaseSfx = 2; sfx.giggle(); }
      phaseTimer -= dt;
      if (phaseTimer <= 0) {
        pattern.push(nextPad());
        len = pattern.length;
        roundClean = true;
        beginServe(LEAD_IN);
      }
    }

    function tickOops(dt) {
      phaseAge += dt;
      if (phaseSfx === 0 && phaseAge >= 7) { phaseSfx = 1; sfx.miss(); }
      phaseTimer -= dt;
      if (phaseTimer <= 0) {
        if (hearts <= 0) gameOver();
        else beginServe(LEAD_REPAIR);
      }
    }

    function updateFx(dt) {
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
      for (var r = 0; r < ripples.length; r++) {
        if (ripples[r].life > 0) ripples[r].life -= dt;
      }
    }

    // ---------- Drawing (pixel layer → g) ----------
    function drawRoom() {
      g.fillStyle = CREAM;
      g.fillRect(-4, -4, W + 8, H + 8);
      // soft floorboards
      g.fillStyle = "rgba(14,42,45,0.05)";
      for (var row = 0; row < 8; row++) {
        var y = row * 25 + 24;
        g.fillRect(0, y, W, 1);
        for (var sx = (row % 2) * 40 + 30; sx < W; sx += 80) g.fillRect(sx, y - 24, 1, 24);
      }
      // round braided play rug
      roundBlock(g, 12, 12, 176, 176, 88, RUG_OUT, null);
      roundBlock(g, 20, 20, 160, 160, 80, RUG_IN, null);
      roundRing(g, 16, 16, 168, 168, 84, "rgba(64,192,153,0.28)");
      roundRing(g, 44, 44, 112, 112, 56, "rgba(64,192,153,0.16)");
    }

    function drawPad(i) {
      var p = PADS[i];
      var lit = padLit[i] > 0;
      var sink = lit && !reduce ? 2 : 0; // pressed pads sink into their lip
      roundBlock(g, p.x, p.y + LIP, PAD_W, PAD_H, PAD_R, lit ? p.lip : p.mutedLip, INK);
      var fy = p.y + sink;
      roundBlock(g, p.x, fy, PAD_W, PAD_H, PAD_R, lit ? p.color : p.muted, INK);
      // lit pads get a bright inner rim, so "on" never rests on hue alone
      if (lit) roundRing(g, p.x + 2, fy + 2, PAD_W - 4, PAD_H - 4, PAD_R - 2, "rgba(255,255,255,0.7)");
      // a little shine in the top-left corner
      g.fillStyle = lit ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.4)";
      g.fillRect(p.x + 7, fy + 4, 9, 2);
      g.fillRect(p.x + 4, fy + 7, 2, 7);
      // icon (unlit = a deeper shade of the pad, lit = solid ink)
      var bmp = ICONS[p.icon];
      var iw = bmp[0].length * 2, ih = bmp.length * 2;
      drawBitmap(g, bmp, p.cx - iw / 2, fy + Math.round((PAD_H - ih) / 2), 2, lit ? INK : p.iconDim);
    }

    function drawRipples() {
      for (var k = 0; k < ripples.length; k++) {
        var rp = ripples[k];
        if (rp.life <= 0) continue;
        var p = PADS[rp.pad];
        var t = 1 - rp.life / rp.maxLife;
        var grow = Math.round(2 + t * 14);
        g.globalAlpha = Math.max(0, (1 - t) * 0.8);
        roundRing(g, p.x - grow, p.y - grow, PAD_W + grow * 2, PAD_H + LIP + grow * 2, PAD_R + grow, p.color);
      }
      g.globalAlpha = 1;
    }

    function babyMood(vis) {
      if (vis === "gameover") return "sleep";
      if (surpriseT > 0) return "surprised";
      if (happyT > 0) return "happy";
      if (vis === "serving" && serveOn) return "coo";
      return "calm";
    }

    function drawBaby(vis) {
      var mood = babyMood(vis);
      var oy = 0;
      if (!reduce) {
        if (mood === "happy") oy = Math.floor(animT / 5) % 2 === 0 ? -2 : 0;      // giggle bounce
        else if (bounceT > 0) oy = bounceT > 4 ? -2 : -1;                       // coo hop per note
        else if (mood === "surprised") oy = surpriseT > SURPRISE_FRAMES - 6 ? -2 : 0;
        else if (mood === "calm" && Math.sin(animT * 0.06) < -0.55) oy = -1;     // gentle idle bob
      }
      // looks toward whichever pad is lit (joint attention, in pixels)
      var gx = 0, gy = 0;
      if (lastLit >= 0 && padLit[lastLit] > 0 && (mood === "coo" || mood === "calm")) {
        gx = lastLit === 1 ? -1 : lastLit === 2 ? 1 : 0;
        gy = lastLit === 0 ? -1 : lastLit === 3 ? 1 : 0;
      }

      // floor shadow stays put while the baby bobs
      g.fillStyle = "rgba(14,42,45,0.13)";
      g.fillRect(89, 121, 22, 2);

      // feet + onesie
      roundBlock(g, 90, 114 + oy, 7, 5, 2, SKIN, INK);
      roundBlock(g, 103, 114 + oy, 7, 5, 2, SKIN, INK);
      roundBlock(g, 89, 101 + oy, 22, 16, 5, ONESIE, INK);
      // sprout print on the onesie
      g.fillStyle = LEAF_SIDE; g.fillRect(99, 109 + oy, 2, 4);
      g.fillStyle = LEAF_TOP; g.fillRect(96, 107 + oy, 3, 2); g.fillRect(101, 106 + oy, 3, 2);

      // ears, sprout tuft, head
      roundBlock(g, 82, 88 + oy, 5, 7, 2, SKIN, INK);
      roundBlock(g, 113, 88 + oy, 5, 7, 2, SKIN, INK);
      blockyRect(g, 99, 70 + oy, 2, 8, LEAF_SIDE);
      roundBlock(g, 92, 68 + oy, 7, 4, 2, LEAF_TOP, INK);
      roundBlock(g, 101, 66 + oy, 7, 4, 2, LEAF_TOP, INK);
      roundBlock(g, 85, 76 + oy, 30, 27, 12, SKIN, INK);

      // hands: out when calm, up when happy, by the cheeks when surprised,
      // and reaching toward the pad it is serving
      var hl = [84, 106], hr = [110, 106];
      if (mood === "happy") { hl = [79, 93]; hr = [115, 93]; }
      else if (mood === "surprised") { hl = [81, 98]; hr = [113, 98]; }
      else if (mood === "sleep") { hl = [85, 108]; hr = [109, 108]; }
      else if (mood === "coo") {
        if (gx < 0) hl = [82, 100];
        else if (gx > 0) hr = [112, 100];
        else if (gy < 0) { hl = [82, 100]; hr = [112, 100]; }
      }
      roundBlock(g, hl[0], hl[1] + oy, 6, 5, 2, SKIN, INK);
      roundBlock(g, hr[0], hr[1] + oy, 6, 5, 2, SKIN, INK);

      // cheeks
      g.fillStyle = ROSE;
      g.fillRect(88, 92 + oy, 4, 2);
      g.fillRect(108, 92 + oy, 4, 2);

      // eyes
      var blink = mood === "calm" && (animT % 200) < 7;
      var eyes = [92 + gx, 106 + gx], ey = 85 + oy + gy;
      g.fillStyle = INK;
      for (var e = 0; e < 2; e++) {
        var ex = eyes[e];
        if (mood === "sleep") {
          g.fillRect(ex - 1, ey + 1, 1, 1); g.fillRect(ex, ey + 2, 2, 1); g.fillRect(ex + 2, ey + 1, 1, 1);
        } else if (mood === "happy") {
          g.fillRect(ex - 1, ey + 2, 1, 1); g.fillRect(ex, ey + 1, 2, 1); g.fillRect(ex + 2, ey + 2, 1, 1);
        } else if (mood === "surprised") {
          g.fillRect(ex, ey - 1, 2, 1); g.fillRect(ex - 1, ey, 4, 2); g.fillRect(ex, ey + 2, 2, 1);
          g.fillRect(ex - 1, ey - 4, 4, 1); // raised brows
          g.fillStyle = "#FFFFFF"; g.fillRect(ex, ey, 1, 1); g.fillStyle = INK;
        } else if (blink) {
          g.fillRect(ex - 1, ey + 2, 4, 1);
        } else {
          g.fillRect(ex, ey, 2, 3);
          g.fillStyle = "#FFFFFF"; g.fillRect(ex, ey, 1, 1); g.fillStyle = INK;
        }
      }

      // mouth
      var my = 96 + oy;
      if (mood === "coo") {
        g.fillRect(98, my - 1, 4, 1); g.fillRect(97, my, 6, 3); g.fillRect(98, my + 3, 4, 1);
        g.fillStyle = MOUTH; g.fillRect(98, my, 4, 3);
      } else if (mood === "happy") {
        g.fillRect(96, my - 1, 8, 3); g.fillRect(97, my + 2, 6, 1);
        g.fillStyle = MOUTH; g.fillRect(97, my, 6, 1); g.fillRect(98, my + 1, 4, 1);
        g.fillStyle = ROSE; g.fillRect(99, my + 1, 2, 1);
      } else if (mood === "surprised") {
        g.fillRect(99, my, 2, 1); g.fillRect(98, my + 1, 4, 2); g.fillRect(99, my + 3, 2, 1);
        g.fillStyle = MOUTH; g.fillRect(99, my + 1, 2, 2);
      } else if (mood === "sleep") {
        g.fillRect(99, my + 1, 2, 1);
      } else {
        g.fillRect(97, my, 1, 1); g.fillRect(98, my + 1, 4, 1); g.fillRect(102, my, 1, 1);
      }
    }

    function drawHearts() {
      for (var h = 0; h < MAX_HEARTS; h++) {
        var full = h < hearts;
        // the heart just lost blinks out (never under reduced motion)
        if (!full && h === hearts && heartBlinkT > 0 && !reduce && Math.floor(heartBlinkT / 4) % 2 === 0) full = true;
        drawBitmap(g, HEART_HUD, 7 + h * 17, 7, 2, full ? ROSE : HEART_EMPTY, full ? INK : HEART_EDGE);
      }
    }

    // Progress pips (bottom-left): how many steps served / returned so far.
    // Deliberately colourless per pad so they never give the pattern away.
    function drawPips(vis) {
      if (!len || vis === "idle" || vis === "gameover") return;
      var shown = Math.min(len, 40), filled = 0, color = LEAF_SIDE, missAt = -1;
      if (vis === "serving") { filled = serveIdx + 1; color = BRAIN; }
      else if (vis === "returning") filled = inputIdx;
      else if (vis === "cheer") filled = len;
      else if (vis === "oops") { filled = inputIdx; missAt = inputIdx; }
      for (var k = 0; k < shown; k++) {
        var px = 8 + (k % 10) * 6, py = 187 - Math.floor(k / 10) * 6;
        var c = k === missAt ? ROSE : k < filled ? color : PIP_EMPTY;
        blockyRect(g, px, py, 4, 4, c);
      }
    }

    function tagFor(vis) {
      if (vis === "serving") return { text: "baby's turn", color: mix(BRAIN, CREAM, 0.45) };
      if (vis === "returning") return { text: "your turn", color: mix(LEAF_SIDE, CREAM, 0.45) };
      if (vis === "cheer") return { text: cheerText, color: mix(LEAF_TOP, CREAM, 0.35) };
      if (vis === "oops") return { text: "try again", color: mix(WARM, CREAM, 0.2) };
      return null;
    }

    function render() {
      ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      var sh = camera.offset();
      var vis = state === "paused" ? pausedFrom : state;
      var tag = tagFor(vis);
      var i;

      // ----- pixel layer -----
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.save();
      g.translate(sh.x, sh.y);
      drawRoom();
      // lit pads glow: a tight two-step pixel halo just outside the pad
      for (i = 0; i < PADS.length; i++) {
        if (padLit[i] <= 0) continue;
        A.pixelGlow(g, PADS[i].cx, PADS[i].cy + 1, 19, PADS[i].color, 0.14);
        A.pixelGlow(g, PADS[i].cx, PADS[i].cy + 1, 15, PADS[i].color, 0.24);
      }
      for (i = 0; i < PADS.length; i++) drawPad(i);
      drawRipples();
      drawBaby(vis);

      // particles
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        g.globalAlpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
        g.fillStyle = pt.color;
        g.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 2);
      }
      g.globalAlpha = 1;

      drawHearts();
      drawPips(vis);
      ctx.font = "bold 8px monospace";
      var tagW = 0;
      if (tag) {
        tagW = Math.ceil(ctx.measureText(tag.text).width) + 10;
        roundBlock(g, 194 - tagW, 7, tagW, 13, 4, tag.color, INK);
      }
      g.restore();

      ctx.drawImage(buf, 0, 0, W, H);

      // ----- text layer (full backing resolution) -----
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (tag) {
        ctx.fillStyle = INK;
        ctx.fillText(tag.text, 194 - tagW / 2, 14);
      }
      // floaters: coloured text with a crisp ink outline so they read on
      // any tile
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        var fx = Math.round(fl.x), fy = Math.round(fl.y);
        ctx.font = fl.big ? "bold 10px monospace" : "bold 8px monospace";
        ctx.globalAlpha = Math.max(0, Math.min(1, fl.life / (fl.maxLife * 0.6)));
        ctx.fillStyle = INK;
        ctx.fillText(fl.text, fx - 0.7, fy); ctx.fillText(fl.text, fx + 0.7, fy);
        ctx.fillText(fl.text, fx, fy - 0.7); ctx.fillText(fl.text, fx, fy + 0.7);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, fx, fy);
      }
      ctx.globalAlpha = 1;
      // the conversation took a nap: drifting z's
      if (vis === "gameover") {
        ctx.fillStyle = mix(INK, CREAM, 0.3);
        for (var z = 0; z < 2; z++) {
          var zt = reduce ? z * 8 : (animT * 0.2 + z * 8) % 16;
          ctx.globalAlpha = reduce ? 1 : Math.max(0, 1 - zt / 16);
          ctx.font = "bold " + (6 + z * 2) + "px monospace";
          ctx.fillText(z ? "Z" : "z", 119 + z * 6 + zt * 0.3, 78 - zt);
        }
        ctx.globalAlpha = 1;
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }

    // ---------- HUD / prompt ----------
    function updateHud() {
      if (els.score) els.score.textContent = String(Math.floor(score)).padStart(5, "0");
      if (els.best) els.best.textContent = String(A.leaderboard.best(GAME_KEY)).padStart(5, "0");
      if (els.round) els.round.textContent = String(len || 1);
    }
    function hidePrompt() { if (els.prompt) els.prompt.hidden = true; }
    function showIdle() {
      els.promptTitle.textContent = "Serve & Return";
      els.promptText.textContent = "The baby serves a pattern. Echo it back, one more step each time.";
      els.promptActions.textContent = "";
      A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores" });
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Start";
      btn.addEventListener("click", function () { start(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
      els.prompt.hidden = false;
    }
    function showPaused() {
      els.promptTitle.textContent = "Paused";
      els.promptText.textContent = "The baby is happy to wait.";
      els.promptActions.textContent = "";
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Resume";
      btn.addEventListener("click", function () { resume(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
      els.prompt.hidden = false;
    }
    function showEnd(finalScore) {
      updateHud();
      els.promptTitle.textContent = "The conversation took a nap";
      els.promptText.textContent = "Score " + String(finalScore).padStart(5, "0") + " · longest pattern " + bestLen;
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

    // Returns true when the tap was consumed (start/restart/resume) so the
    // same tap never also presses a pad.
    function tapStart() {
      ensureAudio();
      if (state === "idle") { start(); return true; }
      if (state === "paused") { resume(); return true; }
      if (state === "gameover") {
        if (document.activeElement && document.activeElement.tagName === "INPUT") return true;
        if (Date.now() < endGuard) return true;
        start(); return true;
      }
      return false;
    }

    // ---------- Loop ----------
    var rafId = null, lastTime = 0;
    function loop(now) {
      if (!lastTime) lastTime = now;
      var dt = Math.min(2.5, (now - lastTime) / (1000 / 60));
      lastTime = now;
      camera.tick(dt);
      if (isActive(state) && !camera.frozen()) tick(dt);
      else if (state === "gameover") updateFx(dt); // let the last sparkles settle
      if (state !== "paused") animT += dt;        // blink / bob / z's freeze on pause too
      render();
      updateHud();
      rafId = window.requestAnimationFrame(loop);
    }

    return {
      press: press,
      // Hit-test in logical coordinates; slop keeps taps forgiving.
      pressAt: function (lx, ly) {
        for (var i = 0; i < PADS.length; i++) {
          var p = PADS[i];
          if (lx >= p.x - HIT_SLOP && lx <= p.x + PAD_W + HIT_SLOP &&
              ly >= p.y - HIT_SLOP && ly <= p.y + PAD_H + LIP + HIT_SLOP) { press(i); return true; }
        }
        return false;
      },
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
      tapStart: tapStart,
      // P: pause <-> resume mid-conversation.
      togglePause: function () {
        if (state === "paused") resume();
        else pause();
      },
      // Space: start from idle / game over, otherwise pause <-> resume.
      space: function () {
        if (!isActive(state)) return tapStart();
        pause();
        return true;
      },
      toggleMute: function () { return audio.toggleMute(); },
      isMuted: function () { return audio.isMuted(); },
      activate: function () {
        resetWorld(); state = "idle"; lastTime = 0;
        updateHud(); showIdle();
        wake.acquire();
        offHidden = A.onHidden(pause);
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
  var SR_ONLY = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;" +
    "overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap";

  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "gms-arcade-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Serve and Return — a mini game");
    overlay.innerHTML =
      '<div class="gms-arcade-backdrop" data-egg-close></div>' +
      '<div class="gms-arcade-panel">' +
        '<div class="gms-arcade-panel__head">' +
          '<p class="gms-arcade-title">Serve &amp; Return <span>— you found it!</span></p>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button type="button" class="gms-arcade-close" data-egg-mute aria-label="Sound">♪</button>' +
            '<button type="button" class="gms-arcade-close" data-egg-close aria-label="Close game">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="gms-arcade-scores">' +
          '<span>SCORE <strong data-egg-score>00000</strong></span>' +
          '<span>ROUND <strong data-egg-round>1</strong></span>' +
          '<span>BEST <strong data-egg-best>00000</strong></span>' +
        '</div>' +
        '<p data-egg-live aria-live="polite" style="' + SR_ONLY + '"></p>' +
        '<div class="gms-arcade-stage gms-arcade-stage--echo">' +
          '<canvas class="gms-arcade-canvas" tabindex="0" role="application" aria-label="Serve and Return play area. Arrow keys, W A S D, or 1 to 4 play the pads, Space starts, P pauses, M mutes."></canvas>' +
          '<div class="gms-arcade-prompt" data-egg-prompt hidden>' +
            '<p class="gms-arcade-prompt__title" data-egg-prompt-title></p>' +
            '<p class="gms-arcade-prompt__text" data-egg-prompt-text></p>' +
            '<div class="gms-arcade-prompt__actions" data-egg-prompt-actions></div>' +
          '</div>' +
        '</div>' +
        '<p class="gms-arcade-help">Watch the pattern, then echo it · arrows, WASD, 1–4, or tap the pads · P pause · M mute</p>' +
        '<div class="gms-arcade-touchrow">' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-pad="0" aria-label="Orange note pad">▲</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-pad="1" aria-label="Teal heart pad">◀</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-pad="2" aria-label="Green star pad">▶</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-pad="3" aria-label="Tan sun pad">▼</button>' +
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
      round: overlay.querySelector("[data-egg-round]"),
      live: overlay.querySelector("[data-egg-live]"),
      prompt: overlay.querySelector("[data-egg-prompt]"),
      promptTitle: overlay.querySelector("[data-egg-prompt-title]"),
      promptText: overlay.querySelector("[data-egg-prompt-text]"),
      promptActions: overlay.querySelector("[data-egg-prompt-actions]")
    });

    overlay.querySelectorAll("[data-egg-close]").forEach(function (el) {
      el.addEventListener("click", function () { closeOverlay(overlay); });
    });

    var muteBtn = overlay.querySelector("[data-egg-mute]");
    function syncMute() { muteBtn.textContent = game.isMuted() ? "♪̶" : "♪"; muteBtn.setAttribute("aria-pressed", game.isMuted() ? "false" : "true"); }
    muteBtn.addEventListener("click", function () { game.toggleMute(); syncMute(); });
    syncMute();

    // Touch-row pads. Touch presses get a brief held state so the press
    // registers even when the thumb hides the button (the haptic tick comes
    // from the game itself, once per accepted press).
    overlay.querySelectorAll("[data-egg-pad]").forEach(function (el) {
      var idx = parseInt(el.getAttribute("data-egg-pad"), 10);
      var heldT = null;
      var press = function (e) { e.preventDefault(); game.press(idx); };
      el.addEventListener("touchstart", function (e) {
        press(e);
        el.classList.add("is-held");
        if (heldT) window.clearTimeout(heldT);
        heldT = window.setTimeout(function () { el.classList.remove("is-held"); }, 120);
      }, { passive: false });
      el.addEventListener("mousedown", press);
    });

    // The canvas is sized exactly by resize(), but map defensively through
    // the rect (as breakout's logicalX does) in case of any letterboxing.
    function logicalPoint(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      var scale = Math.min(rect.width / W, rect.height / H) || 1;
      var offX = (rect.width - W * scale) / 2, offY = (rect.height - H * scale) / 2;
      return { x: (clientX - rect.left - offX) / scale, y: (clientY - rect.top - offY) / scale };
    }

    // Guard first: prompt buttons and the initials form live inside the stage.
    var stage = overlay.querySelector(".gms-arcade-stage");
    function onControl(e) {
      return !!(e.target && e.target.closest && e.target.closest("button, a, input, label, form"));
    }
    // Canvas: pointerdown (not click) so a pad answers the instant a finger
    // lands. preventDefault cancels the compatibility mousedown a touch would
    // otherwise fire, so one tap can never press a pad twice.
    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      if (game.tapStart()) return; // idle / paused / game over: this tap only starts or resumes
      var pt = logicalPoint(e.clientX, e.clientY);
      game.pressAt(pt.x, pt.y);
    });
    // Rest of the stage (letterbox margins + the prompt card): a tap starts
    // or resumes. Only pointer events are used, so there is no synthetic
    // mouse event to double up on.
    stage.addEventListener("pointerdown", function (e) {
      if (e.target === canvas || onControl(e)) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      game.tapStart();
    });

    function padForKey(k) {
      if (k === "ArrowUp" || k === "w" || k === "W" || k === "1") return 0;
      if (k === "ArrowLeft" || k === "a" || k === "A" || k === "2") return 1;
      if (k === "ArrowRight" || k === "d" || k === "D" || k === "3") return 2;
      if (k === "ArrowDown" || k === "s" || k === "S" || k === "4") return 3;
      return -1;
    }
    function onKeydown(e) {
      // While typing initials, leave all keys (incl. Escape/Enter) to the form
      // so a stray Escape never closes the game and drops the high score.
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "Escape") { closeOverlay(overlay); return; }
      var pad = padForKey(e.key);
      if (pad !== -1) { e.preventDefault(); if (!e.repeat) game.press(pad); }
      else if (e.code === "Space" || e.key === " ") { e.preventDefault(); if (!e.repeat) game.space(); }
      else if (e.key === "p" || e.key === "P") { if (!e.repeat) game.togglePause(); }
      else if (e.key === "m" || e.key === "M") { game.toggleMute(); syncMute(); }
    }

    overlay.game = game;
    overlay._onKeydown = onKeydown;
    overlay._canvas = canvas;
    overlay._fitCanvas = fitCanvas;
    return overlay;
  }

  // Close in place: GMSArcade runs the teardown (loop, wake lock, audio,
  // listeners), puts the page back and returns focus to the opener.
  function closeOverlay() { A.closeGame(); }

  // Arcade-only: no hidden trigger on other pages. The Play button on
  // /arcade opens it through GMSArcade.play().
  ready(function () {
    A.defineGame("echo", buildOverlay);
  });
})();
