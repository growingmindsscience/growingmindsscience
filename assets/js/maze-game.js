/* Growing Minds Science — maze-game.js
   "Crumb Chase" on the Arcade page: after snack time the playroom floor is
   covered in crumbs. You are a small child with a dustpan, sweeping up every
   crumb while four dust bunnies drift through the room. Bump a bold bunny and
   you sneeze (that costs one of three tries). Grab a broom and the bunnies go
   shy for a few seconds: sweep them up for a chain bonus and they puff back
   to the toy chest. Clear every crumb to move on to the next room.

   Core v2 game (see docs/arcade/game-brief.md and plan.md section 4): live
   brand palette through A.theme(), the shared shell, makeStory for the five
   chapters, makePowerups for Broom, Vacuum and Nap, runSummary for the end
   card. Three authored mazes rotate by level and are validated at load.
   CSP-safe: no eval, no external assets, audio is the shared Web Audio
   synth. Honors prefers-reduced-motion.

   Kept from the original: tile-exact maze movement with buffered turns, the
   wrap-around tunnel, the four bunny personalities and the pen release
   schedule, shy mode and the sweep chain, snacks, three tries plus an extra
   one at 10,000, and the per-level speed scaling.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "crumb-chase";
  var MUTE_KEY = "gms-maze-muted";

  // ---------- Field ----------
  // A 19 x 21 maze of 20 px tiles, a 24 px band above (level, crumbs left)
  // and a 28 px band below (tries, level fruit). 380 x 472 fits a portrait
  // phone and a landscape window alike, so there is no grid turn.
  var TILE = 20, COLS = 19, ROWS = 21;
  var MAZE_W = COLS * TILE, MAZE_H = ROWS * TILE;
  var TOP = 24, BOTTOM = 28;
  var W = MAZE_W, H = TOP + MAZE_H + BOTTOM;
  var TUNNEL_ROW = 10;
  var S = TILE / 8;          // the speeds below were tuned on an 8 px tile
  var TURN_TOL = 3 * S;      // px either side of a tile centre where a buffered turn still takes
  var HIT_DIST = 13;         // px between centres that counts as touching a bunny
  var LW = 12;               // wall body width; the ink outline adds 1.5 px each side
  var DIRS = [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }]; // tie-break order

  // ---------- Mazes ----------
  // '#' wall · '.' crumb · 'o' broom · ' ' bare floor · '-' toy-chest door
  // (bunnies pass, the child cannot) · 'P' child start · 'B' bunny start in
  // the chest. Row 10 is open at both edges: the wrap-around tunnel.
  var MAZES = [
    [ // the original playroom
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
    ],
    [ // the kitchen: long counters, a second tunnel lane
      "###################",
      "#o...#.......#...o#",
      "#.##.#.#####.#.##.#",
      "#.................#",
      "#.#.###.###.###.#.#",
      "#.#...#.....#...#.#",
      "#.###.#.###.#.###.#",
      "#.................#",
      "###.##.##-##.##.###",
      "###.##.# B #.##.###",
      "   .  .#BBB#.  .   ",
      "###.##.#####.##.###",
      "#...#..#####..#...#",
      "#.#...#.. ..#...#.#",
      "#.#.###.###.###.#.#",
      "#o.......P.......o#",
      "##.#.#.#####.#.#.##",
      "#.................#",
      "#.###.###.###.###.#",
      "#.................#",
      "###################"
    ],
    [ // the hallway: a row of coat hooks along the bottom
      "###################",
      "#........#........#",
      "#.###.##.#.##.###.#",
      "#o...............o#",
      "#.#.#.#######.#.#.#",
      "#.#.#.........#.#.#",
      "#...###.###.###...#",
      "#.#.##.......##.#.#",
      "#....#.##-##.#....#",
      "####.#.# B #.#.####",
      "    . .#BBB#. .    ",
      "####.#.#####.#.####",
      "#....#.#####.#....#",
      "#.##.#... ...#.##.#",
      "#.##...#.#.#...##.#",
      "#....#...P...#....#",
      "#.#.#####.#####.#.#",
      "#o...............o#",
      "#.#.#.#.#.#.#.#.#.#",
      "#.................#",
      "###################"
    ]
  ];

  // Parses and validates one maze. Throws (naming the maze) when it is the
  // wrong size, the tunnel is shut, the pen leaks, or a crumb is unreachable.
  function parseMaze(rows, mi) {
    function fail(msg) { throw new Error("Crumb Chase maze " + mi + ": " + msg); }
    if (!rows || rows.length !== ROWS) fail("expected " + ROWS + " rows, found " + (rows ? rows.length : 0));
    var walls = [], pellets = [], spots = [], start = null, door = null, doors = 0, total = 0, r, c, i, k;
    for (r = 0; r < ROWS; r++) {
      if (typeof rows[r] !== "string" || rows[r].length !== COLS) fail("row " + r + " is " + (rows[r] ? rows[r].length : 0) + " wide, expected " + COLS);
      for (c = 0; c < COLS; c++) {
        var ch = rows[r].charAt(c); i = r * COLS + c;
        if ("#.o -PB".indexOf(ch) === -1) fail("unknown tile '" + ch + "' at column " + c + ", row " + r);
        walls[i] = ch === "#" ? 1 : ch === "-" ? 2 : 0;
        pellets[i] = ch === "." ? 1 : ch === "o" ? 2 : 0;
        if (pellets[i]) total++;
        if (ch === "P") { if (start) fail("more than one start tile"); start = { c: c, r: r }; }
        else if (ch === "B") spots.push({ c: c, r: r });
        else if (ch === "-") { doors++; door = { c: c, r: r }; }
      }
    }
    if (!start) fail("no start tile 'P'");
    if (doors !== 1) fail("expected one toy-chest door, found " + doors);
    if (spots.length !== 4) fail("expected four bunny spots, found " + spots.length);
    if (rows[TUNNEL_ROW].charAt(0) === "#" || rows[TUNNEL_ROW].charAt(COLS - 1) === "#") fail("the tunnel row " + TUNNEL_ROW + " must be open at both edges");

    // The pen: everything reachable from the first bunny spot without walls
    // or the door. It must hold all four spots and touch nothing else.
    var pen = {}, q = [spots[0]], minC = COLS, maxC = 0, minR = ROWS, maxR = 0;
    pen[spots[0].r * COLS + spots[0].c] = true;
    for (var h = 0; h < q.length; h++) {
      var t = q[h];
      if (t.c <= 0 || t.c >= COLS - 1 || t.r <= 0 || t.r >= ROWS - 1) fail("the pen is not enclosed: it reaches the edge at column " + t.c + ", row " + t.r);
      var tc = rows[t.r].charAt(t.c);
      if (tc === "." || tc === "o" || tc === "P") fail("the pen is not enclosed: it reaches column " + t.c + ", row " + t.r);
      minC = Math.min(minC, t.c); maxC = Math.max(maxC, t.c); minR = Math.min(minR, t.r); maxR = Math.max(maxR, t.r);
      for (k = 0; k < 4; k++) {
        var nc = t.c + DIRS[k].x, nr = t.r + DIRS[k].y, ni = nr * COLS + nc;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || walls[ni] !== 0 || pen[ni]) continue;
        pen[ni] = true; q.push({ c: nc, r: nr });
      }
    }
    spots.forEach(function (s) { if (!pen[s.r * COLS + s.c]) fail("bunny spot at column " + s.c + ", row " + s.r + " is not inside the pen"); });
    if (!pen[(door.r + 1) * COLS + door.c]) fail("the door must sit on top of the pen");
    var exit = { c: door.c, r: door.r - 1 };
    if (walls[exit.r * COLS + exit.c] !== 0 || pen[exit.r * COLS + exit.c]) fail("the tile above the door must be open floor");

    // Everything the child can reach from the start (door shut, tunnel wraps).
    var reach = [], rq = [start.r * COLS + start.c];
    reach[rq[0]] = true;
    for (var hh = 0; hh < rq.length; hh++) {
      var cur = rq[hh], cc = cur % COLS, cr = (cur - cc) / COLS;
      for (k = 0; k < 4; k++) {
        var mc = ((cc + DIRS[k].x) % COLS + COLS) % COLS, mr = cr + DIRS[k].y, mi2 = mr * COLS + mc;
        if (mr < 0 || mr >= ROWS || walls[mi2] !== 0 || reach[mi2]) continue;
        reach[mi2] = true; rq.push(mi2);
      }
    }
    for (i = 0; i < COLS * ROWS; i++) if (pellets[i] && !reach[i]) fail("the crumb at column " + (i % COLS) + ", row " + Math.floor(i / COLS) + " cannot be reached");
    if (!reach[exit.r * COLS + exit.c]) fail("the toy-chest exit cannot be reached");

    var chest = { c0: minC - 1, c1: maxC + 1, r0: minR - 1, r1: maxR + 1 };
    var snack = null;
    for (r = chest.r1 + 1; r < ROWS && !snack; r++) if (walls[r * COLS + door.c] === 0 && reach[r * COLS + door.c]) snack = { c: door.c, r: r };
    if (!snack) fail("no floor tile below the toy chest for snacks");

    // Shortest paths to the chest exit, for swept bunnies puffing home.
    var home = [];
    for (i = 0; i < COLS * ROWS; i++) home[i] = Infinity;
    var hq = [exit.r * COLS + exit.c]; home[hq[0]] = 0;
    for (var g = 0; g < hq.length; g++) {
      var gc = hq[g] % COLS, gr = (hq[g] - gc) / COLS;
      for (k = 0; k < 4; k++) {
        var xc = ((gc + DIRS[k].x) % COLS + COLS) % COLS, xr = gr + DIRS[k].y, xi = xr * COLS + xc;
        if (xr < 0 || xr >= ROWS || walls[xi] !== 0 || home[xi] !== Infinity) continue;
        home[xi] = home[hq[g]] + 1; hq.push(xi);
      }
    }
    return { index: mi, walls: walls, pellets: pellets, spots: spots, start: start, door: door, exit: exit,
      chest: chest, pen: pen, reach: reach, snack: snack, total: total, home: home, path: null };
  }
  var MAZE_DATA = MAZES.map(parseMaze);

  // ---------- Story: five rooms, gated on level ----------
  var CHAPTERS = [
    { name: "Crumbs", at: 1, text: "Sweep every crumb. Brooms make bunnies shy." },
    { name: "Snack Time", at: 2, text: "Fruit turns up under the toy chest." },
    { name: "Rug Day", at: 3, text: "A new rug, and a tidy round with no bunnies." },
    { name: "Toy Chest", at: 5, text: "The bunnies leave the chest sooner now." },
    { name: "Spring Clean", at: 8, text: "Quicker bunnies, shorter brooms." }
  ];

  var POWERUPS = {
    broom: { label: "Broom", color: "ochre", duration: 360, text: "The bunnies go shy. Sweep them up" },
    vacuum: { label: "Vacuum", color: "research", duration: 240, text: "Nearby crumbs fly into the dustpan" },
    nap: { label: "Nap", color: "sage", duration: 180, text: "The bunnies doze off" }
  };

  // Four dust bunnies. `spot` indexes the 'B' tiles in reading order.
  //  Dusty follows you; Rosie heads you off; Skye sneaks round the side;
  //  Toffee is easily distracted and wanders home when close.
  var BUNNY_DEFS = [
    { name: "Dusty", corner: { c: COLS - 3, r: -3 }, spot: 0 },
    { name: "Rosie", corner: { c: 2, r: -3 }, spot: 2 },
    { name: "Skye", corner: { c: COLS - 1, r: ROWS + 1 }, spot: 1 },
    { name: "Toffee", corner: { c: 0, r: ROWS + 1 }, spot: 3 }
  ];

  // Timings (frames at 60 fps)
  var READY_FRAMES = 96, READY_AFTER_SNEEZE = 72;
  var DEATH_FRAMES = 72, CHOO_AT = 18;
  var CLEAR_FRAMES = 132, CLEAR_HOLD = 30, CLEAR_FLASH = 12;
  var SNACK_FRAMES = 540, PICKUP_FRAMES = 540, SHY_BLINK = 90;
  var TIDY_FRAMES = 1200;
  var EXTRA_AT = 10000;
  // Pen release: crumbs eaten this try OR frames since the try began.
  var RELEASE_CRUMBS = [0, 4, 30, 60];
  var RELEASE_FRAMES = [0, 150, 480, 840];
  var FRUITS = ["apple", "pear", "banana"];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function tileOf(v) { return Math.floor(v / TILE); }
  function centerOf(t) { return t * TILE + TILE / 2; }
  function wrapX(x) { return x < 0 ? x + MAZE_W : x >= MAZE_W ? x - MAZE_W : x; }
  function approach(v, t, s) { return Math.abs(t - v) <= s ? t : v + (t > v ? s : -s); }
  function isTidy(lv) { return lv % 3 === 0; }

  // Wall art as two paths along wall centrelines: horizontal and vertical
  // runs stroked thick with round caps, plus filled squares wherever four
  // wall tiles meet so a solid block never shows a hole.
  function buildWallPath(M) {
    var line = new Path2D(), sq = new Path2D(), r, c, s;
    function wall(cc, rr) { return cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && M.walls[rr * COLS + cc] === 1; }
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        if (!wall(c, r)) continue;
        s = c; while (wall(c + 1, r)) c++;
        if (c > s) { line.moveTo(centerOf(s), centerOf(r)); line.lineTo(centerOf(c), centerOf(r)); }
      }
    }
    for (c = 0; c < COLS; c++) {
      for (r = 0; r < ROWS; r++) {
        if (!wall(c, r)) continue;
        s = r; while (wall(c, r + 1)) r++;
        if (r > s) { line.moveTo(centerOf(c), centerOf(s)); line.lineTo(centerOf(c), centerOf(r)); }
      }
    }
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        if (!wall(c, r)) continue;
        if (!wall(c - 1, r) && !wall(c + 1, r) && !wall(c, r - 1) && !wall(c, r + 1)) { line.moveTo(centerOf(c), centerOf(r)); line.lineTo(centerOf(c) + 0.01, centerOf(r)); }
        if (wall(c + 1, r) && wall(c, r + 1) && wall(c + 1, r + 1)) sq.rect(centerOf(c), centerOf(r), TILE, TILE);
      }
    }
    return { line: line, sq: sq };
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
    var combo = A.makeCombo({ window: 26, max: 5 });
    var particles = A.makeParticles({ cap: 80, reduce: reduce });
    var floaters = A.makeFloaters({ cap: 10, reduce: reduce });
    var wake = A.makeWakeLock();
    var unsubHidden = null;
    var synth = A.makeSynth({ muteKey: MUTE_KEY });
    shell.bindSynth(synth);

    var story = A.makeStory(CHAPTERS, { onEnter: onChapter, bannerFrames: 210 });
    var powers = A.makePowerups(POWERUPS, { onExpire: function (id) { if (id === "broom") endShy(); } });

    var state = "idle"; // idle | running | paused | gameover
    var M, player, bunnies, pellets, pelletsLeft, level, lives, score, best, extraGiven;
    var eatenThisLevel, crumbsThisTry, releaseClock;
    var chain, phaseIdx, phaseTimer, snackTimer, tidyTimer;
    var pickup, pickupIdx, suction, lastSlurp;
    var readyTimer, deathTimer, clearTimer, sneezeDir, time;
    var runStats;

    best = A.leaderboard.best(GAME_KEY);
    time = 0;

    // Colours derived from the live palette, rebuilt when the theme changes.
    var colCache = { pal: null };
    function colors() {
      if (colCache.pal === pal) return colCache;
      colCache = {
        pal: pal,
        rugs: [pal.sage, pal.mix(pal.ochre, pal.paper, 0.35), pal.mix(pal.research, pal.paper, 0.5)],
        bunny: [pal.sageDeep, pal.mix(pal.clay, pal.paper, 0.4), pal.mix(pal.research, pal.paper, 0.3), pal.ochre],
        // Skin and hair have no token: skin is ochre lifted toward the light
        // on-ink tone, hair is clay text pulled toward the field ink.
        skin: pal.mix(pal.ochre, pal.onInk, 0.62),
        hair: pal.mix(pal.clayText, pal.fieldInk, 0.45),
        // An opaque wall shadow (the floor under it is plain paper).
        wallShadow: pal.isDark ? pal.mix(pal.paper, pal.fieldInk, 0.7) : pal.mix(pal.paper, pal.ink, 0.12)
      };
      return colCache;
    }

    // ---------- Speeds (px per frame), scaled by level ----------
    function playerSpeed() { return Math.min(1.0, 0.8 + (level - 1) * 0.04) * S; }
    function bunnySpeed() { return Math.min(0.96, 0.72 + (level - 1) * 0.05) * S; }
    function tunnelSpeed() { return (0.42 + Math.min(4, level - 1) * 0.03) * S; }
    function shySpeed() { return (0.45 + Math.min(4, level - 1) * 0.02) * S; }
    var PUFF_SPEED = 2.4 * S, PEN_SPEED = 0.5 * S;
    function shyFrames() { return Math.max(150, 360 - (level - 1) * 45); }

    // Wander (to their corners) and chase phases alternate; even = wander.
    function phaseLength(idx) {
      var wander = level === 1 ? [420, 420, 300, 300] : [360, 360, 240, 120];
      var chase = [1200, 1200, 1200, Infinity];
      var k = Math.floor(idx / 2);
      if (k > 3) return Infinity;
      return idx % 2 === 0 ? wander[k] : chase[k];
    }
    function wandering() { return phaseIdx % 2 === 0; }

    // ---------- Grid ----------
    function wallAt(c, r) {
      if (r < 0 || r >= ROWS) return 1;
      c = ((c % COLS) + COLS) % COLS; // only the tunnel row is open at the edges
      return M.walls[r * COLS + c];
    }
    function openFor(c, r, doorOk) { var w = wallAt(c, r); return w === 0 || (w === 2 && !!doorOk); }

    // ---------- Audio ----------
    var sfx = {
      munch: function (alt) { synth.beep(alt ? 392 : 494, alt ? 349 : 440, 0.045, "triangle", 0.16); },
      slurp: function () { synth.beep(900, 1500, 0.05, "sine", 0.12); },
      broom: function () { synth.beep(330, 990, 0.22, "triangle", 0.32); synth.arp([523, 659, 784], 0.05, 0.12, "sine", 0.22); },
      sweep: function (step) { var b = Math.pow(1.12, Math.max(1, step) - 1); synth.arp([659 * b, 784 * b, 988 * b, 1318 * b], 0.045, 0.12, "triangle", 0.38); },
      snack: function () { synth.arp([784, 1046, 1318], 0.06, 0.14, "triangle", 0.4); },
      vacuum: function () { synth.noise(0.28, 1400, 0.22); synth.beep(220, 660, 0.28, "sine", 0.26); },
      nap: function () { synth.arp([659, 523, 392], 0.09, 0.2, "sine", 0.3); },
      hop: function () { synth.beep(300, 560, 0.08, "triangle", 0.2); },
      ah: function () { synth.beep(440, 700, 0.22, "sine", 0.28); },
      choo: function () { synth.noise(0.3, 1800, 0.42); synth.beep(620, 170, 0.32, "sine", 0.28); },
      level: function () { synth.arp([523, 659, 784, 1046, 1318], 0.07, 0.2, "triangle", 0.5); },
      chapter: function () { synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.42); },
      extra: function () { synth.arp([659, 784, 988, 1318], 0.06, 0.16, "triangle", 0.4); },
      start: function () { synth.arp([392, 523, 659], 0.08, 0.14, "triangle", 0.32); }
    };

    // ---------- World ----------
    function buildLevel() {
      M = MAZE_DATA[(level - 1) % MAZE_DATA.length];
      pellets = M.pellets.slice();
      pelletsLeft = M.total;
      eatenThisLevel = 0;
      snackTimer = 0;
      pickup = null; pickupIdx = Math.random() < 0.5 ? 0 : 1;
      suction = [];
      tidyTimer = isTidy(level) ? TIDY_FRAMES : 0;
    }
    function resetActors() {
      var s = M.start;
      player = { x: centerOf(s.c), y: centerOf(s.r), dx: 0, dy: 0, faceX: -1, faceY: 0, wantX: 0, wantY: 0, moving: false, walkT: 0 };
      bunnies = [];
      for (var i = 0; i < BUNNY_DEFS.length; i++) {
        var spot = M.spots[BUNNY_DEFS[i].spot];
        bunnies.push({ i: i, x: centerOf(spot.c), y: centerOf(spot.r), dx: 0, dy: 0, mode: "pen", released: false, shy: false, rest: 0 });
      }
      powers.clear(); chain = 0;
      phaseIdx = 0; phaseTimer = phaseLength(0);
      releaseClock = 0; crumbsThisTry = 0;
      suction = [];
    }
    function resetWorld() {
      level = 1; lives = 3; score = 0; extraGiven = false;
      deathTimer = 0; clearTimer = 0; readyTimer = READY_FRAMES;
      sneezeDir = { x: -1, y: 0 }; lastSlurp = -99;
      combo.reset(true); story.reset();
      particles.clear(); floaters.clear();
      runStats = { crumbs: 0, swept: 0, bestChain: 0, powers: 0, snacks: 0 };
      buildLevel();
      resetActors();
      syncHud();
    }

    function syncHud() {
      shell.hud.set("score", Math.floor(score));
      shell.hud.set("best", Math.max(best, Math.floor(score)));
      shell.hud.set("level", level);
      shell.hud.set("tries", lives);
    }

    function addScore(pts) {
      score += pts;
      if (!extraGiven && score >= EXTRA_AT) {
        extraGiven = true;
        lives++;
        floaters.spawn(player.x, player.y - 16, "+1 try", pal.forest, { size: 12 });
        sfx.extra(); A.haptics.pop();
        A.announce("An extra try.");
      }
      syncHud();
    }

    function onChapter(ch, idx) {
      if (idx > 0) {
        sfx.chapter(); A.haptics.win();
        A.announce("Chapter " + (idx + 1) + ", " + ch.name + ". " + ch.text);
      }
    }

    // ---------- Flow ----------
    function showStart() {
      var p = A.progress.get(GAME_KEY);
      shell.prompt.show({
        kicker: "Crumb Chase",
        title: p.plays ? "Back to the playroom" : "Sweep up every crumb.",
        text: "Arrow keys, WASD or a swipe steer. Grab a broom and the dust bunnies go shy, so you can sweep them up. Bump a bold bunny and you sneeze. Three tries.",
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
      story.set(0);
      sfx.start();
      A.announce("Go. Level one, Crumbs. " + CHAPTERS[0].text);
      try { cv.el.focus({ preventScroll: true }); } catch (e) {}
    }
    function pause() {
      if (state !== "running") return;
      state = "paused";
      wake.release();
      shell.prompt.show({ kicker: "Paused", title: CHAPTERS[story.index()].name, text: "The crumbs are not going anywhere. Score " + Math.floor(score) + " · level " + level + " · " + lives + (lives === 1 ? " try" : " tries") + " left.",
        actions: [{ label: "Resume", primary: true, onClick: resume }, { label: "Quit", onClick: function () { A.closeGame(); } }], compact: true });
    }
    function resume() {
      if (state !== "paused") return;
      synth.ensure();
      state = "running"; shell.prompt.hide(); wake.acquire();
    }
    function gameOver() {
      state = "gameover";
      wake.release();
      var final = Math.floor(score);
      var placed = final > 0 && final >= best;
      if (final > best) best = final;
      A.progress.record(GAME_KEY, { score: final, chapter: story.index(), badges: level >= 8 ? ["spring-clean"] : [] });
      syncHud();
      var ch = CHAPTERS[story.index()];
      shell.prompt.show({
        kicker: "Time for a nap",
        title: placed ? "A new best: " + final : "Score " + final,
        text: "You reached level " + level + " (" + ch.name + ") and swept up " + runStats.crumbs + " crumbs.",
        board: function (m) {
          A.runSummary(m, { gameKey: GAME_KEY, score: final,
            lines: [["Level", level], ["Crumbs", runStats.crumbs], ["Bunnies swept", runStats.swept], ["Best chain", runStats.bestChain ? runStats.bestChain + "x" : "None"], ["Power-ups", runStats.powers]],
            onSaved: function () { best = A.leaderboard.best(GAME_KEY); syncHud(); } });
        },
        actions: [{ label: "Play again", primary: true, onClick: start }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
      A.announce("Game over. Score " + final + ".");
    }

    // ---------- Sneezes, shy mode, sweeping ----------
    function startSneeze() {
      lives--;
      deathTimer = DEATH_FRAMES;
      sneezeDir = { x: player.faceX, y: player.faceY };
      combo.reset();
      sfx.ah(); A.haptics.crash();
      camera.freeze(8);
      syncHud();
    }
    function achoo() {
      sfx.choo();
      camera.shake(0.55);
      var fx = sneezeDir.x, fy = sneezeDir.y;
      if (!fx && !fy) fy = -1;
      for (var i = 0; i < 12; i++) {
        var sp = 0.8 + Math.random() * 1.6, spread = (Math.random() * 2 - 1) * 0.9;
        particles.spawn(player.x + fx * 8, player.y - 4 + fy * 8, { vx: fx * sp + (fy ? spread : 0), vy: fy * sp + (fx ? spread : 0), life: 20 + Math.random() * 14,
          color: i % 3 ? pal.surface : pal.sageMist, size: 3.4, kind: "dot", drag: 0.94 });
      }
    }
    function afterDeath() {
      if (lives <= 0) { gameOver(); return; }
      resetActors();
      readyTimer = READY_AFTER_SNEEZE;
    }

    function startShy() {
      chain = 0;
      for (var i = 0; i < bunnies.length; i++) {
        var b = bunnies[i];
        if (b.mode === "puff" || b.mode === "enter") continue;
        b.shy = true;
        if (b.mode === "roam") { b.dx = -b.dx; b.dy = -b.dy; } // startled: turn tail
      }
    }
    function endShy() {
      chain = 0;
      for (var i = 0; i < bunnies.length; i++) bunnies[i].shy = false;
    }
    function shyLeft() { return powers.active("broom") ? powers.frac("broom") * POWERUPS.broom.duration : 0; }

    function sweepBunny(b) {
      chain++;
      var pts = 200 * Math.pow(2, Math.min(chain, 4) - 1); // 200 / 400 / 800 / 1600
      addScore(pts);
      runStats.swept++; runStats.bestChain = Math.max(runStats.bestChain, chain);
      b.mode = "puff"; b.shy = false;
      particles.burst(b.x, b.y, { n: 12, color: [colors().bunny[b.i], pal.surface], speed: 1.8, life: 22, size: 2.6, kind: ["dot", "ring"] });
      floaters.spawn(b.x, b.y - 14, "+" + pts + (chain > 1 ? " ×" + chain : ""), pal.forest, { size: chain > 1 ? 13 : 12 });
      camera.shake(0.2); camera.freeze(10);
      sfx.sweep(chain); A.haptics.pop();
      A.announce(BUNNY_DEFS[b.i].name + " swept up. Chain " + chain + ".");
    }

    function grantPower(id) {
      var def = POWERUPS[id];
      if (!def) return;
      if (id === "broom") {
        def.duration = shyFrames();
        powers.grant("broom");
        startShy();
        sfx.broom();
        particles.burst(player.x, player.y, { n: 10, color: [pal.ochre, pal.sageDeep], speed: 1.6, life: 20, size: 2.4, kind: ["leaf", "dot"] });
        camera.freeze(3);
      } else {
        powers.grant(id);
        if (id === "vacuum") sfx.vacuum(); else sfx.nap();
        particles.burst(player.x, player.y, { n: 14, color: [pal[def.color], pal.surface], speed: 2, life: 24, size: 2.6, kind: ["ring", "dot"] });
        camera.shake(0.12);
      }
      runStats.powers++;
      A.haptics.pop();
      floaters.spawn(player.x, player.y - 18, def.label, pal[def.color], { size: 13, font: "display" });
      shell.toast(def.label + ": " + def.text, 1600);
      A.announce(def.label + ". " + def.text + ".");
    }

    function levelClear() {
      var bonus = 500 * level;
      addScore(bonus);
      clearTimer = reduce ? 48 : CLEAR_FRAMES;
      powers.clear(); endShy(); snackTimer = 0; pickup = null; tidyTimer = 0;
      floaters.spawn(W / 2, centerOf(M.snack.r), "Tidy! +" + bonus, pal.forest, { size: 14, font: "display" });
      camera.freeze(8);
      sfx.level(); A.haptics.win();
      A.announce("Level " + level + " clear. Bonus " + bonus + ".");
    }
    function enterLevel(n) {
      level = n;
      buildLevel();
      resetActors();
      readyTimer = READY_FRAMES;
      story.advance(level);
      if (tidyTimer > 0) {
        shell.toast("Tidy round: no bunnies for 20 seconds, crumbs count double", 2400);
        A.announce("Tidy round. No bunnies for twenty seconds and every crumb counts double.");
      } else A.announce("Level " + level + ".");
      syncHud();
    }
    function nextLevel() { enterLevel(level + 1); }

    // ---------- Crumbs, snacks, pickups ----------
    function eatPellet(c, r, viaVacuum) {
      var i = r * COLS + c, kind = pellets[i];
      if (!kind) return;
      pellets[i] = 0;
      pelletsLeft--; eatenThisLevel++; crumbsThisTry++; runStats.crumbs++;
      var x = centerOf(c), y = centerOf(r);
      if (kind === 1) {
        addScore(tidyTimer > 0 ? 20 : 10);
        combo.hit();
        if (viaVacuum) {
          if (!reduce) suction.push({ x: x, y: y, life: 14 });
          if (time - lastSlurp > 5) { sfx.slurp(); lastSlurp = time; }
        } else {
          sfx.munch(combo.count() % 2 === 0);
          for (var k = 0; k < 2; k++) particles.spawn(x, y, { vx: (Math.random() * 2 - 1) * 1.2, vy: -0.6 - Math.random() * 0.9, life: 9 + Math.random() * 4, color: pal.ochre, size: 1.4, gravity: 0.08 });
        }
      } else {
        addScore(50);
        grantPower("broom");
      }
      var t = M.total;
      if (level >= 2 && (eatenThisLevel === Math.floor(t * 0.35) || eatenThisLevel === Math.floor(t * 0.75))) snackTimer = SNACK_FRAMES;
      if (eatenThisLevel === Math.floor(t * 0.2) || eatenThisLevel === Math.floor(t * 0.58)) placePickup();
      if (pelletsLeft <= 0) levelClear();
    }
    function placePickup() {
      var pc = tileOf(player.x), pr = tileOf(player.y);
      for (var tries = 0; tries < 200; tries++) {
        var c = 1 + Math.floor(Math.random() * (COLS - 2)), r = 1 + Math.floor(Math.random() * (ROWS - 2)), i = r * COLS + c;
        if (M.walls[i] !== 0 || !M.reach[i] || M.pen[i] || pellets[i] === 2) continue;
        if (c === M.snack.c && r === M.snack.r) continue;
        if (r === TUNNEL_ROW && (c < 4 || c > COLS - 5)) continue;
        if (Math.abs(c - pc) + Math.abs(r - pr) < 6) continue;
        pickup = { c: c, r: r, id: pickupIdx % 2 === 0 ? "vacuum" : "nap", t: PICKUP_FRAMES };
        pickupIdx++;
        return;
      }
    }
    function eatAt(c, r) {
      eatPellet(c, r, false);
      if (clearTimer > 0) return;
      if (snackTimer > 0 && c === M.snack.c && r === M.snack.r) {
        var pts = 100 * level;
        snackTimer = 0; runStats.snacks++;
        addScore(pts);
        floaters.spawn(centerOf(c), centerOf(r) - 14, "+" + pts, pal.forest, { size: 12 });
        particles.burst(centerOf(c), centerOf(r), { n: 10, color: [pal.clay, pal.ochre, pal.sageDeep], speed: 1.6, life: 20, size: 2.4, kind: ["dot", "leaf"] });
        sfx.snack(); A.haptics.pop();
      }
      if (pickup && c === pickup.c && r === pickup.r) {
        var id = pickup.id;
        pickup = null;
        grantPower(id);
      }
    }
    function vacuumTick() {
      var pc = tileOf(player.x), pr = tileOf(player.y), R = 2.5 * TILE;
      for (var r = pr - 3; r <= pr + 3; r++) {
        if (r < 0 || r >= ROWS) continue;
        for (var c = pc - 3; c <= pc + 3; c++) {
          if (c < 0 || c >= COLS || pellets[r * COLS + c] !== 1) continue;
          var dx = centerOf(c) - player.x, dy = centerOf(r) - player.y;
          if (dx * dx + dy * dy > R * R) continue;
          eatPellet(c, r, true);
          if (clearTimer > 0) return;
        }
      }
    }

    // ---------- Input ----------
    function steer(dx, dy) {
      if (state === "idle") start();
      if (state !== "running") return;
      player.wantX = dx; player.wantY = dy; // buffered until the turn is open
    }
    var input = A.makeInput(cv.el, {
      canvas: cv,
      keys: { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", " ": "action", Enter: "action", p: "pause" },
      onAction: function (a, repeat, e) {
        if (e && e.preventDefault) e.preventDefault();
        if (a === "left") steer(-1, 0);
        else if (a === "right") steer(1, 0);
        else if (a === "up") steer(0, -1);
        else if (a === "down") steer(0, 1);
        else if (a === "action") { if (repeat) return; if (state === "idle") start(); else if (state === "running") pause(); else if (state === "paused") resume(); }
        else if (a === "pause") { if (state === "running") pause(); else if (state === "paused") resume(); }
      },
      onSwipe: function (d) { if (d === "left") steer(-1, 0); else if (d === "right") steer(1, 0); else if (d === "up") steer(0, -1); else steer(0, 1); },
      onTap: function () { if (state === "idle") start(); else if (state === "paused") resume(); }
    });
    shell.onTap(function (id) {
      if (id === "left") steer(-1, 0); else if (id === "right") steer(1, 0); else if (id === "up") steer(0, -1); else if (id === "down") steer(0, 1);
      else if (id === "pause") { if (state === "running") pause(); else if (state === "paused") resume(); else if (state === "idle") start(); }
    });

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
            if (a.dx) a.x = wrapX(target); else a.y = target;
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
      if ((p.dx || p.dy) && !openFor(c + p.dx, r + p.dy, false)) { p.dx = 0; p.dy = 0; }
    }
    // Buffered steering: reverse instantly; a perpendicular turn takes as soon
    // as the child is within TURN_TOL px of a centre whose side is open.
    function applyWant(p) {
      if (!p.wantX && !p.wantY) return;
      if (p.wantX === p.dx && p.wantY === p.dy) return;
      if (!p.dx && !p.dy) return;
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
      if (p.dx) p.y = approach(p.y, centerOf(tileOf(p.y)), dist);
      else if (p.dy) p.x = approach(p.x, centerOf(tileOf(p.x)), dist);
      advance(p, dist, decidePlayer, false);
      p.moving = !!(p.dx || p.dy);
      if (p.moving) { p.faceX = p.dx; p.faceY = p.dy; p.walkT += dt; }
      eatAt(tileOf(p.x), tileOf(p.y));
      if (clearTimer <= 0 && powers.active("vacuum")) vacuumTick();
    }

    function targetFor(b) {
      var def = BUNNY_DEFS[b.i];
      if (wandering()) return def.corner;
      var pc = tileOf(player.x), pr = tileOf(player.y), fx = player.faceX, fy = player.faceY;
      if (b.i === 0) return { c: pc, r: pr };
      if (b.i === 1) return { c: pc + 4 * fx, r: pr + 4 * fy };
      if (b.i === 2) {
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
      if (b.shy) pick = opts[Math.floor(Math.random() * opts.length)];
      else {
        var t = targetFor(b), bestD = Infinity;
        for (k = 0; k < opts.length; k++) {
          var tc = c + opts[k].x - t.c, tr = r + opts[k].y - t.r, dd = tc * tc + tr * tr;
          if (dd < bestD) { bestD = dd; pick = opts[k]; }
        }
      }
      b.dx = pick.x; b.dy = pick.y;
    }
    function decidePuff(b) {
      var c = tileOf(b.x), r = tileOf(b.y);
      if (c === M.exit.c && r === M.exit.r) { b.mode = "enter"; b.dx = 0; b.dy = 0; return; }
      var bestD = Infinity, pick = null;
      for (var k = 0; k < 4; k++) {
        var nc = c + DIRS[k].x, nr = r + DIRS[k].y;
        if (!openFor(nc, nr, false)) continue;
        var hd = M.home[nr * COLS + ((nc + COLS) % COLS)];
        if (hd < bestD) { bestD = hd; pick = DIRS[k]; }
      }
      if (pick) { b.dx = pick.x; b.dy = pick.y; } else { b.dx = -b.dx; b.dy = -b.dy; }
    }
    function releaseReady(i) {
      var ease = Math.max(0, 1 - (level - 1) * 0.4);
      return crumbsThisTry >= Math.floor(RELEASE_CRUMBS[i] * ease) || releaseClock >= RELEASE_FRAMES[i] * Math.max(0.4, ease);
    }
    function updateBunnies(dt) {
      var napping = powers.active("nap");
      for (var i = 0; i < bunnies.length; i++) {
        var b = bunnies[i];
        if (b.mode === "pen") {
          if (tidyTimer > 0 || napping) continue;
          if (!b.released) {
            if ((i === 0 || bunnies[i - 1].released) && releaseReady(i)) { b.released = true; b.mode = "exit"; }
          } else {
            b.rest -= dt;
            if (b.rest <= 0) b.mode = "exit";
          }
        } else if (b.mode === "exit") {
          if (napping) continue;
          // slide to the door column, then float up through the lid
          var step = PEN_SPEED * dt, tx = centerOf(M.door.c), ty = centerOf(M.exit.r);
          if (b.x !== tx) b.x = approach(b.x, tx, step);
          else {
            b.y = approach(b.y, ty, step);
            if (b.y === ty) { b.mode = "roam"; b.dx = 0; b.dy = -1; sfx.hop(); }
          }
        } else if (b.mode === "enter") {
          var home = centerOf(M.door.r + 1);
          b.y = approach(b.y, home, PEN_SPEED * 2 * dt);
          if (b.y === home) { b.mode = "pen"; b.released = true; b.rest = 40; b.shy = false; }
        } else if (b.mode === "puff") {
          advance(b, PUFF_SPEED * dt, decidePuff, false);
        } else {
          if (napping) continue;
          var sp = bunnySpeed(), tr = tileOf(b.y), tc = tileOf(b.x);
          if (tr === TUNNEL_ROW && (tc <= 3 || tc >= COLS - 4)) sp = Math.min(sp, tunnelSpeed());
          if (b.shy) sp = Math.min(sp, shySpeed());
          advance(b, sp * dt, decideBunny, false);
        }
      }
    }
    function checkCollisions() {
      var napping = powers.active("nap");
      for (var i = 0; i < bunnies.length; i++) {
        var b = bunnies[i];
        if (b.mode !== "roam" && b.mode !== "exit") continue;
        var ddx = Math.abs(b.x - player.x);
        if (ddx > MAZE_W / 2) ddx = MAZE_W - ddx; // across the tunnel wrap
        if (ddx < HIT_DIST && Math.abs(b.y - player.y) < HIT_DIST) {
          if (b.shy) sweepBunny(b);
          else if (!napping) { startSneeze(); return; }
        }
      }
    }
    function reverseRoamers() {
      for (var i = 0; i < bunnies.length; i++) {
        var b = bunnies[i];
        if (b.mode === "roam" && !b.shy) { b.dx = -b.dx; b.dy = -b.dy; }
      }
    }

    // ---------- Tick ----------
    function tick(dt) {
      time += dt;
      camera.tick(dt); particles.tick(dt); floaters.tick(dt); story.tick(dt);
      for (var s = suction.length - 1; s >= 0; s--) {
        var it = suction[s];
        it.life -= dt;
        var k = Math.min(1, 0.28 * dt);
        it.x += (player.x - it.x) * k; it.y += (player.y - it.y) * k;
        if (it.life <= 0) suction.splice(s, 1);
      }
      if (state !== "running") return;
      shell.renderPips(powers.list(), pal);
      if (camera.frozen()) return;
      combo.tick(dt);

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

      powers.tick(dt);
      if (snackTimer > 0) snackTimer -= dt;
      if (pickup) { pickup.t -= dt; if (pickup.t <= 0) pickup = null; }
      if (tidyTimer > 0) {
        tidyTimer -= dt;
        if (tidyTimer <= 0) {
          tidyTimer = 0;
          shell.toast("Here come the bunnies", 1400);
          A.announce("The tidy round is over. Here come the bunnies.");
        }
      }
      // shy mode and naps pause the wander/chase clock (it resumes where it left off)
      if (!powers.active("broom") && !powers.active("nap")) {
        phaseTimer -= dt;
        if (phaseTimer <= 0) { phaseIdx++; phaseTimer = phaseLength(phaseIdx); reverseRoamers(); }
      }
      if (tidyTimer <= 0 && !powers.active("nap")) releaseClock += dt;

      updatePlayer(dt);
      if (clearTimer > 0) return; // that was the last crumb
      updateBunnies(dt);
      checkCollisions();
    }

    // ---------- Art ----------
    function drawWrapped(fn, obj, x, y) {
      fn(obj, x, y);
      if (x < TILE) fn(obj, x + MAZE_W, y);
      else if (x > MAZE_W - TILE) fn(obj, x - MAZE_W, y);
    }

    function drawWalls(rug, C) {
      if (!M.path) M.path = buildWallPath(M);
      var P = M.path;
      ctx.save();
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      // offset shadow, then ink outline, rug body, a lighter inner band and stitching
      ctx.translate(0, 3);
      ctx.strokeStyle = C.wallShadow; ctx.lineWidth = LW + 3; ctx.stroke(P.line);
      ctx.fillStyle = C.wallShadow; ctx.fill(P.sq);
      ctx.translate(0, -3);
      ctx.strokeStyle = pal.ink; ctx.stroke(P.line);
      ctx.fillStyle = pal.ink; ctx.fill(P.sq);
      ctx.strokeStyle = rug; ctx.lineWidth = LW; ctx.stroke(P.line);
      ctx.fillStyle = rug; ctx.fill(P.sq);
      ctx.strokeStyle = pal.shade(rug, pal.isDark ? 0.14 : 0.34); ctx.lineWidth = LW * 0.4; ctx.stroke(P.line);
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = pal.shade(rug, pal.isDark ? -0.3 : -0.2); ctx.lineWidth = 1; ctx.stroke(P.line);
      ctx.setLineDash([]);
      ctx.restore();
    }
    function drawChest() {
      var ch = M.chest;
      var x0 = (ch.c0 + 1) * TILE - 3, y0 = (ch.r0 + 1) * TILE - 3;
      var w = (ch.c1 - ch.c0 - 1) * TILE + 6, h = (ch.r1 - ch.r0 - 1) * TILE + 6;
      draw.box(ctx, x0, y0, w, h, 6, { fill: pal.paper2 });
      // a few toy blocks in the corners of the chest
      ctx.strokeStyle = pal.alpha(pal.ink, 0.12); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + h - 5); ctx.lineTo(x0 + w - 4, y0 + h - 5); ctx.stroke();
    }
    function drawDoor() {
      var d = M.door, x0 = d.c * TILE + 2, x1 = (d.c + 1) * TILE - 2, y = centerOf(d.r);
      ctx.save(); ctx.lineCap = "round";
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 5.6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.strokeStyle = pal.ochre; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.restore();
    }
    function drawCrumbs() {
      var r, c, brooms = [];
      ctx.beginPath();
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          var k = pellets[r * COLS + c];
          if (k === 1) { var x = centerOf(c), y = centerOf(r); ctx.moveTo(x + 2.4, y); ctx.arc(x, y, 2.4, 0, Math.PI * 2); }
          else if (k === 2) brooms.push(c, r);
        }
      }
      ctx.fillStyle = pal.ochre; ctx.fill();
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.1; ctx.stroke();
      for (var i = 0; i < brooms.length; i += 2) drawBroom(centerOf(brooms[i]), centerOf(brooms[i + 1]), 1);
    }
    function drawBroom(x, y, scale) {
      var bob = reduce ? 0 : Math.sin(time * 0.1 + x * 0.1) * 1.1;
      ctx.fillStyle = pal.alpha(pal.ochre, 0.2 + (reduce ? 0 : 0.08 * Math.sin(time * 0.12)));
      ctx.beginPath(); ctx.arc(x, y, 9 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(x + 1, y + bob); ctx.scale(scale, scale); ctx.rotate(-0.55);
      ctx.lineCap = "round";
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 1); ctx.stroke();
      ctx.strokeStyle = pal.forestDeep; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 1); ctx.stroke();
      draw.shape(ctx, function (g) { g.beginPath(); g.moveTo(-2.6, 0.5); g.lineTo(2.6, 0.5); g.lineTo(5, 8); g.quadraticCurveTo(0, 9.4, -5, 8); g.closePath(); },
        { fill: pal.ochre, stroke: pal.ink, lineWidth: 1.2, shadow: 1.5, shadowColor: pal.shadow });
      ctx.strokeStyle = pal.alpha(pal.ink, 0.45); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-1.2, 3); ctx.lineTo(-2.4, 7.6); ctx.moveTo(1.2, 3); ctx.lineTo(2.4, 7.6); ctx.stroke();
      ctx.fillStyle = pal.forest; ctx.fillRect(-2.9, 0.2, 5.8, 1.8);
      ctx.restore();
    }
    // Snacks as drawn fruit: apple (clay), pear (sage deep), banana (ochre).
    function drawFruit(kind, x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      var outline = { stroke: pal.ink, lineWidth: 1.3, shadow: 2, shadowColor: pal.shadow };
      if (kind === "apple") {
        draw.shape(ctx, function (g) { g.beginPath(); g.moveTo(0, -3.5); g.bezierCurveTo(4, -6.5, 8, -2, 6, 3); g.bezierCurveTo(4.5, 7, 1.5, 7.5, 0, 6); g.bezierCurveTo(-1.5, 7.5, -4.5, 7, -6, 3); g.bezierCurveTo(-8, -2, -4, -6.5, 0, -3.5); g.closePath(); },
          { fill: pal.clay, stroke: outline.stroke, lineWidth: outline.lineWidth, shadow: outline.shadow, shadowColor: outline.shadowColor });
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, -3.5); ctx.lineTo(0.8, -7.5); ctx.stroke();
        draw.leaf(ctx, 1, -6.5, 5, -0.5, { fill: pal.sageDeep, stroke: pal.ink, lineWidth: 1 });
        ctx.fillStyle = pal.alpha(pal.surface, 0.55); ctx.beginPath(); ctx.ellipse(-3, -1, 1.3, 2, 0.4, 0, Math.PI * 2); ctx.fill();
      } else if (kind === "pear") {
        draw.shape(ctx, function (g) { g.beginPath(); g.moveTo(0, -6); g.bezierCurveTo(2.6, -6, 2.6, -2, 3.6, 0); g.bezierCurveTo(6.5, 3, 5, 7.2, 0, 7.2); g.bezierCurveTo(-5, 7.2, -6.5, 3, -3.6, 0); g.bezierCurveTo(-2.6, -2, -2.6, -6, 0, -6); g.closePath(); },
          { fill: pal.sageDeep, stroke: outline.stroke, lineWidth: outline.lineWidth, shadow: outline.shadow, shadowColor: outline.shadowColor });
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-0.6, -8.6); ctx.stroke();
        draw.leaf(ctx, -0.4, -7.8, 4.4, -0.3, { fill: pal.forest, stroke: pal.ink, lineWidth: 1 });
        ctx.fillStyle = pal.alpha(pal.surface, 0.5); ctx.beginPath(); ctx.ellipse(-2.2, 2.4, 1.2, 1.9, 0.3, 0, Math.PI * 2); ctx.fill();
      } else {
        draw.shape(ctx, function (g) { g.beginPath(); g.moveTo(-6.5, -3.5); g.quadraticCurveTo(-4, 6.5, 6.5, 2.5); g.quadraticCurveTo(7, 4.8, 5.2, 5.4); g.quadraticCurveTo(-6.8, 9, -7.8, -2.8); g.closePath(); },
          { fill: pal.ochre, stroke: outline.stroke, lineWidth: outline.lineWidth, shadow: outline.shadow, shadowColor: outline.shadowColor });
        ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(-7.2, -3.2, 1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = pal.alpha(pal.ink, 0.35); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-5.6, -0.4); ctx.quadraticCurveTo(-3.5, 5, 4.5, 4); ctx.stroke();
      }
      ctx.restore();
    }
    function drawPickup(pk) {
      var def = POWERUPS[pk.id], col = pal[def.color];
      var x = centerOf(pk.c), y = centerOf(pk.r) + (reduce ? 0 : Math.sin(time * 0.12) * 1.4);
      var fade = pk.t < 90 && !reduce && Math.floor(pk.t / 8) % 2 === 0;
      if (fade) return;
      draw.circle(ctx, x, y, 7.6, { fill: col, stroke: pal.ink, lineWidth: 1.4, shadow: 2.5, shadowColor: pal.shadow });
      draw.circle(ctx, x, y, 10 + (reduce ? 0 : Math.sin(time * 0.1) * 1.2), { stroke: pal.alpha(col, 0.55), lineWidth: 1.2 });
      draw.label(ctx, pk.id === "vacuum" ? "V" : "z", x, y + 0.5, { font: "display", size: 12, color: pal.surface, weight: 600 });
    }

    // The sweeper: a small child with a dustpan, eyes that look where they
    // go, a forest sweater and legs that scissor while moving. `pose`
    // covers the sneeze: "ah" | "choo" | "dazed".
    function drawKid(p, x, y, pose) {
      var C = colors();
      var fx = p.faceX, fy = p.faceY;
      var sw = (!reduce && p.moving && !pose) ? Math.sin(p.walkT * 0.34) : 0;
      var hy = y - 5.5 + (pose === "ah" && !reduce ? -1 : 0);
      var squash = pose === "choo" && !reduce;
      ctx.fillStyle = pal.shadow; ctx.beginPath(); ctx.ellipse(x, y + 8.6, 6.2, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineCap = "round";
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(x - 2.1, y + 3); ctx.lineTo(x - 2.1 + sw * 2.6, y + 8.2); ctx.moveTo(x + 2.1, y + 3); ctx.lineTo(x + 2.1 - sw * 2.6, y + 8.2); ctx.stroke();
      if (fy < 0) drawPan(x, y, fx, fy);
      draw.box(ctx, x - 5.6, y - 1.8, 11.2, 7.6, 3.6, { fill: pal.forest, stroke: pal.ink, lineWidth: 1.3 });
      ctx.fillStyle = pal.alpha(pal.sage, 0.75); ctx.fillRect(x - 4.6, y + 2.2, 9.2, 1.2);
      // head
      ctx.save();
      if (squash) { ctx.translate(x, hy); ctx.scale(1.12, 0.86); ctx.translate(-x, -hy); }
      draw.circle(ctx, x, hy, 5.4, { fill: C.skin, stroke: pal.ink, lineWidth: 1.3 });
      ctx.beginPath(); ctx.arc(x, hy, 5.5, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(x + 2.5, hy - 2.6 + (fy < 0 ? 2.5 : 0), x - 5.4, hy - 0.8);
      ctx.closePath(); ctx.fillStyle = C.hair; ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1; ctx.stroke();
      var blink = pose === "choo" ? 1 : pose === "ah" ? 0.5 : (!reduce && Math.floor(time / 80) % 6 === 0 && time % 80 < 6 ? 1 : 0);
      draw.eyes(ctx, x + fx * 1.6, hy + 1.1 + fy * 0.6, 4.2, 1.45, fx, fy, pal, { blink: blink });
      ctx.restore();
      if (fy >= 0) drawPan(x, y, fx, fy);
    }
    function drawPan(x, y, fx, fy) {
      var px, py, flip;
      if (fx) { px = x + fx * 7.6; py = y + 3.4; flip = fx; }
      else { px = x + 7.2; py = y + 2.6 + fy * 1.6; flip = 1; }
      ctx.save(); ctx.translate(px, py); ctx.scale(flip, 1);
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-1.5, -1); ctx.lineTo(-4, -4); ctx.stroke();
      draw.shape(ctx, function (g) { g.beginPath(); g.moveTo(-2, -1.6); g.lineTo(3.6, -2.6); g.lineTo(3.6, 3.2); g.lineTo(-2, 2.2); g.closePath(); },
        { fill: pal.surface2, stroke: pal.ink, lineWidth: 1.2 });
      ctx.restore();
    }

    // Dust bunnies: round body, two ears, eyes, a personality colour.
    function drawBunny(b, x, y) {
      var C = colors();
      if (b.mode === "puff") {
        ctx.save(); ctx.globalAlpha = 0.5;
        draw.circle(ctx, x, y, 6.4, { fill: pal.surface, stroke: pal.inkMuted, lineWidth: 1 });
        ctx.restore();
        draw.eyes(ctx, x + b.dx, y + b.dy, 5, 1.8, b.dx, b.dy, pal);
        return;
      }
      var napping = (powers.active("nap") && (b.mode === "roam" || b.mode === "exit")) || (tidyTimer > 0 && b.mode === "pen");
      var bob = 0;
      if (!reduce && !napping) {
        if (b.mode === "pen") bob = Math.sin((time + b.i * 17) * 0.1) * 1.4;
        else bob = Math.floor((time + b.i * 11) / 10) % 2 ? -1 : 0;
      }
      var wob = b.shy && !reduce ? Math.sin(time * 0.7 + b.i) * 0.8 : 0;
      x += wob; y += bob;
      var body = C.bunny[b.i];
      if (b.shy) {
        var left = shyLeft();
        body = (!reduce && left < SHY_BLINK && Math.floor(left / 10) % 2 === 0) ? pal.surface : pal.sageMist;
      }
      for (var s = -1; s <= 1; s += 2) {
        ctx.save(); ctx.translate(x + s * 3, y - 6.6); ctx.rotate(s * 0.24);
        ctx.beginPath(); ctx.ellipse(0, 0, 2.3, 4.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0.6, 1, 3, 0, 0, Math.PI * 2); ctx.fillStyle = pal.alpha(pal.surface, 0.5); ctx.fill();
        ctx.restore();
      }
      draw.circle(ctx, x, y + 0.6, 7.2, { fill: body, stroke: pal.ink, lineWidth: 1.3, shadow: 2, shadowColor: pal.shadow });
      ctx.fillStyle = pal.alpha(pal.surface, 0.35); ctx.beginPath(); ctx.ellipse(x - 2.4, y - 1.6, 2.6, 1.7, -0.4, 0, Math.PI * 2); ctx.fill();
      var lx = b.dx, ly = b.dy;
      draw.eyes(ctx, x + lx * 1.2, y - 0.2 + ly * 0.8, 5.2, 1.9, lx, ly, pal, { blink: (b.shy || napping) ? 1 : 0 });
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(x + lx * 1.4, y + 2.8, 0.9, 0, Math.PI * 2); ctx.fill();
      if (napping) {
        var zy = reduce ? 0 : (time * 0.04 + b.i) % 4;
        draw.label(ctx, "z", x + 7, y - 9 - zy, { font: "display", size: 10, color: pal.inkMuted, weight: 600 });
      }
    }

    function drawBanner() {
      var bn = story.banner();
      if (!bn || state !== "running") return;
      var a = Math.min(1, bn.frac * 3) * Math.min(1, (1 - bn.frac) * 6 + 0.2);
      ctx.save(); ctx.globalAlpha = a;
      var cy = TOP + 74 + (reduce ? 0 : (1 - Math.min(1, (1 - bn.frac) * 4)) * -10);
      var bw = 272, bh = 54;
      draw.box(ctx, W / 2 - bw / 2, cy - bh / 2, bw, bh, 8, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.3, shadow: 3, shadowColor: pal.shadow });
      ctx.font = "500 22px " + pal.fontDisplay;
      var tw = ctx.measureText(bn.name).width;
      draw.leaf(ctx, W / 2 - tw / 2 - 18, cy - 9, 12, -0.5, { fill: pal.sageDeep, stroke: pal.ink, lineWidth: 1 });
      draw.label(ctx, bn.name, W / 2, cy - 9, { font: "display", size: 22, color: pal.ink, weight: 500 });
      draw.label(ctx, bn.text, W / 2, cy + 14, { size: 11, color: pal.inkMuted, weight: 500, maxWidth: bw - 16 });
      ctx.restore();
    }

    function drawBands() {
      // top band: level and room, crumbs left or the tidy-round clock
      var ch = CHAPTERS[story.index()];
      draw.label(ctx, "Level " + level + " · " + ch.name, W / 2, TOP / 2 + 1, { size: 11, color: pal.inkSoft, weight: 600 });
      if (tidyTimer > 0 && state !== "idle") {
        var secs = Math.ceil(tidyTimer / 60);
        draw.label(ctx, "Tidy round " + secs + "s", W - 10, TOP / 2 + 1, { size: 11, color: pal.forest, weight: 700, align: "right" });
        ctx.fillStyle = pal.alpha(pal.forest, 0.5); ctx.fillRect(W - 96, TOP - 4, 86 * (tidyTimer / TIDY_FRAMES), 2);
      } else {
        draw.label(ctx, pelletsLeft + " left", W - 10, TOP / 2 + 1, { size: 11, color: pal.inkMuted, weight: 600, align: "right" });
      }
      // bottom band: tries (little heads) and the fruit of each level so far
      var C = colors(), by = TOP + MAZE_H + BOTTOM / 2 - 1, i;
      for (i = 0; i < Math.min(lives, 6); i++) {
        var lx = 16 + i * 18;
        draw.circle(ctx, lx, by, 5.4, { fill: C.skin, stroke: pal.ink, lineWidth: 1.2 });
        ctx.beginPath(); ctx.arc(lx, by, 5.5, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(lx + 2.5, by - 2.6, lx - 5.4, by - 0.8); ctx.closePath();
        ctx.fillStyle = C.hair; ctx.fill();
        ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(lx - 1.8, by + 1, 0.9, 0, Math.PI * 2); ctx.arc(lx + 1.8, by + 1, 0.9, 0, Math.PI * 2); ctx.fill();
      }
      for (var lv = level, n = 0; lv >= 1 && n < 6; lv--, n++) drawFruit(FRUITS[(lv - 1) % 3], W - 16 - n * 20, by, 0.8);
      // progress along the bottom rule: toward the next chapter, or through this room's crumbs
      if (state === "running" || state === "paused") {
        var frac = M.total ? (M.total - pelletsLeft) / M.total : 0;
        var prog = story.next() ? story.progress(level + frac) : frac;
        ctx.fillStyle = pal.rule; ctx.fillRect(0, H - 2, W, 2);
        ctx.fillStyle = pal.alpha(pal.forest, 0.6); ctx.fillRect(0, H - 2, W * prog, 2);
      }
    }

    function render() {
      cv.begin(camera);
      var C = colors();
      ctx.fillStyle = pal.paper; ctx.fillRect(0, 0, W, H);

      ctx.save(); ctx.translate(0, TOP);
      // floor: paper with a dot grid on the tile corners
      ctx.save(); ctx.translate(-TILE / 2, -TILE / 2);
      draw.paper(ctx, MAZE_W + TILE, MAZE_H + TILE, pal, { step: TILE, dot: 1 });
      ctx.restore();

      var clearT = CLEAR_FRAMES - clearTimer;
      var flash = clearTimer > 0 && !reduce && clearT > CLEAR_HOLD && Math.floor((clearT - CLEAR_HOLD) / CLEAR_FLASH) % 2 === 0;
      drawChest();
      drawWalls(flash ? pal.surface : C.rugs[(level - 1) % 3], C);
      drawDoor();
      drawCrumbs();

      if (snackTimer > 0 && (reduce || snackTimer > 90 || Math.floor(snackTimer / 8) % 2 === 0)) {
        drawFruit(FRUITS[(level - 1) % 3], centerOf(M.snack.c), centerOf(M.snack.r), 1);
      }
      if (pickup) drawPickup(pickup);

      var i;
      if (clearTimer <= 0) for (i = 0; i < bunnies.length; i++) drawWrapped(drawBunny, bunnies[i], bunnies[i].x, bunnies[i].y);

      if (deathTimer > 0) {
        var d0 = DEATH_FRAMES - deathTimer;
        var pose = d0 < CHOO_AT ? "ah" : d0 < CHOO_AT + 12 ? "choo" : "dazed";
        if (reduce || deathTimer > 24 || Math.floor(deathTimer / 4) % 2 === 0) drawWrapped(function (p, x, y) { drawKid(p, x, y, pose); }, player, player.x, player.y);
      } else {
        drawWrapped(function (p, x, y) { drawKid(p, x, y, null); }, player, player.x, player.y);
      }

      // vacuum: a faint ring for the reach, crumbs flying in
      if (powers.active("vacuum") && state === "running") {
        ctx.strokeStyle = pal.alpha(pal.research, 0.35); ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(player.x, player.y, 2.5 * TILE, reduce ? 0 : time * 0.05, (reduce ? 0 : time * 0.05) + Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      for (var s = 0; s < suction.length; s++) {
        var it = suction[s];
        draw.circle(ctx, it.x, it.y, 2.4 * Math.max(0.3, it.life / 14), { fill: pal.ochre, stroke: pal.ink, lineWidth: 1 });
      }

      particles.render(ctx);
      floaters.render(ctx);
      ctx.restore();

      // Ready card under the toy chest
      if (readyTimer > 0 && state === "running" && deathTimer <= 0 && clearTimer <= 0) {
        var ry = TOP + centerOf(M.snack.r);
        draw.box(ctx, W / 2 - 46, ry - 12, 92, 24, 6, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.2, shadow: 2, shadowColor: pal.shadow });
        draw.label(ctx, reduce ? "Level " + level : "Ready", W / 2, ry + 0.5, { font: "display", size: 16, color: pal.forest, weight: 600 });
      }
      // the sneeze
      if (deathTimer > 0 && DEATH_FRAMES - deathTimer >= CHOO_AT) {
        var bx = clamp(player.x, 50, W - 50), byy = clamp(TOP + player.y - 22, TOP + 16, H - 40);
        ctx.save(); ctx.globalAlpha = clamp(deathTimer / 40, 0, 1);
        draw.label(ctx, "Achoo!", bx, byy, { font: "display", size: 22, color: pal.clayText, weight: 600 });
        ctx.restore();
      }
      drawBanner();
      drawBands();
      cv.end();
    }

    var loop = A.makeLoop(tick, render);
    function onHidden() { if (state === "running") pause(); }

    A.debug("maze", {
      state: function () { return state; },
      score: function () { return Math.floor(score); },
      stats: function () { return runStats; },
      info: function () {
        return { state: state, level: level, maze: M.index, lives: lives, crumbsLeft: pelletsLeft, tidy: Math.ceil(tidyTimer / 60), ready: readyTimer > 0,
          powers: powers.list().map(function (p) { return p.id; }), bunnies: bunnies.map(function (b) { return b.mode + (b.shy ? "/shy" : ""); }), pickup: pickup ? pickup.id : null, snack: snackTimer > 0 };
      },
      grant: function (id) { if (state === "running") grantPower(id); },
      skipToLevel: function (n) {
        if (state !== "running") start();
        clearTimer = 0; deathTimer = 0;
        enterLevel(Math.max(1, n | 0));
      },
      clearLevel: function () {
        if (state !== "running" || clearTimer > 0) return;
        for (var i = 0; i < pellets.length; i++) pellets[i] = 0;
        pelletsLeft = 0; levelClear();
      },
      die: function () { if (state === "running" && deathTimer <= 0 && clearTimer <= 0) { readyTimer = 0; startSneeze(); } },
      snack: function () { snackTimer = SNACK_FRAMES; },
      pickup: function () { placePickup(); return pickup; }
    });

    return {
      held: input.held,
      activate: function () {
        pal = A.theme();
        cv.fit();
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
    A.defineGame("maze", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Crumb Chase",
        tagline: "Sweep every crumb. Mind the dust bunnies.",
        label: "Crumb Chase game",
        canvas: { w: W, h: H, label: "Crumb Chase play field" },
        hud: [{ id: "score", label: "Score", value: 0 }, { id: "best", label: "Best", value: A.leaderboard.best(GAME_KEY) }, { id: "level", label: "Level", value: 1 }, { id: "tries", label: "Tries", value: 3 }],
        help: "Arrows or WASD steer · swipe on the field · Space starts and pauses · M mutes · Esc closes",
        touch: [
          { id: "left", label: "◀", aria: "Steer left", tap: true },
          { id: "up", label: "▲", aria: "Steer up", tap: true },
          { id: "down", label: "▼", aria: "Steer down", tap: true },
          { id: "right", label: "▶", aria: "Steer right", tap: true },
          { id: "pause", label: "Pause", aria: "Pause or resume", tap: true }
        ]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
