/* Growing Minds Science — maze-game.js
   "Crumb Chase" — an arcade-only maze chase on the /arcade page.

   Trigger: the Crumb Chase card's Play button on the arcade page
   ([data-arcade-game="maze"]). Opening tears the page away (GMSArcade) then
   shows the game. After snack time the playroom floor is covered in crumbs:
   you're the little sprout, sweeping up every one while fluffy dust bunnies
   drift through the room. Brush into a bunny and you sneeze (that costs one
   of three tries). Grab a broom and for a few seconds the bunnies get shy —
   sweep them up for a chain bonus and they puff back to the toy chest to
   reform. Clear every crumb to move on to the next, slightly busier level.

   Built on window.GMSArcade (arcade-core.js) for the page-tear, the local
   leaderboard, and the initials entry. Self-contained otherwise: own overlay
   DOM, own rAF loop, full teardown on close. CSP-safe (no eval, no external
   assets; audio is Web Audio oscillator synth). Honors prefers-reduced-motion.

   Mobile (shared toolkit): touch lands anywhere on the stage, not just the
   canvas; a swipe steers, a held finger re-steers swipe-by-swipe; D-pad row
   on touch screens; wake lock while open; auto-pause on tab-hide; haptics
   degrade to no-ops.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A) return;

  var GAME_KEY = "crumb-chase";
  var MUTE_KEY = "gms-maze-muted";

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
  var CRUMB = "#A9794C";       // toasted crumb brown — reads against every wall tint
  var CHEEK = "#F4A48E";
  var CHEST_INNER = "#E8DDC6";
  var SHY_BODY = "#D8CEF0";    // pale lilac
  var SHY_MOUTH = "#7E6FA8";
  var STRAW = "#F1C85B";
  var WOOD = "#8B5E34";
  // Wall tints cycle per level, like a different rug in each room:
  // fill, lit rim, shaded rim, rug-edge stitching.
  var WALL_TINTS = [
    { fill: "#A9D8C1", rim: "#CDEBDB", shade: "#8CC4AA", stitch: "#8CC4AA" }, // sage (muted LEAF_SIDE)
    { fill: "#DEC9A3", rim: "#EFE1C6", shade: "#C6AB80", stitch: "#C6AB80" }, // warm wood
    { fill: "#BCD6EC", rim: "#DCEAF6", shade: "#9ABEDD", stitch: "#9ABEDD" }  // sky
  ];
  var FLASH_TINT = { fill: "#FFFBF2", rim: "#FFFFFF", shade: "#EDE3CF", stitch: "#EDE3CF" };

  // ---------- Maze ----------
  // '#' wall · '.' crumb · 'o' broom · ' ' bare floor · '-' toy-chest door
  // (bunnies pass, the sprout can't) · 'P' sprout start · 'B' bunny start
  // inside the chest. Row 10 is open edge-to-edge: a wrap-around tunnel.
  var MAZE = [
    "###################",
    "#........#........#",
    "#o##.###.#.###.##o#",
    "#.................#",
    "#.##.#.#####.#.##.#",
    "#....#...#...#....#",
    "#.##.###.#.###.##.#",
    "#.##.#.......#.##.#",
    "#....#.##-##.#....#",
    "####.#.# B #.#.####",
    "    . .#BBB#. .    ",
    "####.#.#####.#.####",
    "#....#.#####.#....#",
    "#.##..... .....##.#",
    "#.##.###.#.###.##.#",
    "#o.#.....P.....#.o#",
    "##.#.#.#####.#.#.##",
    "#....#...#...#....#",
    "#.##.###.#.###.##.#",
    "#.................#",
    "###################"
  ];
  var TILE = 8;
  var COLS = MAZE[0].length, ROWS = MAZE.length;
  var MAZE_W = COLS * TILE, MAZE_H = ROWS * TILE;
  var TOP_BAND = 8, BOTTOM_BAND = 10; // shy meter above; tries + level snacks below
  var W = MAZE_W, H = TOP_BAND + MAZE_H + BOTTOM_BAND;
  var CARVE = 2;          // floor bleeds this far into walls so corridors read roomier than a tile
  var TUNNEL_ROW = 10;
  var SNACK_TILE = { c: 9, r: 13 }; // bare floor just under the toy chest
  var TURN_TOL = 3;       // px before/after a tile centre where a buffered turn still takes
  var DIRS = [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }]; // tie-break order

  // Timings (frames at 60fps)
  var READY_FRAMES = 96, READY_AFTER_SNEEZE = 72;
  var DEATH_FRAMES = 72, CHOO_AT = 18;
  var CLEAR_FRAMES = 132, CLEAR_HOLD = 30, CLEAR_FLASH = 12;
  var SNACK_FRAMES = 540, SHY_BLINK = 90;
  var EXTRA_AT = 10000;
  // Pen release: crumbs eaten this try OR frames since the try began.
  var RELEASE_CRUMBS = [0, 4, 30, 60];
  var RELEASE_FRAMES = [0, 150, 480, 840];

  // Four dust bunnies. `spot` indexes the 'B' tiles in reading order.
  var BUNNY_DEFS = [
    { body: "#CDD1D6", shade: "#AAB1BA", corner: { c: COLS - 3, r: -3 }, spot: 0 },       // Dusty — follows you
    { body: "#F0B6C6", shade: "#D993A8", corner: { c: 2, r: -3 }, spot: 2 },              // Rosie — heads you off
    { body: "#B3D1EE", shade: "#8FB5DB", corner: { c: COLS - 1, r: ROWS + 1 }, spot: 1 }, // Skye — sneaks round the side
    { body: WARM, shade: "#BCA27A", corner: { c: 0, r: ROWS + 1 }, spot: 3 }             // Toffee — easily distracted
  ];

  // ---------- Sprite shapes: row spans [dy, x0, x1] around the tile centre ----------
  var HEAD_ROWS = [[-3, -2, 1], [-2, -3, 2], [-1, -4, 3], [0, -4, 3], [1, -4, 3], [2, -3, 2], [3, -2, 1]];
  var HEAD_SQUASH = [[-2, -3, 2], [-1, -4, 3], [0, -5, 4], [1, -5, 4], [2, -4, 3], [3, -3, 2]];
  var LEAF_ROWS = [[-6, 0, 2], [-5, 0, 1]];
  var BUNNY_ROWS = [
    [-6, -3, -3], [-6, 2, 2], [-5, -3, -3], [-5, 2, 2], [-4, -3, -2], [-4, 1, 2], // tall ears
    [-3, -3, 2], [-2, -4, 3], [-1, -4, 3], [0, -4, 3], [1, -4, 3], [2, -4, 3]
  ];
  var FRINGE_A = [[3, -4, -3], [3, -1, 0], [3, 2, 3]];
  var FRINGE_B = [[3, -3, -2], [3, 0, 1]];
  var PUFF_ROWS = [[-2, -2, 1], [-1, -3, 2], [0, -4, 3], [1, -3, 2]];
  var BROOM_ROWS = [[-1, -2, 0], [0, -3, 1], [1, -3, 1], [2, -4, 2]];
  var APPLE_ROWS = [[-3, -3, 2], [-2, -4, 3], [-1, -4, 3], [0, -4, 3], [1, -3, 2], [2, -2, 1]];
  var APPLE_FLESH = [[-3, -3, 2], [-2, -3, 2], [-1, -3, 2], [0, -2, 1]];
  var CRACKER_ROWS = [[-3, -3, 2], [-2, -3, 2], [-1, -3, 2], [0, -3, 2], [1, -3, 2], [2, -3, 2]];
  var MINI_HEAD = [[-2, -2, 1], [-1, -3, 2], [0, -3, 2], [1, -2, 1]];
  var MINI_APPLE = [[-2, -3, 2], [-1, -3, 2], [0, -3, 2], [1, -2, 1]];
  var MINI_CRACKER = [[-2, -2, 1], [-1, -2, 1], [0, -2, 1], [1, -2, 1]];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function blockyRect(ctx, x, y, w, h, fill) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // Chunky outlined sprite from row spans. Each pass is ONE path so the rows
  // rasterize as a single shape — no hairline seams between rows when the
  // backing store scale is fractional. The INK pass is the fill dilated 1px.
  function blob(ctx, cx, cy, rows, fill) {
    var i, r;
    ctx.fillStyle = INK;
    ctx.beginPath();
    for (i = 0; i < rows.length; i++) { r = rows[i]; ctx.rect(cx + r[1] - 1, cy + r[0] - 1, r[2] - r[1] + 3, 3); }
    ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (i = 0; i < rows.length; i++) { r = rows[i]; ctx.rect(cx + r[1], cy + r[0], r[2] - r[1] + 1, 1); }
    ctx.fill();
  }

  // ---------- Grid helpers ----------
  var BASE = (function () {
    var walls = [], pellets = [], spots = [], start = null, door = null, total = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var ch = MAZE[r].charAt(c), i = r * COLS + c;
        walls[i] = ch === "#" ? 1 : ch === "-" ? 2 : 0;
        pellets[i] = ch === "." ? 1 : ch === "o" ? 2 : 0;
        if (pellets[i]) total++;
        if (ch === "P") start = { c: c, r: r };
        else if (ch === "B") spots.push({ c: c, r: r });
        else if (ch === "-") door = { c: c, r: r };
      }
    }
    return { walls: walls, pellets: pellets, spots: spots, start: start, door: door, total: total };
  })();
  var DOOR = BASE.door;
  var EXIT = { c: DOOR.c, r: DOOR.r - 1 };                                   // tile just above the door
  var CHEST = { c0: DOOR.c - 2, c1: DOOR.c + 2, r0: DOOR.r, r1: DOOR.r + 3 }; // the pen's box of tiles

  function tileOf(v) { return Math.floor(v / TILE); }
  function centerOf(t) { return t * TILE + TILE / 2; }
  function wrapX(x) { return x < 0 ? x + MAZE_W : x >= MAZE_W ? x - MAZE_W : x; }
  function wallAt(c, r) {
    if (r < 0 || r >= ROWS) return 1;
    c = ((c % COLS) + COLS) % COLS; // only the tunnel row is open at the edges
    return BASE.walls[r * COLS + c];
  }
  function openFor(c, r, doorOk) { var w = wallAt(c, r); return w === 0 || (w === 2 && !!doorOk); }
  function approach(v, t, s) { return Math.abs(t - v) <= s ? t : v + (t > v ? s : -s); }
  function hexRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }

  // Shortest-path distances to the chest exit, for swept bunnies puffing home.
  var HOME_DIST = (function () {
    var dist = [], q = [], i;
    for (i = 0; i < COLS * ROWS; i++) dist[i] = Infinity;
    var s = EXIT.r * COLS + EXIT.c;
    dist[s] = 0; q.push(s);
    for (var h = 0; h < q.length; h++) {
      var cur = q[h], c = cur % COLS, r = (cur - c) / COLS;
      for (var k = 0; k < 4; k++) {
        var nc = c + DIRS[k].x, nr = r + DIRS[k].y;
        if (!openFor(nc, nr, false)) continue;
        var ni = nr * COLS + ((nc + COLS) % COLS);
        if (dist[ni] !== Infinity) continue;
        dist[ni] = dist[cur] + 1;
        q.push(ni);
      }
    }
    return dist;
  })();

  // ---------- Wall art (built once per tint, drawn as one image) ----------
  // Material per tile: 0 floor, 1 wall, 2 toy chest (drawn separately).
  function tileMat(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return 0; // outside = floor, so the room gets a frame
    if (c >= CHEST.c0 && c <= CHEST.c1 && r >= CHEST.r0 && r <= CHEST.r1) return 2;
    return BASE.walls[r * COLS + c] === 1 ? 1 : 0;
  }
  // A wall pixel stays wall unless a floor tile lies within CARVE px (square
  // neighbourhood). Neighbouring wall tiles therefore merge into one block
  // with no inner borders, and every corridor is 12px wide to the eye.
  var WALL_MASK = (function () {
    var mask = [];
    for (var y = 0; y < MAZE_H; y++) {
      for (var x = 0; x < MAZE_W; x++) {
        var m = tileMat(tileOf(x), tileOf(y));
        if (m && (!tileMat(tileOf(x - CARVE), tileOf(y - CARVE)) || !tileMat(tileOf(x + CARVE), tileOf(y - CARVE)) ||
                  !tileMat(tileOf(x - CARVE), tileOf(y + CARVE)) || !tileMat(tileOf(x + CARVE), tileOf(y + CARVE)))) m = 0;
        mask.push(m);
      }
    }
    return mask;
  })();
  // Chebyshev distance of each wall pixel to the nearest non-wall pixel:
  // 1 = INK outline, 2 = bevel rim, 4 = rug-edge stitching.
  var WALL_DIST = (function () {
    var n = MAZE_W * MAZE_H, d = [], q = [], i;
    for (i = 0; i < n; i++) {
      if (WALL_MASK[i] === 1) d.push(-1);
      else { d.push(0); q.push(i); }
    }
    for (var h = 0; h < q.length; h++) {
      var cur = q[h], x = cur % MAZE_W, y = (cur - x) / MAZE_W;
      for (var oy = -1; oy <= 1; oy++) {
        for (var ox = -1; ox <= 1; ox++) {
          var nx = x + ox, ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= MAZE_W || ny >= MAZE_H) continue;
          var ni = ny * MAZE_W + nx;
          if (d[ni] !== -1) continue;
          d[ni] = d[cur] + 1;
          q.push(ni);
        }
      }
    }
    return d;
  })();

  function drawChest(g) {
    var x0 = CHEST.c0 * TILE + CARVE, x1 = (CHEST.c1 + 1) * TILE - CARVE;
    var y0 = CHEST.r0 * TILE + CARVE;
    var y1 = (CHEST.r1 + 1) * TILE - (tileMat(DOOR.c, CHEST.r1 + 1) ? 0 : CARVE);
    // wooden box
    g.fillStyle = INK; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = WARM; g.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
    g.fillStyle = "#E9D8B6"; g.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, 1);
    // the cosy inside where the bunnies nap
    var ix0 = (CHEST.c0 + 1) * TILE - CARVE, ix1 = CHEST.c1 * TILE + CARVE;
    var iy0 = (CHEST.r0 + 1) * TILE - CARVE, iy1 = CHEST.r1 * TILE + CARVE;
    g.fillStyle = INK; g.fillRect(ix0 - 1, iy0 - 1, ix1 - ix0 + 2, iy1 - iy0 + 2);
    g.fillStyle = CHEST_INNER; g.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
    // door gap in the lid with a soft ribbon the bunnies slip under
    var dx0 = DOOR.c * TILE - CARVE, dx1 = (DOOR.c + 1) * TILE + CARVE;
    g.fillStyle = CHEST_INNER; g.fillRect(dx0, y0, dx1 - dx0, iy0 - y0);
    g.fillStyle = INK; g.fillRect(dx0 - 1, y0, 1, iy0 - y0); g.fillRect(dx1, y0, 1, iy0 - y0);
    g.fillStyle = BRAIN; g.fillRect(dx0, y0 + 1, dx1 - dx0, 2);
    // latch + corner brackets
    var mx = DOOR.c * TILE + TILE / 2;
    g.fillStyle = INK; g.fillRect(mx - 2, iy1 + 1, 4, 3);
    g.fillStyle = BRAIN; g.fillRect(mx - 1, iy1 + 2, 2, 1);
    g.fillStyle = "#9C7A52";
    g.fillRect(x0 + 1, y1 - 3, 2, 2); g.fillRect(x1 - 3, y1 - 3, 2, 2);
  }

  function buildWallArt(tint) {
    var cv = document.createElement("canvas");
    cv.width = MAZE_W; cv.height = MAZE_H;
    var g = cv.getContext("2d");
    var img = g.createImageData(MAZE_W, MAZE_H), px = img.data;
    var ink = hexRgb(INK), fill = hexRgb(tint.fill), rim = hexRgb(tint.rim);
    var shade = hexRgb(tint.shade), stitch = hexRgb(tint.stitch);
    for (var y = 0; y < MAZE_H; y++) {
      for (var x = 0; x < MAZE_W; x++) {
        var i = y * MAZE_W + x;
        if (WALL_MASK[i] !== 1) continue;
        var d = WALL_DIST[i], col = fill;
        if (d === 1) col = ink;
        else if (d === 2) col = (y + 2 >= MAZE_H || WALL_MASK[i + 2 * MAZE_W] !== 1) ? shade : rim; // lit from above
        else if (d === 4 && ((x + y) & 3) < 2) col = stitch;
        px[i * 4] = col[0]; px[i * 4 + 1] = col[1]; px[i * 4 + 2] = col[2]; px[i * 4 + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    drawChest(g);
    return cv;
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
    // Shared juice: crisp shake + hit-stop, and a munch streak that drives the
    // alternating crumb blips (not the score — that stays easy to read).
    // Audio-mute is deliberately independent of reduced-motion.
    var camera = A.makeCamera({ reduce: reduce, maxPx: 3 });
    var combo = A.makeCombo({ window: 26, max: 5 });
    var wake = A.makeWakeLock();
    var offHidden = null;

    var state = "idle"; // idle | running | paused | gameover
    var player, bunnies, pellets, pelletsLeft, level, lives, score, extraGiven;
    var eatenThisLevel, crumbsThisTry, releaseClock;
    var shyTimer, chain, phaseIdx, phaseTimer, snackTimer;
    var readyTimer, readyLabel, deathTimer, clearTimer, sneezeDir;
    var particles, floaters, tickCount;
    var wallArt = null, flashArt = null, artCache = [];
    var PARTICLE_CAP = 40, FLOATER_CAP = 10;

    // Speeds in px/frame at 60fps.
    function playerSpeed() { return Math.min(1.0, 0.8 + (level - 1) * 0.04); }
    function bunnySpeed() { return Math.min(0.96, 0.72 + (level - 1) * 0.05); }
    function tunnelSpeed() { return 0.42 + Math.min(4, level - 1) * 0.03; }
    function shySpeed() { return 0.45 + Math.min(4, level - 1) * 0.02; }
    var PUFF_SPEED = 2.4, PEN_SPEED = 0.5;
    function shyFrames() { return Math.max(150, 360 - (level - 1) * 45); }

    // Wander (to their corners) and chase phases alternate; even = wander.
    function phaseLength(idx) {
      var wander = level === 1 ? [420, 420, 300, 300] : [360, 360, 240, 120];
      var chase = [1200, 1200, 1200, Infinity];
      var k = Math.floor(idx / 2);
      if (k > 3) return Infinity;
      return idx % 2 === 0 ? wander[k] : chase[k];
    }
    function wandering() { return phaseIdx % 2 === 0; } // the endless last phase is a chase

    function artFor(lv) {
      var idx = (lv - 1) % WALL_TINTS.length;
      if (!artCache[idx]) artCache[idx] = buildWallArt(WALL_TINTS[idx]);
      return artCache[idx];
    }

    function buildLevel() {
      pellets = BASE.pellets.slice();
      pelletsLeft = BASE.total;
      eatenThisLevel = 0;
      snackTimer = 0;
      wallArt = artFor(level);
      if (!flashArt) flashArt = buildWallArt(FLASH_TINT);
    }

    function resetActors() {
      var s = BASE.start;
      player = {
        x: centerOf(s.c), y: centerOf(s.r), dx: 0, dy: 0,
        faceX: -1, faceY: 0, wantX: 0, wantY: 0, moving: false, walkT: 0
      };
      bunnies = [];
      for (var i = 0; i < BUNNY_DEFS.length; i++) {
        var spot = BASE.spots[BUNNY_DEFS[i].spot];
        bunnies.push({
          i: i, x: centerOf(spot.c), y: centerOf(spot.r), dx: 0, dy: 0,
          mode: "pen", released: false, shy: false, rest: 0
        });
      }
      shyTimer = 0; chain = 0;
      phaseIdx = 0; phaseTimer = phaseLength(0);
      releaseClock = 0; crumbsThisTry = 0;
    }

    function resetWorld() {
      level = 1; lives = 3; score = 0; extraGiven = false;
      deathTimer = 0; clearTimer = 0;
      readyTimer = READY_FRAMES; readyLabel = "READY!";
      sneezeDir = { x: -1, y: 0 };
      combo.reset(true);
      particles = particles || []; floaters = floaters || [];
      particles.length = 0; floaters.length = 0;
      tickCount = 0;
      buildLevel();
      resetActors();
    }

    // ---------- Audio (shared GMSArcade synth: compressor + noise + arp) ----------
    var audio = A.makeSynth({ muteKey: MUTE_KEY });
    function ensureAudio() { audio.ensure(); }
    var sfx = {
      // two soft alternating notes while a munch streak lasts
      munch: function (alt) { audio.beep(alt ? 392 : 494, alt ? 349 : 440, 0.045, "triangle", 0.16); },
      broom: function () {
        audio.beep(330, 990, 0.22, "triangle", 0.32);
        audio.arp([523, 659, 784], 0.05, 0.12, "sine", 0.22);
      },
      // each bunny in one broom's chain climbs a step
      sweep: function (step) {
        var b = Math.pow(1.12, Math.max(1, step) - 1);
        audio.arp([659 * b, 784 * b, 988 * b, 1318 * b], 0.045, 0.12, "triangle", 0.38);
      },
      snack: function () { audio.arp([784, 1046, 1318], 0.06, 0.14, "triangle", 0.4); },
      ah: function () { audio.beep(440, 700, 0.22, "sine", 0.28); },
      choo: function () { audio.noise(0.3, 1800, 0.42, 1); audio.beep(620, 170, 0.32, "sine", 0.28); },
      level: function () { audio.arp([523, 659, 784, 1046, 1318], 0.07, 0.2, "triangle", 0.5); },
      extra: function () { audio.arp([659, 784, 988, 1318], 0.06, 0.16, "triangle", 0.4); },
      start: function () { audio.arp([392, 523, 659], 0.08, 0.14, "triangle", 0.32); }
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
        var a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 1.2;
        spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 10 + Math.random() * 8, color, 2);
      }
    }
    function spawnFloater(x, y, text, color) {
      if (reduce) return;
      var f;
      for (var i = 0; i < floaters.length; i++) { if (floaters[i].life <= 0) { f = floaters[i]; break; } }
      if (!f) { if (floaters.length >= FLOATER_CAP) return; f = {}; floaters.push(f); }
      f.x = x; f.y = y; f.life = 40; f.maxLife = 40; f.text = text; f.color = color;
    }
    // A couple of crumbs flicked up by each munch — tiny, quick, sells the bite.
    function spawnCrumbs(cx, cy) {
      if (reduce) return;
      for (var i = 0; i < 2; i++) {
        spawnParticle(cx, cy, (Math.random() * 2 - 1) * 0.7, -0.3 - Math.random() * 0.5, 7 + Math.random() * 3, CRUMB, 1);
      }
    }
    // The sneeze itself: a soft misty cloud puffed out the way the sprout faces.
    function spawnSneezeCloud() {
      if (reduce) return;
      var fx = sneezeDir.x, fy = sneezeDir.y;
      if (!fx && !fy) fy = -1;
      var cx = player.x + fx * 4, cy = player.y + TOP_BAND + fy * 4 - 1;
      for (var i = 0; i < 12; i++) {
        var sp = 0.5 + Math.random() * 1.1, spread = (Math.random() * 2 - 1) * 0.7;
        spawnParticle(cx, cy, fx * sp + (fy ? spread : 0), fy * sp + (fx ? spread : 0),
          18 + Math.random() * 14, i % 3 ? "#FFFFFF" : "#D9D0EE", 3);
      }
    }

    // ---------- Lifecycle ----------
    function start() {
      resetWorld(); state = "running"; hidePrompt();
      ensureAudio(); sfx.start();
    }

    // Auto-pause must never cost a try: tick() is gated on "running", so the
    // bunnies, shy timer, and sneeze countdown all freeze with the state.
    function pause() {
      if (state !== "running") return;
      state = "paused";
      showPaused();
    }
    function resume() {
      if (state !== "paused") return;
      state = "running";
      hidePrompt();
      lastTime = 0; // hidden tabs stall rAF — don't let the first dt span the pause
    }

    function addScore(pts) {
      score += pts;
      if (!extraGiven && score >= EXTRA_AT) {
        extraGiven = true;
        lives++;
        spawnFloater(player.x, player.y + TOP_BAND - 10, "+1 try", LEAF_SIDE);
        ensureAudio(); sfx.extra();
        A.haptics.pop();
      }
    }

    function startSneeze() {
      lives--;
      deathTimer = DEATH_FRAMES;
      sneezeDir = { x: player.faceX, y: player.faceY };
      combo.reset();
      ensureAudio(); sfx.ah();
      A.haptics.crash();
      camera.freeze(8); // hit-stop on contact (not motion, so it stays for reduced-motion)
    }
    // The "choo!" beat of the sneeze animation: sound, shake, misty puff.
    function achoo() {
      ensureAudio(); sfx.choo();
      camera.shake(0.55);
      spawnSneezeCloud();
    }
    function afterDeath() {
      if (lives <= 0) {
        state = "gameover";
        showEnd(Math.floor(score));
        return;
      }
      resetActors();
      readyTimer = READY_AFTER_SNEEZE; readyLabel = "READY!";
    }

    function startShy() {
      shyTimer = shyFrames();
      chain = 0;
      for (var i = 0; i < bunnies.length; i++) {
        var b = bunnies[i];
        if (b.mode === "puff" || b.mode === "enter") continue;
        b.shy = true;
        if (b.mode === "roam") { b.dx = -b.dx; b.dy = -b.dy; } // startled: turn tail
      }
    }

    function sweepBunny(b) {
      chain++;
      var pts = 200 * Math.pow(2, Math.min(chain, 4) - 1); // 200 / 400 / 800 / 1600
      addScore(pts);
      b.mode = "puff"; b.shy = false;
      spawnBurst(b.x, b.y + TOP_BAND, BUNNY_DEFS[b.i].body, 10);
      spawnFloater(b.x, b.y + TOP_BAND - 6, String(pts), LEAF_SIDE);
      camera.shake(0.2); camera.freeze(10);
      ensureAudio(); sfx.sweep(chain);
      A.haptics.pop();
    }

    function levelClear() {
      var bonus = 500 * level;
      addScore(bonus);
      clearTimer = reduce ? 48 : CLEAR_FRAMES;
      shyTimer = 0; snackTimer = 0;
      for (var i = 0; i < bunnies.length; i++) bunnies[i].shy = false;
      spawnFloater(W / 2, TOP_BAND + centerOf(SNACK_TILE.r), "+" + bonus, BRAIN);
      camera.freeze(8);
      ensureAudio(); sfx.level();
      A.haptics.win();
    }
    function nextLevel() {
      level++;
      buildLevel();
      resetActors();
      // floaters are off under reduced motion, so the ready card names the level instead
      readyTimer = READY_FRAMES; readyLabel = reduce ? "LEVEL " + level : "READY!";
      spawnFloater(W / 2, TOP_BAND + centerOf(EXIT.r), "Level " + level, LEAF_SIDE);
    }

    function eatAt(c, r) {
      var i = r * COLS + c, kind = pellets[i];
      if (kind) {
        pellets[i] = 0;
        pelletsLeft--; eatenThisLevel++; crumbsThisTry++;
        if (kind === 1) {
          addScore(10);
          combo.hit();
          ensureAudio(); sfx.munch(combo.count() % 2 === 0);
          spawnCrumbs(centerOf(c), centerOf(r) + TOP_BAND);
        } else {
          addScore(50);
          startShy();
          spawnBurst(centerOf(c), centerOf(r) + TOP_BAND, LEAF_TOP, 10);
          camera.freeze(3);
          ensureAudio(); sfx.broom();
          A.haptics.pop();
        }
        if (eatenThisLevel === 70 || eatenThisLevel === 170) snackTimer = SNACK_FRAMES;
        if (pelletsLeft <= 0) { levelClear(); return; }
      }
      if (snackTimer > 0 && c === SNACK_TILE.c && r === SNACK_TILE.r) {
        var pts = 100 * level;
        snackTimer = 0;
        addScore(pts);
        spawnFloater(centerOf(c), centerOf(r) + TOP_BAND - 6, String(pts), BRAIN);
        spawnBurst(centerOf(c), centerOf(r) + TOP_BAND, BRAIN, 8);
        ensureAudio(); sfx.snack();
        A.haptics.pop();
      }
    }

    // ---------- Input ----------
    function steer(dx, dy) {
      if (state === "idle") start();
      if (state !== "running") return;
      player.wantX = dx; player.wantY = dy; // buffered until the turn is open
    }

    // ---------- Movement ----------
    // Slide an actor `dist` px along its heading. Tile centres are exact stops:
    // the actor snaps onto each centre it reaches (so fractional speeds never
    // overshoot a turn) and `decide` picks the heading from there.
    function advance(a, dist, decide, doorOk) {
      var guard = 0;
      while (dist > 0.0001 && guard++ < 6) {
        var cx = centerOf(tileOf(a.x)), cy = centerOf(tileOf(a.y));
        if (!a.dx && !a.dy && (a.x !== cx || a.y !== cy)) { a.x = cx; a.y = cy; }
        if (a.x === cx && a.y === cy) {
          decide(a);
          if (!a.dx && !a.dy) return;
          if (!openFor(tileOf(a.x) + a.dx, tileOf(a.y) + a.dy, doorOk)) { a.dx = 0; a.dy = 0; return; }
          var step = Math.min(dist, TILE);
          if (a.dx) a.x = wrapX(a.x + a.dx * step); else a.y += a.dy * step;
          dist -= step;
        } else {
          var along = a.dx ? a.x : a.y, c0 = a.dx ? cx : cy, d = a.dx || a.dy;
          var target = (c0 - along) * d > 0 ? c0 : c0 + d * TILE;
          var toC = (target - along) * d;
          if (dist >= toC) {
            if (a.dx) a.x = wrapX(target); else a.y = target; // exact snap onto the centre
            dist -= toC;
          } else {
            if (a.dx) a.x = wrapX(a.x + a.dx * dist); else a.y += a.dy * dist;
            dist = 0;
          }
        }
      }
    }

    function decidePlayer(p) {
      var c = tileOf(p.x), r = tileOf(p.y);
      if ((p.wantX || p.wantY) && openFor(c + p.wantX, r + p.wantY, false)) { p.dx = p.wantX; p.dy = p.wantY; }
      if ((p.dx || p.dy) && !openFor(c + p.dx, r + p.dy, false)) { p.dx = 0; p.dy = 0; } // stop at walls
    }

    // Buffered steering: reverse instantly; a perpendicular turn takes as soon
    // as the player is within TURN_TOL px of a centre whose side is open.
    function applyWant(p) {
      if (!p.wantX && !p.wantY) return;
      if (p.wantX === p.dx && p.wantY === p.dy) return;
      if (!p.dx && !p.dy) return; // stopped: decidePlayer handles it at the centre
      if (p.wantX === -p.dx && p.wantY === -p.dy) { p.dx = p.wantX; p.dy = p.wantY; return; }
      var c = tileOf(p.x), r = tileOf(p.y);
      var off = p.dx ? p.x - centerOf(c) : p.y - centerOf(r);
      if (Math.abs(off) > TURN_TOL) return;
      if (!openFor(c + p.wantX, r + p.wantY, false)) return;
      p.dx = p.wantX; p.dy = p.wantY; // the leftover offset eases out below (corner cut)
    }

    function updatePlayer(dt) {
      var p = player, dist = playerSpeed() * dt;
      applyWant(p);
      // ease the cross-axis back onto the lane centre after a corner cut
      if (p.dx) p.y = approach(p.y, centerOf(tileOf(p.y)), dist);
      else if (p.dy) p.x = approach(p.x, centerOf(tileOf(p.x)), dist);
      advance(p, dist, decidePlayer, false);
      p.moving = !!(p.dx || p.dy);
      if (p.moving) { p.faceX = p.dx; p.faceY = p.dy; p.walkT += dt; }
      eatAt(tileOf(p.x), tileOf(p.y));
    }

    function targetFor(b) {
      var def = BUNNY_DEFS[b.i];
      if (wandering()) return def.corner;
      var pc = tileOf(player.x), pr = tileOf(player.y), fx = player.faceX, fy = player.faceY;
      if (b.i === 0) return { c: pc, r: pr };
      if (b.i === 1) return { c: pc + 4 * fx, r: pr + 4 * fy };
      if (b.i === 2) {
        // flank: mirror bunny 1 through the tile 2 ahead of the player
        var vc = pc + 2 * fx, vr = pr + 2 * fy, lead = bunnies[0];
        return { c: 2 * vc - tileOf(lead.x), r: 2 * vr - tileOf(lead.y) };
      }
      var dc = tileOf(b.x) - pc, dr = tileOf(b.y) - pr;
      return dc * dc + dr * dr > 64 ? { c: pc, r: pr } : def.corner;
    }

    function decideBunny(b) {
      var c = tileOf(b.x), r = tileOf(b.y), opts = [], k, d;
      for (k = 0; k < 4; k++) {
        d = DIRS[k];
        if (d.x === -b.dx && d.y === -b.dy) continue; // never double back on their own
        if (openFor(c + d.x, r + d.y, false)) opts.push(d);
      }
      if (!opts.length) { b.dx = -b.dx; b.dy = -b.dy; return; }
      var pick = opts[0];
      if (b.shy) {
        pick = opts[Math.floor(Math.random() * opts.length)];
      } else {
        var t = targetFor(b), best = Infinity;
        for (k = 0; k < opts.length; k++) {
          var tc = c + opts[k].x - t.c, tr = r + opts[k].y - t.r, dd = tc * tc + tr * tr;
          if (dd < best) { best = dd; pick = opts[k]; }
        }
      }
      b.dx = pick.x; b.dy = pick.y;
    }

    function decidePuff(b) {
      var c = tileOf(b.x), r = tileOf(b.y);
      if (c === EXIT.c && r === EXIT.r) { b.mode = "enter"; b.dx = 0; b.dy = 0; return; }
      var best = Infinity, pick = null;
      for (var k = 0; k < 4; k++) {
        var nc = c + DIRS[k].x, nr = r + DIRS[k].y;
        if (!openFor(nc, nr, false)) continue;
        var hd = HOME_DIST[nr * COLS + ((nc + COLS) % COLS)];
        if (hd < best) { best = hd; pick = DIRS[k]; }
      }
      if (pick) { b.dx = pick.x; b.dy = pick.y; } else { b.dx = -b.dx; b.dy = -b.dy; }
    }

    function releaseReady(i) {
      var ease = Math.max(0, 1 - (level - 1) * 0.4);
      return crumbsThisTry >= Math.floor(RELEASE_CRUMBS[i] * ease) ||
        releaseClock >= RELEASE_FRAMES[i] * Math.max(0.4, ease);
    }

    function updateBunnies(dt) {
      for (var i = 0; i < bunnies.length; i++) {
        var b = bunnies[i];
        if (b.mode === "pen") {
          if (!b.released) {
            if ((i === 0 || bunnies[i - 1].released) && releaseReady(i)) { b.released = true; b.mode = "exit"; }
          } else {
            b.rest -= dt;
            if (b.rest <= 0) b.mode = "exit";
          }
        } else if (b.mode === "exit") {
          // slide to the door column, then float up through the lid
          var step = PEN_SPEED * dt, tx = centerOf(DOOR.c), ty = centerOf(EXIT.r);
          if (b.x !== tx) b.x = approach(b.x, tx, step);
          else {
            b.y = approach(b.y, ty, step);
            if (b.y === ty) { b.mode = "roam"; b.dx = 0; b.dy = -1; }
          }
        } else if (b.mode === "enter") {
          b.y = approach(b.y, centerOf(DOOR.r + 1), PEN_SPEED * 2 * dt);
          if (b.y === centerOf(DOOR.r + 1)) { b.mode = "pen"; b.released = true; b.rest = 40; b.shy = false; }
        } else if (b.mode === "puff") {
          advance(b, PUFF_SPEED * dt, decidePuff, false);
        } else {
          var sp = bunnySpeed(), tr = tileOf(b.y), tc = tileOf(b.x);
          if (tr === TUNNEL_ROW && (tc <= 3 || tc >= COLS - 4)) sp = Math.min(sp, tunnelSpeed());
          if (b.shy) sp = Math.min(sp, shySpeed());
          advance(b, sp * dt, decideBunny, false);
        }
      }
    }

    function checkCollisions() {
      for (var i = 0; i < bunnies.length; i++) {
        var b = bunnies[i];
        if (b.mode !== "roam" && b.mode !== "exit") continue;
        var ddx = Math.abs(b.x - player.x);
        if (ddx > MAZE_W / 2) ddx = MAZE_W - ddx; // across the tunnel wrap
        if (ddx < 6 && Math.abs(b.y - player.y) < 6) {
          if (b.shy) sweepBunny(b);
          else { startSneeze(); return; }
        }
      }
    }

    function reverseRoamers() {
      for (var i = 0; i < bunnies.length; i++) {
        var b = bunnies[i];
        if (b.mode === "roam" && !b.shy) { b.dx = -b.dx; b.dy = -b.dy; }
      }
    }

    // ---------- Update ----------
    function tick(dt) {
      tickCount += dt;
      combo.tick(dt);
      updateParticles(dt);

      if (clearTimer > 0) {
        clearTimer -= dt;
        if (clearTimer <= 0) nextLevel();
        return;
      }
      if (deathTimer > 0) {
        var before = DEATH_FRAMES - deathTimer;
        deathTimer -= dt;
        if (before < CHOO_AT && DEATH_FRAMES - deathTimer >= CHOO_AT) achoo();
        if (deathTimer <= 0) afterDeath();
        return;
      }
      if (readyTimer > 0) { readyTimer -= dt; return; }

      if (snackTimer > 0) snackTimer -= dt;
      // shy mode pauses the wander/chase clock (it resumes where it left off)
      if (shyTimer > 0) {
        shyTimer -= dt;
        if (shyTimer <= 0) {
          shyTimer = 0; chain = 0;
          for (var i = 0; i < bunnies.length; i++) bunnies[i].shy = false;
        }
      } else {
        phaseTimer -= dt;
        if (phaseTimer <= 0) { phaseIdx++; phaseTimer = phaseLength(phaseIdx); reverseRoamers(); }
      }
      releaseClock += dt;

      updatePlayer(dt);
      if (clearTimer > 0) return; // that was the last crumb
      updateBunnies(dt);
      checkCollisions();
    }

    function updateParticles(dt) {
      var drag = Math.pow(0.95, dt);
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
        pt.vx *= drag; pt.vy *= drag;
      }
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        fl.y -= 0.25 * dt; fl.life -= dt;
      }
    }

    // ---------- Drawing ----------
    // Actors near the tunnel mouths are drawn twice so they slide across the wrap.
    function drawWrapped(fn, obj, x, y) {
      fn(obj, x, y);
      if (x < 8) fn(obj, x + MAZE_W, y);
      else if (x > MAZE_W - 8) fn(obj, x - MAZE_W, y);
    }

    function drawBroom(cx, cy) {
      var pulse = reduce ? 0.1 : 0.08 + 0.07 * Math.sin(tickCount * 0.12);
      A.pixelGlow(ctx, cx, cy, 3.5, LEAF_TOP, pulse);
      ctx.fillStyle = WOOD;
      ctx.beginPath();
      ctx.rect(cx + 3, cy - 6, 1, 1); ctx.rect(cx + 2, cy - 5, 1, 1); ctx.rect(cx + 1, cy - 4, 1, 1);
      ctx.rect(cx, cy - 3, 1, 1); ctx.rect(cx - 1, cy - 2, 1, 1);
      ctx.fill();
      blob(ctx, cx, cy, BROOM_ROWS, STRAW);
      ctx.fillStyle = BRAIN; ctx.fillRect(cx - 2, cy - 1, 3, 1); // binding
      ctx.fillStyle = "#C99A2E";
      ctx.fillRect(cx - 3, cy + 2, 1, 1); ctx.fillRect(cx - 1, cy + 2, 1, 1); ctx.fillRect(cx + 1, cy + 2, 1, 1);
    }

    function drawPellets() {
      ctx.fillStyle = CRUMB;
      ctx.beginPath();
      var brooms = [], r, c;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          var k = pellets[r * COLS + c];
          if (k === 1) ctx.rect(c * TILE + 3, TOP_BAND + r * TILE + 3, 2, 2);
          else if (k === 2) brooms.push(c, r);
        }
      }
      ctx.fill();
      for (var i = 0; i < brooms.length; i += 2) drawBroom(centerOf(brooms[i]), TOP_BAND + centerOf(brooms[i + 1]));
    }

    function drawSnackIcon(cx, cy, lv, mini) {
      if (lv % 2 === 1 && mini) { // whole little apple (a slice doesn't read this small)
        blob(ctx, cx, cy, MINI_APPLE, "#E0574A");
        ctx.fillStyle = "#F7A197"; ctx.fillRect(cx - 2, cy - 1, 1, 1);
        ctx.fillStyle = LEAF_TOP; ctx.fillRect(cx, cy - 4, 2, 1);
      } else if (lv % 2 === 1) { // apple slice: cream flesh, red peel, two pips
        blob(ctx, cx, cy, APPLE_ROWS, "#E0574A");
        ctx.fillStyle = "#FFF3CF";
        ctx.beginPath();
        for (var i = 0; i < APPLE_FLESH.length; i++) {
          ctx.rect(cx + APPLE_FLESH[i][1], cy + APPLE_FLESH[i][0], APPLE_FLESH[i][2] - APPLE_FLESH[i][1] + 1, 1);
        }
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.fillRect(cx - 2, cy - 1, 1, 1); ctx.fillRect(cx + 1, cy - 1, 1, 1);
      } else { // cracker
        blob(ctx, cx, cy, mini ? MINI_CRACKER : CRACKER_ROWS, "#E6B865");
        ctx.fillStyle = "#B98A3E";
        if (mini) ctx.fillRect(cx - 1, cy - 1, 1, 1);
        else {
          ctx.fillRect(cx - 2, cy - 2, 1, 1); ctx.fillRect(cx + 1, cy - 2, 1, 1);
          ctx.fillRect(cx - 2, cy + 1, 1, 1); ctx.fillRect(cx + 1, cy + 1, 1, 1);
          ctx.fillRect(cx - 1, cy - 1, 2, 2);
        }
      }
    }

    // The sprout: orange head, leaf tuft, eyes that look where it's going, a
    // little munching mouth. `pose` covers the sneeze: "ah" | "choo" | "dazed".
    function drawSprout(p, x, y, pose) {
      var cx = Math.round(x), cy = Math.round(y) + TOP_BAND;
      var ex = p.faceX, ey = p.faceY;
      var lean = 0, leafX = 0;
      if (!reduce && !pose && p.moving && Math.floor(p.walkT / 8) % 2) leafX = -1; // leaf sways as it scoots
      if (!reduce && pose === "ah") { lean = -1; leafX = Math.floor(tickCount / 2) % 2 ? 1 : 0; }
      cy += lean;
      var squash = !reduce && pose === "choo";
      blob(ctx, cx + leafX, cy + (squash ? 1 : 0), LEAF_ROWS, LEAF_TOP);
      blob(ctx, cx, cy, squash ? HEAD_SQUASH : HEAD_ROWS, BRAIN);
      ctx.fillStyle = LEAF_SIDE; ctx.fillRect(cx, cy + (squash ? -3 : -4), 1, 1); // stem
      ctx.fillStyle = CHEEK;
      ctx.fillRect(cx - 4, cy + 1, 1, 1); ctx.fillRect(cx + 3, cy + 1, 1, 1);
      ctx.fillStyle = INK;
      if (pose) {
        // eyes squeezed shut for the sneeze
        ctx.fillRect(cx - 3, cy, 2, 1); ctx.fillRect(cx + 1, cy, 2, 1);
        if (pose === "choo") ctx.fillRect(cx - 1, cy + 2, 2, 1);
        return;
      }
      ctx.fillRect(cx - 2 + ex, cy - 1 + ey, 1, 2);
      ctx.fillRect(cx + 1 + ex, cy - 1 + ey, 1, 2);
      if (p.moving && Math.floor(p.walkT / 5) % 2 === 0) ctx.fillRect(cx - 1 + ex, cy + 2, 2, 1); // nom
    }

    function drawBunny(b, x, y) {
      var def = BUNNY_DEFS[b.i];
      var cx = Math.round(x), cy = Math.round(y) + TOP_BAND;
      if (b.mode === "puff") {
        ctx.globalAlpha = 0.9;
        blob(ctx, cx, cy, PUFF_ROWS, "#FFFFFF");
        ctx.globalAlpha = 1;
        ctx.fillStyle = INK;
        ctx.fillRect(cx - 2 + b.dx, cy - 1 + b.dy, 1, 1); ctx.fillRect(cx + 1 + b.dx, cy - 1 + b.dy, 1, 1);
        return;
      }
      var bob = 0;
      if (!reduce) {
        if (b.mode === "pen") bob = Math.round(Math.sin((tickCount + b.i * 17) * 0.1) * 1.4);
        else bob = Math.floor((tickCount + b.i * 11) / 10) % 2 ? -1 : 0;
        if (b.shy && Math.floor(tickCount / 5) % 2) cx += 1; // shy wobble
      }
      cy += bob;
      var fluffA = reduce || Math.floor((tickCount + b.i * 7) / 9) % 2 === 0;
      var body = def.body;
      if (b.shy) body = (shyTimer < SHY_BLINK && Math.floor(shyTimer / 10) % 2 === 0) ? "#FFFFFF" : SHY_BODY;
      blob(ctx, cx, cy, BUNNY_ROWS.concat(fluffA ? FRINGE_A : FRINGE_B), body);
      if (!b.shy) {
        ctx.fillStyle = def.shade;
        ctx.fillRect(cx - 4, cy + 2, 1, 1); ctx.fillRect(cx + 3, cy + 2, 1, 1);
        ctx.fillStyle = CHEEK;
        ctx.fillRect(cx - 2, cy - 4, 1, 1); ctx.fillRect(cx + 1, cy - 4, 1, 1);
        ctx.fillStyle = INK;
        var ex = b.dx, ey = b.dy;
        ctx.fillRect(cx - 2 + ex, cy - 1 + ey, 1, 2);
        ctx.fillRect(cx + 1 + ex, cy - 1 + ey, 1, 2);
      } else {
        // shy: small dot eyes and a wobbly little mouth
        ctx.fillStyle = INK;
        ctx.fillRect(cx - 2, cy - 1, 1, 1); ctx.fillRect(cx + 1, cy - 1, 1, 1);
        ctx.fillStyle = SHY_MOUTH;
        ctx.fillRect(cx - 3, cy + 2, 1, 1); ctx.fillRect(cx - 2, cy + 1, 1, 1);
        ctx.fillRect(cx - 1, cy + 2, 1, 1); ctx.fillRect(cx, cy + 1, 1, 1);
        ctx.fillRect(cx + 1, cy + 2, 1, 1); ctx.fillRect(cx + 2, cy + 1, 1, 1);
      }
    }

    function shadowText(text, x, y, font, color) {
      ctx.font = font; ctx.textAlign = "center";
      ctx.fillStyle = INK;
      ctx.fillText(text, x - 1, y + 1);
      ctx.fillText(text, x + 1, y + 1);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.textAlign = "left";
    }

    function render() {
      ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      var sh = camera.offset();
      ctx.translate(sh.x, sh.y);

      ctx.fillStyle = CREAM;
      ctx.fillRect(-4, -4, W + 8, H + 8);

      // walls: one pre-rendered image; flashes to cream-white on a level clear
      var clearT = CLEAR_FRAMES - clearTimer;
      var flash = clearTimer > 0 && !reduce && clearT > CLEAR_HOLD && Math.floor((clearT - CLEAR_HOLD) / CLEAR_FLASH) % 2 === 0;
      ctx.drawImage(flash ? flashArt : wallArt, 0, TOP_BAND);

      drawPellets();
      if (snackTimer > 0 && (snackTimer > 90 || Math.floor(snackTimer / 8) % 2 === 0)) {
        drawSnackIcon(centerOf(SNACK_TILE.c), TOP_BAND + centerOf(SNACK_TILE.r), level, false);
      }

      // bunnies (hidden while the room flashes clean)
      var i;
      if (clearTimer <= 0) {
        for (i = 0; i < bunnies.length; i++) drawWrapped(drawBunny, bunnies[i], bunnies[i].x, bunnies[i].y);
      }

      // sprout: sneeze beats, then a hopper-style blink before the reset
      if (deathTimer > 0) {
        var dt0 = DEATH_FRAMES - deathTimer;
        var pose = dt0 < CHOO_AT ? "ah" : dt0 < CHOO_AT + 12 ? "choo" : "dazed";
        if (deathTimer > 24 || Math.floor(deathTimer / 4) % 2 === 0) {
          drawWrapped(function (p, x, y) { drawSprout(p, x, y, pose); }, player, player.x, player.y);
        }
      } else {
        drawWrapped(function (p, x, y) { drawSprout(p, x, y, null); }, player, player.x, player.y);
      }

      // particles
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
      }
      ctx.globalAlpha = 1;

      // floaters
      ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        ctx.globalAlpha = clamp(fl.life / fl.maxLife * 1.5, 0, 1);
        ctx.fillStyle = INK;
        ctx.fillText(fl.text, Math.round(fl.x), Math.round(fl.y) + 1);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, Math.round(fl.x), Math.round(fl.y));
      }
      ctx.globalAlpha = 1; ctx.textAlign = "left";

      // READY! / LEVEL N under the toy chest
      if (readyTimer > 0 && state !== "idle") {
        // backing card spans whole tiles so no crumb is left half-covered
        var ry = TOP_BAND + centerOf(SNACK_TILE.r);
        ctx.fillStyle = CREAM;
        ctx.fillRect((SNACK_TILE.c - 3) * TILE, ry - 5, TILE * 7, 10);
        shadowText(readyLabel, W / 2, ry + 3, "bold 8px monospace", BRAIN);
      }

      // sneeze banner
      if (deathTimer > 0 && DEATH_FRAMES - deathTimer >= CHOO_AT) {
        var bx = clamp(player.x, 30, W - 30);
        var by = clamp(player.y + TOP_BAND - 9, 20, H - 24);
        ctx.globalAlpha = clamp(deathTimer / 40, 0, 1);
        shadowText("ACHOO!", bx, by, "bold 13px monospace", BRAIN);
        ctx.globalAlpha = 1;
      }

      // top band: how long the bunnies stay shy
      if (shyTimer > 0 && deathTimer <= 0) {
        var total = shyFrames(), bw = 56, bxx = Math.round(W / 2 - bw / 2);
        var blink = shyTimer < SHY_BLINK && Math.floor(shyTimer / 10) % 2 === 0;
        ctx.fillStyle = "rgba(14,42,45,0.18)";
        ctx.fillRect(bxx, 3, bw, 2);
        ctx.fillStyle = blink ? "#FFFFFF" : "#B7A6E0";
        ctx.fillRect(bxx, 3, Math.max(1, Math.round(bw * clamp(shyTimer / total, 0, 1))), 2);
      }

      // bottom band: tries left (little sprouts) and level snacks
      var by2 = TOP_BAND + MAZE_H + 5;
      for (i = 0; i < Math.min(lives, 6); i++) {
        var lx = 6 + i * 10;
        blob(ctx, lx, by2, MINI_HEAD, BRAIN);
        ctx.fillStyle = LEAF_TOP; ctx.fillRect(lx, by2 - 4, 2, 1);
        ctx.fillStyle = INK; ctx.fillRect(lx - 2, by2 - 1, 1, 1); ctx.fillRect(lx + 1, by2 - 1, 1, 1);
      }
      for (var lv = level, n = 0; lv >= 1 && n < 6; lv--, n++) {
        drawSnackIcon(W - 7 - n * 10, by2, lv, true);
      }

      ctx.restore();
    }

    // ---------- HUD / prompt ----------
    function updateHud() {
      if (els.score) els.score.textContent = String(Math.floor(score)).padStart(5, "0");
      if (els.best) els.best.textContent = String(A.leaderboard.best(GAME_KEY)).padStart(5, "0");
      if (els.level) els.level.textContent = String(level || 1);
    }
    function hidePrompt() { if (els.prompt) els.prompt.hidden = true; }
    function showIdle() {
      els.promptTitle.textContent = "Crumb Chase";
      els.promptText.textContent = "Sweep up every crumb. Grab a broom and the dust bunnies get shy.";
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
      els.promptText.textContent = "The crumbs aren't going anywhere.";
      els.promptActions.textContent = "";
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Resume";
      btn.addEventListener("click", function () { resume(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
      els.prompt.hidden = false;
    }
    function showEnd(finalScore) {
      updateHud();
      els.promptTitle.textContent = "Time for a nap";
      els.promptText.textContent = "Score " + String(finalScore).padStart(5, "0") + " · level " + level;
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

    var api = {
      steer: steer,
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
      // Returns true when the tap was consumed (start/restart/resume).
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
      // Space: pauses a running game, otherwise acts like a start/resume tap.
      space: function () {
        if (state === "running") { pause(); return; }
        api.tapStart();
      },
      togglePause: function () {
        if (state === "running") pause();
        else if (state === "paused") resume();
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
    return api;
  }

  // ======================================================================
  //  Overlay scaffolding
  // ======================================================================
  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "gms-arcade-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Crumb Chase — a mini game");
    overlay.innerHTML =
      '<div class="gms-arcade-backdrop" data-egg-close></div>' +
      '<div class="gms-arcade-panel">' +
        '<div class="gms-arcade-panel__head">' +
          '<p class="gms-arcade-title">Crumb Chase <span>— you found it!</span></p>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button type="button" class="gms-arcade-close" data-egg-mute aria-label="Sound">♪</button>' +
            '<button type="button" class="gms-arcade-close" data-egg-close aria-label="Close game">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="gms-arcade-scores">' +
          '<span>SCORE <strong data-egg-score>00000</strong></span>' +
          '<span>LEVEL <strong data-egg-level>1</strong></span>' +
          '<span>BEST <strong data-egg-best>00000</strong></span>' +
        '</div>' +
        '<div class="gms-arcade-stage gms-arcade-stage--maze">' +
          '<canvas class="gms-arcade-canvas" tabindex="0" role="application" aria-label="Crumb Chase play area. Arrow keys or W A S D steer, Space starts, P pauses, M mutes."></canvas>' +
          '<div class="gms-arcade-prompt" data-egg-prompt hidden>' +
            '<p class="gms-arcade-prompt__title" data-egg-prompt-title></p>' +
            '<p class="gms-arcade-prompt__text" data-egg-prompt-text></p>' +
            '<div class="gms-arcade-prompt__actions" data-egg-prompt-actions></div>' +
          '</div>' +
        '</div>' +
        '<p class="gms-arcade-help">Arrows / WASD steer · swipe to steer on touch · grab a broom to sweep up the dust bunnies · P pause · M mute</p>' +
        '<div class="gms-arcade-touchrow">' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-dir="-1,0" aria-label="Steer left">◀</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-dir="0,-1" aria-label="Steer up">▲</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-dir="0,1" aria-label="Steer down">▼</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-dir="1,0" aria-label="Steer right">▶</button>' +
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
      level: overlay.querySelector("[data-egg-level]"),
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

    // D-pad buttons. Touch presses get a brief held state + tick so the
    // press registers even when the thumb hides the button.
    overlay.querySelectorAll("[data-egg-dir]").forEach(function (el) {
      var parts = el.getAttribute("data-egg-dir").split(",");
      var dx = parseInt(parts[0], 10), dy = parseInt(parts[1], 10);
      var heldT = null;
      var press = function (e) { e.preventDefault(); game.steer(dx, dy); };
      el.addEventListener("touchstart", function (e) {
        press(e);
        A.haptics.tick();
        el.classList.add("is-held");
        if (heldT) window.clearTimeout(heldT);
        heldT = window.setTimeout(function () { el.classList.remove("is-held"); }, 120);
      }, { passive: false });
      el.addEventListener("mousedown", press);
    });

    // Stage (canvas + letterbox margins): a near-still tap starts/resumes; a
    // swipe steers, and swipes chain — the origin re-arms at the finger after
    // every steer, so a held finger can re-steer corner-by-corner without
    // lifting. Guard first: prompt buttons and initials input live inside the stage.
    var stage = overlay.querySelector(".gms-arcade-stage");
    var SWIPE_PX = 18, TAP_PX = 10;
    var swipe = null, suppressMouse = 0;
    function onControl(e) {
      return !!(e.target && e.target.closest && e.target.closest("button, a, input, label, form"));
    }
    stage.addEventListener("touchstart", function (e) {
      if (onControl(e)) return;
      e.preventDefault();
      suppressMouse = Date.now() + 500;
      var t = e.touches[0];
      swipe = { x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, dir: "" };
    }, { passive: false });
    stage.addEventListener("touchmove", function (e) {
      if (onControl(e)) return;
      e.preventDefault();
      if (!swipe || !e.touches.length) return;
      var t = e.touches[0];
      var dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
      if (Math.abs(dx) < SWIPE_PX && Math.abs(dy) < SWIPE_PX) return;
      var sx = 0, sy = 0;
      if (Math.abs(dx) > Math.abs(dy)) sx = dx > 0 ? 1 : -1;
      else sy = dy > 0 ? 1 : -1;
      game.steer(sx, sy);
      var key = sx + "," + sy;
      if (key !== swipe.dir) { A.haptics.tick(); swipe.dir = key; }
      swipe.x = t.clientX; swipe.y = t.clientY; // re-arm from here — chained steer
    }, { passive: false });
    stage.addEventListener("touchend", function (e) {
      if (onControl(e)) return;
      e.preventDefault();
      // a near-still tap (< 10px) starts / resumes / restarts; mid-run it's a
      // no-op. touchend is also the gesture iOS wants before audio can play.
      if (swipe) {
        var t = e.changedTouches && e.changedTouches[0];
        var moved = t ? Math.max(Math.abs(t.clientX - swipe.sx), Math.abs(t.clientY - swipe.sy)) : 0;
        if (moved < TAP_PX) game.tapStart();
      }
      swipe = null;
    }, { passive: false });
    stage.addEventListener("mousedown", function (e) {
      if (onControl(e)) return;
      if (Date.now() < suppressMouse) return;
      e.preventDefault();
      game.tapStart();
    });

    function onKeydown(e) {
      // While typing initials, leave all keys (incl. Escape/Enter) to the form
      // so a stray Escape never closes the game and drops the high score.
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "Escape") { closeOverlay(overlay); return; }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); game.steer(-1, 0); }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); game.steer(1, 0); }
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); game.steer(0, -1); }
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); game.steer(0, 1); }
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

  // Arcade-only: the Crumb Chase card's Play button is the one way in
  // (it opens the game through GMSArcade.play()).
  ready(function () {
    A.defineGame("maze", buildOverlay);
  });
})();
