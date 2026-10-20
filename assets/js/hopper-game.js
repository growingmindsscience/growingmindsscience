/* Growing Minds Science — hopper-game.js
   "Special Delivery" on the Arcade page: a crossing game. A small envelope
   courier carries a letter from the bottom of the field to one of five
   mailboxes at the top: first across five lanes of rolling wooden toys,
   then over a story stream you can only cross by riding floating picture
   books. Fill all five mailboxes to move to the next neighborhood, where
   everything moves a little quicker.

   Core v2 game (see docs/arcade/plan.md and docs/arcade/game-brief.md):
   live brand tokens through A.theme(), the shared shell and canvas,
   makeStory for the five rounds (Hallway, Playroom, Garden, Library,
   Night Walk), makePowerups for Umbrella, Skates and Lantern, runSummary
   for the end card. CSP-safe: no eval, no external assets, audio is the
   shared Web Audio synth. Honors prefers-reduced-motion.

   Rules kept from the first version: lane structure, a 60 second clock per
   letter, three lives, swipe chaining, riding a book carries you with it,
   and a speed multiplier per round. New: up to two queued hops, a bench on
   the safe row that shelters the courier for a second after landing (toys
   can't squish it and the clock pauses), flags that rise on delivery.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "special-delivery";
  var MUTE_KEY = "gms-hopper-muted";

  // ---------- Grid ----------
  // 416 x 448 logical: a near-square portrait field that fits a phone held
  // either way, so the grid never turns on end.
  var CELL = 32, COLS = 13, ROWS = 14;
  var W = COLS * CELL, H = ROWS * CELL;
  var HOME_ROW = 0, MEDIAN_ROW = 6, SAFE_ROW = 12, START_ROW = 13;
  var STREAM_ROWS = [1, 2, 3, 4, 5], TOY_ROWS = [7, 8, 9, 10, 11];
  var SLOT_COLS = [0, 3, 6, 9, 12];
  var BENCH_FROM = 5, BENCH_TO = 7;          // bench spans these columns on the safe row
  var LANTERNS = [[1, 6], [11, 6], [2, 12], [10, 12]]; // Night Walk posts: [col, row]
  var PAD = CELL * 3;                        // off-field margin so lane items slide in and out
  var LETTER_TIME = 3600;                    // 60 s per letter
  var HOP_FRAMES = 8, SKATE_FRAMES = 11, SHELTER_FRAMES = 60, FLOAT_FRAMES = 90;

  // Lane recipes: [row, dir, speed (px per frame), item width (cells), kind]
  var STREAM_LANES = [
    [1, 1, 1.00, 3, "book"],
    [2, -1, 0.76, 2, "book"],
    [3, 1, 1.24, 3, "book"],
    [4, -1, 0.90, 2, "book"],
    [5, 1, 0.84, 3, "book"]
  ];
  var TOY_LANES = [
    [7, -1, 1.44, 2, "wagon"],
    [8, 1, 0.96, 1, "ball"],
    [9, -1, 1.20, 2, "train"],
    [10, 1, 1.70, 1, "car"],
    [11, -1, 0.84, 2, "blocks"]
  ];

  // ---------- Story: five neighborhoods, one per round ----------
  // tint / amt shift the ground a little each round; Night Walk darkens it.
  var CHAPTERS = [
    { name: "Hallway", at: 1, text: "Hop past the toys, ride the books, find a mailbox.", tint: null, amt: 0 },
    { name: "Playroom", at: 2, text: "The toys roll a little faster now.", tint: "ochre", amt: 0.06 },
    { name: "Garden", at: 3, text: "Past the hedge, the stream runs quicker.", tint: "sage", amt: 0.16 },
    { name: "Library", at: 4, text: "So many books. Choose your stepping stones.", tint: "research", amt: 0.07 },
    { name: "Night Walk", at: 5, text: "Lanterns light the last stretch home.", tint: "fieldInk", amt: 0.68, night: true }
  ];

  var POWERUPS = {
    umbrella: { label: "Umbrella", color: "research", uses: 1, text: "One safe splash" },
    skates: { label: "Skates", color: "sage", duration: 480, text: "Hops cover two rows when the landing is clear" },
    lantern: { label: "Lantern", color: "ochre", duration: 300, text: "Toys roll at half speed" },
    // Not a timed effect: a pickup on the median, scored on the spot.
    parcel: { label: "Bonus Parcel", color: "forest", duration: 1, text: "Extra points" }
  };
  var LANE_POWERS = ["umbrella", "skates", "lantern"];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function isStream(row) { return STREAM_ROWS.indexOf(row) !== -1; }
  function isToyRow(row) { return TOY_ROWS.indexOf(row) !== -1; }
  function luminance(hex) { var c = A.color.parse(hex); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }

  // ======================================================================
  //  Game
  // ======================================================================
  function createGame(shell) {
    var cv = shell.canvas, ctx = cv.ctx, draw = A.draw;
    var pal = A.theme();
    var offTheme = A.onThemeChange(function (p) { pal = p; });
    var reduce = A.prefersReducedMotion();

    var camera = A.makeCamera({ reduce: reduce, maxPx: 4 });
    var combo = A.makeCombo({ window: 900, max: 5 });
    var particles = A.makeParticles({ cap: 90, reduce: reduce });
    var floaters = A.makeFloaters({ cap: 12, reduce: reduce });
    var wake = A.makeWakeLock();
    var unsubHidden = null;
    var synth = A.makeSynth({ muteKey: MUTE_KEY });
    shell.bindSynth(synth);

    var story = A.makeStory(CHAPTERS, { onEnter: onRound, bannerFrames: 170 });
    var powers = A.makePowerups(POWERUPS, {});

    var state = "idle"; // idle | running | paused | gameover
    var player, lanes, slots, flags, round, lives, score, best, bestRow, letterTimer;
    var deathT, deathReason, clearT, shelterT, landT, hopQ;
    var pickup, parcel, nextPickup, nextParcel;
    var delivered, time, runStats;

    best = A.leaderboard.best(GAME_KEY);

    // ---------- Audio ----------
    var sfx = {
      hop: function () { synth.beep(300, 420, 0.05, "square", 0.22); },
      forward: function () { synth.beep(420, 580, 0.05, "triangle", 0.35); },
      bump: function () { synth.beep(180, 150, 0.05, "square", 0.15); },
      deliver: function (step) { var b = 1 + (Math.max(1, step || 1) - 1) * 0.08; synth.arp([523 * b, 659 * b, 784 * b], 0.06, 0.16, "triangle", 0.45); },
      round: function () { synth.arp([392, 523, 659, 784, 1046], 0.07, 0.2, "triangle", 0.45); },
      power: function () { synth.arp([659, 880, 1318], 0.045, 0.12, "triangle", 0.4); },
      parcel: function () { synth.arp([784, 988, 1175, 1568], 0.05, 0.12, "triangle", 0.4); },
      shelter: function () { synth.beep(520, 660, 0.08, "sine", 0.25); },
      umbrella: function () { synth.beep(700, 400, 0.18, "sine", 0.35); },
      splash: function () { synth.noise(0.3, 520, 0.5, 2); synth.beep(260, 80, 0.22, "sine", 0.4); },
      squish: function () { synth.noise(0.26, 300, 0.55, 4); synth.beep(200, 70, 0.2, "sawtooth", 0.45); }
    };

    // ---------- Lanes ----------
    function speedMul() { return Math.min(1 + (round - 1) * 0.16, 2); }
    function buildLane(recipe) {
      var kind = recipe[4], stream = kind === "book";
      var items = [], pos = Math.random() * CELL * 3, loopTarget = W + PAD * 2, n = 0;
      while (pos < loopTarget) {
        var iw = recipe[3] * CELL;
        items.push({ start: pos, w: iw, seed: Math.floor(Math.random() * 97) + n });
        pos += iw + (stream ? 2 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3)) * CELL;
        n++;
      }
      return { row: recipe[0], dir: recipe[1], speed: recipe[2], kind: kind, isStream: stream, loop: pos, items: items, offset: 0 };
    }
    function buildWave() {
      lanes = [];
      var i;
      for (i = 0; i < STREAM_LANES.length; i++) lanes.push(buildLane(STREAM_LANES[i]));
      for (i = 0; i < TOY_LANES.length; i++) lanes.push(buildLane(TOY_LANES[i]));
    }
    function laneAt(row) { for (var i = 0; i < lanes.length; i++) if (lanes[i].row === row) return lanes[i]; return null; }
    function laneVel(lane) {
      var m = lane.isStream ? 1 : (powers.active("lantern") ? 0.5 : 1);
      return lane.dir * lane.speed * speedMul() * m;
    }
    // Screen x of an item's left edge, optionally `ahead` frames in the future.
    function itemX(lane, item, ahead) {
      var x = (item.start + lane.offset + (ahead ? laneVel(lane) * ahead : 0)) % lane.loop;
      if (x < 0) x += lane.loop;
      return x - PAD;
    }
    function moveLanes(dt) {
      for (var i = 0; i < lanes.length; i++) {
        var l = lanes[i];
        l.offset = (l.offset + laneVel(l) * dt) % l.loop;
      }
    }
    function bookUnder(lane, x, ahead) {
      for (var i = 0; i < lane.items.length; i++) {
        var bx = itemX(lane, lane.items[i], ahead);
        if (x >= bx - 3 && x <= bx + lane.items[i].w + 3) return i;
      }
      return -1;
    }
    function toyHits(lane, x, margin, ahead) {
      for (var i = 0; i < lane.items.length; i++) {
        var tx = itemX(lane, lane.items[i], ahead);
        if (x + margin > tx + 4 && x - margin < tx + lane.items[i].w - 4) return true;
      }
      return false;
    }
    function slotNear(x) {
      for (var s = 0; s < SLOT_COLS.length; s++) {
        if (!slots[s] && Math.abs(SLOT_COLS[s] * CELL + CELL / 2 - x) <= CELL * 0.6) return s;
      }
      return -1;
    }
    // Is the cell at (row, center x) safe to land on `ahead` frames from now?
    function safeAt(row, x, ahead) {
      if (row < HOME_ROW || row > START_ROW) return false;
      if (row === HOME_ROW) return slotNear(x) !== -1;
      var lane = laneAt(row);
      if (isStream(row)) return bookUnder(lane, x, ahead) !== -1;
      if (isToyRow(row)) return !toyHits(lane, x, 14, ahead);
      return true;
    }

    // ---------- Courier ----------
    function cx() { return player.px + CELL / 2; }
    function footY(row) { return row * CELL + 27; }
    function resetPlayer() {
      player = { px: Math.floor(COLS / 2) * CELL, row: START_ROW, hopT: 0, hopLen: HOP_FRAMES, fromX: 0, fromRow: START_ROW,
        steps: 1, face: { x: 0, y: -1 }, floatT: 0, hidden: false };
      bestRow = START_ROW;
      letterTimer = LETTER_TIME;
      hopQ = [];
      shelterT = 0; landT = 0;
    }

    function resetWorld() {
      round = 1; lives = 3; score = 0; delivered = 0; time = 0;
      slots = [false, false, false, false, false];
      flags = [0, 0, 0, 0, 0];
      deathT = 0; deathReason = ""; clearT = 0;
      pickup = null; parcel = null;
      nextPickup = 420 + Math.random() * 240; nextParcel = 900 + Math.random() * 480;
      combo.reset(true); powers.clear(); story.reset();
      particles.clear(); floaters.clear();
      runStats = { chapter: 0, powers: 0, parcels: 0 };
      buildWave();
      resetPlayer();
      syncHud();
    }

    function syncHud() {
      shell.hud.set("score", score);
      shell.hud.set("best", Math.max(best, score));
      shell.hud.set("round", round);
      shell.hud.set("lives", lives);
    }

    function onRound(ch, idx) {
      runStats.chapter = Math.max(runStats.chapter, idx);
      if (idx > 0) {
        sfx.round(); A.haptics.win();
        A.announce("Round " + round + ", " + ch.name + ". " + ch.text);
      }
    }

    // ---------- Flow ----------
    function showStart() {
      var p = A.progress.get(GAME_KEY);
      shell.prompt.show({
        kicker: "Special Delivery",
        title: p.plays ? "Another letter to carry" : "Carry the letter home.",
        text: "Hop with the arrow keys, a swipe or a tap. Dodge the rolling toys, ride the picture books across the story stream, and drop a letter in each of the five mailboxes.",
        actions: [{ label: "Start", primary: true, onClick: start }],
        board: p.plays ? function (m) { A.renderLeaderboard(m, GAME_KEY, {}); } : null
      });
    }
    function start() {
      synth.ensure();
      resetWorld();
      story.set(0);
      state = "running";
      shell.prompt.hide();
      wake.acquire();
      try { cv.el.focus({ preventScroll: true }); } catch (e) {}
      A.announce("Go. Round one, Hallway. " + CHAPTERS[0].text);
    }
    function pause() {
      if (state !== "running") return;
      state = "paused";
      wake.release();
      shell.prompt.show({ kicker: "Paused", title: CHAPTERS[story.index()].name,
        text: "Your letter waits right where it stands. Score " + score + " · " + lives + (lives === 1 ? " life" : " lives") + " left.",
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
      var placed = score > 0 && score >= best;
      if (score > best) best = score;
      A.progress.record(GAME_KEY, { score: score, chapter: runStats.chapter, badges: runStats.chapter >= 4 ? ["night-walk"] : [] });
      syncHud();
      var ch = CHAPTERS[story.index()];
      shell.prompt.show({
        kicker: "Out of letters",
        title: placed ? "A new best: " + score : "Score " + score,
        text: "You reached " + ch.name + " (round " + round + ") and delivered " + delivered + (delivered === 1 ? " letter." : " letters."),
        board: function (m) {
          A.runSummary(m, { gameKey: GAME_KEY, score: score,
            lines: [["Neighborhood", ch.name], ["Round", round], ["Letters delivered", delivered], ["Best streak", combo.best() + "x"], ["Power-ups", runStats.powers]],
            onSaved: function () { best = A.leaderboard.best(GAME_KEY); syncHud(); } });
        },
        actions: [{ label: "Play again", primary: true, onClick: start }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
      A.announce("Game over. Score " + score + ".");
    }

    // ---------- Death and delivery ----------
    function loseLetter(reason) {
      if (deathT > 0 || state !== "running") return;
      lives -= 1;
      deathT = 54; deathReason = reason;
      combo.reset(); hopQ = []; player.floatT = 0;
      var x = cx(), y = footY(player.row) - 10;
      if (reason === "splash") {
        sfx.splash(); camera.shake(0.5);
        particles.burst(x, y + 6, { n: 14, color: [pal.research, pal.sageDeep, pal.surface], speed: 1.8, life: 26, size: 2.4, kind: ["dot", "ring"], gravity: 0.06 });
        floaters.spawn(x, y - 16, "Splash!", pal.research, { size: 22, font: "display", life: 64, stroke: pal.surface, vy: -0.3 });
      } else if (reason === "squish") {
        sfx.squish(); camera.shake(0.6);
        particles.burst(x, y, { n: 12, color: [pal.clay, pal.ochre, pal.surface], speed: 1.8, life: 24, size: 2.4, kind: ["square", "dot"] });
        floaters.spawn(x, y - 16, "Squish!", pal.clayText, { size: 22, font: "display", life: 64, stroke: pal.surface, vy: -0.3 });
      } else {
        sfx.squish(); camera.shake(0.3);
        floaters.spawn(x, y - 16, "Time's up", pal.clayText, { size: 20, font: "display", life: 70, stroke: pal.surface, vy: -0.3 });
      }
      A.haptics.crash();
      camera.freeze(5);
      syncHud(); shell.hud.flash("lives");
      A.announce(reason === "time" ? "Time's up. " : (reason === "splash" ? "Splash. " : "Squish. ") + (lives > 0 ? lives + (lives === 1 ? " life" : " lives") + " left." : ""));
    }
    function afterDeath() {
      deathT = 0;
      if (lives <= 0) { gameOver(); return; }
      resetPlayer();
    }

    function deliver(s) {
      slots[s] = true; delivered += 1;
      var mult = combo.hit();
      var pts = (50 * round + Math.floor(letterTimer / 120) * 2) * mult;
      score += pts;
      var filled = 0;
      for (var i = 0; i < slots.length; i++) if (slots[i]) filled++;
      var mx = SLOT_COLS[s] * CELL + CELL / 2;
      floaters.spawn(mx, CELL + 10, "+" + pts + (mult > 1 ? " ×" + mult : ""), mult > 1 ? pal.forest : pal.ink, { size: mult > 1 ? 14 : 12, stroke: pal.surface });
      particles.burst(mx, 12, { n: 12, color: [pal.ochre, pal.sageDeep, pal.surface], speed: 1.6, life: 24, size: 2.4, kind: ["dot", "leaf"] });
      sfx.deliver(filled); A.haptics.pop(); camera.shake(0.15);
      shell.hud.flash("score");
      if (filled === slots.length) {
        var bonus = 150 + 50 * round;
        score += bonus;
        clearT = 70; player.hidden = true; hopQ = [];
        floaters.spawn(W / 2, MEDIAN_ROW * CELL + 16, "Round clear +" + bonus, pal.forest, { size: 18, font: "display", life: 70, stroke: pal.surface, vy: -0.2 });
        A.announce("All five letters delivered. Round clear.");
      } else {
        A.announce("Letter delivered. " + (slots.length - filled) + " to go.");
        resetPlayer();
      }
      syncHud();
    }
    function nextRound() {
      clearT = 0;
      round += 1;
      slots = [false, false, false, false, false];
      flags = [0, 0, 0, 0, 0];
      buildWave();
      resetPlayer();
      pickup = null; parcel = null;
      if (!story.advance(round)) {
        floaters.spawn(W / 2, MEDIAN_ROW * CELL + 16, "Round " + round, pal.forest, { size: 18, font: "display", life: 70, stroke: pal.surface, vy: -0.2 });
        sfx.round();
        A.announce("Round " + round + ". A little faster again.");
      }
      syncHud();
    }

    // ---------- Pickups ----------
    function spawnPickup(id) {
      if (!id) {
        var pool = LANE_POWERS.filter(function (p) { return !powers.active(p); });
        if (!pool.length) return;
        id = pool[Math.floor(Math.random() * pool.length)];
      }
      var life = 540;
      if (Math.random() < 0.45) {
        // ride a picture book that is on screen now
        var lane = lanes[Math.floor(Math.random() * STREAM_ROWS.length)];
        for (var t = 0; t < lane.items.length; t++) {
          var it = lane.items[(t + Math.floor(Math.random() * lane.items.length)) % lane.items.length];
          var bx = itemX(lane, it);
          if (bx > CELL && bx + it.w < W - CELL) { pickup = { id: id, row: lane.row, ride: { lane: lane, item: it }, x: 0, life: life, max: life }; return; }
        }
      }
      var rows = TOY_ROWS.concat([SAFE_ROW]);
      for (var k = 0; k < 20; k++) {
        var row = rows[Math.floor(Math.random() * rows.length)];
        var col = 1 + Math.floor(Math.random() * (COLS - 2));
        if (row === player.row && Math.abs(col * CELL - player.px) < CELL * 2) continue;
        pickup = { id: id, row: row, ride: null, x: col * CELL + CELL / 2, life: life, max: life };
        return;
      }
    }
    function pickupX(p) { return p.ride ? itemX(p.ride.lane, p.ride.item) + p.ride.item.w / 2 : p.x; }
    function spawnParcel() {
      var col = 1 + Math.floor(Math.random() * (COLS - 2));
      if (player.row === MEDIAN_ROW && Math.abs(col * CELL - player.px) < CELL * 2) col = (col + 5) % (COLS - 2) + 1;
      parcel = { x: col * CELL + CELL / 2, life: 360, max: 360 };
    }
    function collect(id) {
      var def = POWERUPS[id];
      var x = cx(), y = footY(player.row) - 16;
      runStats.powers += 1;
      if (id === "parcel") {
        var pts = 100 * round;
        score += pts; runStats.parcels += 1;
        sfx.parcel(); A.haptics.thump();
        floaters.spawn(x, y - 10, "Bonus Parcel +" + pts, pal.forest, { size: 13, font: "display", stroke: pal.surface });
        particles.burst(x, y, { n: 14, color: [pal.forest, pal.ochre, pal.surface], speed: 2, life: 24, size: 2.4, kind: ["square", "dot"] });
        shell.toast("Bonus Parcel: +" + pts, 1400);
        A.announce("Bonus parcel. " + pts + " points.");
        syncHud(); shell.hud.flash("score");
        return;
      }
      powers.grant(id);
      sfx.power(); A.haptics.thump(); camera.shake(0.12);
      floaters.spawn(x, y - 10, def.label, pal[def.color] === pal.sage ? pal.sageDeep : pal[def.color], { size: 14, font: "display", stroke: pal.surface });
      particles.burst(x, y, { n: 14, color: [pal[def.color], pal.surface], speed: 2, life: 24, size: 2.4, kind: ["ring", "dot"] });
      shell.toast(def.label + ": " + def.text, 1700);
      A.announce(def.label + ". " + def.text + ".");
    }

    // ---------- Hopping ----------
    function hop(dx, dy) {
      if (state === "idle") { start(); return; }
      if (state !== "running" || deathT > 0 || clearT > 0) return;
      if (player.hopT > 0) { if (hopQ.length < 2) hopQ.push({ x: dx, y: dy }); return; }
      doHop(dx, dy);
    }
    function doHop(dx, dy) {
      var x0 = cx();
      var tx = clamp(player.px + dx * CELL, 0, (COLS - 1) * CELL);
      if (dx !== 0 && dy === 0 && Math.abs(tx - player.px) < 1) { sfx.bump(); return; }
      var steps = 1, frames = HOP_FRAMES;
      if (dy !== 0 && powers.active("skates")) {
        var r2 = player.row + dy * 2;
        var x2 = isStream(r2) ? tx : Math.round(tx / CELL) * CELL;
        if (r2 >= HOME_ROW && r2 <= START_ROW && safeAt(r2, x2 + CELL / 2, SKATE_FRAMES)) { steps = 2; frames = SKATE_FRAMES; }
      }
      var row = player.row + dy * steps;
      if (row > START_ROW || row < HOME_ROW) { sfx.bump(); return; }
      if (!isStream(row)) tx = Math.round(tx / CELL) * CELL;
      if (row === HOME_ROW) {
        var s = slotNear(tx + CELL / 2);
        if (s === -1) { sfx.bump(); return; }
        tx = SLOT_COLS[s] * CELL;
      }
      player.fromX = x0; player.fromRow = player.row;
      player.px = tx; player.row = row;
      player.hopT = frames; player.hopLen = frames; player.steps = steps;
      player.floatT = 0; // shelter keeps counting, so hopping straight off the bench is covered
      player.face = { x: dx, y: dy };
      if (row < bestRow) { score += 10 * (bestRow - row); bestRow = row; sfx.forward(); syncHud(); }
      else sfx.hop();
      A.haptics.tick();
    }
    function land() {
      player.hopT = 0; landT = 6;
      var x = cx(), fy = footY(player.row);
      if (!reduce) particles.burst(x, fy, { n: 4, color: [pal.inkMuted, pal.sageDeep], speed: 0.7, life: 12, size: 1.6, spread: Math.PI, angle: -Math.PI / 2 });
      if (player.row === HOME_ROW) {
        var s = slotNear(x);
        if (s !== -1) { deliver(s); return; }
      }
      if (!checkFooting()) return;
      if (player.row === SAFE_ROW && player.px >= BENCH_FROM * CELL && player.px <= BENCH_TO * CELL) {
        shelterT = SHELTER_FRAMES; sfx.shelter();
      }
      if (hopQ.length) { var q = hopQ.shift(); doHop(q.x, q.y); }
    }
    // Returns false when the courier was lost.
    function checkFooting() {
      var row = player.row, x = cx(), lane = laneAt(row);
      if (isStream(row)) {
        if (bookUnder(lane, x) !== -1) { player.floatT = 0; return true; }
        if (player.floatT > 0) return true;
        if (powers.use("umbrella")) {
          player.floatT = FLOAT_FRAMES; sfx.umbrella();
          floaters.spawn(x, footY(row) - 30, "Umbrella!", pal.research, { size: 16, font: "display", stroke: pal.surface });
          A.announce("The umbrella floats you. Hop to a book.");
          return true;
        }
        loseLetter("splash"); return false;
      }
      if (isToyRow(row) && shelterT <= 0 && toyHits(lane, x, 9)) { loseLetter("squish"); return false; }
      return true;
    }

    // ---------- Input ----------
    var input = A.makeInput(cv.el, {
      canvas: cv,
      keys: { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", " ": "action", Enter: "action", p: "pause" },
      onAction: function (a, repeat, e) {
        if (e && e.preventDefault) e.preventDefault();
        if (repeat && a !== "action") return;
        if (a === "left") hop(-1, 0);
        else if (a === "right") hop(1, 0);
        else if (a === "up") hop(0, -1);
        else if (a === "down") hop(0, 1);
        else if (a === "action") { if (repeat) return; if (state === "idle" || state === "gameover") start(); else if (state === "running") pause(); else if (state === "paused") resume(); }
        else if (a === "pause") { if (state === "running") pause(); else if (state === "paused") resume(); }
      },
      // makeInput re-anchors after each swipe, so a held finger chains hops.
      onSwipe: function (d) { if (state !== "running") return; if (d === "left") hop(-1, 0); else if (d === "right") hop(1, 0); else if (d === "up") hop(0, -1); else hop(0, 1); },
      onTap: function () { if (state === "running") hop(0, -1); else if (state === "paused") resume(); else if (state === "idle") start(); }
    });
    shell.onTap(function (id) {
      if (id === "left") hop(-1, 0); else if (id === "right") hop(1, 0); else if (id === "up") hop(0, -1); else if (id === "down") hop(0, 1);
      else if (id === "pause") { if (state === "running") pause(); else if (state === "paused") resume(); else if (state === "idle") start(); }
    });

    // ---------- Tick ----------
    function tick(dt) {
      time += dt;
      camera.tick(dt); particles.tick(dt); floaters.tick(dt); story.tick(dt);
      for (var f = 0; f < flags.length; f++) {
        var target = slots[f] ? 1 : 0;
        flags[f] = target > flags[f] ? Math.min(1, flags[f] + dt / (reduce ? 1 : 18)) : Math.max(0, flags[f] - dt / 10);
      }
      if (state === "idle" || state === "gameover") { moveLanes(dt); return; }
      if (state !== "running") return;
      if (camera.frozen()) return;
      combo.tick(dt); powers.tick(dt);
      shell.renderPips(powers.list(), pal);
      moveLanes(dt);
      if (landT > 0) landT = Math.max(0, landT - dt);

      if (clearT > 0) { clearT -= dt; if (clearT <= 0) nextRound(); return; }
      if (deathT > 0) { deathT -= dt; if (deathT <= 0) afterDeath(); return; }

      if (shelterT > 0) shelterT = Math.max(0, shelterT - dt);
      else { letterTimer -= dt; if (letterTimer <= 0) { letterTimer = 0; loseLetter("time"); return; } }

      // pickups come and go
      if (pickup) { pickup.life -= dt; if (pickup.life <= 0) { pickup = null; nextPickup = 360 + Math.random() * 300; } }
      else { nextPickup -= dt; if (nextPickup <= 0) { spawnPickup(); nextPickup = 9999; } }
      if (parcel) { parcel.life -= dt; if (parcel.life <= 0) { parcel = null; nextParcel = 900 + Math.random() * 480; } }
      else { nextParcel -= dt; if (nextParcel <= 0) { spawnParcel(); nextParcel = 9999; } }

      if (player.hopT > 0) {
        player.hopT -= dt;
        if (player.hopT <= 0) land();
        return;
      }

      var row = player.row, lane = laneAt(row);
      if (isStream(row)) {
        var on = bookUnder(lane, cx());
        if (on !== -1) {
          player.floatT = 0;
          player.px += laneVel(lane) * dt;
          if (player.px < -CELL * 0.55 || player.px > W - CELL * 0.45) { loseLetter("splash"); return; }
        } else if (player.floatT > 0) {
          player.floatT -= dt;
          player.px = clamp(player.px + laneVel(lane) * 0.6 * dt, 0, (COLS - 1) * CELL);
          if (player.floatT <= 0) { player.floatT = 0; loseLetter("splash"); return; }
        } else if (!checkFooting()) return;
      } else if (!checkFooting()) return;

      // pick things up where the courier stands
      if (pickup && pickup.row === row && Math.abs(pickupX(pickup) - cx()) < 20) { var id = pickup.id; pickup = null; nextPickup = 480 + Math.random() * 300; collect(id); }
      if (parcel && row === MEDIAN_ROW && Math.abs(parcel.x - cx()) < 20) { parcel = null; nextParcel = 1000 + Math.random() * 480; collect("parcel"); }
    }

    // ======================================================================
    //  Render
    // ======================================================================
    function chapterLook() {
      var ch = CHAPTERS[story.index()];
      var amt = ch.night ? (pal.isDark ? 0.55 : ch.amt) : ch.amt;
      var tintCol = ch.tint ? pal[ch.tint] : pal.paper;
      var ground = ch.tint ? pal.mix(pal.paper, tintCol, amt) : pal.paper;
      return {
        night: !!ch.night, ground: ground,
        stream: pal.mix(pal.sageMist, tintCol, ch.night ? (pal.isDark ? 0.4 : 0.55) : amt * 0.7),
        median: pal.mix(ground, pal.sage, pal.isDark ? 0.55 : 0.42),
        safe: pal.mix(ground, pal.sage, pal.isDark ? 0.22 : 0.16),
        home: pal.mix(ground, pal.sage, pal.isDark ? 0.3 : 0.24),
        text: ch.night && !pal.isDark ? pal.onInk : pal.ink,
        muted: ch.night && !pal.isDark ? pal.onInkMuted : pal.inkMuted
      };
    }

    function drawGround(look) {
      draw.paper(ctx, W, H, pal, { fill: look.ground, step: CELL, dot: 1, gridColor: look.night && !pal.isDark ? pal.alpha(pal.surface, 0.1) : pal.grid });
      // home row
      ctx.fillStyle = look.home; ctx.fillRect(0, 0, W, CELL);
      // story stream
      ctx.fillStyle = look.stream; ctx.fillRect(0, CELL, W, CELL * 5);
      ctx.strokeStyle = pal.alpha(pal.sageDeep, pal.isDark ? 0.5 : 0.45); ctx.lineWidth = 1.2;
      for (var r = 1; r <= 5; r++) {
        var dir = STREAM_LANES[r - 1][1];
        for (var k = 0; k < 6; k++) {
          var span = W + 40;
          var rx = ((k * 83 + r * 37 + (reduce ? 0 : time * 0.35 * dir)) % span + span) % span - 20;
          var ry = r * CELL + 8 + ((k + r) % 3) * 8;
          ctx.beginPath(); ctx.arc(rx, ry, 5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
          ctx.beginPath(); ctx.arc(rx + 9, ry + 2, 3.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        }
      }
      ctx.fillStyle = pal.rule; ctx.fillRect(0, CELL - 0.5, W, 1); ctx.fillRect(0, CELL * 6 - 0.5, W, 1);
      // hedge median
      var my = MEDIAN_ROW * CELL;
      ctx.fillStyle = look.median; ctx.fillRect(0, my, W, CELL);
      for (var c = 0; c < COLS * 2; c++) {
        var lx = c * 16 + 4;
        draw.leaf(ctx, lx, my + 4, 9, 0.5 + (c % 3) * 0.3, { fill: c % 2 ? pal.sageDeep : pal.forest, alpha: 0.75 });
        draw.leaf(ctx, lx + 6, my + CELL - 4, 9, -0.6 - (c % 2) * 0.35, { fill: c % 2 ? pal.forest : pal.sageDeep, alpha: 0.75 });
      }
      // toy lanes: paper with a dashed rule between lanes
      ctx.fillStyle = pal.rule; ctx.fillRect(0, CELL * 7 - 0.5, W, 1); ctx.fillRect(0, CELL * 12 - 0.5, W, 1);
      for (var lr = 8; lr <= 11; lr++) draw.dashes(ctx, 6, lr * CELL, W, lr * CELL, 10, 8, { stroke: pal.rule, lineWidth: 1.2 });
      // safe row
      ctx.fillStyle = look.safe; ctx.fillRect(0, SAFE_ROW * CELL, W, CELL);
      // lantern pools at night: stacked low-alpha discs, no gradient
      if (look.night) {
        ctx.fillStyle = pal.alpha(pal.ochre, pal.isDark ? 0.09 : 0.13);
        for (var i = 0; i < LANTERNS.length; i++) {
          var px = LANTERNS[i][0] * CELL + CELL / 2, py = LANTERNS[i][1] * CELL + 8;
          ctx.beginPath(); ctx.arc(px, py, 58, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, 36, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    function drawHomeRow() {
      for (var c = 0; c < COLS; c++) {
        if (SLOT_COLS.indexOf(c) !== -1) continue;
        var x = c * CELL;
        draw.box(ctx, x + 2, 9, CELL - 4, 19, 9, { fill: pal.sage, stroke: pal.ink, lineWidth: 1.2, shadow: 2, shadowColor: pal.shadow });
        draw.leaf(ctx, x + 8, 17, 8, -0.5, { fill: pal.sageDeep });
        draw.leaf(ctx, x + 17, 20, 8, -0.9, { fill: pal.forest, alpha: 0.7 });
      }
      for (var s = 0; s < SLOT_COLS.length; s++) drawMailbox(s);
    }
    function drawMailbox(s) {
      var x0 = SLOT_COLS[s] * CELL, mx = x0 + CELL / 2;
      var open = !slots[s];
      if (open && state === "running") {
        var pulse = reduce ? 0 : Math.sin(time * 0.08 + s) * 1.5;
        draw.circle(ctx, mx, 15, 13 + pulse, { stroke: pal.alpha(pal.ochre, 0.7), lineWidth: 1.4 });
      }
      // the right-hand mailbox is drawn mirrored so its flag stays on the field
      ctx.save();
      if (s === SLOT_COLS.length - 1) { ctx.translate(mx * 2, 0); ctx.scale(-1, 1); }
      ctx.fillStyle = pal.inkSoft; ctx.fillRect(mx - 1.5, 19, 3, 11);
      ctx.fillStyle = pal.shadow; ctx.fillRect(mx - 6, 29, 12, 2);
      if (!open) {
        // the letter peeks out of the slot
        draw.box(ctx, mx - 6, 2, 12, 8, 1, { fill: pal.surface, stroke: pal.ink, lineWidth: 1 });
        ctx.fillStyle = pal.ochre; ctx.fillRect(mx + 2, 3.5, 2.5, 2.5);
      }
      draw.box(ctx, x0 + 5, 6, 21, 14, 6, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.4, shadow: 2, shadowColor: pal.shadow });
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x0 + 10, 11); ctx.lineTo(x0 + 21, 11); ctx.stroke();
      // the flag: lies flat when waiting, rises when a letter arrives
      var f = flags[s];
      var ease = f * f * (3 - 2 * f);
      ctx.save(); ctx.translate(x0 + 25, 15); ctx.rotate(-ease * Math.PI / 2);
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, 0); ctx.stroke();
      draw.box(ctx, 5, -5, 6, 5, 1, { fill: pal.ochre, stroke: pal.ink, lineWidth: 1 });
      ctx.restore();
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(x0 + 25, 15, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawBench() {
      var x = BENCH_FROM * CELL + 6, w = (BENCH_TO - BENCH_FROM + 1) * CELL - 12, y = SAFE_ROW * CELL;
      ctx.fillStyle = pal.shadow; ctx.fillRect(x + 2, y + 27, w - 4, 3);
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 8, y + 18); ctx.lineTo(x + 8, y + 28); ctx.moveTo(x + w - 8, y + 18); ctx.lineTo(x + w - 8, y + 28); ctx.stroke();
      draw.box(ctx, x, y + 5, w, 5, 2, { fill: pal.forest, stroke: pal.ink, lineWidth: 1.3 });
      draw.box(ctx, x - 2, y + 14, w + 4, 5, 2, { fill: pal.forest, stroke: pal.ink, lineWidth: 1.3, shadow: 2, shadowColor: pal.shadow });
      ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + 10, y + 14); ctx.moveTo(x + w - 10, y + 10); ctx.lineTo(x + w - 10, y + 14);
      ctx.lineWidth = 1.4; ctx.stroke();
    }
    function drawLanternPosts() {
      for (var i = 0; i < LANTERNS.length; i++) {
        var px = LANTERNS[i][0] * CELL + CELL / 2, py = LANTERNS[i][1] * CELL;
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py + 29); ctx.lineTo(px, py + 10); ctx.stroke();
        draw.box(ctx, px - 4.5, py + 3, 9, 9, 2, { fill: pal.ochre, stroke: pal.ink, lineWidth: 1.3 });
        ctx.fillStyle = pal.alpha(pal.surface, 0.7); ctx.fillRect(px - 1.5, py + 5.5, 3, 4);
      }
    }

    function drawBook(x, y, w, seed) {
      var bob = reduce ? 0 : Math.sin(time * 0.05 + seed) * 1;
      var top = y + 5 + bob, h = 22, mid = x + w / 2;
      // wake behind the book
      ctx.strokeStyle = pal.alpha(pal.sageDeep, 0.55); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x - 1, top + h / 2 + 2, 6, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w + 1, top + h / 2 + 2, 6, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
      draw.box(ctx, x + 2, top, w - 4, h, 3, { fill: pal.research, stroke: pal.ink, lineWidth: 1.4, shadow: 2.5, shadowColor: pal.shadow });
      draw.box(ctx, x + 5, top + 2.5, w - 10, h - 5, 2, { fill: pal.surface });
      // spine: a soft fold down the middle
      ctx.fillStyle = pal.alpha(pal.research, 0.25); ctx.fillRect(mid - 2, top + 2.5, 4, h - 5);
      ctx.strokeStyle = pal.alpha(pal.ink, 0.45); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mid, top + 2.5); ctx.lineTo(mid, top + h - 2.5); ctx.stroke();
      // a picture on the left page, lines of words on the right
      var pw = w / 2 - 7;
      draw.circle(ctx, x + 6 + pw * 0.45, top + 9, 3.2, { fill: seed % 2 ? pal.sageDeep : pal.ochre });
      ctx.fillStyle = pal.alpha(pal.forest, 0.5); ctx.fillRect(x + 7, top + 14, pw - 2, 2.5);
      ctx.fillStyle = pal.alpha(pal.ink, 0.25);
      for (var l = 0; l < 3; l++) ctx.fillRect(mid + 4, top + 6 + l * 4, pw - 4 - (l === 2 ? 6 : 0), 1.5);
      // a few slow page-flip frames now and then
      if (!reduce) {
        var ph = (time * 0.004 + seed * 0.37) % 1;
        if (ph < 0.12) {
          var k = Math.floor(ph / 0.12 * 4) / 4 + 0.125;
          var pwid = (w / 2 - 5) * Math.cos(k * Math.PI);
          var liftP = Math.sin(k * Math.PI) * 3;
          ctx.beginPath();
          ctx.moveTo(mid, top + 2.5); ctx.lineTo(mid + pwid, top + 2.5 - liftP); ctx.lineTo(mid + pwid, top + h - 2.5 - liftP); ctx.lineTo(mid, top + h - 2.5);
          ctx.closePath();
          ctx.fillStyle = pal.surface; ctx.fill();
          ctx.strokeStyle = pal.alpha(pal.ink, 0.5); ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }

    function wheel(x, y, r) {
      draw.circle(ctx, x, y, r, { fill: pal.ink });
      draw.circle(ctx, x, y, r * 0.4, { fill: pal.surface });
    }
    function drawToy(kind, x, y, w, dir, seed, speed) {
      var bounce = reduce ? 0 : -Math.abs(Math.sin(time * 0.16 + seed)) * (kind === "ball" ? 3 : 1.4);
      var hw = w / 2;
      ctx.fillStyle = pal.shadow;
      ctx.beginPath(); ctx.ellipse(x + hw, y + 27, hw - 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(x + hw, y + CELL / 2 + bounce);
      if (dir < 0) ctx.scale(-1, 1); // the front always leads
      var o = { stroke: pal.ink, lineWidth: 1.4 };
      if (kind === "wagon") {
        // wood: clay mixed toward paper (no wood token)
        var wood = pal.mix(pal.clay, pal.paper, 0.4);
        draw.box(ctx, -hw + 6, -6, w - 18, 12, 3, { fill: wood, stroke: o.stroke, lineWidth: o.lineWidth });
        ctx.strokeStyle = pal.alpha(pal.ink, 0.3); ctx.lineWidth = 1;
        ctx.beginPath(); for (var sl = 1; sl < 4; sl++) { var sx = -hw + 6 + (w - 18) * sl / 4; ctx.moveTo(sx, -4); ctx.lineTo(sx, 4); } ctx.stroke();
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(hw - 12, 0); ctx.lineTo(hw - 3, -9); ctx.stroke();
        draw.circle(ctx, hw - 3, -9, 2.2, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.2 });
        wheel(-hw + 12, 8, 4.5); wheel(hw - 18, 8, 4.5);
      } else if (kind === "ball") {
        draw.circle(ctx, 0, 0, 10, { fill: pal.ochre, stroke: o.stroke, lineWidth: o.lineWidth });
        var rot = reduce ? 0.6 : time * 0.012 * speed * 8;
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 9.3, 0, Math.PI * 2); ctx.clip();
        ctx.rotate(rot);
        ctx.strokeStyle = pal.surface; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.ellipse(0, 0, 3.8, 11, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = pal.alpha(pal.surface, 0.55); ctx.beginPath(); ctx.arc(-3.5, -4, 2, 0, Math.PI * 2); ctx.fill();
      } else if (kind === "train") {
        draw.box(ctx, -hw + 4, -3, w - 16, 11, 3, { fill: pal.forest, stroke: o.stroke, lineWidth: o.lineWidth });
        draw.box(ctx, -hw + 4, -13, 16, 12, 2, { fill: pal.forest, stroke: o.stroke, lineWidth: o.lineWidth });
        ctx.fillStyle = pal.surface; ctx.fillRect(-hw + 8, -10, 8, 5);
        draw.box(ctx, hw - 24, -12, 6, 9, 1.5, { fill: pal.ink });
        draw.circle(ctx, hw - 10, 2.5, 5, { fill: pal.forest, stroke: o.stroke, lineWidth: o.lineWidth });
        ctx.strokeStyle = pal.alpha(pal.surface, 0.6); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-hw + 24, 2); ctx.lineTo(hw - 16, 2); ctx.stroke();
        wheel(-hw + 11, 9, 4.5); wheel(-hw + 25, 9, 4.5); wheel(hw - 16, 9, 4.5);
      } else if (kind === "car") {
        draw.box(ctx, -7, -12, 13, 9, 4, { fill: pal.research, stroke: o.stroke, lineWidth: o.lineWidth });
        ctx.fillStyle = pal.surface; ctx.fillRect(-4.5, -10, 8, 5);
        draw.box(ctx, -13, -5, 26, 11, 4, { fill: pal.research, stroke: o.stroke, lineWidth: o.lineWidth });
        ctx.fillStyle = pal.ochre; ctx.fillRect(10, -2, 2.5, 3);
        wheel(-7, 7, 4); wheel(7, 7, 4);
      } else { // blocks on a little cart
        var wood2 = pal.mix(pal.clay, pal.paper, 0.4);
        draw.box(ctx, -hw + 4, 3, w - 8, 4, 2, { fill: wood2, stroke: o.stroke, lineWidth: 1.2 });
        draw.box(ctx, -22, -12, 15, 15, 2, { fill: pal.sage, stroke: o.stroke, lineWidth: o.lineWidth });
        draw.box(ctx, -5, -8, 12, 11, 2, { fill: pal.sageDeep, stroke: o.stroke, lineWidth: o.lineWidth });
        draw.box(ctx, 9, -11, 14, 14, 2, { fill: pal.sage, stroke: o.stroke, lineWidth: o.lineWidth });
        wheel(-hw + 10, 9, 4); wheel(hw - 10, 9, 4);
      }
      ctx.restore();
      if (kind === "blocks") {
        // letters drawn unmirrored so they always read
        var m = dir < 0 ? -1 : 1, by = y + CELL / 2 + bounce;
        draw.label(ctx, "A", x + hw + m * -14.5, by - 4.5, { size: 10, weight: 700, color: pal.ink });
        draw.label(ctx, "B", x + hw + m * 16, by - 4, { size: 10, weight: 700, color: pal.ink });
      }
    }

    function drawLanes() {
      for (var l = 0; l < lanes.length; l++) {
        var lane = lanes[l], ly = lane.row * CELL;
        for (var i = 0; i < lane.items.length; i++) {
          var it = lane.items[i], x = itemX(lane, it);
          if (x + it.w < -8 || x > W + 8) continue;
          if (lane.isStream) drawBook(x, ly, it.w, it.seed);
          else drawToy(lane.kind, x, ly, it.w, lane.dir, it.seed, Math.abs(laneVel(lane)));
        }
      }
    }

    function textOn(fill) {
      var dark = luminance(pal.ink) < luminance(pal.paper) ? pal.ink : pal.paper;
      var light = dark === pal.ink ? pal.surface : pal.ink;
      return luminance(fill) > 0.55 ? dark : light;
    }
    function drawPickupDisc(x, y, id, frac) {
      var def = POWERUPS[id], col = pal[def.color];
      var bob = reduce ? 0 : Math.sin(time * 0.12) * 1.5;
      draw.circle(ctx, x, y + bob, 10, { fill: col, stroke: pal.ink, lineWidth: 1.4, shadow: 2.5, shadowColor: pal.shadow });
      draw.label(ctx, def.label.charAt(0), x, y + bob + 0.5, { font: "display", size: 13, weight: 600, color: textOn(col) });
      draw.ring(ctx, x, y + bob, 13.5, frac, { stroke: pal.alpha(pal.ink, 0.6), lineWidth: 1.4 });
    }
    function drawParcel() {
      var x = parcel.x, y = MEDIAN_ROW * CELL + 16 + (reduce ? 0 : Math.sin(time * 0.1) * 1.2);
      draw.circle(ctx, x, y, 14, { fill: pal.alpha(pal.surface, 0.55) });
      draw.box(ctx, x - 9, y - 7, 18, 14, 2, { fill: pal.forest, stroke: pal.ink, lineWidth: 1.4, shadow: 2.5, shadowColor: pal.shadow });
      ctx.fillStyle = pal.surface; ctx.fillRect(x - 1.2, y - 7, 2.4, 14); ctx.fillRect(x - 9, y - 1.2, 18, 2.4);
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(x - 3, y - 9, 3, 2, -0.4, 0, Math.PI * 2); ctx.ellipse(x + 3, y - 9, 3, 2, 0.4, 0, Math.PI * 2); ctx.stroke();
      draw.ring(ctx, x, y, 16, parcel.life / parcel.max, { stroke: pal.forest, lineWidth: 1.6 });
    }

    // The courier: an envelope with hands, legs, an ochre stamp and eyes.
    // Origin at its feet; `lift` raises the body, the shadow stays down.
    function drawCourier(x, fy, o) {
      var lift = o.lift || 0;
      var sr = 10 * (1 - Math.min(0.55, lift / 22));
      ctx.fillStyle = pal.shadow;
      ctx.beginPath(); ctx.ellipse(x, fy + 1, sr, 3 * (1 - Math.min(0.5, lift / 30)), 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.translate(x, fy - lift);
      ctx.scale(o.sx || 1, o.sy || 1);
      var hopping = o.hopping, envB = -6, envT = envB - 17;
      // legs and feet
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (hopping) { ctx.moveTo(-5, envB); ctx.lineTo(-8, -2); ctx.moveTo(5, envB); ctx.lineTo(8, -2); }
      else { ctx.moveTo(-5, envB); ctx.lineTo(-5, -1); ctx.moveTo(5, envB); ctx.lineTo(5, -1); }
      ctx.stroke();
      ctx.fillStyle = pal.ink;
      var fxo = hopping ? 8.5 : 6;
      ctx.beginPath(); ctx.ellipse(-fxo, -0.5, 3, 1.7, 0, 0, Math.PI * 2); ctx.ellipse(fxo, -0.5, 3, 1.7, 0, 0, Math.PI * 2); ctx.fill();
      if (o.skates) {
        draw.box(ctx, -fxo - 4, 0.8, 8, 2.4, 1.2, { fill: pal.sage, stroke: pal.ink, lineWidth: 1 });
        draw.box(ctx, fxo - 4, 0.8, 8, 2.4, 1.2, { fill: pal.sage, stroke: pal.ink, lineWidth: 1 });
      }
      // arms: up when hopping
      var armY = envT + 9, handY = hopping ? armY - 6 : armY + 3;
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-12, armY); ctx.lineTo(-16, handY); ctx.moveTo(12, armY); ctx.lineTo(16, handY); ctx.stroke();
      // a held umbrella (closed) or lantern
      if (o.umbrella) {
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(16, handY); ctx.lineTo(16, handY - 13); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(16, handY - 15); ctx.lineTo(13.5, handY - 5); ctx.lineTo(18.5, handY - 5); ctx.closePath();
        ctx.fillStyle = pal.research; ctx.fill(); ctx.stroke();
      }
      if (o.lantern) {
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-16, handY); ctx.lineTo(-16, handY + 3); ctx.stroke();
        draw.box(ctx, -19.5, handY + 3, 7, 7, 2, { fill: pal.ochre, stroke: pal.ink, lineWidth: 1.1 });
      }
      draw.circle(ctx, -16, handY, 2.6, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.2 });
      draw.circle(ctx, 16, handY, 2.6, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.2 });
      // envelope
      draw.box(ctx, -12, envT, 24, 17, 2.5, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.5 });
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-11, envT + 1.5); ctx.lineTo(0, envT + 8); ctx.lineTo(11, envT + 1.5); ctx.stroke();
      ctx.save();
      ctx.setLineDash([1.2, 1.2]);
      draw.box(ctx, 4.5, envT + 2.5, 6, 6.5, 1, { fill: pal.ochre, stroke: pal.ink, lineWidth: 1 });
      ctx.restore();
      var blink = !reduce && Math.floor(time / 100) % 6 === 0 && (time % 100) < 6 ? 1 : 0;
      draw.eyes(ctx, -1.5, envT + 12, 8, 2.6, o.face.x, o.face.y, pal, { blink: blink, white: pal.alpha(pal.sageMist, 0.9) });
      ctx.restore();
    }

    function renderCourier(look) {
      if (player.hidden) return;
      var k = player.hopT > 0 ? clamp(1 - player.hopT / player.hopLen, 0, 1) : 1;
      var x = player.hopT > 0 ? player.fromX + (cx() - player.fromX) * k : cx();
      var fy = player.hopT > 0 ? footY(player.fromRow) + (footY(player.row) - footY(player.fromRow)) * k : footY(player.row);
      var lift = player.hopT > 0 ? Math.sin(k * Math.PI) * (player.steps === 2 ? 14 : 9) : 0;
      var sx = 1, sy = 1, alpha = 1;
      if (!reduce && player.hopT > 0) { var s = Math.sin(k * Math.PI); sy = 1 + 0.1 * s; sx = 1 - 0.07 * s; }
      if (!reduce && landT > 0 && player.hopT <= 0) { var q = landT / 6; sy = 1 - 0.12 * q; sx = 1 + 0.1 * q; }
      if (deathT > 0) {
        var d = 1 - clamp(deathT / 54, 0, 1);
        alpha = 1 - d * 0.7;
        if (deathReason === "splash") { sx = sy = 1 - d * 0.6; fy += d * 4; }
        else if (deathReason === "squish") { sy = 0.35; sx = 1.3; }
      }
      if (look.night) {
        ctx.fillStyle = pal.alpha(pal.ochre, powers.active("lantern") ? 0.16 : 0.1);
        ctx.beginPath(); ctx.arc(x, fy - 10, powers.active("lantern") ? 56 : 38, 0, Math.PI * 2); ctx.fill();
      }
      if (shelterT > 0) {
        var sf = shelterT / SHELTER_FRAMES;
        ctx.strokeStyle = pal.alpha(pal.forest, 0.25 + 0.5 * sf); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(x, fy, 20, Math.PI, Math.PI * 2); ctx.stroke();
      }
      if (deathT > 0 && deathReason === "splash" && !reduce) {
        var d2 = 1 - clamp(deathT / 54, 0, 1);
        ctx.strokeStyle = pal.alpha(pal.research, 0.7 * (1 - d2)); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(x, fy - 4, 8 + d2 * 16, 3 + d2 * 5, 0, 0, Math.PI * 2); ctx.stroke();
      }
      drawCourier(x, fy, { lift: lift, sx: sx, sy: sy, alpha: alpha, hopping: player.hopT > 0, face: player.face,
        skates: powers.active("skates"), umbrella: powers.active("umbrella"), lantern: powers.active("lantern") });
      if (player.floatT > 0) {
        // the umbrella, upturned, carries the courier like a little boat
        var bowl = fy - 3;
        ctx.beginPath(); ctx.arc(x, bowl, 15, 0, Math.PI); ctx.closePath();
        ctx.fillStyle = pal.research; ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.strokeStyle = pal.alpha(pal.surface, 0.6); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, bowl); ctx.lineTo(x, bowl + 15); ctx.moveTo(x - 8, bowl); ctx.lineTo(x - 6, bowl + 12); ctx.moveTo(x + 8, bowl); ctx.lineTo(x + 6, bowl + 12); ctx.stroke();
        draw.ring(ctx, x, fy - 14, 21, player.floatT / FLOAT_FRAMES, { stroke: pal.research, lineWidth: 1.4 });
      }
    }

    function drawClock(look) {
      if (state !== "running" && state !== "paused") return;
      var frac = clamp(letterTimer / LETTER_TIME, 0, 1);
      var bx = W - 122, by = START_ROW * CELL + 24, bw = 80;
      draw.pill(ctx, bx, by, bw, 5, { fill: pal.alpha(look.text, 0.14) });
      draw.pill(ctx, bx, by, Math.max(5, bw * frac), 5, { fill: frac < 0.17 ? pal.clay : (look.night && !pal.isDark ? pal.onInk : pal.forest) });
      draw.label(ctx, Math.ceil(letterTimer / 60) + "s", W - 10, by + 2.5, { size: 11, weight: 600, color: frac < 0.17 ? pal.clayText : look.text, align: "right" });
      if (shelterT > 0) draw.label(ctx, "Sheltered", bx - 8, by + 2.5, { size: 10, weight: 600, color: look.muted, align: "right" });
    }

    function drawBanner() {
      var bn = story.banner();
      if (!bn || state !== "running") return;
      var a = Math.min(1, bn.frac * 3) * Math.min(1, (1 - bn.frac) * 6 + 0.2);
      ctx.save(); ctx.globalAlpha = a;
      var ty = 82 + (reduce ? 0 : (1 - Math.min(1, (1 - bn.frac) * 4)) * -10);
      draw.box(ctx, W / 2 - 150, ty - 34, 300, 70, 6, { fill: pal.alpha(pal.surface, 0.94), stroke: pal.rule, lineWidth: 1, shadow: 3, shadowColor: pal.shadow });
      draw.label(ctx, "Round " + round, W / 2, ty - 20, { size: 10, weight: 600, color: pal.inkMuted, tracking: "1px" });
      draw.label(ctx, bn.name, W / 2, ty + 1, { font: "display", size: 26, color: pal.ink, weight: 500 });
      draw.label(ctx, bn.text, W / 2, ty + 23, { size: 11, color: pal.inkSoft, weight: 500, maxWidth: 284 });
      ctx.restore();
    }

    function render() {
      cv.begin(camera);
      var look = chapterLook();
      drawGround(look);
      drawHomeRow();
      if (look.night) drawLanternPosts();
      drawBench();
      if (parcel) drawParcel();
      // floor pickups sit under the toys; book riders sit on their book
      if (pickup && !pickup.ride) drawPickupDisc(pickup.x, pickup.row * CELL + 16, pickup.id, pickup.life / pickup.max);
      drawLanes();
      if (pickup && pickup.ride) drawPickupDisc(pickupX(pickup), pickup.row * CELL + 16, pickup.id, pickup.life / pickup.max);
      if (state !== "idle") renderCourier(look);
      else drawCourier(Math.floor(COLS / 2) * CELL + CELL / 2, footY(START_ROW), { face: { x: 0, y: -1 } });
      particles.render(ctx);
      floaters.render(ctx);
      drawClock(look);
      drawBanner();
      // the round's progress along the bottom rule: letters in this round
      if (state === "running" || state === "paused") {
        var n = 0; for (var i = 0; i < slots.length; i++) if (slots[i]) n++;
        ctx.fillStyle = pal.alpha(look.night && !pal.isDark ? pal.onInk : pal.forest, 0.6);
        ctx.fillRect(0, H - 2, W * n / slots.length, 2);
      }
      ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
      cv.end();
    }

    var loop = A.makeLoop(tick, render);
    function onHidden() { if (state === "running") pause(); }

    A.debug("hopper", {
      state: function () {
        return { state: state, round: round, lives: lives, score: score, row: player.row, x: cx(), hopping: player.hopT > 0, queued: hopQ.length,
          slots: slots.slice(), delivered: delivered, letterTimer: Math.round(letterTimer), shelter: shelterT > 0, floating: player.floatT > 0,
          chapter: CHAPTERS[story.index()].name, powers: powers.list().map(function (p) { return p.id; }),
          pickup: pickup ? { id: pickup.id, row: pickup.row, x: Math.round(pickupX(pickup)) } : null, parcel: parcel ? Math.round(parcel.x) : null };
      },
      score: function () { return score; },
      grant: function (id) { if (id === "parcel") spawnParcel(); else if (POWERUPS[id]) { powers.grant(id); shell.toast(POWERUPS[id].label + ": " + POWERUPS[id].text, 1600); } },
      spawnPickup: function (id) { spawnPickup(id); },
      skipToRound: function (n) {
        if (state !== "running") start();
        round = Math.max(1, n | 0);
        slots = [false, false, false, false, false]; flags = [0, 0, 0, 0, 0];
        clearT = 0; deathT = 0;
        buildWave(); resetPlayer();
        story.reset();
        if (!story.advance(round)) story.set(0);
        syncHud();
      },
      deliver: function () { if (state !== "running" || clearT > 0 || deathT > 0) return; var s = slots.indexOf(false); if (s !== -1) deliver(s); },
      hop: function (dx, dy) { hop(dx, dy); },
      place: function (row, col) { if (state !== "running") return; player.row = clamp(row | 0, 1, START_ROW); player.px = clamp(col | 0, 0, COLS - 1) * CELL; player.hopT = 0; player.floatT = 0; hopQ = []; },
      die: function () { loseLetter("squish"); }
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
      // The phone turned: a run pauses while the field refits.
      onViewport: function () { pause(); },
      destroy: function () { offTheme(); input.destroy(); }
    };
  }

  // ======================================================================
  //  Overlay
  // ======================================================================
  A.ready(function () {
    A.defineGame("hopper", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Special Delivery",
        tagline: "Carry your letter through the crossing.",
        label: "Special Delivery game",
        canvas: { w: W, h: H, label: "Special Delivery play field" },
        hud: [{ id: "score", label: "Score", value: 0 }, { id: "best", label: "Best", value: A.leaderboard.best(GAME_KEY) }, { id: "round", label: "Round", value: 1 }, { id: "lives", label: "Lives", value: 3 }],
        help: "Arrows or WASD hop · tap hops forward · swipe to hop, keep the finger down to chain · Space pauses · M mutes · Esc closes",
        touch: [
          { id: "left", label: "◀", aria: "Hop left", tap: true },
          { id: "up", label: "▲", aria: "Hop forward", tap: true },
          { id: "down", label: "▼", aria: "Hop back", tap: true },
          { id: "right", label: "▶", aria: "Hop right", tap: true },
          { id: "pause", label: "Pause", aria: "Pause or resume", tap: true }
        ]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
