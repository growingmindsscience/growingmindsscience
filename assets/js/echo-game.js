/* Growing Minds Science — echo-game.js
   "Serve and Return" on the Arcade page: a pattern-echo memory game.

   A baby in a crib "serves" a pattern by lighting four pads in turn, each
   with its own note. You "return" it by pressing the same pads in the same
   order. Every good return adds one more step, so the conversation gets
   longer and a little quicker. A nod to two ideas from developmental
   science: serve and return (a baby coos or points, the caregiver answers)
   and rupture and repair (a missed cue is normal: the baby simply serves
   the same pattern again so you can repair it).

   Core v2 game (see docs/arcade/plan.md and docs/arcade/game-brief.md):
   reads the live brand tokens through A.theme(), draws at device resolution
   through the shell's canvas, uses makeShell for the overlay, makeStory for
   chapters, makePowerups for the two gentle helpers, runSummary for the end
   card. CSP-safe: no eval, no external assets, audio is the shared Web Audio
   synth. Honors prefers-reduced-motion (no shake, rings, bobbing or slides;
   the pads still light and lift, because that is the information).

   Modes (start card): Classic; Echo Plus (the pads trade places every five
   rounds); Duet (you serve a pad, the baby echoes it and adds one, then you
   echo the whole pattern).

   Power-ups: Slow Down (research blue, one charge: the next playback runs
   at half speed; earned every five clean rounds), Second Look (sage, one
   charge: hear the pattern once more before answering; earned at each new
   chapter).
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "serve-and-return";
  var MUTE_KEY = "gms-echo-muted";
  var MODE_KEY = "gms-echo-mode";

  // ---------- Field ----------
  // Tall enough for the crib, square enough to fit a landscape phone.
  var W = 400, H = 440;
  var BABY_X = 200, HEAD_Y = 222, HEAD_R = 44;
  var PAD_W = 92, PAD_H = 76, PAD_R = 20, HIT_SLOP = 8;
  var RAIL_TOP = 300, RAIL_BOT = 404;
  var MAX_HEARTS = 3;

  // Four places around the baby: 0 top, 1 left, 2 right, 3 bottom
  // (arrow keys and 1-4 always press a place; in Echo Plus the pads move).
  var SLOTS = [{ x: 200, y: 112 }, { x: 72, y: 246 }, { x: 328, y: 246 }, { x: 200, y: 372 }];

  // Four pads, each with its own colour AND its own icon, so colour is never
  // the only cue. Notes are A-minor pentatonic (A4 C5 E5 G5): any order
  // sounds musical.
  var PADS = [
    { name: "note", color: "forest", glyph: "♪", freq: 523.25 },
    { name: "heart", color: "sage", glyph: "♥\uFE0E", freq: 659.25 },
    { name: "star", color: "ochre", glyph: "★", freq: 783.99 },
    { name: "sun", color: "research", glyph: "☀\uFE0E", freq: 440 }
  ];
  var SLOT_NAMES = ["top", "left", "right", "bottom"];

  // Frame budgets (60 Hz frames).
  var LEAD_IN = 24, LEAD_REPAIR = 34, LEAD_CHAPTER = 96, LEAD_SHUFFLE = 70;
  var CHEER_FRAMES = 74, HAPPY_FRAMES = 42;
  var OOPS_FRAMES = 70, SURPRISE_FRAMES = 44, NAP_FRAMES = 60;

  // ---------- Story: five chapters, gated on the round ----------
  var CHAPTERS = [
    { name: "First Coos", at: 1, text: "Short turns. Watch, then answer." },
    { name: "Taking Turns", at: 4, text: "The baby waits for you. Take your time." },
    { name: "Longer Turns", at: 8, text: "The patterns grow a little longer." },
    { name: "Back and Forth", at: 12, text: "Quicker turns now. Stay with it." },
    { name: "A Whole Conversation", at: 16, text: "Long patterns, back and forth." }
  ];

  var POWERUPS = {
    slow: { label: "Slow Down", color: "research", uses: 1, text: "the next pattern plays at half speed" },
    look: { label: "Second Look", color: "sageDeep", uses: 1, text: "hear the pattern once more before you answer" }
  };

  var MODES = {
    classic: { label: "Classic", text: "The baby serves a pattern. Echo it back, one more step each time." },
    plus: { label: "Echo Plus", text: "Like Classic, but every five rounds the pads trade places." },
    duet: { label: "Duet", text: "You serve first. The baby echoes your pad and adds one; then you echo the whole pattern." }
  };
  var MODE_ORDER = ["classic", "plus", "duet"];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function readMode() { try { var m = window.localStorage.getItem(MODE_KEY); return MODES[m] ? m : "classic"; } catch (e) { return "classic"; } }
  function saveMode(m) { try { window.localStorage.setItem(MODE_KEY, m); } catch (e) {} }

  // A heart path centred on (x, y), about 2r wide.
  function heartPath(c, x, y, r) {
    c.beginPath();
    c.moveTo(x, y + r * 0.95);
    c.bezierCurveTo(x - r * 1.35, y + r * 0.05, x - r * 0.95, y - r * 1.05, x, y - r * 0.4);
    c.bezierCurveTo(x + r * 0.95, y - r * 1.05, x + r * 1.35, y + r * 0.05, x, y + r * 0.95);
    c.closePath();
  }

  // ======================================================================
  //  Game
  // ======================================================================
  function createGame(shell) {
    var cv = shell.canvas, ctx = cv.ctx, draw = A.draw;
    var pal = A.theme();
    var offTheme = A.onThemeChange(function (p) { pal = p; });
    var reduce = A.prefersReducedMotion();

    var camera = A.makeCamera({ reduce: reduce, maxPx: 3 });
    var particles = A.makeParticles({ cap: 70, reduce: reduce });
    var floaters = A.makeFloaters({ cap: 10, reduce: reduce });
    var wake = A.makeWakeLock();
    var unsubHidden = null;
    var synth = A.makeSynth({ muteKey: MUTE_KEY });
    shell.bindSynth(synth);

    // Touch row: the pad glyphs read larger, and the two helpers share a second line.
    ["p0", "p1", "p2", "p3"].forEach(function (id) { var b = shell.touchButton(id); if (b) b.style.fontSize = "20px"; });
    ["slow", "look"].forEach(function (id) { var b = shell.touchButton(id); if (b) b.style.flex = "1 1 40%"; });

    var story = A.makeStory(CHAPTERS, { onEnter: onChapter, bannerFrames: 170 });
    var powers = A.makePowerups(POWERUPS, { onGrant: syncPowerButtons, onExpire: syncPowerButtons });

    var mode = readMode();
    var state = "idle"; // idle | lead | serving | returning | cheer | oops | napping | paused | gameover
    var pausedFrom = null;
    var pattern, round, inputIdx, hearts, score, best, roundClean;
    var serveIdx, serveOn, serveTimer, serveLead, serveReplay;
    var phaseTimer, phaseAge, phaseSfx, bigCheer, cheerText;
    var padLit, padLift, lastLit, bounceT, happyT, surpriseT, heartBlinkT;
    var slotOf, padPos, slowArmed, slowNow, chapterLead, shuffleLead;
    var time = 0;
    var runStats;

    best = A.leaderboard.best(GAME_KEY);

    // Skin is the one colour with no brand token: a warm paper tone mixed
    // from paper and clay (light), or paper-2 and clay (dark).
    function skin() { return pal.isDark ? pal.mix(pal.paper2, pal.clay, 0.45) : pal.mix(pal.paper, pal.clay, 0.28); }
    function padColor(i) { return pal[PADS[i].color]; }
    function padLitColor(i) { return pal.shade(padColor(i), pal.isDark ? 0.32 : 0.2); }
    function padRestColor(i) { return pal.mix(padColor(i), pal.paper, pal.isDark ? 0.35 : 0.45); }

    // ---------- Audio ----------
    var sfx = {
      // each pad's note, held about as long as the pad stays lit, with a soft octave shimmer
      tone: function (i, frames) {
        var f = PADS[i].freq, dur = Math.max(0.18, frames / 60 + 0.06);
        synth.beep(f, f, dur, "triangle", 0.55);
        synth.beep(f * 2, f * 2, dur * 0.6, "sine", 0.1);
      },
      returned: function () { synth.arp([523.25, 659.25, 783.99, 1046.5], 0.07, 0.18, "triangle", 0.42); },
      giggle: function () { synth.arp([1174.66, 1318.51, 1174.66, 1318.51], 0.065, 0.06, "sine", 0.16); },
      big: function () { synth.arp([440, 523.25, 659.25, 783.99, 1046.5, 1318.51], 0.075, 0.22, "triangle", 0.45); },
      // a gentle, low "uh-oh" (two falling sine notes), never a buzzer
      miss: function () { synth.arp([349.23, 293.66], 0.16, 0.3, "sine", 0.4); },
      chapter: function () { synth.arp([523.25, 659.25, 783.99, 1046.5], 0.08, 0.2, "sine", 0.36); },
      power: function () { synth.arp([659.25, 880, 1318.51], 0.05, 0.12, "triangle", 0.36); },
      shuffle: function () { synth.arp([783.99, 659.25, 523.25, 659.25], 0.06, 0.1, "sine", 0.3); }
    };

    // The conversation quickens with length: about 430 ms light / 170 ms gap at
    // first, easing to a floor of about 200 ms / 90 ms. Duet paces by round,
    // since its pattern grows two steps a round.
    function pace() { return mode === "duet" ? round + 1 : pattern.length; }
    function lightFrames() { return Math.max(200, 430 - (pace() - 1) * 23) * 0.06 * (slowNow ? 2 : 1); }
    function gapFrames() { return Math.max(90, 170 - (pace() - 1) * 8) * 0.06 * (slowNow ? 2 : 1); }

    function isActive(s) { return s === "lead" || s === "serving" || s === "returning" || s === "cheer" || s === "oops"; }

    function nextPad() {
      var n = Math.floor(Math.random() * 4), L = pattern.length;
      // allow doubles, but never three of the same in a row
      if (L >= 2 && pattern[L - 1] === n && pattern[L - 2] === n) n = (n + 1 + Math.floor(Math.random() * 3)) % 4;
      return n;
    }
    function padAtSlot(s) { for (var i = 0; i < 4; i++) if (slotOf[i] === s) return i; return s; }

    // ---------- World ----------
    function resetWorld() {
      pattern = []; round = 1; inputIdx = 0;
      hearts = MAX_HEARTS; score = 0; roundClean = true;
      serveIdx = -1; serveOn = false; serveTimer = 0; serveLead = 0; serveReplay = false;
      phaseTimer = 0; phaseAge = 0; phaseSfx = 0; bigCheer = false; cheerText = "";
      padLit = [0, 0, 0, 0]; padLift = [0, 0, 0, 0]; lastLit = -1;
      bounceT = 0; happyT = 0; surpriseT = 0; heartBlinkT = 0;
      slotOf = [0, 1, 2, 3];
      padPos = SLOTS.map(function (s) { return { x: s.x, y: s.y }; });
      slowArmed = false; slowNow = false; chapterLead = false; shuffleLead = false;
      pausedFrom = null;
      powers.clear(); story.reset();
      particles.clear(); floaters.clear();
      runStats = { chapter: 0, longest: 0, clean: 0, repairs: 0, powers: 0, rounds: 0 };
      syncHud(); syncPowerButtons();
    }

    function syncHud() {
      shell.hud.set("score", score);
      shell.hud.set("best", Math.max(best, score));
      shell.hud.set("round", round);
      shell.hud.set("mode", MODES[mode].label);
    }
    function syncPowerButtons() {
      [["slow", "slow"], ["look", "look"]].forEach(function (row) {
        var b = shell.touchButton(row[0]); if (!b) return;
        var on = powers.active(row[1]);
        b.disabled = !on;
        b.setAttribute("aria-disabled", on ? "false" : "true");
        b.style.opacity = on ? "" : "0.45";
      });
    }

    function onChapter(ch, idx) {
      runStats.chapter = Math.max(runStats.chapter, idx);
      if (idx > 0) {
        chapterLead = true;
        sfx.chapter(); A.haptics.win();
        powers.grant("look");
        runStats.powers += 1;
        floaters.spawn(BABY_X, HEAD_Y - HEAD_R - 22, "Second Look", pal.sageDeep, { size: 13, font: "display" });
        shell.toast("Second Look: " + POWERUPS.look.text, 1800);
        A.announce("Chapter " + (idx + 1) + ", " + ch.name + ". " + ch.text + " You have a Second Look: press 6 to hear a pattern again.");
      }
    }

    function lightPad(i, frames) {
      padLit[i] = frames; lastLit = i;
      var p = padPos[i];
      particles.burst(p.x, p.y, { n: 5, color: [padLitColor(i), pal.alpha(pal.ink, 0.5)], speed: 1.1, life: 26, size: 3, kind: "ring" });
    }

    // ---------- Flow ----------
    function modeBoard(m) {
      var wrap = A.el("div", "gms-arcade-choices");
      wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", "Mode");
      var desc = A.el("p", "gms-arcade-prompt__text", MODES[mode].text);
      desc.setAttribute("aria-live", "polite");
      var btns = [];
      MODE_ORDER.forEach(function (id) {
        var b = A.el("button", "gms-arcade-choice", MODES[id].label);
        b.type = "button"; b.setAttribute("aria-pressed", id === mode ? "true" : "false");
        b.addEventListener("click", function () {
          mode = id; saveMode(id);
          btns.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
          desc.textContent = MODES[id].text;
          syncHud();
        });
        btns.push(b); wrap.appendChild(b);
      });
      m.appendChild(wrap); m.appendChild(desc);
    }
    function showStart() {
      var p = A.progress.get(GAME_KEY);
      shell.prompt.show({
        kicker: "Serve and Return",
        title: p.plays ? "Ready for another conversation?" : "The baby serves. You return.",
        text: "Watch the pads light up, then press them in the same order. Each good return adds one more step. A missed cue is fine: the baby serves it again.",
        actions: [{ label: "Start", primary: true, onClick: start }],
        board: function (m) { modeBoard(m); if (p.plays) A.renderLeaderboard(m, GAME_KEY, {}); }
      });
    }
    function start() {
      synth.ensure();
      resetWorld();
      shell.prompt.hide();
      wake.acquire();
      shell.setHelp("Arrows, WASD or 1–4 press the pads · tap the pads · 5 Slow Down · 6 Second Look · Space pauses · M mutes · Esc closes");
      story.set(0);
      A.announce("Go. " + MODES[mode].label + ". Chapter one, First Coos.");
      if (mode === "duet") beginLead(LEAD_CHAPTER);
      else { pattern.push(nextPad()); beginServe(LEAD_CHAPTER); }
    }
    function beginLead(delay) {
      state = "lead"; inputIdx = 0;
      serveTimer = delay || 0; // the player may press as soon as they like
      A.announce("Your serve. Press any pad.");
    }
    function beginServe(lead, replay) {
      state = "serving";
      serveIdx = -1; serveOn = false; serveTimer = lead; serveLead = lead; serveReplay = !!replay;
      inputIdx = 0;
      if (slowArmed) { slowArmed = false; slowNow = true; }
      if (!replay) A.announce(mode === "duet" ? "The baby echoes and adds one." : "Baby's turn.");
      else A.announce("Second look. Listen again.");
    }
    function beginReturn() {
      state = "returning";
      inputIdx = 0; slowNow = false;
      A.announce("Your turn: " + pattern.length + (pattern.length === 1 ? " step." : " steps."));
    }
    function pause() {
      if (!isActive(state)) return;
      pausedFrom = state; state = "paused";
      wake.release();
      shell.prompt.show({ kicker: "Paused", title: CHAPTERS[story.index()].name, text: "The baby is happy to wait. Score " + score + " · round " + round + ".",
        actions: [{ label: "Resume", primary: true, onClick: resume }, { label: "Quit", onClick: function () { A.closeGame(); } }], compact: true });
      A.announce("Paused.");
    }
    function resume() {
      if (state !== "paused") return;
      synth.ensure();
      state = pausedFrom || "returning"; pausedFrom = null;
      shell.prompt.hide(); wake.acquire();
    }

    // Player input: light and sound first (feedback before judgement), then check.
    function press(i) {
      if (state === "idle") { start(); return; }
      if (state === "paused") { resume(); return; }
      if (state === "lead") {
        synth.ensure();
        var lf0 = Math.max(16, lightFrames());
        lightPad(i, lf0); sfx.tone(i, lf0); A.haptics.tick();
        pattern.push(i);
        floaters.spawn(padPos[i].x, padPos[i].y - PAD_H / 2 - 10, "your serve", pal.inkSoft, { size: 11 });
        pattern.push(nextPad());
        beginServe(40);
        return;
      }
      if (state !== "returning") return;
      synth.ensure();
      var lf = Math.max(14, lightFrames());
      lightPad(i, lf); sfx.tone(i, lf); A.haptics.tick();
      if (i === pattern[inputIdx]) {
        inputIdx++;
        var pts = 10 * pattern.length;
        score += pts;
        particles.burst(padPos[i].x, padPos[i].y, { n: 6, color: [padLitColor(i), pal.surface], speed: 1.4, life: 18, size: 2.2, kind: ["dot", "leaf"] });
        syncHud();
        if (inputIdx >= pattern.length) roundComplete();
      } else {
        missedCue();
      }
    }

    function roundComplete() {
      var len = pattern.length;
      var bonus = 25 * len + (roundClean ? 10 * len : 0);
      score += bonus;
      runStats.longest = Math.max(runStats.longest, len);
      runStats.rounds = round;
      state = "cheer";
      phaseTimer = CHEER_FRAMES; phaseAge = 0; phaseSfx = 0;
      happyT = HAPPY_FRAMES;
      bigCheer = round % 5 === 0;
      cheerText = bigCheer ? round + " rounds!" : (roundClean ? "lovely" : "repaired");
      floaters.spawn(BABY_X + 70, HEAD_Y - 40, "+" + bonus, pal.forest, { size: 13 });
      particles.burst(BABY_X, HEAD_Y, { n: 10, color: [pal.sageDeep, pal.ochre, pal.surface], speed: 1.8, life: 24, size: 2.6, kind: ["leaf", "dot"] });
      A.haptics.pop();
      if (roundClean) {
        runStats.clean += 1;
        if (runStats.clean % 5 === 0) {
          powers.grant("slow"); runStats.powers += 1; sfx.power();
          floaters.spawn(BABY_X, HEAD_Y - HEAD_R - 22, "Slow Down", pal.research, { size: 13, font: "display" });
          shell.toast("Slow Down: " + POWERUPS.slow.text, 1800);
          A.announce("Five clean rounds. You have a Slow Down: press 5 to use it.");
        }
      }
      if (bigCheer) {
        for (var i = 0; i < 4; i++) particles.burst(padPos[i].x, padPos[i].y, { n: 5, color: padLitColor(i), speed: 1.6, life: 24, size: 2.6, kind: "ring" });
        camera.shake(0.4);
        A.haptics.win();
        A.announce("Lovely. " + round + " rounds.");
      }
      syncHud(); shell.hud.flash("score");
    }

    // A missed cue is a rupture, not a failure: the baby looks surprised (not
    // sad), a heart goes, and the same pattern is served again to repair.
    function missedCue() {
      roundClean = false;
      hearts--;
      heartBlinkT = 36;
      runStats.repairs += 1;
      state = "oops";
      phaseTimer = OOPS_FRAMES; phaseAge = 0; phaseSfx = 0;
      surpriseT = SURPRISE_FRAMES; happyT = 0;
      camera.shake(0.45); camera.freeze(4);
      A.haptics.thump();
      floaters.spawn(BABY_X - 74, HEAD_Y - 40, "repair", pal.clayText, { size: 14, font: "display" });
      if (hearts > 0) A.announce("Missed cue. " + hearts + (hearts === 1 ? " heart" : " hearts") + " left. The baby serves it again.");
    }

    function nextRound() {
      round += 1;
      roundClean = true;
      chapterLead = false; shuffleLead = false;
      story.advance(round);
      if (mode === "plus" && (round - 1) % 5 === 0) shufflePads();
      syncHud();
      var lead = chapterLead ? LEAD_CHAPTER : shuffleLead ? LEAD_SHUFFLE : LEAD_IN;
      if (mode === "duet") beginLead(lead);
      else { pattern.push(nextPad()); beginServe(lead); }
    }

    // Echo Plus: the pads trade places (every pad moves).
    function shufflePads() {
      var next;
      do {
        next = [0, 1, 2, 3];
        for (var i = 3; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = next[i]; next[i] = next[j]; next[j] = t; }
      } while (next[0] === slotOf[0] || next[1] === slotOf[1] || next[2] === slotOf[2] || next[3] === slotOf[3]);
      slotOf = next;
      if (reduce) for (var k = 0; k < 4; k++) { padPos[k].x = SLOTS[slotOf[k]].x; padPos[k].y = SLOTS[slotOf[k]].y; }
      shuffleLead = true;
      sfx.shuffle();
      floaters.spawn(BABY_X, HEAD_Y - HEAD_R - 40, "The pads moved", pal.ink, { size: 14, font: "display" });
      var where = [];
      for (var p = 0; p < 4; p++) where.push(PADS[p].name + " " + SLOT_NAMES[slotOf[p]]);
      A.announce("The pads moved: " + where.join(", ") + ".");
    }

    function nap() {
      state = "napping"; phaseTimer = NAP_FRAMES;
      wake.release();
      A.announce("The conversation took a nap.");
    }
    function gameOver() {
      state = "gameover";
      var placed = score > 0 && score >= best;
      if (score > best) best = score;
      A.progress.record(GAME_KEY, { score: score, chapter: runStats.chapter, badges: runStats.chapter >= 4 ? ["whole-conversation"] : [] });
      syncHud();
      var ch = CHAPTERS[story.index()];
      shell.prompt.show({
        kicker: "The conversation took a nap",
        title: placed ? "A new best: " + score : "Score " + score,
        text: "You reached " + ch.name + " in " + MODES[mode].label + ", with a longest pattern of " + runStats.longest + (runStats.longest === 1 ? " step." : " steps."),
        board: function (m) {
          A.runSummary(m, { gameKey: GAME_KEY, score: score,
            lines: [["Mode", MODES[mode].label], ["Chapter", ch.name], ["Rounds returned", runStats.rounds], ["Longest pattern", runStats.longest], ["Clean rounds", runStats.clean], ["Repairs", runStats.repairs]],
            onSaved: function () { best = A.leaderboard.best(GAME_KEY); syncHud(); } });
        },
        actions: [{ label: "Play again", primary: true, onClick: start }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
      A.announce("Game over. Score " + score + ". Longest pattern " + runStats.longest + ".");
    }

    // ---------- Power-ups ----------
    function useSlow() {
      if (!(isActive(state))) return;
      if (slowArmed || slowNow) return;
      if (!powers.use("slow")) { A.announce("No Slow Down yet. Five clean rounds earn one."); return; }
      if (state === "serving") slowNow = true; else slowArmed = true;
      sfx.power();
      shell.toast("Slow Down: " + POWERUPS.slow.text, 1500);
      floaters.spawn(BABY_X, HEAD_Y - HEAD_R - 22, "slow down", pal.research, { size: 12 });
      A.announce(state === "serving" ? "Slow Down. This pattern plays at half speed." : "Slow Down. The next pattern plays at half speed.");
      syncPowerButtons();
    }
    function useLook() {
      if (state !== "returning") { if (isActive(state)) A.announce("Second Look works on your turn."); return; }
      if (!powers.use("look")) { A.announce("No Second Look yet. A new chapter earns one."); return; }
      sfx.power();
      shell.toast("Second Look: listen once more", 1300);
      floaters.spawn(BABY_X, HEAD_Y - HEAD_R - 22, "second look", pal.sageDeep, { size: 12 });
      beginServe(26, true);
      syncPowerButtons();
    }

    // ---------- Input ----------
    function hitPad(pt) {
      for (var i = 0; i < 4; i++) {
        var p = padPos[i];
        if (Math.abs(pt.x - p.x) <= PAD_W / 2 + HIT_SLOP && Math.abs(pt.y - p.y) <= PAD_H / 2 + HIT_SLOP) return i;
      }
      return -1;
    }
    function action(a) {
      if (a === "action") { if (state === "idle") start(); else if (state === "paused") resume(); else if (isActive(state)) pause(); }
      else if (a === "pause") { if (state === "paused") resume(); else pause(); }
      else if (a === "slow") useSlow();
      else if (a === "look") useLook();
    }
    var input = A.makeInput(cv.el, {
      canvas: cv,
      keys: {
        ArrowUp: "s0", w: "s0", "1": "s0", ArrowLeft: "s1", a: "s1", "2": "s1",
        ArrowRight: "s2", d: "s2", "3": "s2", ArrowDown: "s3", s: "s3", "4": "s3",
        "5": "slow", "6": "look", " ": "action", Enter: "action", p: "pause"
      },
      onAction: function (a, repeat, e) {
        if (e && e.preventDefault) e.preventDefault();
        if (repeat) return;
        if (a.charAt(0) === "s" && a.length === 2) { if (state === "gameover" || state === "napping") return; press(padAtSlot(+a.charAt(1))); }
        else action(a);
      },
      // pointerdown, so a pad answers the instant a finger lands
      onDown: function (pt) {
        if (state === "paused") { resume(); return; }
        if (state !== "returning" && state !== "lead") return;
        var i = hitPad(pt);
        if (i >= 0) press(i);
      }
    });
    shell.onTap(function (id) {
      if (id.charAt(0) === "p" && id.length === 2) {
        if (state === "gameover" || state === "napping") return;
        var i = +id.charAt(1);
        var b = shell.touchButton(id);
        if (b) { b.classList.add("is-held"); window.setTimeout(function () { b.classList.remove("is-held"); }, 120); }
        press(i);
      } else action(id);
    });

    // ---------- Tick ----------
    function tick(dt) {
      if (state !== "paused") time += dt;
      camera.tick(dt); particles.tick(dt); floaters.tick(dt);
      if (state === "paused" || state === "idle") return;
      story.tick(dt);
      for (var i = 0; i < 4; i++) {
        if (padLit[i] > 0) padLit[i] = Math.max(0, padLit[i] - dt);
        var want = padLit[i] > 0 ? 1 : 0;
        padLift[i] = reduce ? want : padLift[i] + (want - padLift[i]) * Math.min(1, 0.45 * dt);
        // Echo Plus slide toward the pad's new place
        var s = SLOTS[slotOf[i]], k = Math.min(1, 0.09 * dt);
        padPos[i].x += (s.x - padPos[i].x) * k; padPos[i].y += (s.y - padPos[i].y) * k;
      }
      if (bounceT > 0) bounceT -= dt;
      if (happyT > 0) happyT -= dt;
      if (surpriseT > 0) surpriseT -= dt;
      if (heartBlinkT > 0) heartBlinkT -= dt;

      if (state === "napping") { phaseTimer -= dt; if (phaseTimer <= 0) gameOver(); return; }
      if (state === "gameover") return;
      if (camera.frozen()) return;
      shell.renderPips(powers.list(), pal);

      if (state === "lead") { if (serveTimer > 0) serveTimer -= dt; }
      else if (state === "serving") tickServe(dt);
      else if (state === "cheer") tickCheer(dt);
      else if (state === "oops") tickOops(dt);
    }
    function tickServe(dt) {
      serveTimer -= dt;
      // "while" and accumulate (not assign) keeps the rhythm steady on long frames
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
      // the stinger lands just after the last note instead of on top of it
      if (phaseSfx === 0 && phaseAge >= 8) { phaseSfx = 1; if (bigCheer) sfx.big(); else sfx.returned(); }
      if (phaseSfx === 1 && phaseAge >= 26) { phaseSfx = 2; sfx.giggle(); }
      phaseTimer -= dt;
      if (phaseTimer <= 0) nextRound();
    }
    function tickOops(dt) {
      phaseAge += dt;
      if (phaseSfx === 0 && phaseAge >= 7) { phaseSfx = 1; sfx.miss(); }
      phaseTimer -= dt;
      if (phaseTimer <= 0) {
        if (hearts <= 0) nap();
        else beginServe(LEAD_REPAIR);
      }
    }

    // ---------- Render ----------
    function vis() { return state === "paused" ? pausedFrom : state; }
    function babyMood(v) {
      if (v === "gameover" || v === "napping") return "sleep";
      if (surpriseT > 0) return "surprised";
      if (happyT > 0) return "happy";
      if (v === "serving" && serveOn) return "coo";
      return "calm";
    }

    function drawIcon(name, x, y, s, color) {
      ctx.save();
      ctx.fillStyle = color; ctx.strokeStyle = color;
      if (name === "note") {
        ctx.beginPath(); ctx.ellipse(x - s * 0.28, y + s * 0.42, s * 0.36, s * 0.27, -0.45, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = s * 0.16;
        ctx.beginPath(); ctx.moveTo(x + s * 0.06, y + s * 0.38); ctx.lineTo(x + s * 0.06, y - s * 0.72); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + s * 0.06, y - s * 0.72);
        ctx.quadraticCurveTo(x + s * 0.58, y - s * 0.5, x + s * 0.5, y - s * 0.05); ctx.stroke();
      } else if (name === "heart") {
        heartPath(ctx, x, y + s * 0.05, s * 0.66); ctx.fill();
      } else if (name === "star") {
        draw.star(ctx, x, y + s * 0.04, s * 0.78, 5, 0.46, { fill: color });
      } else {
        ctx.beginPath(); ctx.arc(x, y, s * 0.34, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = s * 0.13;
        for (var r = 0; r < 8; r++) {
          var a = r * Math.PI / 4;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5); ctx.lineTo(x + Math.cos(a) * s * 0.76, y + Math.sin(a) * s * 0.76); ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawPad(i) {
      var p = padPos[i], lift = padLift[i], lit = padLit[i] > 0;
      var x = p.x - PAD_W / 2, y = p.y - PAD_H / 2 - lift * 4;
      var fill = lit ? padLitColor(i) : padRestColor(i);
      draw.box(ctx, x, y, PAD_W, PAD_H, PAD_R, { fill: fill, stroke: pal.ink, lineWidth: lit ? 1.6 : 1.3, shadow: 3 + lift * 5, shadowColor: pal.shadow });
      // lit pads get a bright inner rim, so "on" never rests on hue alone
      if (lit) draw.box(ctx, x + 4, y + 4, PAD_W - 8, PAD_H - 8, PAD_R - 4, { stroke: pal.alpha(pal.surface, 0.8), lineWidth: 1.6 });
      // a small highlight in the top-left corner
      ctx.fillStyle = pal.alpha(pal.surface, lit ? 0.5 : 0.32);
      ctx.beginPath(); ctx.ellipse(x + 22, y + 13, 11, 4, -0.2, 0, Math.PI * 2); ctx.fill();
      // the icon sits on a paper disc, in ink, so it reads on every pad in both themes
      var dr = 20 + lift * 3;
      draw.circle(ctx, p.x, y + PAD_H / 2, dr, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.2 });
      drawIcon(PADS[i].name, p.x, y + PAD_H / 2, 15 + lift * 2, pal.ink);
    }

    function drawCribBack() {
      // mattress, a quiet surface band inside the rails
      draw.box(ctx, 22, RAIL_TOP + 16, W - 44, RAIL_BOT - RAIL_TOP - 16, 6, { fill: pal.alpha(pal.sageMist, pal.isDark ? 0.25 : 0.7) });
    }
    function drawCribFront() {
      ctx.save();
      ctx.strokeStyle = pal.ink; ctx.lineCap = "round";
      // posts
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(16, RAIL_TOP - 14); ctx.lineTo(16, RAIL_BOT + 8); ctx.moveTo(W - 16, RAIL_TOP - 14); ctx.lineTo(W - 16, RAIL_BOT + 8); ctx.stroke();
      // rails
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(16, RAIL_TOP); ctx.lineTo(W - 16, RAIL_TOP); ctx.moveTo(16, RAIL_BOT); ctx.lineTo(W - 16, RAIL_BOT); ctx.stroke();
      // slats
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = pal.alpha(pal.ink, 0.7);
      ctx.beginPath();
      for (var x = 40; x < W - 20; x += 26) { ctx.moveTo(x, RAIL_TOP + 2); ctx.lineTo(x, RAIL_BOT - 2); }
      ctx.stroke();
      // post finials
      draw.circle(ctx, 16, RAIL_TOP - 16, 4.5, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.4 });
      draw.circle(ctx, W - 16, RAIL_TOP - 16, 4.5, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.4 });
      ctx.restore();
    }

    function drawBaby(v) {
      var mood = babyMood(v);
      var sk = skin();
      var oy = 0;
      if (!reduce) {
        if (mood === "happy") oy = Math.floor(time / 5) % 2 === 0 ? -3 : 0;          // giggle bounce
        else if (bounceT > 0) oy = -bounceT * 0.35;                                // coo hop per note
        else if (mood === "surprised") oy = surpriseT > SURPRISE_FRAMES - 6 ? -3 : 0;
        else if (mood === "calm") oy = Math.sin(time * 0.05) * 1.2;                 // gentle idle breath
        else if (mood === "sleep") oy = Math.sin(time * 0.03) * 1.5 + 2;
      }
      // eyes follow the lit pad (joint attention)
      var lx = 0, ly = 0;
      if (lastLit >= 0 && padLit[lastLit] > 0) {
        var dx = padPos[lastLit].x - BABY_X, dy = padPos[lastLit].y - (HEAD_Y - 4);
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        lx = dx / d; ly = dy / d;
      }
      var hx = BABY_X, hy = HEAD_Y + oy;

      // onesie: a surface body with a sage collar and a sprout print
      draw.shape(ctx, function (c) {
        c.beginPath();
        c.moveTo(hx - 34, hy + 34);
        c.quadraticCurveTo(hx - 54, hy + 52, hx - 54, hy + 104);
        c.lineTo(hx - 54, RAIL_BOT - 4);
        c.lineTo(hx + 54, RAIL_BOT - 4);
        c.lineTo(hx + 54, hy + 104);
        c.quadraticCurveTo(hx + 54, hy + 52, hx + 34, hy + 34);
        c.closePath();
      }, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.4, shadow: 3, shadowColor: pal.shadow });
      draw.shape(ctx, function (c) {
        c.beginPath(); c.ellipse(hx, hy + 38, 26, 9, 0, 0, Math.PI * 2);
      }, { fill: pal.sage, stroke: pal.ink, lineWidth: 1.3 });
      draw.leaf(ctx, hx - 1, hy + 72, 13, -Math.PI / 2 - 0.6, { fill: pal.sageDeep, stroke: pal.ink, lineWidth: 1 });
      draw.leaf(ctx, hx + 1, hy + 72, 11, -Math.PI / 2 + 0.7, { fill: pal.sageDeep, stroke: pal.ink, lineWidth: 1 });

      // ears, then the head
      draw.circle(ctx, hx - HEAD_R + 2, hy + 4, 9, { fill: sk, stroke: pal.ink, lineWidth: 1.4 });
      draw.circle(ctx, hx + HEAD_R - 2, hy + 4, 9, { fill: sk, stroke: pal.ink, lineWidth: 1.4 });
      draw.circle(ctx, hx, hy, HEAD_R, { fill: sk, stroke: pal.ink, lineWidth: 1.5, shadow: 3, shadowColor: pal.shadow });
      // a small highlight
      ctx.fillStyle = pal.alpha(pal.surface, pal.isDark ? 0.12 : 0.35);
      ctx.beginPath(); ctx.ellipse(hx - 16, hy - 22, 13, 7, -0.5, 0, Math.PI * 2); ctx.fill();
      // a few hair strands
      ctx.save();
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - HEAD_R + 1); ctx.quadraticCurveTo(hx - 10, hy - HEAD_R - 12, hx + 2, hy - HEAD_R - 14);
      ctx.moveTo(hx + 4, hy - HEAD_R + 1); ctx.quadraticCurveTo(hx + 6, hy - HEAD_R - 10, hx + 15, hy - HEAD_R - 8);
      ctx.moveTo(hx - 12, hy - HEAD_R + 3); ctx.quadraticCurveTo(hx - 20, hy - HEAD_R - 6, hx - 15, hy - HEAD_R - 11);
      ctx.stroke();
      ctx.restore();

      // cheeks
      ctx.fillStyle = pal.alpha(pal.clay, pal.isDark ? 0.45 : 0.32);
      ctx.beginPath(); ctx.ellipse(hx - 26, hy + 12, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hx + 26, hy + 12, 8, 5, 0, 0, Math.PI * 2); ctx.fill();

      // eyes
      var eyeY = hy - 4, gap = 32, er = 8.5;
      var eyeWhite = pal.isDark ? pal.onInk : pal.surface, eyeInk = pal.isDark ? pal.fieldInk : pal.ink;
      ctx.save();
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.lineCap = "round";
      if (mood === "sleep") {
        ctx.beginPath();
        ctx.arc(hx - gap / 2, eyeY, 7, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.moveTo(hx + gap / 2 + 7 * Math.cos(0.15 * Math.PI), eyeY + 7 * Math.sin(0.15 * Math.PI));
        ctx.arc(hx + gap / 2, eyeY, 7, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else if (mood === "happy") {
        ctx.beginPath();
        ctx.arc(hx - gap / 2, eyeY + 4, 7, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.moveTo(hx + gap / 2 + 7 * Math.cos(1.15 * Math.PI), eyeY + 4 + 7 * Math.sin(1.15 * Math.PI));
        ctx.arc(hx + gap / 2, eyeY + 4, 7, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
      } else {
        var big = mood === "surprised" ? 1.2 : 1;
        var blink = mood === "calm" && !reduce && (time % 220) < 7 ? 1 : 0;
        draw.eyes(ctx, hx + lx * 2, eyeY + ly * 1.5, gap, er * big, lx, ly, pal, { white: eyeWhite, ink: eyeInk, blink: blink });
        if (!blink) {
          ctx.fillStyle = eyeWhite;
          ctx.beginPath(); ctx.arc(hx - gap / 2 + lx * 3 - 1.8, eyeY + ly * 3 - 2, 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(hx + gap / 2 + lx * 3 - 1.8, eyeY + ly * 3 - 2, 1.6, 0, Math.PI * 2); ctx.fill();
        }
        if (mood === "surprised") {
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(hx - gap / 2 - 7, eyeY - 15); ctx.quadraticCurveTo(hx - gap / 2, eyeY - 20, hx - gap / 2 + 7, eyeY - 15);
          ctx.moveTo(hx + gap / 2 - 7, eyeY - 15); ctx.quadraticCurveTo(hx + gap / 2, eyeY - 20, hx + gap / 2 + 7, eyeY - 15); ctx.stroke();
        }
      }
      ctx.restore();

      // mouth by mood
      var my = hy + 20;
      var mouthFill = pal.mix(pal.clay, pal.ink, pal.isDark ? 0.15 : 0.35);
      ctx.save();
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      if (mood === "coo") {
        draw.shape(ctx, function (c) { c.beginPath(); c.ellipse(hx, my + 1, 5, 6, 0, 0, Math.PI * 2); }, { fill: mouthFill, stroke: pal.ink, lineWidth: 1.4 });
      } else if (mood === "happy") {
        draw.shape(ctx, function (c) { c.beginPath(); c.moveTo(hx - 11, my - 2); c.quadraticCurveTo(hx, my - 1, hx + 11, my - 2); c.quadraticCurveTo(hx + 9, my + 12, hx, my + 12); c.quadraticCurveTo(hx - 9, my + 12, hx - 11, my - 2); c.closePath(); },
          { fill: mouthFill, stroke: pal.ink, lineWidth: 1.4 });
      } else if (mood === "surprised") {
        draw.shape(ctx, function (c) { c.beginPath(); c.ellipse(hx, my + 2, 6.5, 8, 0, 0, Math.PI * 2); }, { fill: mouthFill, stroke: pal.ink, lineWidth: 1.4 });
      } else if (mood === "sleep") {
        ctx.beginPath(); ctx.moveTo(hx - 4, my + 2); ctx.quadraticCurveTo(hx, my + 4, hx + 4, my + 2); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(hx - 8, my); ctx.quadraticCurveTo(hx, my + 8, hx + 8, my); ctx.stroke();
      }
      ctx.restore();
      return { lx: lx, ly: ly, mood: mood, oy: oy };
    }

    // Hands hold the top rail; while cooing, the hand nearer the lit pad reaches for it.
    function drawHands(b) {
      var sk = skin();
      var lh = { x: BABY_X - 36, y: RAIL_TOP - 1 }, rh = { x: BABY_X + 36, y: RAIL_TOP - 1 };
      if (b.mood === "happy" && !reduce) { lh.y -= 16; lh.x -= 10; rh.y -= 16; rh.x += 10; }
      else if (b.mood === "surprised") { lh.y -= 8; rh.y -= 8; }
      else if (b.mood === "coo") {
        if (b.lx < -0.5) { lh.x -= 14; lh.y -= 14; }
        else if (b.lx > 0.5) { rh.x += 14; rh.y -= 14; }
        else if (b.ly < -0.5) { lh.y -= 18; rh.y -= 18; }
      }
      draw.circle(ctx, lh.x, lh.y, 9, { fill: sk, stroke: pal.ink, lineWidth: 1.4, shadow: 2, shadowColor: pal.shadow });
      draw.circle(ctx, rh.x, rh.y, 9, { fill: sk, stroke: pal.ink, lineWidth: 1.4, shadow: 2, shadowColor: pal.shadow });
    }

    function drawHearts() {
      for (var h = 0; h < MAX_HEARTS; h++) {
        var full = h < hearts;
        // the heart just lost blinks out (never under reduced motion)
        if (!full && h === hearts && heartBlinkT > 0 && !reduce && Math.floor(heartBlinkT / 4) % 2 === 0) full = true;
        var x = W - 22 - (MAX_HEARTS - 1 - h) * 24, y = 22;
        draw.shape(ctx, function (c) { heartPath(c, x, y, 9); },
          full ? { fill: pal.clay, stroke: pal.ink, lineWidth: 1.3, shadow: 2, shadowColor: pal.shadow } : { stroke: pal.alpha(pal.ink, 0.35), lineWidth: 1.3 });
      }
    }

    // Step pips along the bottom: how far the serve or the return has got.
    // Deliberately colourless per pad so they never give the pattern away.
    function drawSteps(v) {
      var len = pattern.length;
      if (!len || v === "idle" || v === "gameover" || v === "napping" || v === "lead") return;
      var filled = 0, col = pal.forest, missAt = -1;
      if (v === "serving") { filled = serveIdx + 1; col = pal.ochre; }
      else if (v === "returning") filled = inputIdx;
      else if (v === "cheer") filled = len;
      else if (v === "oops") { filled = inputIdx; missAt = inputIdx; }
      if (len > 22) {
        draw.label(ctx, filled + " / " + len, 20, 426, { size: 12, color: pal.inkSoft, align: "left", weight: 600 });
        return;
      }
      for (var k = 0; k < len; k++) {
        var px = 22 + k * 10, py = 426;
        var c = k === missAt ? pal.clay : k < filled ? col : null;
        draw.circle(ctx, px, py, 3.4, c ? { fill: c, stroke: pal.ink, lineWidth: 1 } : { stroke: pal.alpha(pal.ink, 0.35), lineWidth: 1 });
      }
    }

    function tagFor(v) {
      if (v === "lead") return { text: "your serve", color: pal.ochre };
      if (v === "serving") return { text: serveReplay ? "second look" : "baby's turn", color: pal.research };
      if (v === "returning") return { text: "your turn", color: pal.forest };
      if (v === "cheer") return { text: cheerText, color: pal.sageDeep };
      if (v === "oops") return { text: "try again", color: pal.clay };
      if (v === "napping" || v === "gameover") return { text: "nap time", color: pal.inkMuted };
      return null;
    }
    function drawTag(v) {
      var tag = tagFor(v);
      if (!tag) return;
      ctx.font = "600 12px " + pal.fontBody;
      var tw = Math.ceil(ctx.measureText(tag.text).width) + 30;
      var x = W - 14 - tw, y = 415;
      draw.pill(ctx, x, y, tw, 22, { fill: pal.surface, stroke: pal.ink, lineWidth: 1.2, shadow: 2, shadowColor: pal.shadow });
      draw.circle(ctx, x + 12, y + 11, 4, { fill: tag.color, stroke: pal.ink, lineWidth: 1 });
      draw.label(ctx, tag.text, x + 21, y + 11.5, { size: 12, color: pal.ink, align: "left", weight: 600 });
      if (slowArmed || slowNow) {
        var sw = 84, sx = x - sw - 8;
        draw.pill(ctx, sx, y, sw, 22, { fill: pal.alpha(pal.research, 0.16), stroke: pal.research, lineWidth: 1.2 });
        draw.label(ctx, slowNow ? "half speed" : "slow ready", sx + sw / 2, y + 11.5, { size: 11, color: pal.ink, weight: 600 });
      }
    }

    function render() {
      cv.begin(camera);
      draw.paper(ctx, W, H, pal, { step: 20, dot: 1 });
      ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      var v = vis();
      drawCribBack();
      var b = drawBaby(v);
      drawCribFront();
      drawHands(b);
      for (var i = 0; i < 4; i++) if (padLift[i] <= 0.01) drawPad(i);
      for (var j = 0; j < 4; j++) if (padLift[j] > 0.01) drawPad(j); // lit pads on top

      // the conversation took a nap: drifting z's
      if (v === "gameover" || v === "napping") {
        for (var z = 0; z < 3; z++) {
          var zt = reduce ? z * 10 : (time * 0.25 + z * 10) % 30;
          ctx.save(); ctx.globalAlpha = reduce ? 1 : Math.max(0, 1 - zt / 30);
          draw.label(ctx, "z", BABY_X + 40 + z * 10 + zt * 0.4, HEAD_Y - 40 - zt - z * 6, { font: "display", size: 14 + z * 4, color: pal.inkSoft, italic: true });
          ctx.restore();
        }
      }

      particles.render(ctx);
      floaters.render(ctx);

      drawHearts();
      drawSteps(v);
      drawTag(v);

      // chapter banner, drawn between rounds
      var bn = story.banner();
      if (bn && state !== "idle" && state !== "gameover") {
        var a = Math.min(1, bn.frac * 3) * Math.min(1, (1 - bn.frac) * 6 + 0.2);
        ctx.save(); ctx.globalAlpha = a;
        var ty = 26 + (reduce ? 0 : (1 - Math.min(1, (1 - bn.frac) * 4)) * -10);
        draw.label(ctx, bn.name, W / 2, ty, { font: "display", size: 26, color: pal.ink, weight: 500 });
        draw.label(ctx, bn.text, W / 2, ty + 22, { size: 11, color: pal.inkMuted, weight: 500 });
        ctx.restore();
      }

      // chapter progress along the bottom rule
      if (state !== "idle") {
        var prog = story.progress(round);
        ctx.fillStyle = pal.alpha(pal.forest, 0.55); ctx.fillRect(0, H - 2, W * prog, 2);
      }
      cv.end();
    }

    var loop = A.makeLoop(tick, render);
    function onHidden() { if (isActive(state)) pause(); }

    A.debug("echo", {
      state: function () { return state; },
      score: function () { return score; },
      pattern: function () { return pattern.slice(); },
      mode: function (m) { if (m && MODES[m]) { mode = m; saveMode(m); syncHud(); } return mode; },
      // answer(true) presses the right next pad (or serves pad 0 in Duet); answer(false) presses a wrong one.
      answer: function (correct) {
        if (state === "lead") { press(0); return true; }
        if (state !== "returning") return false;
        var want = pattern[inputIdx];
        press(correct === false ? (want + 1) % 4 : want);
        return true;
      },
      skipToRound: function (n) {
        n = Math.max(1, n | 0);
        if (state === "idle" || state === "gameover") start();
        round = n;
        pattern.length = 0;
        var steps = mode === "duet" ? (n - 1) * 2 : n;
        for (var i = 0; i < steps; i++) pattern.push(nextPad());
        if (mode === "plus" && n > 5) shufflePads();
        chapterLead = false;
        story.advance(n);
        syncHud();
        if (mode === "duet") beginLead(chapterLead ? LEAD_CHAPTER : LEAD_IN); else beginServe(chapterLead ? LEAD_CHAPTER : LEAD_IN);
      },
      lose: function () { hearts = 1; state = "returning"; missedCue(); },
      grant: function (id) { powers.grant(id); syncPowerButtons(); },
      lightPad: function (i, frames) { lightPad(i, frames || 60); }
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
        state = "idle";
      },
      onKeydown: function (e) { if (input.onKeydown(e)) e.preventDefault(); },
      onKeyup: function (e) { input.onKeyup(e); },
      // The phone turned: a round pauses while the field refits.
      onViewport: function () { pause(); },
      destroy: function () { offTheme(); input.destroy(); }
    };
  }

  // ======================================================================
  //  Overlay
  // ======================================================================
  A.ready(function () {
    A.defineGame("echo", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Serve and Return",
        tagline: "Watch the pattern. Echo it back.",
        label: "Serve and Return game",
        canvas: { w: W, h: H, label: "Serve and Return play field. Arrow keys, W A S D, or 1 to 4 press the pads, 5 Slow Down, 6 Second Look, Space pauses." },
        hud: [{ id: "score", label: "Score", value: 0 }, { id: "best", label: "Best", value: A.leaderboard.best(GAME_KEY) }, { id: "round", label: "Round", value: 1 }, { id: "mode", label: "Mode", value: "Classic" }],
        help: "Arrows, WASD or 1–4 press the pads · tap the pads · 5 Slow Down · 6 Second Look · Space starts and pauses · M mutes · Esc closes",
        touch: [
          { id: "p0", label: PADS[0].glyph, aria: "Note pad", tap: true },
          { id: "p1", label: PADS[1].glyph, aria: "Heart pad", tap: true },
          { id: "p2", label: PADS[2].glyph, aria: "Star pad", tap: true },
          { id: "p3", label: PADS[3].glyph, aria: "Sun pad", tap: true },
          { id: "slow", label: "Slow Down", aria: "Use Slow Down", tap: true },
          { id: "look", label: "Second Look", aria: "Use Second Look", tap: true }
        ]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
