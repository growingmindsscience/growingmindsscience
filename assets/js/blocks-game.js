/* Growing Minds Science — blocks-game.js
   "Tidy Up" on the Arcade page: it's clean-up time in the playroom. Wooden
   toy blocks tumble into the toy bin one at a time; slide and turn them as
   they fall, and a full row gets folded away. If the bin is so full the next
   toy can't fit, the round ends.

   Familiar rules underneath: seven four-block shapes from a shuffled 7-bag,
   turning with wall kicks, a ghost landing guide, hold, soft and hard drop,
   lock delay with a capped number of resets, DAS/ARR for held sideways
   moves, and levels (capped at 20) that quicken the fall every ten rows.
   On top: T-spins (3-corner rule), back-to-back bonuses for tetris and
   T-spin clears, a perfect-clear bonus and a combo for consecutive clearing
   drops.

   Two modes on the start card: Marathon (play until the bin overflows) and
   Bedtime (two minutes, score attack).

   Power-ups: Mystery Block (ochre; every 20 lines the next piece is a single
   block that clears whatever row it lands in) and Lullaby (research blue;
   granted for an "All tidy!" tetris, the blocks fall at half speed for ten
   seconds).

   Core v2 game (see docs/arcade/game-brief.md): live brand tokens through
   A.theme(), device-resolution canvas through the shell, makeShell for the
   overlay, makeStory for the five rooms, makePowerups for the pips,
   runSummary for the end card. CSP-safe: no eval, no external assets, audio
   is the shared Web Audio synth. Honors prefers-reduced-motion.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "tidy-up";
  var MUTE_KEY = "gms-blocks-muted";
  var MODE_KEY = "gms-blocks-mode";

  // ---------- Layout (logical units) ----------
  // A 10 x 20 bin of 24 px cells, two hidden rows above the rim where new
  // toys appear, and a 120 px shelf on the right. Portrait-friendly; the
  // shell letterboxes it into a landscape stage too.
  var CELL = 24, COLS = 10, ROWS = 20, HIDDEN = 2, TOTAL = ROWS + HIDDEN;
  var FX = 6, FY = 10, FW = COLS * CELL, FH = ROWS * CELL;   // the bin's floor area
  var BX = 2, BY = 6, BW = FW + 8, BH = FH + 8;              // the bin, rim included
  var PX = 258, PW = 114;                                    // the shelf
  var W = 376, H = 496;

  // ---------- Timing (frames at 60 Hz) ----------
  var DAS = 10, ARR = 2;              // held left/right: first repeat, then every ARR
  var SOFT_FPR = 2;                   // soft-drop fall speed (frames per row)
  var LOCK_DELAY = 30, LOCK_RESETS = 15;
  var CLEAR_FRAMES = 10;              // a cleared row folds to a rule over this long
  var DROP_FRAMES = 7;                // then the rows above drop into place
  var OVER_FRAMES = 54;               // the overflow (or lights-out) wash before the end card
  var BEDTIME_FRAMES = 120 * 60;      // two minutes
  var MAX_LEVEL = 20;

  var LINE_PTS = [0, 100, 300, 500, 800];
  var TSPIN_PTS = [400, 800, 1200, 1600];
  var PERFECT_PTS = [0, 800, 1200, 1800, 2000];
  var MYSTERY_EVERY = 20;

  // Wall kicks, tried in order: stay put, nudge left/right, lift a row, then
  // the long two-column reach the I piece sometimes needs against a wall.
  var KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]];

  // ---------- Toy shapes ----------
  // Spawn orientation inside its turning box (I 4x4, O 2x2, the rest 3x3).
  // Index 7 is the Mystery Block: one cell, never in the bag.
  var PIECES = [
    { id: "I", color: "research", rows: ["....", "XXXX", "....", "...."] },
    { id: "O", color: "ochre", rows: ["XX", "XX"] },
    { id: "T", color: "forest", rows: [".X.", "XXX", "..."] },
    { id: "S", color: "sageDeep", rows: [".XX", "XX.", "..."] },
    { id: "Z", color: "clay", rows: ["XX.", ".XX", "..."] },
    { id: "J", color: "sage", rows: ["X..", "XXX", "..."] },
    { id: "L", color: "toyWood", rows: ["..X", "XXX", "..."] },
    { id: "M", color: "ochre", rows: ["X"] }
  ];
  var T_PIECE = 2, MYSTERY = 7;

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
    }
  })();

  // ---------- Story: five rooms tidied, gated on lines ----------
  // The bin's rim takes a slight tint per room (mixed into ink).
  var CHAPTERS = [
    { name: "Blocks", at: 0, text: "Stack them up, row by row.", tint: "ink", amt: 0 },
    { name: "Books", at: 10, text: "Picture books go back on the shelf.", tint: "research", amt: 0.3 },
    { name: "Puzzles", at: 20, text: "Every piece has a place.", tint: "forest", amt: 0.35 },
    { name: "Dress-up", at: 30, text: "Hats, capes and one odd sock.", tint: "clay", amt: 0.3 },
    { name: "Bedtime", at: 40, text: "One last tidy before lights out.", tint: "research", amt: 0.45 }
  ];

  var POWERUPS = {
    mystery: { label: "Mystery Block", color: "ochre", uses: 1, text: "Lands and clears its row" },
    lullaby: { label: "Lullaby", color: "research", duration: 600, text: "Blocks fall at half speed" }
  };

  var MODES = {
    marathon: { label: "Marathon", text: "Play until the bin overflows. Every ten rows the blocks fall a little faster." },
    bedtime: { label: "Bedtime", text: "Two minutes until lights out. Tidy as much as you can." }
  };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function rowY(r) { return FY + (r - HIDDEN) * CELL; }
  function fmtTime(frames) {
    var s = Math.max(0, Math.ceil(frames / 60));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  function readMode() { try { var m = window.localStorage.getItem(MODE_KEY); return MODES[m] ? m : "marathon"; } catch (e) { return "marathon"; } }
  function saveMode(m) { try { window.localStorage.setItem(MODE_KEY, m); } catch (e) {} }

  // Board cells pack the piece type and a grain pattern: (type + 1) | (grain << 4).
  function cellType(v) { return (v & 15) - 1; }
  function cellGrain(v) { return v >> 4; }

  // ======================================================================
  //  Game
  // ======================================================================
  function createGame(shell) {
    var cv = shell.canvas, ctx = cv.ctx, draw = A.draw;
    var pal = A.theme();
    var offTheme = A.onThemeChange(function (p) { pal = p; });
    var reduce = A.prefersReducedMotion();

    var camera = A.makeCamera({ reduce: reduce, maxPx: 4 });
    // Consecutive clearing drops build the combo; a drop that clears nothing
    // resets it (see resolveLock). The window is long so an unhurried player
    // is never punished for thinking.
    var combo = A.makeCombo({ window: 3600, max: 5 });
    var particles = A.makeParticles({ cap: 140, reduce: reduce });
    var floaters = A.makeFloaters({ cap: 12, reduce: reduce });
    var wake = A.makeWakeLock();
    var unsubHidden = null;
    var synth = A.makeSynth({ muteKey: MUTE_KEY });
    shell.bindSynth(synth);

    var story = A.makeStory(CHAPTERS, { onEnter: onChapter, bannerFrames: 170 });
    var powers = A.makePowerups(POWERUPS, {});

    var state = "idle"; // idle | running | paused | dying | gameover
    var mode = readMode();
    var board, piece, queue, holdType, canHold, score, lines, level, best;
    var gravT, clearRows, clearT, clearKind, overT, endReason, levelPending;
    var dropFrom, dropT;
    var shiftDir, shiftT, lastDir;
    var landCells = [], landT, trail;
    var b2b, nextMystery, mysteryPending, timeLeft, time;
    var runStats;

    best = A.leaderboard.best(GAME_KEY);

    // ---------- Audio ----------
    var sfx = {
      move: function () { synth.beep(330, 350, 0.03, "square", 0.14); },
      rotate: function () { synth.beep(460, 620, 0.05, "triangle", 0.3); },
      hold: function () { synth.beep(620, 410, 0.07, "triangle", 0.3); },
      // a soft wooden "tok" as a toy settles
      lock: function () { synth.noise(0.07, 700, 0.26, 1); synth.beep(190, 120, 0.06, "sine", 0.32); },
      slam: function () { synth.noise(0.16, 1000, 0.45, 2); synth.beep(220, 80, 0.12, "sine", 0.5); },
      // climbs a note per row tidied at once, a touch higher with the combo
      clear: function (n, mult) {
        var b = 1 + (Math.max(1, mult || 1) - 1) * 0.06;
        var notes = [523, 659, 784, 1046, 1318], seq = [];
        for (var i = 0; i < n + 1; i++) seq.push(notes[i] * b);
        synth.arp(seq, 0.055, 0.16, "triangle", 0.42);
      },
      tidy: function () { synth.arp([523, 659, 784, 1046, 1318, 1568], 0.06, 0.2, "triangle", 0.48); },
      tspin: function () { synth.arp([440, 660, 990, 1320], 0.045, 0.14, "triangle", 0.42); },
      mystery: function () { synth.arp([784, 988, 1318, 1568], 0.05, 0.16, "sine", 0.4); },
      power: function () { synth.arp([659, 880, 1318], 0.045, 0.12, "triangle", 0.38); },
      level: function () { synth.arp([392, 523, 659, 784], 0.07, 0.18, "triangle", 0.3); },
      chapter: function () { synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.4); },
      // a gentle falling "oh well", never alarming
      overflow: function () { synth.arp([523, 440, 392, 330, 262], 0.1, 0.22, "triangle", 0.38); synth.noise(0.3, 400, 0.2, 1); },
      lightsOut: function () { synth.arp([784, 659, 523, 392], 0.14, 0.3, "sine", 0.36); }
    };

    // ---------- World ----------
    function emptyRow() { var r = []; for (var c = 0; c < COLS; c++) r.push(0); return r; }

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
      queue = []; refillQueue();
      piece = null; holdType = -1; canHold = true;
      score = 0; lines = 0; level = 1;
      gravT = 0; clearRows = []; clearT = 0; clearKind = null; overT = 0; endReason = null; levelPending = false;
      dropFrom = []; for (var d = 0; d < TOTAL; d++) dropFrom.push(0);
      dropT = 0;
      shiftDir = 0; shiftT = 0; lastDir = 0;
      landCells.length = 0; landT = 0; trail = null;
      b2b = false; nextMystery = MYSTERY_EVERY; mysteryPending = false;
      timeLeft = BEDTIME_FRAMES; time = 0;
      combo.reset(true); powers.clear(); story.reset();
      particles.clear(); floaters.clear();
      runStats = { chapter: 0, tetrises: 0, tspins: 0, perfect: 0, mysteries: 0 };
      input.release();
      syncHud();
    }

    function syncHud() {
      shell.hud.set("score", score);
      shell.hud.set("best", Math.max(best, score));
      shell.hud.set("time", fmtTime(timeLeft));
      shell.hud.show("time", mode === "bedtime");
      shell.hud.set("room", CHAPTERS[story.index()].name);
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
    function solid(x, y) { return x < 0 || x >= COLS || y >= TOTAL || (y >= 0 && board[y][x] !== 0); }
    function grounded() { return !fits(piece.type, piece.rot, piece.x, piece.y + 1); }
    function landingY() {
      var y = piece.y;
      while (fits(piece.type, piece.rot, piece.x, y + 1)) y++;
      return y;
    }

    // New toys appear straddling the rim: the top row just above the bin, so
    // a near-full bin is visible at a glance.
    function spawnPiece(t) {
      piece = { type: t, rot: 0, x: t === 1 ? 4 : (t === MYSTERY ? 4 : 3), y: 1, lockT: 0, resets: 0, lastRot: false, g: Math.floor(Math.random() * 8) };
      gravT = 0;
      if (!fits(piece.type, piece.rot, piece.x, piece.y)) { topOut(); return false; }
      return true;
    }
    function spawnNext() {
      canHold = true;
      if (mysteryPending) { mysteryPending = false; spawnPiece(MYSTERY); return; }
      var t = queue.shift();
      refillQueue();
      spawnPiece(t);
    }
    // What the shelf shows next: the Mystery Block jumps the queue.
    function upcoming(n) {
      var out = [];
      if (mysteryPending) out.push(MYSTERY);
      for (var i = 0; out.length < n && i < queue.length; i++) out.push(queue[i]);
      return out;
    }

    // Lock delay: a successful move or turn on the ground buys more time, but
    // only LOCK_RESETS times per piece so a toy can't be juggled forever.
    function onMoved() {
      if (piece.lockT > 0 || grounded()) {
        if (piece.resets < LOCK_RESETS) { piece.lockT = 0; piece.resets++; }
      }
    }

    function shift(dir) {
      if (!piece || !fits(piece.type, piece.rot, piece.x + dir, piece.y)) return false;
      piece.x += dir; piece.lastRot = false;
      onMoved();
      sfx.move();
      return true;
    }
    function softStep() {
      if (!piece || !fits(piece.type, piece.rot, piece.x, piece.y + 1)) return false;
      piece.y++; piece.lockT = 0; piece.lastRot = false;
      score += 1;
      return true;
    }
    function rotate(dirn) {
      if (state !== "running" || !piece) return false;
      if (piece.type === 1 || piece.type === MYSTERY) return false; // a square looks the same every way
      var nr = (piece.rot + (dirn > 0 ? 1 : 3)) % 4;
      for (var i = 0; i < KICKS.length; i++) {
        var nx = piece.x + KICKS[i][0], ny = piece.y + KICKS[i][1];
        if (fits(piece.type, nr, nx, ny)) {
          piece.rot = nr; piece.x = nx; piece.y = ny; piece.lastRot = true;
          onMoved();
          sfx.rotate(); A.haptics.tick();
          return true;
        }
      }
      return false;
    }
    function hardDrop() {
      if (state !== "running" || !piece || clearT > 0) return;
      var gy = landingY(), d = gy - piece.y;
      if (!reduce && d > 0) trail = { t: piece.type, rot: piece.rot, x: piece.x, from: piece.y, to: gy, life: 9 };
      if (d > 0) piece.lastRot = false;
      piece.y = gy;
      score += d * 2;
      camera.shake(0.18);
      sfx.slam(); A.haptics.thump();
      lockPiece(true);
    }
    // Hold: tuck the current toy aside (once per drop) and take the held one.
    // The Mystery Block can't be held: it is a gift for right now.
    function holdPiece() {
      if (state !== "running" || !piece || !canHold || piece.type === MYSTERY) return;
      var cur = piece.type;
      canHold = false;
      sfx.hold(); A.haptics.tick();
      if (holdType < 0) {
        holdType = cur;
        var t = queue.shift(); refillQueue();
        spawnPiece(t);
      } else {
        var h = holdType; holdType = cur;
        spawnPiece(h);
      }
      canHold = false;
    }

    // T-spin, 3-corner rule: the T's last move was a turn and at least three
    // of the four corners of its 3x3 box are walls, floor or blocks.
    function isTSpin() {
      if (piece.type !== T_PIECE || !piece.lastRot) return false;
      var n = 0, x = piece.x, y = piece.y;
      if (solid(x, y)) n++;
      if (solid(x + 2, y)) n++;
      if (solid(x, y + 2)) n++;
      if (solid(x + 2, y + 2)) n++;
      return n >= 3;
    }

    function lockPiece(hard) {
      var cells = PIECES[piece.type].rots[piece.rot];
      var t = piece.type, allHidden = true, i, bx, by;
      var tspin = isTSpin();
      landCells.length = 0;
      for (i = 0; i < cells.length; i++) {
        bx = piece.x + cells[i][0]; by = piece.y + cells[i][1];
        if (by >= 0) board[by][bx] = (t + 1) | (((piece.g + i * 3) & 7) << 4);
        if (by >= HIDDEN) allHidden = false;
        landCells.push(bx, by);
      }
      landT = reduce ? 0 : 5;
      // a little dust under every cell that came to rest on something
      for (i = 0; i < cells.length; i++) {
        bx = piece.x + cells[i][0]; by = piece.y + cells[i][1];
        var below = by + 1, own = false;
        for (var k = 0; k < cells.length; k++) { if (piece.x + cells[k][0] === bx && piece.y + cells[k][1] === below) { own = true; break; } }
        if (!own && by >= HIDDEN) particles.burst(FX + bx * CELL + CELL / 2, rowY(below), { n: hard ? 3 : 2, color: pal.alpha(pal.inkMuted, 0.5), speed: 0.7, life: 12, size: 1.6, spread: Math.PI, angle: -Math.PI / 2 });
      }
      if (!hard) { sfx.lock(); A.haptics.tick(); }
      var landedRow = piece.y;
      piece = null;
      if (allHidden) { topOut(); return; }
      resolveLock(t, tspin, landedRow);
    }

    function resolveLock(t, tspin, landedRow) {
      var rows = [], r, c;
      if (t === MYSTERY) {
        rows.push(landedRow);
        powers.use("mystery");
        runStats.mysteries += 1;
      } else {
        for (r = 0; r < TOTAL; r++) {
          var n0 = 0;
          for (c = 0; c < COLS; c++) { if (board[r][c]) n0++; }
          if (n0 === COLS) rows.push(r);
        }
      }
      var n = rows.length;
      var midY = n ? rowY((rows[0] + rows[n - 1]) / 2) + CELL / 2 : FY + FH / 2;
      var cxF = FX + FW / 2;

      if (n === 0) {
        combo.reset();
        if (tspin) {
          var tz = TSPIN_PTS[0] * level;
          score += tz; runStats.tspins += 1;
          floaters.spawn(cxF, FY + FH / 3, "T-spin +" + tz, pal.research, { size: 16, font: "display", life: 50, stroke: pal.surface });
          sfx.tspin();
        }
        syncHud();
        spawnNext();
        return;
      }

      var mystery = t === MYSTERY;
      var base = tspin ? TSPIN_PTS[Math.min(3, n)] : LINE_PTS[Math.min(4, n)];
      if (mystery) base = LINE_PTS[1] + 100;
      var difficult = !mystery && (n === 4 || tspin);
      var wasB2B = difficult && b2b;
      if (wasB2B) base = Math.round(base * 1.5);
      if (!mystery) b2b = difficult;
      var pts = base * level;

      var mult = combo.hit();
      var comboPts = mult > 1 ? 50 * (mult - 1) * level : 0;

      // perfect clear: nothing left outside the rows being folded away
      var left = 0;
      for (r = 0; r < TOTAL; r++) {
        if (rows.indexOf(r) !== -1) continue;
        for (c = 0; c < COLS; c++) if (board[r][c]) left++;
      }
      var perfect = left === 0 && !mystery;
      var perfectPts = perfect ? PERFECT_PTS[Math.min(4, n)] * level : 0;

      score += pts + comboPts + perfectPts;
      lines += n;
      if (n === 4) runStats.tetrises += 1;
      if (tspin) runStats.tspins += 1;
      if (perfect) runStats.perfect += 1;

      var nextLevel = Math.min(MAX_LEVEL, 1 + Math.floor(lines / 10));
      if (nextLevel > level) { level = nextLevel; levelPending = true; }

      // sage leaves lift off every row as it folds away
      for (var i = 0; i < n; i++) {
        var ry = rowY(rows[i]) + CELL / 2;
        for (var k = 0; k < 5; k++) {
          particles.burst(FX + (k + 0.5) * FW / 5, ry, { n: 3, color: [pal.sage, pal.sageDeep, pal.forest], speed: 1.5, life: 28, size: 2.6, kind: ["leaf", "dot"], gravity: 0.03, spread: Math.PI * 1.2, angle: -Math.PI / 2 });
        }
      }

      // the words
      var fy = clamp(midY - 18, FY + 30, FY + FH - 40);
      if (mystery) {
        floaters.spawn(cxF, fy, "Mystery tidy!", pal.ochre, { size: 20, font: "display", life: 60, stroke: pal.surface });
      } else if (tspin) {
        floaters.spawn(cxF, fy, "T-spin " + ["", "single", "double", "triple"][Math.min(3, n)], pal.research, { size: 20, font: "display", life: 60, stroke: pal.surface });
      } else if (n === 4) {
        floaters.spawn(cxF, fy, "All tidy!", pal.forest, { size: 26, font: "display", life: 64, stroke: pal.surface });
      }
      floaters.spawn(cxF, fy + 24, "+" + (pts + comboPts + perfectPts), n >= 3 || tspin ? pal.forest : pal.inkSoft, { size: 13, life: 44, stroke: pal.surface });
      if (wasB2B) floaters.spawn(cxF, fy + 42, "Back to back", pal.research, { size: 11, life: 48, stroke: pal.surface });
      if (mult > 1) floaters.spawn(cxF, fy + (wasB2B ? 58 : 42), "Combo ×" + mult, pal.forest, { size: 11, life: 48, stroke: pal.surface });
      if (perfect) floaters.spawn(cxF, fy - 30, "Spotless!", pal.ochre, { size: 22, font: "display", life: 70, stroke: pal.surface });

      camera.shake([0, 0.1, 0.18, 0.26, 0.45][Math.min(4, n)]);
      if (n === 4 || perfect) {
        camera.freeze(8); // the big one lands with weight
        sfx.tidy(); A.haptics.win();
      } else if (tspin) { sfx.tspin(); A.haptics.thump(); }
      else if (mystery) { sfx.mystery(); A.haptics.pop(); }
      else { sfx.clear(n, mult); A.haptics.pop(); }

      if (n === 4) {
        powers.grant("lullaby");
        shell.toast("Lullaby: blocks fall at half speed", 1600);
        A.announce("All tidy! Lullaby: the blocks fall at half speed for a while.");
      }

      // story, then the Mystery Block every twenty lines
      story.advance(lines);
      while (lines >= nextMystery) { nextMystery += MYSTERY_EVERY; grantMystery(); }

      clearRows = rows; clearKind = mystery ? "mystery" : "line";
      syncHud(); shell.hud.flash("score");
      if (reduce) { collapse(); spawnNext(); }
      else clearT = CLEAR_FRAMES;
    }

    function grantMystery() {
      if (mysteryPending) return;
      mysteryPending = true;
      powers.grant("mystery");
      sfx.power();
      shell.toast("Mystery Block: it lands and clears its row", 1800);
      A.announce("Mystery Block next. It clears whatever row it lands in.");
    }

    function collapse() {
      var keep = [], from = [], r;
      for (r = 0; r < TOTAL; r++) { if (clearRows.indexOf(r) === -1) { keep.push(board[r]); from.push(r); } }
      while (keep.length < TOTAL) { keep.unshift(emptyRow()); from.unshift(-1); }
      board = keep;
      for (r = 0; r < TOTAL; r++) dropFrom[r] = from[r] >= 0 ? (r - from[r]) * CELL : 0;
      dropT = reduce ? 0 : DROP_FRAMES;
      clearRows = []; clearKind = null;
      if (levelPending) {
        levelPending = false;
        sfx.level();
        floaters.spawn(FX + FW / 2, FY + FH * 0.45, "Level " + level, pal.forest, { size: 18, font: "display", life: 60, stroke: pal.surface });
        A.announce("Level " + level + ".");
      }
    }

    function onChapter(ch, idx) {
      runStats.chapter = Math.max(runStats.chapter, idx);
      if (idx > 0) {
        sfx.chapter(); A.haptics.win();
        A.announce("Room " + (idx + 1) + ", " + ch.name + ". " + ch.text);
      }
    }

    // ---------- Flow ----------
    function showStart() {
      var p = A.progress.get(GAME_KEY);
      shell.prompt.show({
        kicker: "Tidy Up",
        title: p.plays ? "Back to the playroom" : "Clean-up time in the playroom",
        text: "Slide and turn the falling toy blocks. Fill a whole row and it folds away. Keep the bin from overflowing.",
        board: function (m) {
          var group = A.el("div", "gms-arcade-choices");
          group.setAttribute("role", "group"); group.setAttribute("aria-label", "Choose a mode");
          var note = A.el("p", "gms-arcade-prompt__text", MODES[mode].text);
          var btns = {};
          Object.keys(MODES).forEach(function (id) {
            var b = A.el("button", "gms-arcade-choice", MODES[id].label);
            b.type = "button"; b.setAttribute("aria-pressed", id === mode ? "true" : "false");
            b.addEventListener("click", function (e) {
              e.preventDefault();
              mode = id; saveMode(id);
              Object.keys(btns).forEach(function (k) { btns[k].setAttribute("aria-pressed", k === mode ? "true" : "false"); });
              note.textContent = MODES[mode].text;
              syncHud();
            });
            btns[id] = b; group.appendChild(b);
          });
          m.appendChild(group); m.appendChild(note);
          if (p.plays) A.renderLeaderboard(m, GAME_KEY, {});
        },
        actions: [{ label: "Start", primary: true, onClick: start }]
      });
    }
    function start() {
      synth.ensure();
      resetWorld();
      state = "running";
      shell.prompt.hide();
      wake.acquire();
      spawnNext();
      shell.setHelp("← → move · ↑ or X turn (Z back) · ↓ soft drop · Space drop · C hold · P pauses · M mutes · Esc closes");
      A.announce(mode === "bedtime" ? "Go. Bedtime mode: two minutes until lights out." : "Go. Marathon mode. Room one, Blocks.");
    }
    function pause() {
      if (state !== "running") return;
      state = "paused";
      wake.release(); input.release();
      shell.prompt.show({ kicker: "Paused", title: CHAPTERS[story.index()].name,
        text: "The blocks will wait right where they are. Score " + score + " · " + lines + (lines === 1 ? " line." : " lines."),
        actions: [{ label: "Resume", primary: true, onClick: resume }, { label: "Quit", onClick: function () { A.closeGame(); } }], compact: true });
    }
    function resume() {
      if (state !== "paused") return;
      synth.ensure();
      state = "running"; shell.prompt.hide(); wake.acquire();
    }
    // The next toy has nowhere to go: the bin overflowed.
    function topOut() {
      if (state !== "running") return;
      piece = null; state = "dying"; overT = OVER_FRAMES; endReason = "overflow";
      wake.release(); input.release(); combo.reset();
      sfx.overflow(); A.haptics.crash(); camera.shake(0.3);
      for (var i = 0; i < 12; i++) {
        particles.burst(FX + 30 + Math.random() * (FW - 60), FY + 4, { n: 1, color: pal[PIECES[i % 7].color] || pal.ochre, speed: 1.8, life: 34, size: 3, kind: "square", gravity: 0.08, spread: Math.PI * 0.8, angle: -Math.PI / 2 });
      }
    }
    function lightsOut() {
      if (state !== "running") return;
      state = "dying"; overT = OVER_FRAMES; endReason = "time";
      wake.release(); input.release();
      sfx.lightsOut(); A.haptics.win();
    }
    function gameOver() {
      state = "gameover";
      wake.release();
      var placed = score > 0 && score > best;
      if (score > best) best = score;
      var ch = CHAPTERS[story.index()];
      var badges = [];
      if (runStats.chapter >= 4) badges.push("bedtime");
      if (runStats.tetrises > 0) badges.push("all-tidy");
      if (runStats.perfect > 0) badges.push("spotless");
      A.progress.record(GAME_KEY, { score: score, chapter: runStats.chapter, badges: badges });
      syncHud();
      var timeUp = endReason === "time";
      shell.prompt.show({
        kicker: timeUp ? "Lights out" : "The toy bin overflowed",
        title: placed ? "A new best: " + score : "Score " + score,
        text: "You tidied " + lines + (lines === 1 ? " row" : " rows") + " and reached " + ch.name + (timeUp ? " before bedtime." : "."),
        board: function (m) {
          A.runSummary(m, { gameKey: GAME_KEY, score: score,
            lines: [["Mode", MODES[mode].label], ["Room", ch.name], ["Rows", lines], ["Level", level], ["All tidy", runStats.tetrises], ["T-spins", runStats.tspins], ["Best combo", combo.best() + " drops"]],
            onSaved: function () { best = A.leaderboard.best(GAME_KEY); syncHud(); } });
        },
        actions: [{ label: "Play again", primary: true, onClick: start }, { label: "Change mode", onClick: showStart }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
      A.announce((timeUp ? "Lights out. " : "The toy bin overflowed. ") + "Score " + score + ", " + lines + " rows.");
    }

    // ---------- Input ----------
    function heldDir(id) { return !!(input.held[id] || shell.held[id]); }
    function pressDir(id) {
      if (state !== "running" || !piece || clearT > 0) return;
      if (id === "left" || id === "right") {
        var dir = id === "left" ? -1 : 1;
        lastDir = dir; shiftDir = dir; shiftT = 0;
        if (shift(dir)) A.haptics.tick();
      } else if (id === "down") { gravT = 0; softStep(); }
    }
    function act(id) {
      if (id === "left" || id === "right" || id === "down") { pressDir(id); return; }
      if (state === "paused") { if (id === "pause" || id === "enter" || id === "drop") resume(); return; }
      if (state === "idle" || state === "gameover") { if (id === "drop" || id === "enter") start(); return; }
      if (state !== "running") return;
      if (id === "pause") { pause(); return; }
      if (clearT > 0) return;
      if (id === "rotate") rotate(1);
      else if (id === "rotateBack") rotate(-1);
      else if (id === "drop") hardDrop();
      else if (id === "hold") holdPiece();
    }

    // Canvas gestures (touch and mouse): tap turns, a sideways drag slides a
    // column per step, a slow drag down nudges, a quick flick down drops and
    // a quick flick up holds. Distances are logical units.
    var STEP = 18, TAP_MOVE = 10, TAP_MS = 400, FLICK = 60, FLICK_MS = 220, HOLD_FLICK = 50;
    var gesture = null;
    function drainDown(g, y) {
      var dy = y - g.oy;
      if (dy < 0) { g.oy = y; return; }
      while (dy >= STEP) { if (state === "running" && piece && clearT <= 0) softStep(); g.oy += STEP; dy -= STEP; g.steps++; }
    }
    var input = A.makeInput(cv.el, {
      canvas: cv,
      keys: {
        ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowDown: "down", s: "down",
        ArrowUp: "rotate", w: "rotate", x: "rotate", z: "rotateBack", " ": "drop", c: "hold", Shift: "hold", p: "pause", Enter: "enter"
      },
      onAction: function (a, repeat, e) {
        if (e && e.preventDefault) e.preventDefault();
        if (repeat) return; // DAS/ARR handles held keys
        act(a);
      },
      onDown: function (p) {
        gesture = { sx: p.x, sy: p.y, ox: p.x, oy: p.y, t0: Date.now(), travel: 0, steps: 0 };
      },
      onDrag: function (p) {
        var g = gesture; if (!g) return;
        g.travel = Math.max(g.travel, Math.abs(p.x - g.sx), Math.abs(p.y - g.sy));
        if (state !== "running" || !piece) return;
        var dx = p.x - g.ox;
        while (Math.abs(dx) >= STEP) {
          var dir = dx > 0 ? 1 : -1;
          if (clearT <= 0 && shift(dir)) A.haptics.tick();
          g.ox += dir * STEP; dx -= dir * STEP; g.steps++;
        }
        if (Date.now() - g.t0 >= FLICK_MS) drainDown(g, p.y);
      },
      onUp: function (p) {
        var g = gesture; gesture = null;
        if (!g) return;
        if (state === "paused") { resume(); return; }
        if (state !== "running") return;
        var ms = Date.now() - g.t0, dx = p.x - g.sx, dy = p.y - g.sy;
        if (ms <= FLICK_MS && dy >= FLICK && dy > Math.abs(dx)) { act("drop"); return; }
        if (ms <= FLICK_MS + 60 && -dy >= HOLD_FLICK && -dy > Math.abs(dx)) { act("hold"); return; }
        if (g.travel < TAP_MOVE && ms <= TAP_MS && !g.steps) { act("rotate"); return; }
        drainDown(g, p.y);
      }
    });
    // Touch row: Left, Down and Right are hold buttons that also fire on the
    // press (so a quick tap is never lost); Rotate, Drop and Hold are taps.
    shell.onTap(function (id) { act(id); });

    // DAS/ARR: after the first step, wait DAS frames, then repeat every ARR.
    // If both sides are held, the most recent press wins.
    function updateShift(dt) {
      var l = heldDir("left"), r = heldDir("right"), dir = 0;
      if (l && r) dir = lastDir; else if (l) dir = -1; else if (r) dir = 1;
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

    function framesPerRow() {
      var f = Math.max(2, 48 * Math.pow(0.84, level - 1));
      if (powers.active("lullaby")) f *= 2;
      return f;
    }

    // ---------- Tick ----------
    function tick(dt) {
      time += dt;
      camera.tick(dt); particles.tick(dt); floaters.tick(dt); story.tick(dt);
      if (landT > 0) landT -= dt;
      if (dropT > 0) dropT = Math.max(0, dropT - dt);
      if (trail) { trail.life -= dt; if (trail.life <= 0) trail = null; }

      if (state === "dying") {
        overT -= dt;
        if (overT <= 0) { overT = 0; gameOver(); }
        return;
      }
      if (state !== "running") return;
      if (camera.frozen()) return;
      combo.tick(dt); powers.tick(dt);
      shell.renderPips(powers.list(), pal);

      if (mode === "bedtime") {
        var before = Math.ceil(timeLeft / 60);
        timeLeft -= dt;
        if (Math.ceil(timeLeft / 60) !== before) {
          shell.hud.set("time", fmtTime(timeLeft));
          if (timeLeft <= 10 * 60 && timeLeft > 0) { shell.hud.flash("time"); synth.beep(880, 880, 0.04, "sine", 0.12); }
        }
        if (timeLeft <= 0) { timeLeft = 0; shell.hud.set("time", fmtTime(0)); lightsOut(); return; }
      }

      if (clearT > 0) {
        clearT -= dt;
        if (clearT <= 0) { clearT = 0; collapse(); spawnNext(); }
        return;
      }
      if (!piece) return;

      updateShift(dt);
      if (!piece) return;

      // gravity (soft drop just shortens the frames per row)
      var fpr = framesPerRow();
      var soft = heldDir("down") && fpr > SOFT_FPR;
      if (soft) fpr = SOFT_FPR;
      gravT += dt;
      while (gravT >= fpr) {
        gravT -= fpr;
        if (fits(piece.type, piece.rot, piece.x, piece.y + 1)) {
          piece.y++; piece.lockT = 0; piece.lastRot = false;
          if (soft) score += 1;
        } else { gravT = 0; break; }
      }
      if (grounded()) {
        piece.lockT += dt;
        if (piece.lockT >= LOCK_DELAY) lockPiece(false);
      }
    }

    // ---------- Art ----------
    function pieceColor(t) {
      var key = PIECES[t].color;
      if (key === "toyWood") return pal.mix(pal.ochre, pal.paper, 0.4); // L: a pale wood, ochre into paper
      return pal[key];
    }
    // A wooden toy block: flat fill, rounded edge, ink outline, a 1 px lighter
    // top edge, and two or three faint grain lines across the face.
    function drawBlock(x, y, s, h, t, g, opts) {
      opts = opts || {};
      var col = pieceColor(t);
      var r = s >= 20 ? 4 : 3;
      var hh = h == null ? s : h;
      if (hh < 3) return;
      if (opts.alpha != null) { ctx.save(); ctx.globalAlpha *= opts.alpha; }
      draw.box(ctx, x + 1, y + 1, s - 2, hh - 2, Math.min(r, (hh - 2) / 2), { fill: col, stroke: pal.ink, lineWidth: s >= 20 ? 1.4 : 1.1, shadow: opts.shadow ? 2.5 : 0, shadowColor: pal.shadow });
      if (hh > 8) {
        // lighter top edge
        ctx.strokeStyle = pal.shade(col, pal.isDark ? 0.25 : 0.42); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + r + 1, y + 2.6); ctx.lineTo(x + s - r - 1, y + 2.6); ctx.stroke();
        // grain
        if (s >= 14) {
          ctx.strokeStyle = pal.alpha(pal.fieldInk, pal.isDark ? 0.28 : 0.13); ctx.lineWidth = 0.8;
          var count = 2 + (g & 1);
          for (var k = 0; k < count; k++) {
            var gy = y + hh * (0.34 + k * (count === 3 ? 0.2 : 0.3)) + (((g >> 1) + k) % 3 - 1);
            var bow = ((g + k) % 2 ? 1.6 : -1.6) * (hh / s);
            var x0 = x + 4 + ((g + k) % 3), x1 = x + s - 4 - ((g + 2 * k) % 3);
            ctx.beginPath(); ctx.moveTo(x0, gy); ctx.quadraticCurveTo((x0 + x1) / 2, gy + bow, x1, gy + bow * 0.4); ctx.stroke();
          }
        }
      }
      if (t === MYSTERY && hh > 10) {
        draw.label(ctx, "?", x + s / 2, y + hh / 2 + 1, { font: "display", size: Math.round(s * 0.62), weight: 600, color: pal.ink });
      }
      if (opts.alpha != null) ctx.restore();
    }

    function drawPreview(t, cx, cy, s, alpha) {
      var cells = PIECES[t].rots[0];
      var minX = 9, maxX = -1, minY = 9, maxY = -1, i;
      for (i = 0; i < cells.length; i++) {
        minX = Math.min(minX, cells[i][0]); maxX = Math.max(maxX, cells[i][0]);
        minY = Math.min(minY, cells[i][1]); maxY = Math.max(maxY, cells[i][1]);
      }
      var w = (maxX - minX + 1) * s, h = (maxY - minY + 1) * s;
      var ox = cx - w / 2 - minX * s, oy = cy - h / 2 - minY * s;
      for (i = 0; i < cells.length; i++) drawBlock(ox + cells[i][0] * s, oy + cells[i][1] * s, s, null, t, (i * 3 + t) & 7, { alpha: alpha });
    }

    function rimColor() {
      var ch = CHAPTERS[story.index()];
      return ch.amt ? pal.mix(pal.ink, pal[ch.tint], ch.amt) : pal.ink;
    }

    // The toy bin: a surface tray with an ink rim and two handles on top.
    function drawBin() {
      var rim = rimColor();
      draw.box(ctx, BX, BY, BW, BH, 7, { fill: rim, stroke: pal.ink, lineWidth: 1.4, shadow: 3, shadowColor: pal.shadow });
      draw.box(ctx, FX, FY, FW, FH, 3, { fill: pal.surface, stroke: pal.alpha(pal.ink, 0.35), lineWidth: 1 });
      // faint column guides, like the seams of the bin's floor
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var c = 1; c < COLS; c++) { var gx = FX + c * CELL + 0.5; ctx.moveTo(gx, FY + 4); ctx.lineTo(gx, FY + FH - 4); }
      ctx.stroke();
      // handles: two rounded tabs on the top rim with a slot cut through
      var hw = 34, hh = 11;
      for (var i = 0; i < 2; i++) {
        var hx = i === 0 ? BX + 36 : BX + BW - 36 - hw, hy = BY - 5;
        draw.pill(ctx, hx, hy, hw, hh, { fill: rim, stroke: pal.ink, lineWidth: 1.3 });
        draw.pill(ctx, hx + 7, hy + 3, hw - 14, 4.5, { fill: pal.paper, stroke: pal.alpha(pal.ink, 0.6), lineWidth: 1 });
      }
    }

    function isLanding(c, r) {
      for (var i = 0; i < landCells.length; i += 2) { if (landCells[i] === c && landCells[i + 1] === r) return true; }
      return false;
    }

    function drawField() {
      var r, c, i;
      ctx.save();
      ctx.beginPath(); ctx.rect(FX, 0, FW, FY + FH); ctx.clip();

      var dropU = dropT > 0 ? 1 - dropT / DROP_FRAMES : 1;
      var dropK = 1 - dropU * dropU; // falls faster as it goes
      var clearProg = clearT > 0 ? 1 - clearT / CLEAR_FRAMES : 0;

      // the stack
      for (r = 1; r < TOTAL; r++) {
        var clearing = clearT > 0 && clearRows.indexOf(r) !== -1;
        var off = dropT > 0 ? dropFrom[r] * dropK : 0;
        for (c = 0; c < COLS; c++) {
          var v = board[r][c];
          if (!v) continue;
          var x = FX + c * CELL, y = rowY(r) - off;
          if (clearing) {
            // the row folds: it squashes toward its middle until it is a rule
            var hh = CELL * (1 - clearProg);
            drawBlock(x, y + (CELL - hh) / 2, CELL, hh, cellType(v), cellGrain(v));
          } else if (landT > 0 && isLanding(c, r)) drawBlock(x, y + 1, CELL, CELL - 1, cellType(v), cellGrain(v));
          else drawBlock(x, y, CELL, null, cellType(v), cellGrain(v));
        }
        if (clearing) {
          ctx.fillStyle = clearKind === "mystery" ? pal.ochre : pal.sageDeep;
          ctx.globalAlpha = 0.35 + 0.65 * clearProg;
          ctx.fillRect(FX + 2, rowY(r) + CELL / 2 - 1, FW - 4, 2);
          ctx.globalAlpha = 1;
        }
      }

      // hard-drop trail: a faint streak down each column the toy fell through
      if (trail) {
        var tp = PIECES[trail.t], tc = tp.rots[trail.rot], tops = [-1, -1, -1, -1];
        for (i = 0; i < tc.length; i++) { if (tops[tc[i][0]] < 0 || tc[i][1] < tops[tc[i][0]]) tops[tc[i][0]] = tc[i][1]; }
        ctx.fillStyle = pal.alpha(pieceColor(trail.t), 0.22 * clamp(trail.life / 9, 0, 1));
        for (i = 0; i < 4; i++) {
          if (tops[i] < 0) continue;
          var y0 = rowY(trail.from + tops[i]), y1 = rowY(trail.to + tops[i]);
          ctx.fillRect(FX + (trail.x + i) * CELL + 5, y0, CELL - 10, y1 - y0);
        }
      }

      if (piece) {
        var cells = PIECES[piece.type].rots[piece.rot], gy = landingY();
        // ghost: an empty ink-outlined block where the toy will land
        if (gy !== piece.y) {
          for (i = 0; i < cells.length; i++) {
            var gx = FX + (piece.x + cells[i][0]) * CELL, gyy = rowY(gy + cells[i][1]);
            draw.box(ctx, gx + 2.5, gyy + 2.5, CELL - 5, CELL - 5, 4, { stroke: pal.alpha(pal.ink, pal.isDark ? 0.5 : 0.42), lineWidth: 1.3 });
          }
        }
        for (i = 0; i < cells.length; i++) {
          drawBlock(FX + (piece.x + cells[i][0]) * CELL, rowY(piece.y + cells[i][1]), CELL, null, piece.type, (piece.g + i * 3) & 7, { shadow: true });
        }
        if (piece.type === MYSTERY && !reduce) {
          var mx = FX + piece.x * CELL + CELL / 2, my = rowY(piece.y) + CELL / 2;
          draw.circle(ctx, mx, my, CELL * 0.72 + Math.sin(time * 0.12) * 1.5, { stroke: pal.alpha(pal.ochre, 0.6), lineWidth: 1.3 });
        }
      }
      ctx.restore();

      // overflow: a soft wash drawn down over the stack like a blanket;
      // lights out: the room dims
      if (state === "dying" || (state === "gameover" && endReason)) {
        var frac = state === "gameover" || reduce ? 1 : clamp(1 - overT / OVER_FRAMES, 0, 1);
        if (endReason === "time") {
          ctx.fillStyle = pal.alpha(pal.fieldInk, 0.42 * frac);
          ctx.fillRect(FX, FY, FW, FH);
          draw.label(ctx, "Lights out", FX + FW / 2, FY + FH * 0.4, { font: "display", size: 30, color: pal.alpha(pal.onInk, frac), weight: 500 });
        } else {
          var covered = Math.min(FH, Math.ceil(frac * FH * 1.2));
          ctx.fillStyle = pal.alpha(pal.surface, 0.62);
          ctx.fillRect(FX, FY, FW, covered);
        }
      }

      // room progress along the bin's floor
      if (state === "running" || state === "paused") {
        var prog = story.progress(lines);
        ctx.fillStyle = pal.alpha(pal.forest, 0.55);
        ctx.fillRect(FX + 2, FY + FH - 3, (FW - 4) * prog, 2);
      }
    }

    function shelfLabel(text, y) {
      draw.label(ctx, text.toUpperCase(), PX + 6, y, { size: 10, weight: 600, color: pal.inkMuted, align: "left", tracking: "1px" });
    }
    function shelfRule(y) {
      // a shelf plank: a rule with two little brackets underneath
      ctx.fillStyle = pal.alpha(pal.ink, pal.isDark ? 0.45 : 0.4);
      ctx.fillRect(PX + 2, y, PW - 4, 1.5);
      ctx.fillRect(PX + 10, y + 1.5, 1.5, 4);
      ctx.fillRect(PX + PW - 11.5, y + 1.5, 1.5, 4);
    }
    function drawShelf() {
      var cx = PX + PW / 2;
      shelfLabel("Next", 18);
      var nx = upcoming(3);
      if (nx.length) drawPreview(nx[0], cx, 56, 20, 1);
      shelfRule(88);
      if (nx[1] != null) drawPreview(nx[1], cx, 114, 14, 0.9);
      shelfRule(136);
      if (nx[2] != null) drawPreview(nx[2], cx, 160, 14, 0.9);
      shelfRule(182);

      shelfLabel("Hold", 204);
      if (holdType >= 0) drawPreview(holdType, cx, 240, 20, canHold ? 1 : 0.4);
      shelfRule(272);

      shelfLabel("Lines", 294);
      draw.label(ctx, String(lines || 0), PX + 6, 320, { font: "display", size: 26, color: pal.ink, align: "left" });
      shelfRule(340);
      shelfLabel("Level", 362);
      draw.label(ctx, String(level || 1), PX + 6, 388, { font: "display", size: 26, color: pal.forest, align: "left" });
      shelfRule(408);
      shelfLabel("Mode", 430);
      draw.label(ctx, MODES[mode].label, PX + 6, 452, { font: "display", size: 18, color: pal.ink, align: "left" });
      if (mode === "bedtime") draw.label(ctx, fmtTime(timeLeft), PX + PW - 6, 452, { size: 12, weight: 600, color: timeLeft <= 600 ? pal.clayText : pal.inkSoft, align: "right" });

      // live chain readouts along the bottom
      var by = 478;
      if (state === "running" && combo.mult() > 1) {
        draw.label(ctx, "Combo ×" + combo.mult(), PX + 6, by, { size: 11, weight: 600, color: pal.forest, align: "left" });
      }
      if (state === "running" && b2b) {
        draw.label(ctx, "B2B", PX + PW - 6, by, { size: 11, weight: 700, color: pal.research, align: "right" });
      }
    }

    function render() {
      cv.begin(camera);
      draw.paper(ctx, W, H, pal, { step: 12, dot: 0.8 });
      drawBin();
      drawField();
      drawShelf();
      particles.render(ctx);
      floaters.render(ctx);

      // room banner across the top of the bin
      var bn = story.banner();
      if (bn && state === "running") {
        var a = Math.min(1, bn.frac * 3) * Math.min(1, (1 - bn.frac) * 6 + 0.2);
        ctx.save(); ctx.globalAlpha = a;
        var ty = FY + 52 + (reduce ? 0 : (1 - Math.min(1, (1 - bn.frac) * 4)) * -10);
        draw.box(ctx, FX + 18, ty - 24, FW - 36, 56, 6, { fill: pal.alpha(pal.surface, 0.94), stroke: pal.rule, lineWidth: 1 });
        draw.label(ctx, bn.name, FX + FW / 2, ty - 4, { font: "display", size: 26, color: pal.ink, weight: 500 });
        draw.label(ctx, bn.text, FX + FW / 2, ty + 18, { size: 11, color: pal.inkMuted, weight: 500, maxWidth: FW - 48 });
        ctx.restore();
      }
      cv.end();
    }

    var loop = A.makeLoop(tick, render);
    function onHidden() { if (state === "running") pause(); }

    function applyLines() {
      level = Math.min(MAX_LEVEL, 1 + Math.floor(lines / 10));
      story.advance(lines);
      while (lines >= nextMystery) { nextMystery += MYSTERY_EVERY; grantMystery(); }
      syncHud();
    }

    A.debug("blocks", {
      state: function () { return state; },
      score: function () { return score; },
      info: function () { return { mode: mode, lines: lines, level: level, chapter: CHAPTERS[story.index()].name, b2b: b2b, timeLeft: Math.ceil(timeLeft / 60), mysteryPending: mysteryPending, piece: piece ? PIECES[piece.type].id : null, hold: holdType >= 0 ? PIECES[holdType].id : null }; },
      start: function (m) { if (m && MODES[m]) { mode = m; saveMode(m); } start(); },
      addLines: function (n) { lines += n || 10; applyLines(); },
      grant: function (id) {
        if (id === "mystery") grantMystery();
        else { powers.grant(id); if (POWERUPS[id]) shell.toast(POWERUPS[id].label + ": " + POWERUPS[id].text, 1600); }
      },
      // Fill the bottom rows with blocks, one random gap per row.
      fill: function (rows) {
        rows = clamp(rows || 8, 1, ROWS - 4);
        for (var r = TOTAL - rows; r < TOTAL; r++) {
          var gap = Math.floor(Math.random() * COLS);
          for (var c = 0; c < COLS; c++) board[r][c] = c === gap ? 0 : ((Math.floor(Math.random() * 7) + 1) | (Math.floor(Math.random() * 8) << 4));
        }
        if (piece && !fits(piece.type, piece.rot, piece.x, piece.y)) piece.y = Math.max(0, piece.y - rows);
      },
      timeLeft: function (sec) { if (sec != null) timeLeft = sec * 60; return Math.ceil(timeLeft / 60); },
      gameOver: function () { if (state === "running" || state === "paused") { endReason = endReason || "overflow"; piece = null; } gameOver(); }
    });

    return {
      held: input.held,
      activate: function () {
        pal = A.theme();
        cv.fit();
        mode = readMode();
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
        gesture = null;
        state = "idle";
      },
      onKeydown: function (e) { if (input.onKeydown(e)) e.preventDefault(); },
      onKeyup: function (e) { input.onKeyup(e); },
      // The phone turned: a run pauses while the field refits.
      onViewport: function () { pause(); },
      destroy: function () { offTheme(); input.destroy(); }
    };
  }

  // ======================================================================
  //  Overlay
  // ======================================================================
  A.ready(function () {
    A.defineGame("blocks", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Tidy Up",
        tagline: "Clean-up time in the playroom.",
        label: "Tidy Up game",
        canvas: { w: W, h: H, label: "Tidy Up play field. Left and right arrows move, Up turns, Down drops faster, Space drops, C holds, P pauses." },
        hud: [
          { id: "score", label: "Score", value: 0 },
          { id: "best", label: "Best", value: A.leaderboard.best(GAME_KEY) },
          { id: "time", label: "Time", value: "2:00" },
          { id: "room", label: "Room", value: "Blocks" }
        ],
        help: "← → move · ↑ turn · ↓ soft drop · Space drop · C hold · tap turns, drag slides, flick down drops, flick up holds · P pauses · M mutes · Esc closes",
        touch: [
          { id: "left", label: "◀", aria: "Move left", alsoTap: true },
          { id: "rotate", label: "Turn", aria: "Turn", tap: true },
          { id: "down", label: "▼", aria: "Soft drop", alsoTap: true },
          { id: "right", label: "▶", aria: "Move right", alsoTap: true },
          { id: "drop", label: "Drop", aria: "Hard drop", tap: true },
          { id: "hold", label: "Hold", aria: "Hold this block", tap: true }
        ]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
