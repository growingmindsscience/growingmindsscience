/* Growing Minds Science - asteroids-game.js
   "Synapse Drift" on the Arcade page: a paper plane with a lens drifts
   through a field of loud thoughts (myth, noise, panic, rush, should,
   advice, worry). Break them into smaller pieces, gather seeds, and five
   seeds open a Bloom. The field wraps at every edge.

   Core v2 game (see docs/arcade/game-brief.md): reads the live brand tokens
   through A.theme(), draws at device resolution through the shell's canvas,
   uses makeShell for the overlay, makeStory for chapters (on waves),
   makePowerups for timed and counted effects, runSummary for the end card.
   CSP-safe: no eval, no external assets, audio is the shared Web Audio synth.
   Honors prefers-reduced-motion.

   Power-ups: Bloom (ochre: triple spread, ram, pickup magnet; five seeds),
   Shield (forest, one hit), Orbit Drone (research blue: a lens that orbits
   and fires at the nearest rock), Bomb (clay: clears small rocks nearby and
   pushes larger ones away). Blink is an ability with a cooldown ring.
   Wave events: every third wave a meteor shower, every fourth a calm pocket.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "synapse-drift";
  var MUTE_KEY = "gms-asteroids-muted";

  // ---------- Field ----------
  // Landscape by default; a portrait phone gets the field turned on end
  // (chosen when the game opens, see activate()). The world wraps either way.
  var W = 640, H = 440;
  function setField(w, h) { W = w; H = h; }

  // The old game ran at 320 by 220. Everything spatial (sizes, speeds,
  // ranges) is scaled by S so the feel matches on the larger field, with a
  // little more room to manoeuvre than a straight 2x would give.
  var S = 1.8;
  var ROCK_R = { 1: 9 * S, 2: 15 * S, 3: 22 * S, 4: 32 * S };
  var ROCK_POINTS = { 1: 180, 2: 110, 3: 70, 4: 45 };
  var LABELS = ["myth", "noise", "panic", "rush", "should", "advice", "worry"];

  var BLOOM_FRAMES = 430;
  var BLINK_COOLDOWN = 420;
  var SHOWER_FRAMES = 360;
  var BOMB_RANGE = 120;

  // ---------- Story: five skies, gated on waves ----------
  var CHAPTERS = [
    { name: "Quiet Start", at: 1, text: "A few loud thoughts drift by. Make a little room." },
    { name: "Noise", at: 3, text: "More chatter now. The small pieces move fast." },
    { name: "Rush Hour", at: 5, text: "Everything wants to go at once. One at a time." },
    { name: "Should Storm", at: 7, text: "The shoulds pile up. Breathe, aim, let them break." },
    { name: "Clear Sky", at: 9, text: "Open space ahead. Keep it that way." }
  ];

  var POWERUPS = {
    bloom: { label: "Bloom", color: "ochre", duration: BLOOM_FRAMES, text: "Triple spread, and rocks break on contact" },
    shield: { label: "Shield", color: "forest", uses: 1, text: "One hit, softened" },
    drone: { label: "Orbit Drone", color: "research", duration: 720, text: "A small lens circles and fires with you" },
    bomb: { label: "Bomb", color: "clay", uses: 1, text: "Press B to clear the small rocks nearby" }
  };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
  function shortestDelta(from, to, span) {
    var d = to - from;
    if (d > span / 2) d -= span; else if (d < -span / 2) d += span;
    return d;
  }
  function wrap(o, pad) {
    pad = pad || 0;
    if (o.x < -pad) o.x = W + pad; else if (o.x > W + pad) o.x = -pad;
    if (o.y < -pad) o.y = H + pad; else if (o.y > H + pad) o.y = -pad;
  }

  // ======================================================================
  //  Game
  // ======================================================================
  function createGame(shell) {
    var cv = shell.canvas, ctx = cv.ctx, draw = A.draw;
    var pal = A.theme();
    var offTheme = A.onThemeChange(function (p) { pal = p; });
    var reduce = A.prefersReducedMotion();
    var coarse = A.isCoarsePointer();

    var camera = A.makeCamera({ reduce: reduce, maxPx: 5 });
    var combo = A.makeCombo({ window: 120, max: 5 });
    var particles = A.makeParticles({ cap: 140, reduce: reduce });
    var floaters = A.makeFloaters({ cap: 16, reduce: reduce });
    var wake = A.makeWakeLock();
    var unsubHidden = null;
    var synth = A.makeSynth({ muteKey: MUTE_KEY });
    shell.bindSynth(synth);

    var story = A.makeStory(CHAPTERS, { onEnter: onChapter, bannerFrames: 170 });
    var powers = A.makePowerups(POWERUPS, {});

    var state = "idle"; // idle | running | waveclear | paused | dying | gameover
    var stateBeforePause = null;
    var ship, rocks, shots, pickups, stars, mouseTarget;
    var wave, lives, score, best, seedMeter, fireCooldown, blinkCooldown, nextWaveTimer;
    var hurtTimer, deathTimer, time, thrustLevel, lastPopAt;
    var drone, bombRing, shower, events, eventBanner;
    var waveTotal, waveKills, bloomLeafT;
    var runStats;
    var mouseFiring = false;
    var shiftDown = false, shiftUsed = false;

    best = A.leaderboard.best(GAME_KEY);

    // ---------- Audio ----------
    var sfx = {
      fire: function () { synth.beep(760, 520, 0.06, "square", 0.32); },
      drone: function () { synth.beep(1100, 900, 0.04, "triangle", 0.18); },
      thrust: function () { synth.beep(90, 70, 0.04, "sawtooth", 0.14); },
      rock: function (mult) { mult = mult || 1; synth.beep(150 + (mult - 1) * 70, 80, 0.12, "sawtooth", 0.4); synth.noise(0.16, 1100, 0.28); },
      seed: function () { synth.beep(620, 980, 0.12, "triangle", 0.4); },
      power: function () { synth.arp([659, 880, 1318], 0.045, 0.12, "triangle", 0.4); },
      bloom: function () {
        synth.arp([440, 660, 880, 1320], 0.06, 0.2, "triangle", 0.48);
        var d = BLOOM_FRAMES / 60;
        synth.beep(174, 174, d, "sine", 0.12); synth.beep(176.5, 176.5, d, "triangle", 0.09);
      },
      shield: function () { synth.beep(260, 540, 0.16, "sine", 0.42); },
      hit: function () { synth.beep(190, 55, 0.22, "sawtooth", 0.55); synth.noise(0.34, 850, 0.42); },
      blink: function () { synth.beep(900, 320, 0.16, "triangle", 0.34); },
      ready: function () { synth.beep(880, 1320, 0.05, "sine", 0.16); },
      bomb: function () { synth.beep(120, 40, 0.4, "sawtooth", 0.5); synth.noise(0.45, 600, 0.5); },
      wave: function () { synth.arp([392, 588, 784], 0.07, 0.2, "triangle", 0.42); },
      chapter: function () { synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.42); },
      event: function () { synth.arp([330, 494, 659], 0.08, 0.18, "sine", 0.32); }
    };

    // ---------- World ----------
    function makeStars() {
      stars = [];
      var n = Math.round(W * H / 3600);
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, big: Math.random() < 0.3, tw: Math.random() * Math.PI * 2 });
    }
    function resetShip() {
      ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, inv: 120, blink: 0 };
      shots = [];
      fireCooldown = 0;
      mouseTarget = null;
    }
    function resetWorld() {
      makeStars();
      wave = 1; lives = 3; score = 0; seedMeter = 0;
      blinkCooldown = 0; nextWaveTimer = 0; hurtTimer = 0; deathTimer = 0;
      time = 0; thrustLevel = 0; lastPopAt = 0; bloomLeafT = 0;
      rocks = []; pickups = [];
      drone = { a: 0, cd: 40 }; bombRing = null; shower = null;
      events = []; eventBanner = null;
      combo.reset(true); powers.clear(); story.reset();
      particles.clear(); floaters.clear();
      runStats = { chapter: 0, seeds: 0, powers: 0, blooms: 0, rocks: 0 };
      resetShip();
      powers.grant("shield");
      buildWave();
      syncHud();
    }

    function makeCracks(size) {
      var n = size >= 3 ? 3 : 2, out = [];
      var inner = size >= 3 ? 0.5 : 0.28;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 + rand(-0.5, 0.5);
        out.push([a, inner, a + rand(-0.3, 0.3), inner + 0.2, a + rand(-0.25, 0.25), 0.86]);
      }
      return out;
    }
    function makeRock(x, y, vx, vy, size, opts) {
      opts = opts || {};
      var n = size === 1 ? 7 : 9, verts = [];
      for (var i = 0; i < n; i++) verts.push(rand(0.72, 1.14));
      return {
        x: x, y: y, vx: vx, vy: vy, r: ROCK_R[size], size: size,
        a: rand(0, Math.PI * 2), spin: rand(-0.025, 0.025) * (size <= 2 ? 1.5 : 1),
        verts: verts, cracks: makeCracks(size), label: pick(LABELS),
        meteor: !!opts.meteor, life: opts.life || 0
      };
    }
    function spawnRock(size) {
      var r = ROCK_R[size], side = Math.floor(Math.random() * 4);
      var x = side === 0 ? -r : side === 1 ? W + r : rand(0, W);
      var y = side === 2 ? -r : side === 3 ? H + r : rand(0, H);
      var ang = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.9, 0.9);
      var sp = (rand(0.35, 0.95) + wave * 0.045 + (4 - size) * 0.08) * S;
      rocks.push(makeRock(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, size));
    }
    // Pieces a rock of this size breaks into, all the way down.
    function killsFor(size) { return size <= 1 ? 1 : 1 + (size === 4 ? 3 : 2) * killsFor(size - 1); }

    function buildWave() {
      rocks = rocks.filter(function (r) { return r.meteor; });
      var count = Math.min(4 + wave, 10);
      waveTotal = 0; waveKills = 0;
      for (var i = 0; i < count; i++) { spawnRock(3); waveTotal += killsFor(3); }
      if (wave % 4 === 0) { spawnRock(4); waveTotal += killsFor(4); }
      nextWaveTimer = 0;
      if (wave > 1) floaters.spawn(W / 2, H / 2 - 40, "Wave " + wave, pal.forest, { size: 16, font: "display", life: 60 });
      sfx.wave();
      // wave events
      if (wave % 3 === 0) {
        var dirA = pick([0, Math.PI, Math.PI / 2, -Math.PI / 2]) + rand(-0.5, 0.5);
        shower = { t: SHOWER_FRAMES, delay: 80, spawn: 0, a: dirA };
        queueEvent("Meteor shower", "Small, fast rocks cross the sky for a few seconds.");
      }
      if (wave % 4 === 0) {
        for (var s = 0; s < 6; s++) {
          var px = rand(40, W - 40), py = rand(40, H - 40);
          if (Math.abs(px - ship.x) < 50 && Math.abs(py - ship.y) < 50) px = (px + W / 2) % W;
          pickups.push({ x: px, y: py, vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), type: "seed", life: 900 });
        }
        queueEvent("Calm pocket", "Extra seeds drift in. Gather what you can.");
      }
    }
    function queueEvent(name, text) {
      events.push({ name: name, text: text });
      A.announce(name + ". " + text);
    }

    function onChapter(ch, idx) {
      runStats.chapter = Math.max(runStats.chapter, idx);
      if (idx > 0) {
        sfx.chapter(); A.haptics.win();
        A.announce("Wave " + wave + ", " + ch.name + ". " + ch.text);
      }
    }

    function syncHud() {
      shell.hud.set("score", Math.floor(score));
      shell.hud.set("best", Math.max(best, Math.floor(score)));
      shell.hud.set("wave", wave);
      shell.hud.set("lives", Math.max(0, lives));
    }

    // ---------- Flow ----------
    var HELP_DESK = "Arrows or A D turn · Up or W thrusts · Space or click fires · mouse aims · Shift or H blinks · B bombs · P pauses · M mutes · Esc closes";
    var HELP_TOUCH = "Drag anywhere on the field to steer and thrust; it fires while you hold · Blink and Bomb below";
    function showStart() {
      var p = A.progress.get(GAME_KEY);
      shell.prompt.show({
        kicker: "Synapse Drift",
        title: p.plays ? "Back into the drift" : "Clear the noise. Keep the calm.",
        text: coarse
          ? "Drag on the field to steer; the plane thrusts and fires while you hold. Break the loud thoughts into small ones, gather seeds, and five seeds open a Bloom."
          : "Turn with the arrows, thrust with Up, fire with Space, or aim with the mouse and click. Break the loud thoughts into small ones, gather seeds, and five seeds open a Bloom.",
        actions: [{ label: "Start", primary: true, onClick: start }],
        board: p.plays ? function (m) { A.renderLeaderboard(m, GAME_KEY, {}); } : null
      });
    }
    function start() {
      synth.ensure();
      resetWorld();
      state = "running"; stateBeforePause = null;
      story.set(0);
      shell.prompt.hide();
      wake.acquire();
      shell.setHelp(coarse ? HELP_TOUCH : HELP_DESK);
      try { cv.el.focus({ preventScroll: true }); } catch (e) {}
      A.announce("Go. Wave one, Quiet Start.");
    }
    function pause() {
      if (state !== "running" && state !== "waveclear") return;
      stateBeforePause = state;
      state = "paused";
      wake.release();
      input.release(); mouseFiring = false;
      shell.prompt.show({
        kicker: "Paused", title: CHAPTERS[story.index()].name,
        text: "Wave " + wave + " · score " + Math.floor(score) + " · " + lives + (lives === 1 ? " life" : " lives") + " left.",
        actions: [{ label: "Resume", primary: true, onClick: resume }, { label: "Quit", onClick: function () { A.closeGame(); } }],
        compact: true
      });
    }
    function resume() {
      if (state !== "paused") return;
      synth.ensure();
      state = stateBeforePause || "running"; stateBeforePause = null;
      shell.prompt.hide(); wake.acquire();
      try { cv.el.focus({ preventScroll: true }); } catch (e) {}
    }
    function gameOver() {
      state = "gameover";
      wake.release();
      var final = Math.floor(score);
      var placed = final > 0 && final >= best;
      if (final > best) best = final;
      A.progress.record(GAME_KEY, { score: final, chapter: runStats.chapter, badges: runStats.chapter >= 4 ? ["clear-sky"] : [] });
      syncHud();
      shell.renderPips([], pal);
      var ch = CHAPTERS[story.index()];
      shell.prompt.show({
        kicker: "The drift is over",
        title: placed ? "A new best: " + final : "Score " + final,
        text: "You reached wave " + wave + ", " + ch.name + ", and broke " + runStats.rocks + " rocks along the way.",
        board: function (m) {
          A.runSummary(m, {
            gameKey: GAME_KEY, score: final,
            lines: [["Wave", wave], ["Sky", ch.name], ["Best flow", combo.best() + "x"], ["Seeds", runStats.seeds], ["Blooms", runStats.blooms]],
            onSaved: function () { best = A.leaderboard.best(GAME_KEY); syncHud(); }
          });
        },
        actions: [{ label: "Play again", primary: true, onClick: start }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
      A.announce("Game over. Score " + final + ", wave " + wave + ".");
    }

    // ---------- Actions ----------
    function fire() {
      // Fire never starts or restarts a run: the game-over card (and its
      // initials form) must not be skipped by a held Space or a click.
      if ((state !== "running" && state !== "waveclear") || fireCooldown > 0) return;
      var bloom = powers.active("bloom");
      var spread = bloom ? [-0.17, 0, 0.17] : [0];
      for (var i = 0; i < spread.length; i++) {
        var a = ship.a + spread[i];
        shots.push({ x: ship.x + Math.cos(a) * 20, y: ship.y + Math.sin(a) * 20,
          vx: ship.vx * 0.45 + Math.cos(a) * 4.2 * S, vy: ship.vy * 0.45 + Math.sin(a) * 4.2 * S, life: 52, drone: false });
      }
      fireCooldown = bloom ? 8 : 13;
      sfx.fire();
    }
    function blink() {
      if ((state !== "running" && state !== "waveclear") || blinkCooldown > 0) return;
      synth.ensure();
      particles.burst(ship.x, ship.y, { n: 12, color: [pal.sageDeep, pal.forest], speed: 1.8, life: 22, size: 2.4, kind: ["leaf", "dot"] });
      var ok = false;
      for (var tries = 0; tries < 30 && !ok; tries++) {
        ship.x = rand(48, W - 48); ship.y = rand(48, H - 48);
        ok = true;
        for (var i = 0; i < rocks.length; i++) {
          if (dist2(ship, rocks[i]) < Math.pow(rocks[i].r + 40 * S, 2)) { ok = false; break; }
        }
      }
      particles.burst(ship.x, ship.y, { n: 10, color: pal.forest, speed: 1.2, life: 20, size: 2.4, kind: "ring" });
      ship.vx *= 0.4; ship.vy *= 0.4; ship.inv = Math.max(ship.inv, 80); ship.blink = 18;
      blinkCooldown = BLINK_COOLDOWN;
      sfx.blink(); A.haptics.tick();
    }
    function bomb() {
      if (state !== "running" && state !== "waveclear") return;
      if (!powers.use("bomb")) { if (state === "running") shell.toast("No bomb yet. Clay pickups carry one.", 1200); return; }
      synth.ensure();
      sfx.bomb(); A.haptics.thump();
      camera.shake(0.45); camera.freeze(reduce ? 0 : 3);
      bombRing = { x: ship.x, y: ship.y, t: 0 };
      for (var i = rocks.length - 1; i >= 0; i--) {
        var r = rocks[i];
        var dx = shortestDelta(ship.x, r.x, W), dy = shortestDelta(ship.y, r.y, H);
        var d = Math.sqrt(dx * dx + dy * dy);
        if (r.size === 1 && d < BOMB_RANGE + r.r) { hitRock(i, -1); continue; }
        if (d < BOMB_RANGE * 1.6) {
          var push = (1 - d / (BOMB_RANGE * 1.6)) * 2.6 * S;
          var nd = d || 1;
          r.vx += dx / nd * push; r.vy += dy / nd * push;
        }
      }
      A.announce("Bomb. The small rocks nearby are cleared.");
    }
    function activateBloom() {
      seedMeter = 0;
      powers.grant("bloom"); powers.grant("shield");
      runStats.blooms += 1;
      particles.burst(ship.x, ship.y, { n: 26, color: [pal.sageDeep, pal.sage, pal.ochre], speed: 2.4, life: 30, size: 2.8, kind: ["leaf", "leaf", "dot"] });
      floaters.spawn(ship.x, ship.y - 26, "Bloom", pal.forest, { size: 16, font: "display" });
      camera.shake(0.45); camera.freeze(reduce ? 0 : 4);
      sfx.bloom(); A.haptics.win();
      shell.toast("Bloom: " + POWERUPS.bloom.text, 1600);
      A.announce("Bloom. " + POWERUPS.bloom.text + ".");
    }
    function grantPower(id) {
      if (id === "bloom") { activateBloom(); return; }
      var def = POWERUPS[id]; if (!def) return;
      powers.grant(id);
      if (id === "drone") drone.cd = 20;
      runStats.powers += 1;
      sfx.power(); A.haptics.thump();
      floaters.spawn(ship.x, ship.y - 24, def.label, pal[def.color], { size: 14, font: "display" });
      shell.toast(def.label + ": " + def.text, 1600);
      A.announce(def.label + ". " + def.text + ".");
    }

    function hitRock(index, shotIndex) {
      var rock = rocks[index];
      if (shotIndex >= 0) shots.splice(shotIndex, 1);
      var mult = combo.hit();
      var pts = ROCK_POINTS[rock.size] * mult;
      score += pts;
      runStats.rocks += 1;
      if (!rock.meteor) waveKills += 1;
      particles.burst(rock.x, rock.y, { n: rock.size <= 1 ? 7 : 12, color: rock.size <= 2 ? [pal.sageDeep, pal.surface, pal.ink] : [pal.surface, pal.inkMuted, pal.sage],
        speed: 1.6 + rock.size * 0.3, life: 24, size: 2.6, kind: ["square", "dot", "spark"], gravity: 0 });
      if (mult > 1) floaters.spawn(rock.x, rock.y - 12, "+" + pts + " ×" + mult, mult >= 4 ? pal.clayText : pal.forest, { size: 12 });
      sfx.rock(mult);
      var nowMs = Date.now();
      if (rock.size >= 3) { A.haptics.thump(); lastPopAt = nowMs; }
      else if (nowMs - lastPopAt >= 80) { A.haptics.pop(); lastPopAt = nowMs; }
      camera.shake(rock.size >= 4 ? 0.32 : rock.size === 3 ? 0.22 : rock.size === 2 ? 0.13 : 0.08);
      camera.freeze(reduce ? 0 : (rock.size >= 3 ? 3 : 1));
      if (rock.size > 1) {
        var kids = rock.size === 4 ? 3 : 2;
        for (var k = 0; k < kids; k++) {
          var a = Math.random() * Math.PI * 2;
          var sp = (rand(0.55, 1.35) + wave * 0.035) * S;
          var kid = makeRock(rock.x + Math.cos(a) * 6, rock.y + Math.sin(a) * 6,
            Math.cos(a) * sp + rock.vx * 0.35, Math.sin(a) * sp + rock.vy * 0.35, rock.size - 1);
          kid.spin = rand(-0.04, 0.04);
          rocks.push(kid);
        }
      }
      var dropChance = rock.meteor ? 0.05 : 0.13 + (rock.size === 1 ? 0.08 : 0);
      if (Math.random() < dropChance) {
        var roll = Math.random(), type = "seed";
        if (roll > 0.9) type = "bomb"; else if (roll > 0.8) type = "drone"; else if (roll > 0.7) type = powers.active("shield") ? "seed" : "shield";
        pickups.push({ x: rock.x, y: rock.y, vx: rand(-0.45, 0.45) * S, vy: rand(-0.45, 0.45) * S, type: type, life: 560 });
      }
      rocks.splice(index, 1);
      syncHud(); shell.hud.flash("score");
    }

    function loseLife(force) {
      lives -= 1;
      hurtTimer = 16;
      combo.reset();
      camera.shake(0.85); camera.freeze(reduce ? 0 : 8);
      particles.burst(ship.x, ship.y, { n: 22, color: [pal.clay, pal.surface, pal.ink], speed: 2.2, life: 34, size: 2.8, kind: ["square", "dot", "spark"] });
      sfx.hit(); A.haptics.crash();
      powers.remove("drone");
      if (lives <= 0 || force === "end") {
        lives = 0;
        state = "dying"; deathTimer = 60;
        wake.release();
      } else {
        resetShip();
        A.announce(lives + (lives === 1 ? " life" : " lives") + " left.");
      }
      syncHud();
    }
    function shipHit(rockIndex) {
      if (ship.inv > 0 || powers.active("bloom")) { hitRock(rockIndex, -1); return; }
      if (powers.use("shield")) {
        ship.inv = 120;
        seedMeter = Math.max(0, seedMeter - 1);
        particles.burst(ship.x, ship.y, { n: 18, color: [pal.forest, pal.sage], speed: 2, life: 24, size: 2.4, kind: ["ring", "leaf"] });
        floaters.spawn(ship.x, ship.y - 22, "Shield", pal.forest, { size: 13, font: "display" });
        hitRock(rockIndex, -1);
        camera.shake(0.3); camera.freeze(reduce ? 0 : 2);
        sfx.shield();
        A.announce("Shield used.");
        return;
      }
      loseLife();
    }
    function collectPickup(i) {
      var p = pickups[i];
      pickups.splice(i, 1);
      if (p.type === "seed") {
        seedMeter += 1; score += 25; runStats.seeds += 1;
        floaters.spawn(p.x, p.y - 12, "+25 seed", pal.forest, { size: 11 });
        particles.burst(p.x, p.y, { n: 8, color: [pal.ochre, pal.sageDeep], speed: 1.4, life: 18, size: 2.2, kind: ["leaf", "dot"] });
        sfx.seed(); A.haptics.pop();
        if (seedMeter >= 5) activateBloom();
      } else {
        particles.burst(p.x, p.y, { n: 14, color: [pal[POWERUPS[p.type].color], pal.surface], speed: 2, life: 24, size: 2.4, kind: ["ring", "dot"] });
        if (p.type === "shield") { powers.grant("shield"); runStats.powers += 1; sfx.shield(); floaters.spawn(p.x, p.y - 14, "Shield", pal.forest, { size: 13, font: "display" }); shell.toast("Shield: " + POWERUPS.shield.text, 1400); A.announce("Shield. " + POWERUPS.shield.text + "."); }
        else grantPower(p.type);
      }
      syncHud();
    }

    // ---------- Input ----------
    function pauseToggle() { if (state === "running" || state === "waveclear") pause(); else if (state === "paused") resume(); }
    var input = A.makeInput(cv.el, {
      canvas: cv,
      keys: { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "thrust", w: "thrust", " ": "fire", h: "blink", b: "bomb", p: "pause" },
      onAction: function (a, repeat, e) {
        if (e && e.preventDefault) e.preventDefault();
        if (shiftDown) shiftUsed = true;
        if (repeat) return;
        if (a === "fire") fire();
        else if (a === "blink") blink();
        else if (a === "bomb") bomb();
        else if (a === "pause") pauseToggle();
        else if ((a === "left" || a === "right") && mouseTarget) mouseTarget = null; // keys win until the mouse moves again
      },
      onMove: function (pt, e) {
        if (stick && e && e.pointerType !== "mouse") return;
        if (state === "running" || state === "waveclear") mouseTarget = { x: pt.x, y: pt.y };
      },
      onDown: function (pt, e) {
        if (stick && e && e.pointerType !== "mouse") return;
        if (state !== "running" && state !== "waveclear") return;
        mouseTarget = { x: pt.x, y: pt.y };
        mouseFiring = true;
        fire();
      },
      onUp: function () { mouseFiring = false; }
    });
    cv.el.addEventListener("pointerleave", function () { mouseTarget = null; mouseFiring = false; });

    // Coarse pointers steer with a floating stick anywhere on the stage and
    // autofire while it is engaged, so one thumb plays the whole game.
    var stick = null;
    if (coarse) {
      stick = A.makeStick(shell.stage, {
        accept: function (e) {
          if (state !== "running" && state !== "waveclear") return false;
          return !(e.target && e.target.closest && e.target.closest("button, a, input, label, form, .gms-arcade-prompt"));
        }
      });
    }
    shell.onTap(function (id) {
      if (id === "blink") blink();
      else if (id === "bomb") bomb();
      else if (id === "pause") { if (state === "idle" || state === "gameover") return; pauseToggle(); }
    });

    // ---------- Tick ----------
    function simulate(dt) {
      // steering
      var stickMag = 0;
      if (stick && stick.active()) { mouseTarget = null; stickMag = stick.mag(); }
      if (stickMag > 0) {
        var sturn = Math.atan2(Math.sin(stick.angle() - ship.a), Math.cos(stick.angle() - ship.a));
        ship.a += clamp(sturn, -0.11 * dt, 0.11 * dt);
      }
      if (mouseTarget) {
        var desired = Math.atan2(mouseTarget.y - ship.y, mouseTarget.x - ship.x);
        var turn = Math.atan2(Math.sin(desired - ship.a), Math.cos(desired - ship.a));
        ship.a += clamp(turn, -0.11 * dt, 0.11 * dt);
      } else {
        if (input.held.left) ship.a -= 0.075 * dt;
        if (input.held.right) ship.a += 0.075 * dt;
      }
      thrustLevel = input.held.thrust ? 1 : 0;
      if (stickMag > 0.35) thrustLevel = Math.max(thrustLevel, stickMag);
      if (thrustLevel > 0) {
        ship.vx += Math.cos(ship.a) * 0.085 * S * thrustLevel * dt;
        ship.vy += Math.sin(ship.a) * 0.085 * S * thrustLevel * dt;
        if (Math.random() < 0.5 * dt) {
          var ba = ship.a + Math.PI + rand(-0.35, 0.35);
          particles.spawn(ship.x - Math.cos(ship.a) * 12, ship.y - Math.sin(ship.a) * 12, { vx: Math.cos(ba) * rand(0.8, 1.6), vy: Math.sin(ba) * rand(0.8, 1.6), life: 12, color: pal.sageDeep, size: 1.6, kind: "dot" });
        }
        if (Math.random() < 0.04) sfx.thrust();
      }
      ship.vx *= Math.pow(0.992, dt); ship.vy *= Math.pow(0.992, dt);
      var sp = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy), maxSp = 3.1 * S;
      if (sp > maxSp) { ship.vx = ship.vx / sp * maxSp; ship.vy = ship.vy / sp * maxSp; }
      ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      wrap(ship, 14);

      // firing: held Space, held mouse button, or an engaged stick
      if (input.held.fire || mouseFiring || (stick && stick.active())) fire();

      if (fireCooldown > 0) fireCooldown -= dt;
      if (blinkCooldown > 0) { blinkCooldown -= dt; if (blinkCooldown <= 0) { blinkCooldown = 0; sfx.ready(); } }
      if (ship.inv > 0) ship.inv -= dt;
      if (ship.blink > 0) ship.blink -= dt;
      combo.tick(dt); powers.tick(dt);

      // bloom leaves
      if (powers.active("bloom")) {
        bloomLeafT -= dt;
        if (bloomLeafT <= 0) {
          bloomLeafT = 5;
          var la = Math.random() * Math.PI * 2;
          particles.spawn(ship.x + Math.cos(la) * 20, ship.y + Math.sin(la) * 20, { vx: Math.cos(la) * 0.6, vy: Math.sin(la) * 0.6 - 0.2, life: 30, color: Math.random() < 0.5 ? pal.sageDeep : pal.sage, size: 2.4, kind: "leaf", spin: 0.05 });
        }
      }

      // orbit drone
      if (powers.active("drone")) {
        drone.a += 0.06 * dt;
        drone.cd -= dt;
        if (drone.cd <= 0) {
          var dp = dronePos(), bestR = null, bestD = Infinity, bdx = 0, bdy = 0;
          for (var q = 0; q < rocks.length; q++) {
            var ddx = shortestDelta(dp.x, rocks[q].x, W), ddy = shortestDelta(dp.y, rocks[q].y, H);
            var dd = ddx * ddx + ddy * ddy;
            if (dd < bestD) { bestD = dd; bestR = rocks[q]; bdx = ddx; bdy = ddy; }
          }
          if (bestR) {
            var ta = Math.atan2(bdy, bdx);
            shots.push({ x: dp.x, y: dp.y, vx: Math.cos(ta) * 4.2 * S, vy: Math.sin(ta) * 4.2 * S, life: 52, drone: true });
            sfx.drone();
            drone.cd = 40;
          } else drone.cd = 10;
        }
      }

      // shots
      for (var s = shots.length - 1; s >= 0; s--) {
        var shot = shots[s];
        shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
        wrap(shot, 2);
        if (shot.life <= 0) { shots.splice(s, 1); continue; }
        for (var r = rocks.length - 1; r >= 0; r--) {
          if (dist2(shot, rocks[r]) < rocks[r].r * rocks[r].r) { hitRock(r, s); break; }
        }
      }

      // meteor shower
      if (shower && state === "running") {
        if (shower.delay > 0) shower.delay -= dt;
        else {
          shower.t -= dt; shower.spawn -= dt;
          if (shower.spawn <= 0) {
            shower.spawn = 22;
            var diag = Math.sqrt(W * W + H * H);
            var ma = shower.a + rand(-0.25, 0.25), dirx = Math.cos(shower.a), diry = Math.sin(shower.a);
            var off = rand(-diag / 2, diag / 2);
            var mx = W / 2 - dirx * (diag / 2 + 30) - diry * off, my = H / 2 - diry * (diag / 2 + 30) + dirx * off;
            var msp = rand(3.0, 3.8) * S;
            rocks.push(makeRock(mx, my, Math.cos(ma) * msp, Math.sin(ma) * msp, 1, { meteor: true, life: (diag + 120) / msp }));
          }
          if (shower.t <= 0) shower = null;
        }
      }

      // rocks
      for (var i = rocks.length - 1; i >= 0; i--) {
        var rock = rocks[i];
        rock.x += rock.vx * dt; rock.y += rock.vy * dt; rock.a += rock.spin * dt;
        if (rock.meteor) { rock.life -= dt; if (rock.life <= 0) { rocks.splice(i, 1); continue; } }
        else wrap(rock, rock.r + 4);
        if (dist2(ship, rock) < Math.pow(rock.r + 7 * S, 2)) { shipHit(i); if (state === "dying") return; }
      }

      // pickups
      var bloomOn = powers.active("bloom");
      for (var p = pickups.length - 1; p >= 0; p--) {
        var pk = pickups[p];
        var dxp = shortestDelta(pk.x, ship.x, W), dyp = shortestDelta(pk.y, ship.y, H);
        var d2p = dxp * dxp + dyp * dyp;
        var range = (bloomOn ? 170 : mouseTarget ? 118 : 86) * S;
        if (d2p < range * range) {
          var d = Math.max(8, Math.sqrt(d2p));
          var pull = (bloomOn ? 0.12 : mouseTarget ? 0.07 : 0.055) * S;
          pk.vx += (dxp / d) * pull * dt; pk.vy += (dyp / d) * pull * dt;
          var psp = Math.sqrt(pk.vx * pk.vx + pk.vy * pk.vy), pmax = (bloomOn ? 3.1 : mouseTarget ? 2.25 : 1.9) * S;
          if (psp > pmax) { pk.vx = pk.vx / psp * pmax; pk.vy = pk.vy / psp * pmax; }
        }
        pk.x += pk.vx * dt; pk.y += pk.vy * dt; pk.life -= dt;
        wrap(pk, 6);
        if (pk.life <= 0) { pickups.splice(p, 1); continue; }
        if (dist2(ship, pk) < 18 * S * 18 * S) collectPickup(p);
      }

      if (bombRing) { bombRing.t += dt; if (bombRing.t > 30) bombRing = null; }

      // wave clear: only the wave's own rocks count, meteors drift on
      if (state === "running") {
        var left = 0;
        for (var c = 0; c < rocks.length; c++) if (!rocks[c].meteor) left++;
        if (!left) {
          var bonus = 200 + wave * 40 + lives * 25;
          score += bonus;
          state = "waveclear"; nextWaveTimer = 90; shower = null;
          floaters.spawn(W / 2, H / 2 - 20, "Clear +" + bonus, pal.forest, { size: 16, font: "display", life: 60 });
          A.haptics.win();
          syncHud(); shell.hud.flash("score");
        }
      } else if (state === "waveclear") {
        nextWaveTimer -= dt;
        if (nextWaveTimer <= 0) {
          wave += 1;
          state = "running";
          story.advance(wave);
          buildWave();
          syncHud(); shell.hud.flash("wave");
        }
      }
    }

    function tick(dt) {
      time += dt;
      camera.tick(dt); particles.tick(dt); floaters.tick(dt); story.tick(dt);
      if (hurtTimer > 0) hurtTimer -= dt;
      // event banners wait until the chapter banner has had its moment
      if (eventBanner) { eventBanner.t -= dt; if (eventBanner.t <= 0) eventBanner = null; }
      if (!eventBanner && events.length && (state === "running" || state === "waveclear")) {
        var ev = events.shift(); eventBanner = { name: ev.name, text: ev.text, t: 170, len: 170 };
        sfx.event();
      }
      if (state === "dying") {
        deathTimer -= dt;
        for (var i = 0; i < rocks.length; i++) { var r = rocks[i]; r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.spin * dt; if (!r.meteor) wrap(r, r.r + 4); }
        if (deathTimer <= 0) gameOver();
        return;
      }
      if (state !== "running" && state !== "waveclear") return;
      shell.renderPips(powers.list(), pal);
      if (camera.frozen()) return;
      simulate(dt);
      input.consume();
    }

    // ---------- Render ----------
    function dronePos() { return { x: ship.x + Math.cos(drone.a) * 40, y: ship.y + Math.sin(drone.a) * 40 }; }

    function rockPath(r) {
      ctx.beginPath();
      for (var i = 0; i < r.verts.length; i++) {
        var a = i / r.verts.length * Math.PI * 2, rr = r.r * r.verts[i];
        var x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    function drawRock(r) {
      var fill = r.size === 1 ? pal.sageMist : r.size === 2 ? pal.mix(pal.surface, pal.sageMist, 0.5) : pal.surface;
      // shadow: the same outline, 2 px down, unrotated offset
      ctx.save(); ctx.translate(r.x, r.y + 2); ctx.rotate(r.a); rockPath(r); ctx.fillStyle = pal.shadow; ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a);
      rockPath(r);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = r.meteor ? pal.clay : pal.ink; ctx.lineWidth = 1.4; ctx.stroke();
      // cracks
      ctx.strokeStyle = pal.alpha(pal.ink, pal.isDark ? 0.5 : 0.38); ctx.lineWidth = 1;
      ctx.beginPath();
      for (var c = 0; c < r.cracks.length; c++) {
        var k = r.cracks[c];
        ctx.moveTo(Math.cos(k[0]) * r.r * k[1], Math.sin(k[0]) * r.r * k[1]);
        ctx.lineTo(Math.cos(k[2]) * r.r * k[3], Math.sin(k[2]) * r.r * k[3]);
        ctx.lineTo(Math.cos(k[4]) * r.r * k[5], Math.sin(k[4]) * r.r * k[5]);
      }
      ctx.stroke();
      ctx.restore();
      if (r.size >= 3) draw.label(ctx, r.label, r.x, r.y + 0.5, { size: 11, weight: 600, color: pal.inkSoft });
    }

    function planePath(top) {
      ctx.beginPath();
      if (top === 1) { ctx.moveTo(14, 0); ctx.lineTo(-10, -10); ctx.lineTo(-6, 0); }
      else if (top === 2) { ctx.moveTo(14, 0); ctx.lineTo(-6, 0); ctx.lineTo(-10, 10); }
      else { ctx.moveTo(14, 0); ctx.lineTo(-10, -10); ctx.lineTo(-6, 0); ctx.lineTo(-10, 10); }
      ctx.closePath();
    }
    function drawShip() {
      var x = ship.x, y = ship.y, k = 1.5;
      var bloomOn = powers.active("bloom");
      var alpha = 1;
      if (ship.inv > 0) alpha = reduce ? 0.65 : (Math.floor(ship.inv / 8) % 2 === 0 ? 0.5 : 1);
      if (ship.blink > 0) alpha = 0.35;

      // Bloom: a sage halo
      if (bloomOn) {
        var bf = powers.frac("bloom");
        var hr = 32 + (reduce ? 0 : Math.sin(time * 0.1) * 1.5);
        draw.circle(ctx, x, y, hr, { fill: pal.alpha(pal.sage, pal.isDark ? 0.22 : 0.3), stroke: pal.alpha(pal.sageDeep, 0.8), lineWidth: 1.4 });
        draw.ring(ctx, x, y, hr + 4, bf, { stroke: pal.ochre, lineWidth: 2 });
      } else if (powers.active("shield")) {
        ctx.save();
        ctx.setLineDash([5, 4]); ctx.lineDashOffset = reduce ? 0 : -time * 0.2;
        ctx.strokeStyle = pal.alpha(pal.forest, 0.6); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      // Blink cooldown ring
      if (blinkCooldown > 0) {
        ctx.strokeStyle = pal.rule; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, 21, 0, Math.PI * 2); ctx.stroke();
        draw.ring(ctx, x, y, 21, 1 - blinkCooldown / BLINK_COOLDOWN, { stroke: pal.alpha(pal.forest, 0.8), lineWidth: 1.6 });
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      // shadow
      ctx.save(); ctx.translate(x, y + 2.5); ctx.rotate(ship.a); ctx.scale(k, k); planePath(0); ctx.fillStyle = pal.shadow; ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.rotate(ship.a); ctx.scale(k, k);
      // thrust: a short fan of sage dashes behind the tail
      if (thrustLevel > 0 && (state === "running" || state === "waveclear")) {
        ctx.strokeStyle = pal.sageDeep; ctx.lineWidth = 1.8 / k;
        ctx.beginPath();
        for (var f = -1; f <= 1; f++) {
          var fa = Math.PI + f * 0.32;
          var len = (f === 0 ? 9 : 6) * (0.6 + 0.4 * thrustLevel) + (reduce ? 0 : Math.random() * 3);
          ctx.moveTo(-8 + Math.cos(fa) * 2, Math.sin(fa) * 2);
          ctx.lineTo(-8 + Math.cos(fa) * (2 + len), Math.sin(fa) * (2 + len));
        }
        ctx.stroke();
      }
      planePath(1); ctx.fillStyle = pal.surface; ctx.fill();
      planePath(2); ctx.fillStyle = pal.mix(pal.surface, pal.surface2, 0.7); ctx.fill();
      planePath(0); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.3 / k; ctx.stroke();
      // crease
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, 0); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1 / k; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, 0.8); ctx.lineTo(-8, 5); ctx.strokeStyle = pal.alpha(pal.ink, 0.35); ctx.lineWidth = 0.9 / k; ctx.stroke();
      // the lens at the nose
      ctx.beginPath(); ctx.arc(6.5, 0, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = pal.alpha(pal.sageMist, 0.9); ctx.fill();
      ctx.strokeStyle = pal.forest; ctx.lineWidth = 1.7 / k; ctx.stroke();
      ctx.beginPath(); ctx.arc(5.6, -1, 0.9, 0, Math.PI * 2); ctx.fillStyle = pal.alpha(pal.surface, 0.9); ctx.fill();
      ctx.restore();
      ctx.restore();

      // the orbit drone: a small lens
      if (powers.active("drone")) {
        var dp = dronePos();
        ctx.strokeStyle = pal.alpha(pal.research, 0.25); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.stroke();
        draw.circle(ctx, dp.x, dp.y, 5.5, { fill: pal.surface, stroke: pal.research, lineWidth: 1.8, shadow: 2, shadowColor: pal.shadow });
        draw.circle(ctx, dp.x, dp.y, 1.6, { fill: pal.ink });
      }
    }

    function drawPickup(p) {
      var x = p.x, y = p.y + (reduce ? 0 : Math.sin(time * 0.1 + p.life * 0.01) * 1.2);
      var dxp = shortestDelta(p.x, ship.x, W), dyp = shortestDelta(p.y, ship.y, H);
      var dd = Math.sqrt(dxp * dxp + dyp * dyp), reach = 118 * S;
      if (state !== "dying" && dd < reach) {
        ctx.save();
        ctx.globalAlpha = clamp(1 - dd / reach, 0.12, 0.5);
        draw.dashes(ctx, x, y, x + dxp * 0.55, y + dyp * 0.55, 2, 4, { stroke: pal.sageDeep, lineWidth: 1.2 });
        ctx.restore();
      }
      if (!reduce && p.life < 90 && Math.floor(p.life / 8) % 2 === 0) return; // fading out
      if (p.type === "seed") {
        ctx.fillStyle = pal.alpha(pal.ochre, pal.isDark ? 0.2 : 0.15);
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
        draw.seed(ctx, x, y, 6, pal);
        return;
      }
      var def = POWERUPS[p.type], col = pal[def.color];
      draw.circle(ctx, x, y, 9.5, { fill: col, stroke: pal.ink, lineWidth: 1.4, shadow: 2.5, shadowColor: pal.shadow });
      draw.circle(ctx, x, y, 13 + (reduce ? 0 : Math.sin(time * 0.1) * 1.2), { stroke: pal.alpha(col, 0.5), lineWidth: 1.2 });
      draw.label(ctx, def.label.charAt(0), x, y + 0.5, { font: "display", size: 13, weight: 600, color: pal.onForest });
    }

    function drawShot(s) {
      var tx = s.x - s.vx * 1.4, ty = s.y - s.vy * 1.4;
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.strokeStyle = s.drone ? pal.research : pal.ochre; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
    }

    function drawBanner(name, text, frac, y, big) {
      var a = Math.min(1, frac * 3) * Math.min(1, (1 - frac) * 6 + 0.2);
      ctx.save(); ctx.globalAlpha = a;
      var ty = y + (reduce ? 0 : (1 - Math.min(1, (1 - frac) * 4)) * -10);
      draw.label(ctx, name, W / 2, ty, { font: "display", size: big ? 26 : 18, color: big ? pal.ink : pal.forest, weight: 500 });
      draw.label(ctx, text, W / 2, ty + (big ? 22 : 17), { size: 11, color: pal.inkMuted, weight: 500, maxWidth: W - 32 });
      ctx.restore();
    }

    function drawMeters() {
      var bloomOn = powers.active("bloom");
      var bx = 12, by = H - 16;
      if (bloomOn) {
        var bf = powers.frac("bloom");
        var warn = bf * BLOOM_FRAMES <= 60;
        draw.label(ctx, warn ? "Bloom is fading" : "Bloom", bx, by - 10, { size: 10, color: warn ? pal.clayText : pal.forest, align: "left" });
        draw.pill(ctx, bx, by - 2, 70, 5, { fill: pal.alpha(pal.ink, 0.12) });
        draw.pill(ctx, bx, by - 2, Math.max(5, 70 * bf), 5, { fill: pal.ochre });
      } else {
        draw.label(ctx, "Seeds", bx, by - 10, { size: 10, color: pal.inkMuted, align: "left" });
        for (var i = 0; i < 5; i++) {
          var sx = bx + 4 + i * 13;
          if (i < seedMeter) draw.circle(ctx, sx, by + 1, 4, { fill: pal.ochre, stroke: pal.ink, lineWidth: 1 });
          else draw.circle(ctx, sx, by + 1, 4, { stroke: pal.rule, lineWidth: 1.2 });
        }
      }
      draw.label(ctx, blinkCooldown > 0 ? "Blink" : "Blink ready", W - 12, by - 10, { size: 10, color: blinkCooldown > 0 ? pal.inkMuted : pal.forest, align: "right" });
      draw.pill(ctx, W - 82, by - 2, 70, 5, { fill: pal.alpha(pal.ink, 0.12) });
      draw.pill(ctx, W - 82, by - 2, Math.max(5, 70 * (1 - blinkCooldown / BLINK_COOLDOWN)), 5, { fill: pal.forest });
    }

    function render() {
      cv.begin(camera);
      var bloomOn = powers.active("bloom");
      draw.paper(ctx, W, H, pal, { grid: false, fill: bloomOn ? pal.mix(pal.paper, pal.sageMist, pal.isDark ? 0.12 : 0.45) : pal.paper });

      // stars: a quiet dot field
      ctx.fillStyle = pal.grid;
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var sr = st.big ? 1.7 + (reduce ? 0 : Math.sin(time * 0.03 + st.tw) * 0.4) : 1;
        if (st.big) ctx.fillStyle = pal.rule; else ctx.fillStyle = pal.grid;
        ctx.beginPath(); ctx.arc(st.x, st.y, sr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      var playing = state === "running" || state === "waveclear" || state === "paused";
      for (var p = 0; p < pickups.length; p++) drawPickup(pickups[p]);
      for (var r = 0; r < rocks.length; r++) drawRock(rocks[r]);
      for (var s = 0; s < shots.length; s++) drawShot(shots[s]);
      if (playing || state === "idle") drawShip();

      if (bombRing) {
        var bt = bombRing.t / 30;
        var br = reduce ? BOMB_RANGE : BOMB_RANGE * (0.2 + 0.8 * Math.sqrt(bt));
        ctx.save(); ctx.globalAlpha = 1 - bt;
        draw.circle(ctx, bombRing.x, bombRing.y, br, { fill: pal.alpha(pal.clay, 0.1), stroke: pal.clay, lineWidth: 2 });
        ctx.restore();
      }

      particles.render(ctx);
      floaters.render(ctx);

      if (playing) {
        drawMeters();
        // Flow: the combo chain, top right (the pips own the top left)
        if (combo.active() && combo.mult() > 1) {
          var cm = combo.mult();
          draw.label(ctx, "Flow ×" + cm, W - 12, 18, { size: 12, weight: 700, color: cm >= 4 ? pal.clayText : pal.forest, align: "right" });
          draw.pill(ctx, W - 62, 28, 50, 4, { fill: pal.alpha(pal.ink, 0.12) });
          draw.pill(ctx, W - 62, 28, Math.max(4, 50 * combo.frac()), 4, { fill: pal.forest });
        }
      }

      // banners: the chapter at the top, a wave event under it
      var bn = story.banner();
      // In portrait the power-up pips stack down the top left, so the banners sit below them.
      var chapterShown = bn && playing, bannerY = W < H ? 150 : 28;
      if (chapterShown) drawBanner(bn.name, bn.text, bn.frac, bannerY, true);
      if (eventBanner && playing) drawBanner(eventBanner.name, eventBanner.text, eventBanner.t / eventBanner.len, chapterShown ? bannerY + 52 : bannerY, false);

      // progress toward the next sky along the bottom rule
      if (playing) {
        var within = waveTotal ? clamp(waveKills / waveTotal, 0, 1) : 0;
        if (state === "waveclear") within = 1;
        var prog = story.progress(wave + within * 0.999);
        ctx.fillStyle = pal.alpha(pal.forest, 0.55); ctx.fillRect(0, H - 2, W * prog, 2);
      }

      if (hurtTimer > 0 && !reduce) { ctx.fillStyle = pal.alpha(pal.clay, 0.14 * hurtTimer / 16); ctx.fillRect(0, 0, W, H); }
      cv.end();
    }

    var loop = A.makeLoop(tick, render);
    function onHidden() { if (state === "running" || state === "waveclear") pause(); }

    function startIfNeeded() { if (state === "idle" || state === "gameover") start(); if (state === "paused") resume(); }
    A.debug("asteroids", {
      state: function () { return state; },
      score: function () { return Math.floor(score); },
      grant: function (id) { startIfNeeded(); grantPower(id); },
      skipToWave: function (n) {
        startIfNeeded();
        wave = Math.max(1, n | 0);
        state = "running";
        story.advance(wave);
        pickups = []; shots = [];
        rocks = [];
        buildWave();
        syncHud();
        return wave;
      },
      clearWave: function () { startIfNeeded(); rocks = rocks.filter(function (r) { return r.meteor; }); },
      die: function (all) { startIfNeeded(); if (state === "running" || state === "waveclear") loseLife(all ? "end" : null); },
      info: function () { return { wave: wave, lives: lives, rocks: rocks.length, pickups: pickups.length, seeds: seedMeter, chapter: CHAPTERS[story.index()].name, powers: powers.list().map(function (p) { return p.id; }), size: [W, H] }; }
    });

    return {
      held: input.held,
      activate: function () {
        pal = A.theme();
        cv.fit();
        if (cv.aspect() < 0.9) setField(440, 640); else setField(640, 440);
        cv.setSize(W, H);
        state = "idle"; resetWorld();
        shell.setHelp(coarse ? HELP_TOUCH : HELP_DESK);
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
        input.release(); mouseFiring = false;
        state = "idle";
      },
      onKeydown: function (e) {
        if (e.key === "Shift") {
          if (!e.repeat) { shiftDown = true; shiftUsed = false; }
          e.preventDefault();
          return;
        }
        if (input.onKeydown(e)) e.preventDefault();
      },
      onKeyup: function (e) {
        // Shift blinks on release, unless it was a modifier (Shift+B bombs).
        if (e.key === "Shift") { if (shiftDown && !shiftUsed) blink(); shiftDown = false; return; }
        input.onKeyup(e);
      },
      destroy: function () { offTheme(); input.destroy(); if (stick) stick.destroy(); }
    };
  }

  // ======================================================================
  //  Overlay
  // ======================================================================
  A.ready(function () {
    A.defineGame("asteroids", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Synapse Drift",
        tagline: "Clear the noise. Keep the calm.",
        label: "Synapse Drift game",
        canvas: { w: W, h: H, label: "Synapse Drift play field" },
        hud: [{ id: "score", label: "Score", value: 0 }, { id: "best", label: "Best", value: A.leaderboard.best(GAME_KEY) }, { id: "wave", label: "Wave", value: 1 }, { id: "lives", label: "Lives", value: 3 }],
        help: "Arrows or A D turn · Up or W thrusts · Space or click fires · Shift or H blinks · B bombs · M mutes · Esc closes",
        touch: [
          { id: "blink", label: "Blink", aria: "Blink to a safe spot", tap: true, wide: true },
          { id: "bomb", label: "Bomb", aria: "Use a bomb", tap: true, wide: true },
          { id: "pause", label: "Pause", aria: "Pause or resume", tap: true }
        ]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
