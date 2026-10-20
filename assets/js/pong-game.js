/* Growing Minds Science — pong-game.js
   "Pong" on the Arcade page: a rally on a field-guide court. You take the
   right paddle (the bottom one on a portrait phone) against a CPU whose mood
   changes over the match, or against a friend on the same keyboard. First to
   seven wins. Long rallies score more, a run of points won multiplies them,
   and winning the match adds a bonus for the margin.

   Core v2 game (see docs/arcade/game-brief.md): reads the live brand tokens
   through A.theme(), draws at device resolution through the shell's canvas,
   uses makeShell for the overlay, makeStory for the three chapters,
   makePowerups for timed effects, runSummary for the end card. Fully self-
   contained: no page markup, no stylesheet of its own, audio is the shared
   Web Audio synth. CSP-safe: no eval, no external assets. Honors
   prefers-reduced-motion.

   The physics always runs on a landscape court (480 by 300). A portrait
   phone gets the same court turned on end (300 by 480, CPU at the top, you at
   the bottom): sx/sy/srect map court coordinates to the screen at draw time,
   and pointer input is mapped back.

   Power-ups: Wide (sage, your paddle half again as long for 8 s), Slow
   (research blue, the ball at 0.65 speed for 6 s), Split (ochre, a second
   ball for 10 s). A capsule drifts across the court about every 12 seconds;
   the ball that hits it grants it to whoever touched that ball last. The CPU
   can win Wide for itself.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "pong";
  var MUTE_KEY = "gms-pong-muted";
  var MODE_KEY = "gms-pong-mode";

  // ---------- Court (landscape physics frame) ----------
  var W = 480, H = 300;
  var INSET = 18, PW = 10, PH = 56, R = 6;
  var WIN = 7;
  var SPEED0 = 3.6, SPEED_MAX = 7.8, SPEED_UP = 1.06;
  var KEY_SPEED = 5.4, POINTER_SPEED = 12;
  var SPIN = 0.32;
  var SERVE_FRAMES = 56, END_FRAMES = 70;
  var CAPSULE_EVERY = 720, TRAIL = 8;

  // ---------- Story: three chapters over a match ----------
  // Warm-up opens the match, Rally starts once three points have been
  // played, Match point arrives when either side is one point from seven.
  // Each chapter is also the CPU's mood: steady, eager, then tired.
  var CHAPTERS = [
    { name: "Warm-up", at: 0, text: "" },
    { name: "Rally", at: 3, text: "" },
    { name: "Match point", at: 1e9, text: "" }
  ];
  var CHAPTER_TEXT = {
    cpu: ["The CPU plays it steady. Find your rhythm.", "The CPU gets eager. Angle your returns past it.", "One point from the end. The CPU is tiring."],
    duo: ["Find your rhythm.", "Longer rallies now. Angle your returns.", "One point from the end."]
  };
  var PERSONAS = [
    { name: "steady", speed: 3.3, react: 0.1, err: 0.55, follow: false, fatigue: 0 },
    { name: "eager", speed: 4.3, react: 0.17, err: 0.8, follow: true, fatigue: 0 },
    { name: "tired", speed: 3.9, react: 0.1, err: 0.65, follow: false, fatigue: 0.045 }
  ];

  var POWERUPS = {
    wide: { label: "Wide", color: "sage", duration: 480, text: "your paddle is half again as long" },
    slow: { label: "Slow", color: "research", duration: 360, text: "the ball slows down" },
    split: { label: "Split", color: "ochre", duration: 600, text: "a second ball joins the rally" },
    cpuWide: { label: "CPU Wide", color: "sageDeep", duration: 480, text: "the CPU's paddle is longer" }
  };
  var CAPSULE_KINDS = ["wide", "slow", "split"];

  function hits(n) { return n + (n === 1 ? " hit" : " hits"); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ======================================================================
  //  Game
  // ======================================================================
  function createGame(shell) {
    var cv = shell.canvas, ctx = cv.ctx, draw = A.draw;
    var pal = A.theme();
    var offTheme = A.onThemeChange(function (p) { pal = p; });
    var reduce = A.prefersReducedMotion();

    var camera = A.makeCamera({ reduce: reduce, maxPx: 4 });
    // The combo counts points won in a row; a point lost resets it.
    var combo = A.makeCombo({ window: 1e9, max: 5 });
    var particles = A.makeParticles({ cap: 80, reduce: reduce });
    var floaters = A.makeFloaters({ cap: 10, reduce: reduce });
    var wake = A.makeWakeLock();
    var unsubHidden = null;
    var synth = A.makeSynth({ muteKey: MUTE_KEY });
    shell.bindSynth(synth);

    var story = A.makeStory(CHAPTERS, { onEnter: onChapter, bannerFrames: 160 });
    var powers = A.makePowerups(POWERUPS, {
      onExpire: function (id) { if (id === "split") dropExtraBalls(); }
    });

    var state = "idle"; // idle | running | paused | ending | gameover
    var mode = "cpu";   // cpu | duo
    try { if (window.localStorage.getItem(MODE_KEY) === "duo") mode = "duo"; } catch (e) {}
    var rot = false;    // portrait: the court on end
    var SW = W, SH = H;

    var you, cpu, balls, capsule, capsuleTimer;
    var scoreYou, scoreCpu, score, rally, longest, serveDir, serveTimer, endTimer;
    var cpuErr, time, pointerTarget, pointerTarget2, best;
    var runStats;

    best = A.leaderboard.best(GAME_KEY);

    // ---------- Audio ----------
    var sfx = {
      paddle: function (n) { synth.beep(330 + Math.min(12, n) * 22, 260 + Math.min(12, n) * 22, 0.06, "triangle", 0.38); },
      wall: function () { synth.beep(220, 200, 0.03, "square", 0.08); },
      point: function () { synth.arp([523, 659, 784], 0.06, 0.14, "triangle", 0.4); },
      lost: function () { synth.beep(260, 110, 0.22, "sawtooth", 0.3); synth.noise(0.16, 700, 0.18); },
      power: function () { synth.arp([659, 880, 1318], 0.045, 0.12, "triangle", 0.4); },
      fizzle: function () { synth.beep(400, 240, 0.1, "sine", 0.22); },
      chapter: function () { synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.42); },
      serve: function () { synth.beep(440, 520, 0.05, "sine", 0.18); },
      win: function () { synth.arp([523, 659, 784, 1046, 1318], 0.08, 0.2, "triangle", 0.45); },
      lose: function () { synth.arp([392, 330, 262], 0.12, 0.22, "triangle", 0.35); }
    };

    // ---------- Screen mapping ----------
    // Court (x, y) -> screen. In portrait the court's right edge (you) is
    // the screen's bottom and its top edge is the screen's right.
    function sx(x, y) { return rot ? H - y : x; }
    function sy(x, y) { return rot ? x : y; }
    function srect(x, y, w, h) { return rot ? { x: H - y - h, y: x, w: h, h: w } : { x: x, y: y, w: w, h: h }; }
    function courtY(p) { return rot ? H - p.x : p.y; }
    function courtX(p) { return rot ? p.y : p.x; }

    // ---------- World ----------
    function makePaddle(side) {
      return { side: side, x: side === "you" ? W - INSET - PW : INSET, y: H / 2 - PH / 2, h: PH, vel: 0 };
    }
    function resetWorld() {
      you = makePaddle("you"); cpu = makePaddle("cpu");
      balls = []; capsule = null; capsuleTimer = CAPSULE_EVERY * 0.6;
      scoreYou = 0; scoreCpu = 0; score = 0; rally = 0; longest = 0;
      serveDir = 1; serveTimer = 0; endTimer = 0;
      cpuErr = 0; time = 0; pointerTarget = null; pointerTarget2 = null;
      combo.reset(true); powers.clear(); story.reset();
      particles.clear(); floaters.clear();
      runStats = { chapter: 0, powers: 0 };
      POWERUPS.cpuWide.label = mode === "duo" ? "P2 Wide" : "CPU Wide";
      for (var i = 0; i < CHAPTERS.length; i++) CHAPTERS[i].text = CHAPTER_TEXT[mode][i];
      serve();
      syncHud();
    }
    function newBall(x, y, vx, vy, speed, lastTouch, extra) {
      return { x: x, y: y, vx: vx, vy: vy, speed: speed, lastTouch: lastTouch, extra: !!extra, trail: [] };
    }
    // Serve from the center toward serveDir (+1 = toward you). The side that
    // serves counts as the last touch, so an early capsule goes to them.
    function serve() {
      var ang = (Math.random() * 0.7 - 0.35);
      var b = newBall(W / 2, H / 2 + (Math.random() * 60 - 30), serveDir * SPEED0 * Math.cos(ang), SPEED0 * Math.sin(ang), SPEED0, serveDir > 0 ? "cpu" : "you", false);
      balls = [b];
      serveTimer = SERVE_FRAMES;
      rally = 0;
      rollCpuError();
    }
    function dropExtraBalls() {
      for (var i = balls.length - 1; i >= 0; i--) {
        if (balls[i].extra) {
          particles.burst(sx(balls[i].x, balls[i].y), sy(balls[i].x, balls[i].y), { n: 8, color: [pal.ochre, pal.surface], speed: 1.2, life: 18, size: 2, kind: "ring" });
          balls.splice(i, 1);
        }
      }
    }
    function addSplitBall() {
      var src = balls[0];
      if (!src) return;
      var nb = newBall(src.x, src.y, src.vx, -src.vy || SPEED0 * 0.5, src.speed, src.lastTouch, true);
      if (Math.abs(nb.vy) < 0.8) nb.vy = nb.vy < 0 ? -1.2 : 1.2;
      balls.push(nb);
    }
    function rollCpuError() {
      var pers = PERSONAS[story.index()];
      cpuErr = (Math.random() * 2 - 1) * pers.err * (cpu ? cpu.h : PH) / 2;
    }

    function syncHud() {
      shell.hud.set("score", score);
      shell.hud.set("rally", rally);
      shell.hud.set("you", scoreYou);
      shell.hud.set("cpu", scoreCpu);
    }
    function setHudLabels() {
      var labels = mode === "duo" ? { you: "P1", cpu: "P2" } : { you: "You", cpu: "CPU" };
      ["you", "cpu"].forEach(function (id) {
        var cell = shell.panel.querySelector('[data-hud="' + id + '"] .' + A.ns + "-hud__label");
        if (cell) cell.textContent = labels[id];
      });
    }
    function setTouchLabels() {
      var a = shell.touchButton("a"), b = shell.touchButton("b");
      if (!a || !b) return;
      a.textContent = rot ? "◀" : "▲"; a.setAttribute("aria-label", rot ? "Move left" : "Move up");
      b.textContent = rot ? "▶" : "▼"; b.setAttribute("aria-label", rot ? "Move right" : "Move down");
    }
    function helpText() {
      var mine = rot ? "← →" : "↑ ↓";
      if (mode === "duo") {
        return rot ? "P1 (bottom): ← → · P2 (top): A D · drag on your half · Space pauses · M mutes · Esc closes"
          : "P1 (right): ↑ ↓ · P2 (left): W S · drag on your half · Space pauses · M mutes · Esc closes";
      }
      return "Mouse, drag or " + mine + (rot ? " / A D" : " / W S") + " move · Space pauses · M mutes · Esc closes";
    }

    // ---------- Flow ----------
    function renderChoices(m) {
      var wrap = A.el("div", A.ns + "-choices");
      wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", "Players");
      var opts = [["cpu", "One player"], ["duo", "Two players"]];
      var btns = [];
      opts.forEach(function (o) {
        var b = A.el("button", A.ns + "-choice", o[1]);
        b.type = "button"; b.style.minHeight = "44px";
        b.setAttribute("aria-pressed", mode === o[0] ? "true" : "false");
        b.addEventListener("click", function () {
          mode = o[0];
          try { window.localStorage.setItem(MODE_KEY, mode); } catch (e) {}
          btns.forEach(function (x, i) { x.setAttribute("aria-pressed", opts[i][0] === mode ? "true" : "false"); });
          var t = shell.prompt.el.querySelector("[data-egg-prompt-text]");
          if (t) t.textContent = startText();
          setHudLabels();
        });
        btns.push(b); wrap.appendChild(b);
      });
      m.appendChild(wrap);
    }
    function startText() {
      var side = rot ? "bottom" : "right";
      if (mode === "duo") {
        return rot ? "P1 takes the bottom paddle with the left and right arrows, P2 the top with A and D. On a phone, each player drags on their own half. First to seven wins."
          : "P1 takes the right paddle with the arrow keys, P2 the left with W and S. On a touch screen, each player drags on their own half. First to seven wins.";
      }
      return "You take the " + side + " paddle. Move it with the mouse, a drag anywhere on the court, or the keys. Hit it while it moves to put spin on the ball. Long rallies score more. First to seven wins.";
    }
    function showStart() {
      var p = A.progress.get(GAME_KEY);
      shell.prompt.show({
        kicker: "Pong",
        title: p.plays ? "Back on the court" : "Keep the rally going.",
        text: startText(),
        actions: [{ label: "Start", primary: true, onClick: start }],
        board: function (m) {
          renderChoices(m);
          if (p.plays) { var lb = A.el("div"); m.appendChild(lb); A.renderLeaderboard(lb, GAME_KEY, {}); }
        }
      });
    }
    // The court lengthwise, or on end for a portrait phone; chosen on open and
    // at every start so a phone turned between matches gets the right court.
    function layoutField() {
      rot = cv.aspect() < 0.9;
      SW = rot ? H : W; SH = rot ? W : H;
      cv.setSize(SW, SH);
      setTouchLabels();
    }
    function start() {
      synth.ensure();
      layoutField();
      resetWorld();
      setHudLabels();
      state = "running";
      shell.prompt.hide();
      wake.acquire();
      shell.setHelp(helpText());
      story.set(0);
      A.announce("Go. Warm-up. First to seven.");
    }
    function pause() {
      if (state !== "running") return;
      state = "paused";
      wake.release();
      input.release();
      var who = mode === "duo" ? "P1 " + scoreYou + " · P2 " + scoreCpu : "You " + scoreYou + " · CPU " + scoreCpu;
      shell.prompt.show({ kicker: "Paused", title: CHAPTERS[story.index()].name, text: who + " · Score " + score + ".",
        actions: [{ label: "Resume", primary: true, onClick: resume }, { label: "Quit", onClick: function () { A.closeGame(); } }], compact: true });
    }
    function resume() {
      if (state !== "paused") return;
      synth.ensure();
      state = "running"; shell.prompt.hide(); wake.acquire();
    }
    function endMatch() {
      state = "ending"; endTimer = END_FRAMES;
      wake.release();
      powers.clear(); capsule = null;
      shell.renderPips([], pal);
      var won = scoreYou > scoreCpu;
      if (won && mode === "cpu") {
        var margin = (scoreYou - scoreCpu) * 100;
        score += margin;
        floaters.spawn(SW / 2, SH / 2 - 16, "Margin +" + margin, pal.forest, { size: 14, font: "display", life: 60 });
      }
      if (won || mode === "duo") { sfx.win(); A.haptics.win(); } else { sfx.lose(); A.haptics.crash(); }
      syncHud();
    }
    function gameOver() {
      state = "gameover";
      var won = scoreYou > scoreCpu;
      var line = scoreYou + "–" + scoreCpu;
      var ch = CHAPTERS[story.index()];
      if (mode === "duo") {
        A.progress.record(GAME_KEY, { score: 0, chapter: runStats.chapter, badges: [] });
        shell.prompt.show({
          kicker: "Match over",
          title: (won ? "P1" : "P2") + " wins " + (won ? scoreYou + "–" + scoreCpu : scoreCpu + "–" + scoreYou),
          text: "Longest rally " + hits(longest) + ". Two-player matches stay off the leaderboard.",
          board: function (m) { A.runSummary(m, { lines: [["Match", "P1 " + scoreYou + " · P2 " + scoreCpu], ["Longest rally", longest], ["Power-ups", runStats.powers]] }); },
          actions: [{ label: "Rematch", primary: true, onClick: start }, { label: "Change players", onClick: function () { state = "idle"; resetWorld(); showStart(); } }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
        });
        A.announce("Match over. " + (won ? "P1" : "P2") + " wins.");
        return;
      }
      var placed = score > 0 && score >= best;
      if (score > best) best = score;
      A.progress.record(GAME_KEY, { score: score, chapter: runStats.chapter, badges: won ? ["first-to-seven"] : [] });
      syncHud();
      shell.prompt.show({
        kicker: won ? "You won the match" : "The CPU took the match",
        title: placed ? "A new best: " + score : "Score " + score,
        text: (won ? "You won " : "You lost ") + line + ". Your longest rally was " + hits(longest) + ", and you reached " + ch.name + ".",
        board: function (m) {
          A.runSummary(m, { gameKey: GAME_KEY, score: score,
            lines: [["Match", line], ["Longest rally", longest], ["Points in a row", combo.best()], ["Margin bonus", won ? (scoreYou - scoreCpu) * 100 : 0], ["Power-ups", runStats.powers]],
            onSaved: function () { best = A.leaderboard.best(GAME_KEY); } });
        },
        actions: [{ label: "Play again", primary: true, onClick: start }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
      A.announce("Match over. " + (won ? "You won " : "You lost ") + line + ". Score " + score + ".");
    }

    function onChapter(ch, idx) {
      runStats.chapter = Math.max(runStats.chapter, idx);
      rollCpuError();
      if (idx > 0) { sfx.chapter(); A.haptics.win(); }
      A.announce(ch.name + ". " + ch.text);
    }
    function updateChapter() {
      if (story.index() >= 2) return;
      if (Math.max(scoreYou, scoreCpu) >= WIN - 1) { story.set(2); onChapter(CHAPTERS[2], 2); }
      else story.advance(scoreYou + scoreCpu);
    }

    // ---------- Points ----------
    function point(winner, b) {
      var ex = sx(clamp(b.x, 0, W), clamp(b.y, 0, H)), ey = sy(clamp(b.x, 0, W), clamp(b.y, 0, H));
      if (rally > longest) longest = rally;
      if (winner === "you") {
        scoreYou += 1;
        var mult = combo.hit();
        var pts = 10 * Math.max(1, rally) * mult;
        score += pts;
        sfx.point(); A.haptics.pop();
        particles.burst(ex, ey, { n: 14, color: [pal.forest, pal.sage, pal.ochre], speed: 2, life: 26, size: 2.6, kind: ["dot", "leaf"] });
        floaters.spawn(clamp(ex, 40, SW - 40), clamp(ey, 30, SH - 30), "+" + pts + (mult > 1 ? " ×" + mult : ""), mult > 1 ? pal.forest : pal.inkSoft, { size: mult > 1 ? 14 : 12 });
        shell.hud.flash("score"); shell.hud.flash("you");
      } else {
        scoreCpu += 1;
        combo.reset();
        sfx.lost(); A.haptics.thump(); camera.shake(0.35);
        particles.burst(ex, ey, { n: 10, color: [pal.clay, pal.inkMuted], speed: 1.6, life: 22, size: 2.2 });
        shell.hud.flash("cpu");
      }
      powers.remove("split");
      balls = [];
      serveDir = -serveDir;
      updateChapter();
      syncHud();
      if (scoreYou >= WIN || scoreCpu >= WIN) { endMatch(); return; }
      serve();
    }

    // ---------- Input ----------
    var input = A.makeInput(cv.el, {
      canvas: cv,
      keys: { ArrowUp: "p1up", ArrowDown: "p1down", ArrowLeft: "p1left", ArrowRight: "p1right",
        w: "p2up", s: "p2down", a: "p2left", d: "p2right", " ": "action", Enter: "action", p: "pause" },
      onAction: function (a, repeat, e) {
        if (e && e.preventDefault) e.preventDefault();
        if (a === "action") {
          if (repeat) return;
          if (state === "idle" || state === "gameover") start(); else if (state === "running") pause(); else if (state === "paused") resume();
        } else if (a === "pause") { if (state === "running") pause(); else if (state === "paused") resume(); }
        else {
          // keyboard always wins over a resting mouse: drop the pointer target for that side
          if (a.charAt(1) === "1" || mode === "cpu") pointerTarget = null; else pointerTarget2 = null;
        }
      },
      onDown: function (p) { synth.ensure(); aimPointer(p); },
      onDrag: function (p) { aimPointer(p); },
      onMove: function (p, e) { if (e && e.pointerType === "mouse") aimPointer(p); },
      onTap: function () { if (state === "paused") resume(); }
    });
    function aimPointer(p) {
      var y = clamp(courtY(p), 0, H);
      if (mode === "duo" && courtX(p) < W / 2) pointerTarget2 = y; else pointerTarget = y;
    }
    shell.onTap(function (id) {
      if (id === "pause") { if (state === "running") pause(); else if (state === "paused") resume(); else if (state === "idle" || state === "gameover") start(); }
    });
    var held = input.held;
    // Keyboard and hold-button direction for a side, in court units (+1 = down the court).
    function keyDir(side) {
      var p2 = side === "cpu";
      var up, down, left, right;
      if (p2) { up = held.p2up; down = held.p2down; left = held.p2left; right = held.p2right; }
      else {
        var solo = mode === "cpu";
        up = held.p1up || (solo && held.p2up); down = held.p1down || (solo && held.p2down);
        left = held.p1left || (solo && held.p2left); right = held.p1right || (solo && held.p2right);
      }
      var d;
      if (rot) d = (left ? 1 : 0) - (right ? 1 : 0); // screen left = court down when on end
      else d = (down ? 1 : 0) - (up ? 1 : 0);
      if (!p2) {
        var ta = shell.held.a, tb = shell.held.b;
        if (ta || tb) {
          pointerTarget = null;
          // first button: up (landscape) or left (portrait)
          d += rot ? (ta ? 1 : 0) - (tb ? 1 : 0) : (tb ? 1 : 0) - (ta ? 1 : 0);
        }
      }
      return clamp(d, -1, 1);
    }

    // ---------- Paddles ----------
    function movePaddle(p, dt, d, target) {
      var targetH = p.side === "you" ? (powers.active("wide") ? PH * 1.5 : PH) : (powers.active("cpuWide") ? PH * 1.5 : PH);
      var oldH = p.h;
      p.h += (targetH - p.h) * Math.min(1, 0.2 * dt);
      p.y -= (p.h - oldH) / 2; // grow from the center
      var prev = p.y;
      if (d) p.y += d * KEY_SPEED * dt;
      else if (target != null) {
        var diff = target - (p.y + p.h / 2);
        p.y += clamp(diff, -POINTER_SPEED * dt, POINTER_SPEED * dt);
      }
      p.y = clamp(p.y, 0, H - p.h);
      var v = (p.y - prev) / Math.max(0.05, dt);
      p.vel = p.vel * 0.5 + v * 0.5;
    }
    function cpuTick(dt) {
      var pers = PERSONAS[story.index()];
      var target = H / 2, ball = null;
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i];
        if (b.vx < 0 && (!ball || b.x < ball.x)) ball = b;
      }
      if (ball) target = ball.y + cpuErr;
      else if (pers.follow && balls[0]) target = H / 2 + (balls[0].y - H / 2) * 0.6;
      var fat = pers.fatigue ? Math.max(0.55, 1 - rally * pers.fatigue) : 1;
      var diff = target - (cpu.y + cpu.h / 2);
      var maxStep = pers.speed * fat * dt;
      var prev = cpu.y;
      var targetH = powers.active("cpuWide") ? PH * 1.5 : PH, oldH = cpu.h;
      cpu.h += (targetH - cpu.h) * Math.min(1, 0.2 * dt); cpu.y -= (cpu.h - oldH) / 2;
      cpu.y += clamp(diff * pers.react * dt * 1.6, -maxStep, maxStep);
      cpu.y = clamp(cpu.y, 0, H - cpu.h);
      cpu.vel = cpu.vel * 0.5 + ((cpu.y - prev) / Math.max(0.05, dt)) * 0.5;
    }

    // ---------- Ball ----------
    function hitPaddle(b, p) {
      var rel = clamp((b.y - (p.y + p.h / 2)) / (p.h / 2), -1, 1);
      var speed = Math.min(b.speed * SPEED_UP, SPEED_MAX);
      b.speed = speed;
      var dir = p.side === "you" ? -1 : 1;
      var vy = Math.sin(rel * 0.85) * speed + p.vel * SPIN;
      vy = clamp(vy, -speed * 0.8, speed * 0.8);
      b.vy = vy;
      b.vx = dir * Math.sqrt(Math.max(speed * speed - vy * vy, speed * speed * 0.3));
      b.lastTouch = p.side;
      rally += 1;
      shell.hud.set("rally", rally);
      if (p.side === "you") rollCpuError();
      sfx.paddle(rally);
      if (p.side === "you" || mode === "duo") A.haptics.tick();
      var hx = p.side === "you" ? p.x : p.x + PW;
      particles.burst(sx(hx, b.y), sy(hx, b.y), { n: 5, color: [pal.sageDeep, pal.ink], speed: 1.1, life: 14, size: 1.6, kind: "spark", angle: rot ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI), spread: 1.6 });
      if (speed >= SPEED_MAX * 0.95) camera.shake(0.08);
    }
    function stepBall(b, dt) {
      var sf = powers.active("slow") ? 0.65 : 1;
      var dist = Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt * sf;
      var n = Math.max(1, Math.ceil(dist / 3));
      var h = dt * sf / n;
      for (var s = 0; s < n; s++) {
        b.x += b.vx * h; b.y += b.vy * h;
        if (b.y - R < 0) { b.y = R; b.vy = Math.abs(b.vy); sfx.wall(); }
        else if (b.y + R > H) { b.y = H - R; b.vy = -Math.abs(b.vy); sfx.wall(); }
        if (b.vx > 0 && b.x + R >= you.x && b.x - R <= you.x + PW && b.y + R >= you.y && b.y - R <= you.y + you.h) { b.x = you.x - R; hitPaddle(b, you); }
        else if (b.vx < 0 && b.x - R <= cpu.x + PW && b.x + R >= cpu.x && b.y + R >= cpu.y && b.y - R <= cpu.y + cpu.h) { b.x = cpu.x + PW + R; hitPaddle(b, cpu); }
        if (capsule && !capsule.hit) {
          var dx = b.x - capsule.x, dy = b.y - capsule.y;
          if (dx * dx + dy * dy < (R + 10) * (R + 10)) takeCapsule(b);
        }
        if (b.x < -R * 2) return "you";
        if (b.x > W + R * 2) return "cpu";
      }
      return null;
    }

    // ---------- Capsules ----------
    function spawnCapsule() {
      var pool = CAPSULE_KINDS.filter(function (id) { return !(id === "split" && powers.active("split")); });
      var down = Math.random() < 0.5;
      capsule = { id: pool[Math.floor(Math.random() * pool.length)], x: W * (0.34 + Math.random() * 0.32), y: down ? -12 : H + 12, vy: down ? 0.42 : -0.42, phase: Math.random() * 6, hit: false };
    }
    function takeCapsule(b) {
      var id = capsule.id, def = POWERUPS[id];
      var cxp = sx(capsule.x, capsule.y), cyp = sy(capsule.x, capsule.y);
      capsule = null;
      var who = b.lastTouch;
      var grant = null;
      if (who === "you") grant = id;
      else if (who === "cpu") grant = id === "wide" ? "cpuWide" : (mode === "duo" ? id : null);
      if (!grant) {
        sfx.fizzle();
        particles.burst(cxp, cyp, { n: 8, color: [pal[def.color], pal.inkMuted], speed: 1.2, life: 16, size: 2 });
        floaters.spawn(cxp, cyp - 12, def.label + " knocked away", pal.inkMuted, { size: 11 });
        return;
      }
      var gdef = POWERUPS[grant];
      powers.grant(grant);
      if (grant === "split") addSplitBall();
      if (who === "you") runStats.powers += 1;
      sfx.power(); A.haptics.pop(); camera.shake(0.12);
      particles.burst(cxp, cyp, { n: 16, color: [pal[gdef.color], pal.surface], speed: 2.2, life: 26, size: 2.6, kind: ["ring", "dot"] });
      floaters.spawn(cxp, cyp - 12, gdef.label, pal[gdef.color] === pal.sage ? pal.sageDeep : pal[gdef.color], { size: 14, font: "display" });
      var whoName = who === "you" ? (mode === "duo" ? "P1" : "You") : (mode === "duo" ? "P2" : "The CPU");
      var msg = grant === "cpuWide" ? whoName + " got Wide: " + gdef.text.replace("the CPU's", mode === "duo" ? "P2's" : "the CPU's")
        : gdef.label + ": " + gdef.text;
      shell.toast(msg, 1700);
      A.announce(msg + ".");
    }

    // ---------- Tick ----------
    function tick(dt) {
      time += dt;
      camera.tick(dt); particles.tick(dt); floaters.tick(dt); story.tick(dt);
      if (state === "ending") {
        endTimer -= dt;
        if (endTimer <= 0) gameOver();
        return;
      }
      if (state !== "running") return;
      if (camera.frozen()) return;
      combo.tick(dt); powers.tick(dt);
      shell.renderPips(powers.list(), pal);

      movePaddle(you, dt, keyDir("you"), pointerTarget);
      if (mode === "duo") movePaddle(cpu, dt, keyDir("cpu"), pointerTarget2);
      else cpuTick(dt);

      // capsule drift
      capsuleTimer -= dt;
      if (!capsule && capsuleTimer <= 0) { spawnCapsule(); capsuleTimer = CAPSULE_EVERY; }
      if (capsule) {
        capsule.y += capsule.vy * dt;
        capsule.phase += 0.03 * dt;
        if (capsule.y < -20 || capsule.y > H + 20) capsule = null;
      }

      if (serveTimer > 0) {
        serveTimer -= dt;
        if (serveTimer <= 0) sfx.serve();
        return;
      }
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i];
        var out = stepBall(b, dt);
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > TRAIL) b.trail.shift();
        if (out) { point(out, b); return; }
      }
    }

    // ---------- Render ----------
    function cornerTicks() {
      var m = 6, l = 12;
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(m, m + l); ctx.lineTo(m, m); ctx.lineTo(m + l, m);
      ctx.moveTo(SW - m - l, m); ctx.lineTo(SW - m, m); ctx.lineTo(SW - m, m + l);
      ctx.moveTo(SW - m, SH - m - l); ctx.lineTo(SW - m, SH - m); ctx.lineTo(SW - m - l, SH - m);
      ctx.moveTo(m + l, SH - m); ctx.lineTo(m, SH - m); ctx.lineTo(m, SH - m - l);
      ctx.stroke();
    }
    function shadowStyle(px) { return { shadow: px, shadowColor: pal.shadow }; }
    function drawPaddle(p) {
      var r = srect(p.x, p.y, PW, p.h);
      var mine = p.side === "you";
      var wide = powers.active(mine ? "wide" : "cpuWide");
      var fill = wide ? pal.sageMist : (mine ? pal.surface : pal.paper2);
      var st = shadowStyle(2.5);
      draw.pill(ctx, r.x, r.y, r.w, r.h, { fill: fill, stroke: pal.ink, lineWidth: 1.4, shadow: st.shadow, shadowColor: st.shadowColor });
      // the hitting face: a ruled line along the inner edge
      var faceX = mine ? p.x + 3 : p.x + PW - 3;
      var y0 = p.y + 7, y1 = p.y + p.h - 7;
      ctx.strokeStyle = mine ? pal.forest : pal.inkMuted; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(sx(faceX, y0), sy(faceX, y0)); ctx.lineTo(sx(faceX, y1), sy(faceX, y1)); ctx.stroke();
      // a center notch, the sweet spot
      var mx = p.x + PW / 2, my = p.y + p.h / 2;
      ctx.fillStyle = mine ? pal.forest : pal.inkMuted;
      ctx.beginPath(); ctx.arc(sx(mx, my), sy(mx, my), 1.6, 0, Math.PI * 2); ctx.fill();
    }
    function drawBall(b) {
      var slow = powers.active("slow");
      for (var i = 0; i < b.trail.length; i++) {
        var t = (i + 1) / (b.trail.length + 1);
        var tp = b.trail[i];
        ctx.fillStyle = pal.alpha(slow ? pal.research : pal.sageDeep, 0.32 * t);
        ctx.beginPath(); ctx.arc(sx(tp.x, tp.y), sy(tp.x, tp.y), R * (0.35 + 0.55 * t), 0, Math.PI * 2); ctx.fill();
      }
      var bx = sx(b.x, b.y), by = sy(b.x, b.y);
      if (slow) draw.circle(ctx, bx, by, R + 3.5, { stroke: pal.alpha(pal.research, 0.7), lineWidth: 1.4 });
      draw.circle(ctx, bx, by, R, { fill: b.extra ? pal.mix(pal.ochre, pal.surface, 0.35) : pal.ochre, stroke: pal.ink, lineWidth: 1.4, shadow: 2, shadowColor: pal.shadow });
      ctx.fillStyle = pal.alpha(pal.shade(pal.ochre, 0.6), 0.9);
      ctx.beginPath(); ctx.arc(bx - R * 0.35, by - R * 0.35, R * 0.28, 0, Math.PI * 2); ctx.fill();
    }
    function drawCapsule() {
      var def = POWERUPS[capsule.id], col = pal[def.color];
      var wob = reduce ? 0 : Math.sin(capsule.phase) * 2.5;
      var cxp = sx(capsule.x + wob, capsule.y), cyp = sy(capsule.x + wob, capsule.y);
      var w = 32, h = 16;
      draw.circle(ctx, cxp, cyp, 15 + (reduce ? 0 : Math.sin(time * 0.1) * 1.2), { stroke: pal.alpha(col, 0.55), lineWidth: 1.2 });
      draw.pill(ctx, cxp - w / 2, cyp - h / 2, w, h, { fill: col, stroke: pal.ink, lineWidth: 1.4, shadow: 2.5, shadowColor: pal.shadow });
      // a paper band across the middle carries the initial
      draw.box(ctx, cxp - 6, cyp - h / 2 + 1, 12, h - 2, 2, { fill: pal.surface });
      draw.label(ctx, def.label.charAt(0), cxp, cyp + 0.5, { font: "display", size: 12, color: pal.ink, weight: 600 });
    }
    function scoreDigits() {
      var bn = story.banner();
      var fade = bn ? 0.4 : 1;
      var col = pal.alpha(pal.ink, (pal.isDark ? 0.16 : 0.1) * fade);
      var a, b;
      if (rot) { a = { x: SW / 2, y: SH / 2 - 64 }; b = { x: SW / 2, y: SH / 2 + 64 }; }
      else { a = { x: W / 2 - 64, y: H / 2 }; b = { x: W / 2 + 64, y: H / 2 }; }
      draw.label(ctx, scoreCpu, a.x, a.y, { font: "display", size: 64, color: col, weight: 500 });
      draw.label(ctx, scoreYou, b.x, b.y, { font: "display", size: 64, color: col, weight: 500 });
      if (combo.mult() > 1 && state === "running") {
        draw.label(ctx, "×" + combo.mult(), b.x + (rot ? 34 : 30), b.y - (rot ? 0 : 22), { size: 12, color: pal.forest, weight: 700 });
      }
    }
    function render() {
      cv.begin(camera);
      draw.paper(ctx, SW, SH, pal, { step: 20, dot: 1 });
      ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, SW - 1, SH - 1);
      cornerTicks();
      // the center line: a quiet dashed rule
      draw.dashes(ctx, sx(W / 2, 10), sy(W / 2, 10), sx(W / 2, H - 10), sy(W / 2, H - 10), 7, 8, { stroke: pal.rule, lineWidth: 1.6 });
      draw.circle(ctx, sx(W / 2, H / 2), sy(W / 2, H / 2), 3, { fill: pal.rule });
      scoreDigits();

      if (capsule) drawCapsule();
      if (balls) for (var i = 0; i < balls.length; i++) drawBall(balls[i]);

      // serve countdown: a ring that closes around the ball
      if (state === "running" && serveTimer > 0 && balls[0]) {
        var b0 = balls[0];
        draw.ring(ctx, sx(b0.x, b0.y), sy(b0.x, b0.y), R + 6, 1 - serveTimer / SERVE_FRAMES, { stroke: pal.forest, lineWidth: 1.6 });
        // a small arrow toward the receiver
        var ax = b0.x + serveDir * 18;
        draw.label(ctx, rot ? (serveDir > 0 ? "▼" : "▲") : (serveDir > 0 ? "▶" : "◀"), sx(ax, b0.y), sy(ax, b0.y), { size: 10, color: pal.inkMuted });
      }

      if (cpu) drawPaddle(cpu);
      if (you) drawPaddle(you);

      particles.render(ctx);
      floaters.render(ctx);

      // chapter banner
      var bn = story.banner();
      if (bn && (state === "running" || state === "ending")) {
        var a = Math.min(1, bn.frac * 3) * Math.min(1, (1 - bn.frac) * 6 + 0.2);
        ctx.save(); ctx.globalAlpha = a;
        var base = rot ? SH * 0.3 : 30;
        var ty = base + (reduce ? 0 : (1 - Math.min(1, (1 - bn.frac) * 4)) * -10);
        // a paper band under the words so the center rule does not cut through them
        ctx.fillStyle = pal.alpha(pal.paper, 0.9);
        ctx.fillRect(16, ty - 18, SW - 32, bn.text ? 52 : 34);
        draw.label(ctx, bn.name, SW / 2, ty, { font: "display", size: 26, color: pal.ink, weight: 500 });
        if (bn.text) draw.label(ctx, bn.text, SW / 2, ty + 22, { size: 11, color: pal.inkMuted, weight: 500, maxWidth: SW - 40 });
        ctx.restore();
      }

      // match progress along the bottom rule: the leader's points toward seven
      if (state === "running" || state === "paused" || state === "ending") {
        var prog = clamp(Math.max(scoreYou, scoreCpu) / WIN, 0, 1);
        ctx.fillStyle = pal.alpha(pal.forest, 0.55); ctx.fillRect(0, SH - 2, SW * prog, 2);
      }
      cv.end();
    }

    var loop = A.makeLoop(function (dt) { tick(dt); input.consume(); }, render);

    function onHidden() { if (state === "running") pause(); }

    A.debug("pong", {
      state: function () { return state; },
      info: function () { return { mode: mode, rot: rot, you: scoreYou, cpu: scoreCpu, rally: rally, longest: longest, chapter: CHAPTERS[story.index()].name, persona: PERSONAS[story.index()].name, balls: balls.length, capsule: capsule ? capsule.id : null, powers: powers.list().map(function (p) { return p.id; }), paddle: you ? Math.round(you.h) : 0, paddleY: you ? Math.round(you.y) : 0, cpuY: cpu ? Math.round(cpu.y) : 0, size: [SW, SH] }; },
      score: function () { return score; },
      win: function () { if (state !== "running") return; scoreYou = WIN - 1; rally = Math.max(rally, 4); point("you", balls[0] || { x: W, y: H / 2 }); },
      lose: function () { if (state !== "running") return; scoreCpu = WIN - 1; point("cpu", balls[0] || { x: 0, y: H / 2 }); },
      point: function (side) { if (state === "running") point(side === "cpu" ? "cpu" : "you", balls[0] || { x: W / 2, y: H / 2 }); },
      grant: function (id) { if (!POWERUPS[id]) return false; powers.grant(id); if (id === "split") addSplitBall(); return true; },
      capsule: function (id) { spawnCapsule(); if (id && POWERUPS[id]) capsule.id = id; capsule.y = H / 2; capsule.vy = 0.1; return capsule.id; },
      serve: function () { serveTimer = 0; },
      mode: function (m) { if (m === "cpu" || m === "duo") mode = m; return mode; }
    });

    return {
      held: input.held,
      activate: function () {
        pal = A.theme();
        cv.fit();
        layoutField();
        state = "idle"; resetWorld();
        setHudLabels();
        shell.setHelp(helpText());
        render();
        loop.start();
        unsubHidden = A.onHidden(onHidden);
        showStart();
      },
      // The phone turned: a match pauses; an idle court is laid out again.
      onViewport: function () {
        if (state === "running") pause();
        else if (state === "idle") { layoutField(); resetWorld(); render(); }
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
    A.defineGame("pong", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Pong",
        tagline: "Keep the rally going.",
        label: "Pong game",
        canvas: { w: W, h: H, label: "Pong court" },
        hud: [{ id: "score", label: "Score", value: 0 }, { id: "rally", label: "Rally", value: 0 }, { id: "you", label: "You", value: 0 }, { id: "cpu", label: "CPU", value: 0 }],
        help: "Mouse, drag or ↑ ↓ / W S move · Space starts and pauses · M mutes · Esc closes",
        touch: [
          { id: "a", label: "▲", aria: "Move up" },
          { id: "b", label: "▼", aria: "Move down" },
          { id: "pause", label: "Pause", aria: "Pause or resume", tap: true, wide: true }
        ]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
