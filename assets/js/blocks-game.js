/* Growing Minds Science — blocks-game.js
   "Tidy Up" — a falling-blocks puzzle on the Arcade page.

   Trigger: the "Play Tidy Up" card on /arcade ([data-arcade-game="blocks"]).
   Opening tears the page away (GMSArcade) then shows the game. It's clean-up
   time in the playroom: toy blocks tumble into the toy bin one at a time.
   Slide and turn them as they fall; fill a whole row and it gets tidied
   away. If the bin is so full the next toy can't fit in, the round ends.

   Familiar rules underneath: seven four-block shapes from a shuffled bag,
   turning with simple wall kicks, a ghost landing guide, hold, soft and
   hard drop, lock delay, DAS/ARR for held sideways moves, and levels that
   quicken the fall every ten rows.

   Built on window.GMSArcade (arcade-core.js) for the page-tear, the local
   leaderboard, the initials entry, and the shared juice + mobile toolkits.
   Self-contained otherwise: own overlay DOM, own rAF loop, full teardown on
   close. CSP-safe (no eval, no external assets; audio is Web Audio
   oscillator synth). Honors prefers-reduced-motion.

   Mobile (shared toolkit): touch lands anywhere on the stage, not just the
   canvas; tap turns the piece, a sideways drag slides it a column per step,
   a slow downward drag nudges it down, a quick flick down drops it and a
   quick flick up tucks it into HOLD; wake lock while open; auto-pause on
   tab-hide; haptics degrade to no-ops.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A) return;

  var GAME_KEY = "tidy-up";
  var MUTE_KEY = "gms-blocks-muted";

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
  var PANEL_BG = "#EDE6D6";    // side-panel cards (the floor tone hopper uses)
  var WOOD = "#C29B66";        // bin planks — a shade deeper than WARM so tan blocks still read
  var WOOD_GRAIN = "#A68050";
  var CORAL = "#E8836B";
  var SKY = "#7FB7D6";
  var SUN = "#F2C94C";

  // ---------- Grid ----------
  var CELL = 10, COLS = 10, ROWS = 20, HIDDEN = 2, TOTAL = ROWS + HIDDEN;
  var FX = 6, FY = 8;                 // top-left of the visible field, inside the bin
  var FW = COLS * CELL, FH = ROWS * CELL;
  var PX = 116, PW = 56;              // side panel (NEXT / HOLD / LINES / LEVEL)
  var W = 176, H = 214;

  // ---------- Timing (frames @ 60fps) ----------
  var DAS = 10, ARR = 2;              // held left/right: first repeat, then every ARR
  var SOFT_FPR = 2;                   // soft-drop fall speed (frames per row)
  var LOCK_DELAY = 30, LOCK_RESETS = 15;
  var CLEAR_FRAMES = 10;              // cleared-row flash before the stack settles
  var OVER_FRAMES = 54;               // "bin overflowed" wash before the end prompt
  var LINE_PTS = [0, 100, 300, 500, 800];

  // Wall kicks, tried in order: stay put, nudge left/right, lift a row, then
  // the long two-column reach the I piece sometimes needs against a wall.
  var KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];

  // ---------- Toy shapes ----------
  // Spawn orientation inside its turning box (I 4x4, O 2x2, the rest 3x3).
  var PIECES = [
    { id: "I", color: SKY, rows: ["....", "XXXX", "....", "...."] },
    { id: "O", color: SUN, rows: ["XX", "XX"] },
    { id: "T", color: BRAIN, rows: [".X.", "XXX", "..."] },
    { id: "S", color: LEAF_TOP, rows: [".XX", "XX.", "..."] },
    { id: "Z", color: CORAL, rows: ["XX.", ".XX", "..."] },
    { id: "J", color: LEAF_SIDE, rows: ["X..", "XXX", "..."] },
    { id: "L", color: WARM, rows: ["..X", "XXX", "..."] }
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function mixHex(hex, to, t) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (to[0] - r) * t);
    g = Math.round(g + (to[1] - g) * t);
    b = Math.round(b + (to[2] - b) * t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  // Precompute all four turns (clockwise) plus the highlight/shade tones.
  (function buildPieces() {
    for (var i = 0; i < PIECES.length; i++) {
      var p = PIECES[i], n = p.rows.length, base = [];
      for (var y = 0; y < n; y++) {
        for (var x = 0; x < n; x++) { if (p.rows[y].charAt(x) === "X") base.push([x, y]); }
      }
      p.rots = [base];
      for (var r = 1; r < 4; r++) {
        var prev = p.rots[r - 1], next = [];
        // clockwise quarter turn inside the n x n box: (x, y) -> (n-1-y, x)
        for (var c = 0; c < prev.length; c++) next.push([n - 1 - prev[c][1], prev[c][0]]);
        p.rots.push(next);
      }
      p.light = mixHex(p.color, [255, 255, 255], 0.45);
      p.dark = mixHex(p.color, [14, 42, 45], 0.3);
    }
  })();

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
    // Shared juice: crisp shake + hit-stop, and a tidy-up streak multiplier.
    // Audio-mute is deliberately independent of reduced-motion (a11y:
    // motion-sensitive players still get sound).
    var camera = A.makeCamera({ reduce: reduce, maxPx: 3 });
    // Back-to-back clearing locks build the streak. The window is long so an
    // unhurried player can still chain two tidy-ups; a lock that clears
    // nothing simply lets it drain.
    var combo = A.makeCombo({ window: 480, max: 5 });
    var wake = A.makeWakeLock();
    var offHidden = null;

    var state = "idle"; // idle | running | paused | gameover
    var board, piece, queue, holdType, canHold, score, lines, level;
    var gravT, clearRows, clearT, overT, levelPending;
    var shiftDir, shiftT, lastDir;
    var landCells = [], landT, trail;
    var particles, floaters, tickCount;
    var PARTICLE_CAP = 28, FLOATER_CAP = 10;
    // Held controls (keyboard + touch buttons). press() acts on the leading
    // edge so a quick tap never gets lost between frames; tick() handles the
    // auto-repeat while the flag stays up.
    var held = { left: false, right: false, down: false };

    function emptyRow() {
      var r = [];
      for (var c = 0; c < COLS; c++) r.push(0);
      return r;
    }
    function releaseAll() { held.left = false; held.right = false; held.down = false; }

    // 7-bag: every shape once per shuffled bag, so droughts never happen.
    function refillQueue() {
      while (queue.length < 7) {
        var bag = [0, 1, 2, 3, 4, 5, 6];
        for (var i = bag.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
        }
        for (var k = 0; k < bag.length; k++) queue.push(bag[k]);
      }
    }

    function resetWorld() {
      board = [];
      for (var r = 0; r < TOTAL; r++) board.push(emptyRow());
      queue = [];
      refillQueue();
      piece = null; holdType = -1; canHold = true;
      score = 0; lines = 0; level = 1;
      gravT = 0; clearRows = []; clearT = 0; overT = 0; levelPending = false;
      shiftDir = 0; shiftT = 0; lastDir = 0;
      landCells.length = 0; landT = 0; trail = null;
      releaseAll();
      combo.reset(true);
      particles = particles || []; floaters = floaters || [];
      particles.length = 0; floaters.length = 0;
      tickCount = 0;
    }

    // ---------- Audio (shared GMSArcade synth: compressor + noise + arp) ----------
    var audio = A.makeSynth({ muteKey: MUTE_KEY });
    function ensureAudio() { audio.ensure(); }
    var sfx = {
      move: function () { audio.beep(330, 350, 0.03, "square", 0.16); },
      rotate: function () { audio.beep(460, 620, 0.05, "triangle", 0.32); },
      hold: function () { audio.beep(620, 410, 0.07, "triangle", 0.32); },
      // soft wooden "tok" as a toy settles
      lock: function () { audio.noise(0.07, 700, 0.28, 1); audio.beep(190, 120, 0.06, "sine", 0.35); },
      slam: function () { audio.noise(0.16, 1000, 0.5, 2); audio.beep(220, 80, 0.12, "sine", 0.55); },
      // climbs a note per row tidied at once, and a touch higher with the streak
      clear: function (n, mult) {
        var b = 1 + (Math.max(1, mult || 1) - 1) * 0.06;
        var notes = [523, 659, 784, 1046, 1318], seq = [];
        for (var i = 0; i < n + 1; i++) seq.push(notes[i] * b);
        audio.arp(seq, 0.055, 0.16, "triangle", 0.45);
      },
      tidy: function () { audio.arp([523, 659, 784, 1046, 1318, 1568], 0.06, 0.2, "triangle", 0.5); },
      level: function () { audio.arp([392, 523, 659, 784], 0.07, 0.18, "square", 0.28); },
      // a gentle falling "oh well" — never alarming
      overflow: function () {
        audio.arp([523, 440, 392, 330, 262], 0.1, 0.22, "triangle", 0.4);
        audio.noise(0.3, 400, 0.22, 1);
      }
    };

    // ---------- Particles / floaters (pooled) ----------
    function spawnParticle(x, y, vx, vy, life, color, g) {
      if (reduce) return;
      var p;
      for (var i = 0; i < particles.length; i++) { if (particles[i].life <= 0) { p = particles[i]; break; } }
      if (!p) { if (particles.length >= PARTICLE_CAP) return; p = {}; particles.push(p); }
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.maxLife = life; p.color = color; p.g = g || 0;
    }
    function spawnFloater(x, y, text, color, big) {
      if (reduce) return;
      var f;
      for (var i = 0; i < floaters.length; i++) { if (floaters[i].life <= 0) { f = floaters[i]; break; } }
      if (!f) { if (floaters.length >= FLOATER_CAP) return; f = {}; floaters.push(f); }
      f.x = x; f.y = y; f.life = big ? 44 : 32; f.maxLife = f.life; f.text = text; f.color = color; f.big = !!big;
    }
    // Low, sideways puff where a toy touches down — sells the weight.
    function spawnDust(cx, cy, n) {
      if (reduce) return;
      for (var i = 0; i < n; i++) {
        spawnParticle(cx + (Math.random() * 6 - 3), cy - 1, (Math.random() * 2 - 1) * 0.8,
          -0.1 - Math.random() * 0.25, 7 + Math.random() * 4, WARM);
      }
    }

    // ---------- Lifecycle ----------
    function start() {
      resetWorld();
      state = "running";
      hidePrompt();
      ensureAudio();
      spawnNext();
    }

    // Auto-pause must freeze everything: tick() is gated on "running", so
    // gravity, lock delay, the clear flash and the streak window all stop.
    function pause() {
      if (state !== "running") return;
      state = "paused";
      releaseAll(); // keyups get lost while the tab is hidden
      showPaused();
    }
    function resume() {
      if (state !== "paused") return;
      state = "running";
      hidePrompt();
      lastTime = 0; // hidden tabs stall rAF — don't let the first dt span the pause
    }

    // ---------- Board helpers ----------
    function fits(t, rot, x, y) {
      var cells = PIECES[t].rots[rot];
      for (var i = 0; i < cells.length; i++) {
        var bx = x + cells[i][0], by = y + cells[i][1];
        if (bx < 0 || bx >= COLS || by >= TOTAL) return false;
        if (by >= 0 && board[by][bx]) return false;
      }
      return true;
    }
    function grounded() { return !fits(piece.type, piece.rot, piece.x, piece.y + 1); }
    function landingY() {
      var y = piece.y;
      while (fits(piece.type, piece.rot, piece.x, y + 1)) y++;
      return y;
    }

    // New toys appear straddling the rim: top row just above the bin, so a
    // near-full bin is visible at a glance.
    function spawnPiece(t) {
      piece = { type: t, rot: 0, x: PIECES[t].id === "O" ? 4 : 3, y: 1, lockT: 0, resets: 0 };
      gravT = 0;
      if (!fits(piece.type, piece.rot, piece.x, piece.y)) { topOut(); return false; }
      return true;
    }
    function spawnNext() {
      canHold = true;
      var t = queue.shift();
      refillQueue();
      spawnPiece(t);
    }

    // Lock delay: a successful move/turn on the ground buys more time, but
    // only LOCK_RESETS times per piece so a toy can't be juggled forever.
    function onMoved() {
      if (piece.lockT > 0 || grounded()) {
        if (piece.resets < LOCK_RESETS) { piece.lockT = 0; piece.resets++; }
      }
    }

    function shift(dir) {
      if (!piece || !fits(piece.type, piece.rot, piece.x + dir, piece.y)) return false;
      piece.x += dir;
      onMoved();
      ensureAudio(); sfx.move();
      return true;
    }
    function softStep() {
      if (!piece || !fits(piece.type, piece.rot, piece.x, piece.y + 1)) return false;
      piece.y++;
      piece.lockT = 0;
      score += 1;
      return true;
    }

    function rotate(dirn) {
      if (state !== "running" || !piece) return false;
      if (PIECES[piece.type].id === "O") return false; // a square block looks the same every way
      var nr = (piece.rot + (dirn > 0 ? 1 : 3)) % 4;
      for (var i = 0; i < KICKS.length; i++) {
        var nx = piece.x + KICKS[i][0], ny = piece.y + KICKS[i][1];
        if (fits(piece.type, nr, nx, ny)) {
          piece.rot = nr; piece.x = nx; piece.y = ny;
          onMoved();
          ensureAudio(); sfx.rotate();
          A.haptics.tick();
          return true;
        }
      }
      return false;
    }

    function hardDrop() {
      if (state !== "running" || !piece) return;
      var gy = landingY(), d = gy - piece.y;
      if (!reduce && d > 0) trail = { t: piece.type, rot: piece.rot, x: piece.x, from: piece.y, to: gy, life: 8 };
      piece.y = gy;
      score += d * 2;
      camera.shake(0.2);
      ensureAudio(); sfx.slam();
      A.haptics.thump();
      lockPiece(true);
    }

    // Hold: tuck the current toy aside (once per drop) and take the held one.
    function holdPiece() {
      if (state !== "running" || !piece || !canHold) return;
      var cur = piece.type;
      canHold = false;
      ensureAudio(); sfx.hold();
      A.haptics.tick();
      if (holdType < 0) {
        holdType = cur;
        var t = queue.shift();
        refillQueue();
        spawnPiece(t);
      } else {
        var h = holdType;
        holdType = cur;
        spawnPiece(h);
      }
    }

    function lockPiece(hard) {
      var cells = PIECES[piece.type].rots[piece.rot];
      var t = piece.type, allHidden = true, i, bx, by;
      landCells.length = 0;
      for (i = 0; i < cells.length; i++) {
        bx = piece.x + cells[i][0]; by = piece.y + cells[i][1];
        if (by >= 0) board[by][bx] = t + 1;
        if (by >= HIDDEN) allHidden = false;
        landCells.push(bx, by);
      }
      landT = reduce ? 0 : 5;
      // dust under every cell that came to rest on something
      for (i = 0; i < cells.length; i++) {
        bx = piece.x + cells[i][0]; by = piece.y + cells[i][1];
        var below = by + 1;
        var own = false;
        for (var k = 0; k < cells.length; k++) {
          if (piece.x + cells[k][0] === bx && piece.y + cells[k][1] === below) { own = true; break; }
        }
        if (!own && by >= HIDDEN) spawnDust(FX + bx * CELL + CELL / 2, FY + (below - HIDDEN) * CELL, hard ? 2 : 1);
      }
      if (!hard) { ensureAudio(); sfx.lock(); }
      piece = null;
      if (allHidden) { topOut(); return; }

      var full = [];
      for (var r = 0; r < TOTAL; r++) {
        var n = 0;
        for (var c = 0; c < COLS; c++) { if (board[r][c]) n++; }
        if (n === COLS) full.push(r);
      }
      if (full.length) clearLines(full);
      else spawnNext();
    }

    function clearLines(rows) {
      var n = rows.length;
      var mult = combo.hit();
      var pts = LINE_PTS[n] * level * mult;
      score += pts;
      lines += n;
      var nextLevel = 1 + Math.floor(lines / 10);
      if (nextLevel > level) { level = nextLevel; levelPending = true; }

      // bursts along each row, in the colours of the toys being put away
      var midY = FY + ((rows[0] + rows[n - 1]) / 2 - HIDDEN) * CELL + CELL / 2;
      for (var i = 0; i < n; i++) {
        var ry = FY + (rows[i] - HIDDEN) * CELL + CELL / 2;
        for (var k = 0; k < 6; k++) {
          var c = Math.floor(Math.random() * COLS);
          var v = board[rows[i]][c];
          spawnParticle(FX + c * CELL + CELL / 2, ry, (Math.random() * 2 - 1) * 1.3,
            -0.5 - Math.random() * 1.1, 14 + Math.random() * 10, v ? PIECES[v - 1].color : BRAIN, 0.05);
        }
      }
      if (n === 4) spawnFloater(FX + FW / 2, midY - 6, "ALL TIDY!", BRAIN, true);
      spawnFloater(FX + FW / 2, midY + (n === 4 ? 6 : 2), "+" + pts + (mult > 1 ? " x" + mult : ""),
        n >= 3 ? BRAIN : LEAF_SIDE, false);

      camera.shake([0, 0.15, 0.25, 0.35, 0.55][n]);
      ensureAudio();
      if (n === 4) {
        camera.freeze(8); // hit-stop: the big one lands with weight
        sfx.tidy();
        A.haptics.thump();
      } else {
        sfx.clear(n, mult);
        A.haptics.pop();
      }

      clearRows = rows;
      if (reduce) { collapse(); spawnNext(); } // no flash — settle straight away
      else clearT = CLEAR_FRAMES;
    }

    function collapse() {
      var keep = [];
      for (var r = 0; r < TOTAL; r++) { if (clearRows.indexOf(r) === -1) keep.push(board[r]); }
      while (keep.length < TOTAL) keep.unshift(emptyRow());
      board = keep;
      clearRows = [];
      if (levelPending) {
        levelPending = false;
        ensureAudio(); sfx.level();
        spawnFloater(FX + FW / 2, FY + 70, "Level " + level, LEAF_SIDE, true);
      }
    }

    // The next toy has nowhere to go: the bin overflowed.
    function topOut() {
      piece = null;
      overT = OVER_FRAMES;
      releaseAll();
      combo.reset();
      ensureAudio(); sfx.overflow();
      A.haptics.crash();
      camera.shake(0.3);
      // a few toys tumble out over the rim
      for (var i = 0; i < 10; i++) {
        spawnParticle(FX + 20 + Math.random() * 60, FY, (Math.random() * 2 - 1) * 1.2,
          -0.6 - Math.random() * 0.9, 18 + Math.random() * 12, PIECES[i % 7].color, 0.06);
      }
    }

    // ---------- Input ----------
    function press(key) {
      held[key] = true;
      if (key === "left" || key === "right") {
        var dir = key === "left" ? -1 : 1;
        lastDir = dir; shiftDir = dir; shiftT = 0;
        if (state === "running" && piece && shift(dir)) A.haptics.tick();
      } else if (key === "down") {
        if (state === "running" && piece) { gravT = 0; softStep(); }
      }
    }
    function release(key) { held[key] = false; }

    // DAS/ARR: after the first step, wait DAS frames, then repeat every ARR.
    // If both sides are held, the most recent press wins.
    function updateShift(dt) {
      var dir = 0;
      if (held.left && held.right) dir = lastDir;
      else if (held.left) dir = -1;
      else if (held.right) dir = 1;
      if (dir !== shiftDir) { shiftDir = dir; shiftT = 0; return; }
      if (!dir) return;
      shiftT += dt;
      var guard = 0;
      while (shiftT >= DAS && guard < COLS) {
        guard++;
        if (!shift(dir)) { shiftT = DAS; break; } // against a wall: stay charged
        shiftT -= ARR;
      }
    }

    // ---------- Update ----------
    function tick(dt) {
      tickCount += dt;
      combo.tick(dt);
      if (landT > 0) landT -= dt;
      if (trail) { trail.life -= dt; if (trail.life <= 0) trail = null; }
      updateParticles(dt);

      if (overT > 0) {
        overT -= dt;
        if (overT <= 0) {
          overT = 0;
          state = "gameover";
          showEnd(Math.floor(score));
        }
        return;
      }
      if (clearT > 0) {
        clearT -= dt;
        if (clearT <= 0) { clearT = 0; collapse(); spawnNext(); }
        return;
      }
      if (!piece) return;

      updateShift(dt);

      // gravity (soft drop just shortens the frames-per-row)
      var fpr = Math.max(4, 48 - (level - 1) * 5);
      var soft = held.down && fpr > SOFT_FPR;
      if (soft) fpr = SOFT_FPR;
      gravT += dt;
      while (gravT >= fpr) {
        gravT -= fpr;
        if (fits(piece.type, piece.rot, piece.x, piece.y + 1)) {
          piece.y++;
          piece.lockT = 0;
          if (soft) score += 1;
        } else {
          gravT = 0;
          break;
        }
      }
      if (grounded()) {
        piece.lockT += dt;
        if (piece.lockT >= LOCK_DELAY) lockPiece(false);
      }
    }

    function updateParticles(dt) {
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        pt.vy += pt.g * dt;
        pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
      }
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        fl.y -= 0.3 * dt; fl.life -= dt;
      }
    }

    // ---------- Drawing ----------
    // A little toy block: INK outline, light top/left, darker bottom/right,
    // and a peg on the face so it reads as a toy, not a flat square.
    function drawBlock(x, y, w, h, t) {
      var p = PIECES[t];
      blockyRect(ctx, x + 1, y + 1, w - 2, h - 2, p.color);
      ctx.fillStyle = p.light;
      ctx.fillRect(x + 1, y + 1, w - 2, 1);
      ctx.fillRect(x + 1, y + 1, 1, h - 2);
      ctx.fillStyle = p.dark;
      ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
      ctx.fillRect(x + w - 2, y + 2, 1, h - 3);
      if (w >= 8) {
        var sx = x + Math.floor(w / 2) - 1, sy = y + Math.floor(h / 2) - 2;
        ctx.fillStyle = p.light;
        ctx.fillRect(sx, sy, 2, 2);
        ctx.fillStyle = p.dark;
        ctx.fillRect(sx, sy + 2, 2, 1);
      }
    }

    function rowY(r) { return FY + (r - HIDDEN) * CELL; }

    function isLanding(c, r) {
      for (var i = 0; i < landCells.length; i += 2) {
        if (landCells[i] === c && landCells[i + 1] === r) return true;
      }
      return false;
    }

    // Preview a shape (spawn orientation) centred on cx, cy.
    function drawPreview(t, cx, cy, s, alpha) {
      var cells = PIECES[t].rots[0];
      var minX = 9, maxX = -1, minY = 9, maxY = -1, i;
      for (i = 0; i < cells.length; i++) {
        minX = Math.min(minX, cells[i][0]); maxX = Math.max(maxX, cells[i][0]);
        minY = Math.min(minY, cells[i][1]); maxY = Math.max(maxY, cells[i][1]);
      }
      var w = (maxX - minX + 1) * s, h = (maxY - minY + 1) * s;
      var ox = Math.round(cx - w / 2) - minX * s, oy = Math.round(cy - h / 2) - minY * s;
      ctx.globalAlpha = alpha;
      for (i = 0; i < cells.length; i++) drawBlock(ox + cells[i][0] * s, oy + cells[i][1] * s, s, s, t);
      ctx.globalAlpha = 1;
    }

    function drawRug() {
      ctx.fillStyle = CREAM;
      ctx.fillRect(FX, FY, FW, FH);
      // playroom rug: a faint stitched border and a sprinkle of soft dots
      ctx.fillStyle = "rgba(253,149,31,0.12)";
      for (var x = FX + 4; x < FX + FW - 4; x += 4) {
        ctx.fillRect(x, FY + 3, 2, 1);
        ctx.fillRect(x, FY + FH - 4, 2, 1);
      }
      for (var y = FY + 5; y < FY + FH - 5; y += 4) {
        ctx.fillRect(FX + 3, y, 1, 2);
        ctx.fillRect(FX + FW - 4, y, 1, 2);
      }
      ctx.fillStyle = "rgba(14,42,45,0.05)";
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if ((r + c) % 2 === 0) ctx.fillRect(FX + c * CELL + 4, FY + r * CELL + 4, 2, 2);
        }
      }
    }

    // The toy bin: two wooden planks and a floor, INK-outlined like every
    // toy on the site, open at the top.
    function drawBin() {
      ctx.fillStyle = "rgba(14,42,45,0.12)"; // soft floor shadow
      ctx.fillRect(2, H - 1, FX + FW + 3, 1);
      blockyRect(ctx, FX - 4, FY - 2, 3, FH + 6, WOOD);
      blockyRect(ctx, FX + FW + 1, FY - 2, 3, FH + 6, WOOD);
      blockyRect(ctx, FX - 1, FY + FH + 1, FW + 2, 3, WOOD);
      // grain + a couple of nails
      ctx.fillStyle = WOOD_GRAIN;
      ctx.fillRect(FX - 3, FY + 14, 1, 38);
      ctx.fillRect(FX - 2, FY + 96, 1, 46);
      ctx.fillRect(FX + FW + 3, FY + 40, 1, 52);
      ctx.fillRect(FX + FW + 2, FY + 150, 1, 34);
      ctx.fillRect(FX + 16, FY + FH + 2, 30, 1);
      ctx.fillRect(FX + 62, FY + FH + 3, 24, 1);
      ctx.fillStyle = INK;
      ctx.fillRect(FX - 3, FY + 2, 1, 1);
      ctx.fillRect(FX + FW + 2, FY + 2, 1, 1);
      ctx.fillRect(FX - 3, FY + FH + 2, 1, 1);
      ctx.fillRect(FX + FW + 2, FY + FH + 2, 1, 1);
    }

    function label(text, x, y) {
      ctx.font = "7px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = INK;
      ctx.fillText(text, x, y);
    }
    function value(text, x, y, color) {
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = color || INK;
      ctx.fillText(text, x, y);
    }

    function drawPanel() {
      var cx = PX + PW / 2;
      // NEXT: the very next toy large, the two after it smaller
      label("NEXT", cx, 11);
      blockyRect(ctx, PX + 1, 15, PW - 2, 26, PANEL_BG);
      blockyRect(ctx, PX + 1, 45, PW - 2, 36, PANEL_BG);
      if (queue && queue.length >= 3) {
        drawPreview(queue[0], cx, 28, 8, 1);
        drawPreview(queue[1], cx, 54, 6, 0.9);
        drawPreview(queue[2], cx, 72, 6, 0.9);
      }
      // HOLD (dimmed once used this drop)
      label("HOLD", cx, 93);
      blockyRect(ctx, PX + 1, 97, PW - 2, 26, PANEL_BG);
      if (holdType >= 0) drawPreview(holdType, cx, 110, 8, canHold ? 1 : 0.35);

      // LINES / LEVEL
      blockyRect(ctx, PX + 1, 131, PW - 2, 50, PANEL_BG);
      label("LINES", cx, 141);
      value(String(lines || 0), cx, 153);
      label("LEVEL", cx, 166);
      value(String(level || 1), cx, 178, LEAF_SIDE);

      // tidy-up streak readout (the DOM HUD only shows SCORE/LINES/BEST)
      var cm = combo.mult();
      if (cm > 1) {
        ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = INK;
        ctx.fillText("x" + cm + " streak", cx + 1, 197);
        ctx.fillStyle = cm >= 4 ? BRAIN : LEAF_SIDE;
        ctx.fillText("x" + cm + " streak", cx, 196);
        // thin draining window bar under it
        ctx.fillStyle = "rgba(14,42,45,0.14)";
        ctx.fillRect(cx - 20, 201, 40, 2);
        ctx.fillStyle = cm >= 4 ? BRAIN : LEAF_SIDE;
        ctx.fillRect(cx - 20, 201, Math.round(40 * combo.frac()), 2);
      }
      ctx.textAlign = "left";
    }

    function drawField() {
      var r, c, i;
      // clip to the bin (plus the strip above its rim, where new toys peek in)
      ctx.save();
      ctx.beginPath();
      ctx.rect(FX, 0, FW, FY + FH);
      ctx.clip();

      // the stack
      for (r = 1; r < TOTAL; r++) {
        for (c = 0; c < COLS; c++) {
          var v = board[r][c];
          if (!v) continue;
          var x = FX + c * CELL, y = rowY(r);
          if (landT > 0 && isLanding(c, r)) drawBlock(x, y + 1, CELL, CELL - 1, v - 1); // 1px landing squash
          else drawBlock(x, y, CELL, CELL, v - 1);
        }
      }

      // cleared rows: white pulse, then the toys pop away from the middle out
      if (clearT > 0) {
        var prog = 1 - clearT / CLEAR_FRAMES;
        var half = Math.round(prog * FW / 2);
        for (i = 0; i < clearRows.length; i++) {
          var ry = rowY(clearRows[i]);
          ctx.globalAlpha = Math.floor(clearT / 2) % 2 === 0 ? 0.7 : 0.4;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(FX, ry, FW, CELL);
          ctx.globalAlpha = 1;
          ctx.fillStyle = CREAM;
          ctx.fillRect(FX + FW / 2 - half, ry, half * 2, CELL);
        }
      }

      // hard-drop trail: a faint streak down each column the toy fell through
      if (trail) {
        var tp = PIECES[trail.t], tc = tp.rots[trail.rot], tops = [-1, -1, -1, -1];
        for (i = 0; i < tc.length; i++) {
          if (tops[tc[i][0]] < 0 || tc[i][1] < tops[tc[i][0]]) tops[tc[i][0]] = tc[i][1];
        }
        ctx.globalAlpha = 0.26 * clamp(trail.life / 8, 0, 1);
        ctx.fillStyle = tp.light;
        for (i = 0; i < 4; i++) {
          if (tops[i] < 0) continue;
          var y0 = rowY(trail.from + tops[i]), y1 = rowY(trail.to + tops[i]);
          ctx.fillRect(FX + (trail.x + i) * CELL + 2, y0, CELL - 4, y1 - y0);
        }
        ctx.globalAlpha = 1;
      }

      if (piece) {
        var p = PIECES[piece.type], cells = p.rots[piece.rot], gy = landingY();
        // ghost: a faint outline where the toy will land
        if (gy !== piece.y) {
          for (i = 0; i < cells.length; i++) {
            var gx = FX + (piece.x + cells[i][0]) * CELL, gyy = rowY(gy + cells[i][1]);
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = p.color;
            ctx.fillRect(gx + 1, gyy + 1, CELL - 2, CELL - 2);
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = p.dark;
            ctx.fillRect(gx + 1, gyy + 1, CELL - 2, 1);
            ctx.fillRect(gx + 1, gyy + CELL - 2, CELL - 2, 1);
            ctx.fillRect(gx + 1, gyy + 2, 1, CELL - 4);
            ctx.fillRect(gx + CELL - 2, gyy + 2, 1, CELL - 4);
          }
          ctx.globalAlpha = 1;
        }
        // soft crisp halo so the falling toy stands out from the stack
        if (!reduce) {
          for (i = 0; i < cells.length; i++) {
            A.pixelGlow(ctx, FX + (piece.x + cells[i][0]) * CELL + CELL / 2,
              rowY(piece.y + cells[i][1]) + CELL / 2, 5, p.color, 0.05);
          }
        }
        for (i = 0; i < cells.length; i++) {
          drawBlock(FX + (piece.x + cells[i][0]) * CELL, rowY(piece.y + cells[i][1]), CELL, CELL, piece.type);
        }
      }

      // overflow: a soft cream wash drawn down over the stack like a blanket
      if (overT > 0 || state === "gameover") {
        var covered = (reduce || state === "gameover") ? ROWS + 1
          : Math.min(ROWS + 1, Math.ceil((1 - overT / OVER_FRAMES) * (ROWS + 1) * 1.25));
        ctx.fillStyle = "rgba(244,239,227,0.6)";
        ctx.fillRect(FX, FY - CELL, FW, covered * CELL);
      }
      ctx.restore();
    }

    function render() {
      ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      var sh = camera.offset();
      ctx.translate(sh.x, sh.y);

      ctx.fillStyle = CREAM;
      ctx.fillRect(-4, -4, W + 8, H + 8);

      drawRug();
      drawField();
      drawBin();
      drawPanel();

      // particles
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 2);
      }
      ctx.globalAlpha = 1;

      // floaters (INK drop-shadow so they read over busy blocks)
      ctx.textAlign = "center";
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        ctx.font = fl.big ? "bold 11px monospace" : "bold 8px monospace";
        ctx.globalAlpha = clamp(fl.life / (fl.maxLife * 0.5), 0, 1);
        var fx = Math.round(fl.x), fy = Math.round(fl.y);
        ctx.fillStyle = INK;
        ctx.fillText(fl.text, fx + 1, fy + 1);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, fx, fy);
      }
      ctx.globalAlpha = 1; ctx.textAlign = "left";

      ctx.restore();
    }

    // ---------- HUD / prompt ----------
    function updateHud() {
      if (els.score) els.score.textContent = String(Math.floor(score)).padStart(5, "0");
      if (els.best) els.best.textContent = String(A.leaderboard.best(GAME_KEY)).padStart(5, "0");
      if (els.lines) els.lines.textContent = String(lines || 0);
    }
    function hidePrompt() { if (els.prompt) els.prompt.hidden = true; }
    function showIdle() {
      els.promptTitle.textContent = "Tidy Up";
      els.promptText.textContent = "Stack the falling toy blocks. Fill a whole row to put it away.";
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
      els.promptText.textContent = "The blocks will wait right where they are.";
      els.promptActions.textContent = "";
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Resume";
      btn.addEventListener("click", function () { resume(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
      els.prompt.hidden = false;
    }
    function showEnd(finalScore) {
      updateHud();
      els.promptTitle.textContent = "The toy bin overflowed";
      els.promptText.textContent = "Score " + String(finalScore).padStart(5, "0") + " · " +
        lines + (lines === 1 ? " line" : " lines");
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
      held: held,
      press: press,
      release: release,
      rotate: function (dirn) { return rotate(dirn); },
      hardDrop: hardDrop,
      hold: holdPiece,
      // touch-drag steps (one column / one row per call)
      move: function (dir) {
        if (state !== "running" || !piece) return;
        if (shift(dir)) A.haptics.tick();
      },
      softStep: function () {
        if (state !== "running" || !piece) return;
        softStep();
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
      // Returns true when the tap was consumed (start/restart/resume) so the
      // stage touchend never turns that same tap into a turn.
      tapStart: function () {
        ensureAudio();
        if (state === "idle") { start(); return true; }
        if (state === "paused") { resume(); return true; }
        if (state === "gameover") {
          if (document.activeElement && document.activeElement.tagName === "INPUT") return true;
          start(); return true;
        }
        return false;
      },
      startIfIdle: function () { if (state === "idle") { ensureAudio(); start(); } },
      togglePause: function () {
        if (state === "running") pause();
        else if (state === "paused") resume();
      },
      isPaused: function () { return state === "paused"; },
      resume: resume,
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
  // Six touch buttons don't fit one phone row at the shared 62px minimum,
  // so these opt out of it (and the side padding) to share the row evenly.
  var TOUCHBTN_FIT = ' style="min-width:0;padding-left:0;padding-right:0"';

  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "gms-arcade-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Tidy Up — a mini game");
    overlay.innerHTML =
      '<div class="gms-arcade-backdrop" data-egg-close></div>' +
      '<div class="gms-arcade-panel">' +
        '<div class="gms-arcade-panel__head">' +
          '<p class="gms-arcade-title">Tidy Up <span>— you found it!</span></p>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button type="button" class="gms-arcade-close" data-egg-mute aria-label="Toggle sound">♪</button>' +
            '<button type="button" class="gms-arcade-close" data-egg-close aria-label="Close game">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="gms-arcade-scores">' +
          '<span>SCORE <strong data-egg-score>00000</strong></span>' +
          '<span>LINES <strong data-egg-lines>0</strong></span>' +
          '<span>BEST <strong data-egg-best>00000</strong></span>' +
        '</div>' +
        '<div class="gms-arcade-stage gms-arcade-stage--blocks">' +
          '<canvas class="gms-arcade-canvas" tabindex="0"></canvas>' +
          '<div class="gms-arcade-prompt" data-egg-prompt hidden>' +
            '<p class="gms-arcade-prompt__title" data-egg-prompt-title></p>' +
            '<p class="gms-arcade-prompt__text" data-egg-prompt-text></p>' +
            '<div class="gms-arcade-prompt__actions" data-egg-prompt-actions></div>' +
          '</div>' +
        '</div>' +
        '<p class="gms-arcade-help">←/→ move · ↑ rotate (Z counter) · ↓ soft drop · Space drop · C hold · P pause · tap to rotate, drag to move, flick down to drop</p>' +
        '<div class="gms-arcade-touchrow" style="flex-wrap:nowrap">' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-left aria-label="Move left"' + TOUCHBTN_FIT + '>◀</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-rotate aria-label="Rotate"' + TOUCHBTN_FIT + '>⟳</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-down aria-label="Soft drop"' + TOUCHBTN_FIT + '>▼</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-right aria-label="Move right"' + TOUCHBTN_FIT + '>▶</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-drop aria-label="Drop"' + TOUCHBTN_FIT + '>DROP</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-hold aria-label="Hold"' + TOUCHBTN_FIT + '>HOLD</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var canvas = overlay.querySelector(".gms-arcade-canvas");
    var stage = overlay.querySelector(".gms-arcade-stage");
    function fitCanvas() {
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
      lines: overlay.querySelector("[data-egg-lines]"),
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

    // Touch buttons. Held ones (◀ ▼ ▶) feed the game's held map so DAS
    // repeats work exactly like the keyboard; one-shot ones (⟳ DROP HOLD)
    // flash a brief held state so the press registers under the thumb.
    // A press while idle/paused/over only starts or resumes.
    function holdBtn(sel, key) {
      var el = overlay.querySelector(sel);
      var down = function (e) {
        e.preventDefault();
        el.classList.add("is-held");
        if (game.tapStart()) return;
        game.press(key);
      };
      var up = function (e) { e.preventDefault(); game.release(key); el.classList.remove("is-held"); };
      el.addEventListener("touchstart", down, { passive: false });
      el.addEventListener("touchend", up, { passive: false });
      el.addEventListener("touchcancel", up, { passive: false });
      el.addEventListener("mousedown", down);
      el.addEventListener("mouseup", up);
      el.addEventListener("mouseleave", up);
    }
    function tapBtn(sel, fn) {
      var el = overlay.querySelector(sel);
      var heldT = null;
      var fire = function (e) {
        e.preventDefault();
        el.classList.add("is-held");
        if (heldT) window.clearTimeout(heldT);
        heldT = window.setTimeout(function () { el.classList.remove("is-held"); }, 120);
        if (game.tapStart()) return;
        fn();
      };
      el.addEventListener("touchstart", fire, { passive: false });
      el.addEventListener("mousedown", fire);
    }
    holdBtn("[data-egg-left]", "left");
    holdBtn("[data-egg-right]", "right");
    holdBtn("[data-egg-down]", "down");
    tapBtn("[data-egg-rotate]", function () { game.rotate(1); });
    tapBtn("[data-egg-drop]", function () { game.hardDrop(); });
    tapBtn("[data-egg-hold]", function () { game.hold(); });

    // Stage (canvas + letterbox margins): a tap starts/resumes, or turns the
    // piece mid-run. Sideways drags slide one column per STEP_PX (origin
    // re-arms after each step, so a held finger steers column by column).
    // Downward travel is held back for the first FLICK_MS: a fast flick
    // becomes a hard drop, a slow drag nudges down a row per STEP_PX. A fast
    // upward flick tucks the piece into HOLD.
    // Guard first: prompt buttons and the initials input live inside the stage.
    var STEP_PX = 18, TAP_PX = 10, TAP_MS = 400;
    var FLICK_PX = 60, FLICK_MS = 220, HOLD_FLICK_PX = 50;
    var gesture = null, suppressMouse = 0;
    function onControl(e) {
      return !!(e.target && e.target.closest && e.target.closest("button, a, input, label, form"));
    }
    function findTouch(list, id) {
      for (var i = 0; i < list.length; i++) { if (list[i].identifier === id) return list[i]; }
      return null;
    }
    function drainDown(g, y) {
      var dy = y - g.oy;
      if (dy < 0) { g.oy = y; return; } // dragging back up just re-arms
      while (dy >= STEP_PX) {
        game.softStep();
        g.oy += STEP_PX; dy -= STEP_PX;
        g.steps++;
      }
    }
    stage.addEventListener("touchstart", function (e) {
      if (onControl(e)) return;
      e.preventDefault();
      suppressMouse = Date.now() + 500;
      if (gesture) return; // the first finger steers; extra fingers are ignored
      var t = e.changedTouches[0];
      gesture = {
        id: t.identifier, sx: t.clientX, sy: t.clientY, ox: t.clientX, oy: t.clientY,
        t0: Date.now(), travel: 0, steps: 0, consumed: game.tapStart()
      };
    }, { passive: false });
    stage.addEventListener("touchmove", function (e) {
      if (onControl(e)) return;
      e.preventDefault();
      if (!gesture) return;
      var t = findTouch(e.changedTouches, gesture.id);
      if (!t) return;
      gesture.travel = Math.max(gesture.travel, Math.abs(t.clientX - gesture.sx), Math.abs(t.clientY - gesture.sy));
      if (gesture.consumed) return;
      var dx = t.clientX - gesture.ox;
      while (Math.abs(dx) >= STEP_PX) {
        var dir = dx > 0 ? 1 : -1;
        game.move(dir);
        gesture.ox += dir * STEP_PX; dx -= dir * STEP_PX;
        gesture.steps++;
      }
      if (Date.now() - gesture.t0 >= FLICK_MS) drainDown(gesture, t.clientY);
    }, { passive: false });
    function onTouchEnd(e) {
      if (onControl(e)) return;
      if (!gesture) return;
      var t = findTouch(e.changedTouches, gesture.id);
      if (!t) return;
      e.preventDefault();
      var g = gesture;
      gesture = null;
      if (g.consumed || e.type === "touchcancel") return;
      var ms = Date.now() - g.t0;
      var dx = t.clientX - g.sx, dy = t.clientY - g.sy;
      if (ms <= FLICK_MS && dy >= FLICK_PX && dy > Math.abs(dx)) { game.hardDrop(); return; }
      if (ms <= FLICK_MS + 60 && -dy >= HOLD_FLICK_PX && -dy > Math.abs(dx)) { game.hold(); return; }
      if (g.travel < TAP_PX && ms <= TAP_MS && !g.steps) { game.rotate(1); return; }
      drainDown(g, t.clientY); // a quick short nudge down that wasn't a flick
    }
    stage.addEventListener("touchend", onTouchEnd, { passive: false });
    stage.addEventListener("touchcancel", onTouchEnd, { passive: false });
    stage.addEventListener("mousedown", function (e) {
      if (onControl(e)) return;
      if (Date.now() < suppressMouse) return;
      e.preventDefault();
      game.tapStart();
    });

    function isKey(e, list) { return list.indexOf(e.key) !== -1; }
    function onKeydown(e) {
      // While typing initials, leave all keys (incl. Escape/Enter) to the form
      // so a stray Escape never reloads the page and drops the high score.
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "Escape") { closeOverlay(overlay); return; }
      if (isKey(e, ["ArrowLeft", "a", "A"])) { e.preventDefault(); if (!e.repeat) game.press("left"); }
      else if (isKey(e, ["ArrowRight", "d", "D"])) { e.preventDefault(); if (!e.repeat) game.press("right"); }
      else if (isKey(e, ["ArrowDown", "s", "S"])) { e.preventDefault(); if (!e.repeat) game.press("down"); }
      else if (isKey(e, ["ArrowUp", "x", "X", "w", "W"])) { e.preventDefault(); if (!e.repeat) game.rotate(1); }
      else if (isKey(e, ["z", "Z"])) { e.preventDefault(); if (!e.repeat) game.rotate(-1); }
      else if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (!e.repeat && !game.tapStart()) game.hardDrop();
      }
      else if (e.key === "Enter") {
        if (game.isPaused()) { e.preventDefault(); game.resume(); }
        else if (!(document.activeElement && document.activeElement.tagName === "BUTTON")) game.startIfIdle();
      }
      else if (isKey(e, ["c", "C", "Shift"])) { e.preventDefault(); if (!e.repeat) game.hold(); }
      else if (isKey(e, ["p", "P"])) { e.preventDefault(); if (!e.repeat) game.togglePause(); }
      else if (isKey(e, ["m", "M"])) { game.toggleMute(); syncMute(); }
    }
    function onKeyup(e) {
      if (isKey(e, ["ArrowLeft", "a", "A"])) game.release("left");
      else if (isKey(e, ["ArrowRight", "d", "D"])) game.release("right");
      else if (isKey(e, ["ArrowDown", "s", "S"])) game.release("down");
    }

    overlay.game = game;
    overlay._onKeydown = onKeydown;
    overlay._onKeyup = onKeyup;
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
    document.addEventListener("keyup", overlay._onKeyup);
    // resize alone misses iOS URL-bar collapse + orientation; close reloads
    // the page, so the subscription needs no teardown path.
    overlay._offViewport = A.onViewportChange(overlay._fitCanvas);
    overlay.game.activate();
    window.requestAnimationFrame(function () { overlay._canvas.focus(); });
  }

  // Arcade-only: no hidden trigger elsewhere on the site.
  ready(function () {
    var trigger = document.querySelector('[data-arcade-game="blocks"]');
    if (!trigger) return;

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
