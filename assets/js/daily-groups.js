/* Growing Minds Science — daily-groups.js
   "Groupings": sixteen words, four hidden groups of four. Find them in four
   mistakes or fewer. One puzzle a day for everyone, walked in order through
   /assets/data/arcade/groups.json, plus a practice mode that picks any other
   puzzle. A DOM game on the arcade shell (no canvas). Solved groups collapse
   into labelled bands, so colour is never the only cue.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "groupings";
  var DATA_URL = "/assets/data/arcade/groups.json";
  var el = A.el;
  var LEVEL_EMOJI = { 1: "🟩", 2: "🟨", 3: "🟦", 4: "🟪" };

  function shuffle(arr, rnd) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor((rnd ? rnd() : Math.random()) * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function createGame(shell) {
    var reduce = A.prefersReducedMotion();
    var synth = A.makeSynth({ muteKey: "gms-groups-muted" });
    shell.bindSynth(synth);

    // ---------- DOM ----------
    var board = el("div", "gms-arcade-board daily daily-groups");
    board.tabIndex = 0; board.setAttribute("data-arcade-focus", ""); board.setAttribute("aria-label", "Groupings board");
    var meta = el("p", "daily__meta");
    var solvedWrap = el("div", "groups__solved"); solvedWrap.setAttribute("aria-live", "polite");
    var grid = el("div", "groups__grid"); grid.setAttribute("role", "group"); grid.setAttribute("aria-label", "Words");
    var mistakesRow = el("p", "groups__mistakes");
    var controls = el("div", "groups__controls");
    var shuffleBtn = ctl("Shuffle", "groups__ctl"), deselectBtn = ctl("Deselect", "groups__ctl"), submitBtn = ctl("Submit", "groups__ctl is-primary");
    controls.appendChild(shuffleBtn); controls.appendChild(deselectBtn); controls.appendChild(submitBtn);
    board.appendChild(meta); board.appendChild(solvedWrap); board.appendChild(grid); board.appendChild(mistakesRow); board.appendChild(controls);
    shell.stage.appendChild(board);
    function ctl(label, cls) { var b = el("button", cls, label); b.type = "button"; return b; }

    // ---------- State ----------
    var data = null, puzzle = null, order = [], selected = [], solved = [], guesses = [], mistakes = 0, done = false, mode = "daily", puzzleNo = 0, busy = false;
    var MAX_MISTAKES = 4;

    function puzzleForToday() {
      var n = data.puzzles.length;
      var idx = ((A.dayNumber() - 1) % n + n) % n;
      return data.puzzles[idx];
    }
    function groupOf(word) {
      for (var g = 0; g < puzzle.groups.length; g++) if (puzzle.groups[g].words.indexOf(word) !== -1) return puzzle.groups[g];
      return null;
    }
    function remainingWords() {
      var out = [];
      puzzle.groups.forEach(function (g) { if (solved.indexOf(g.level) === -1) out = out.concat(g.words); });
      return out;
    }

    function setup(newMode) {
      mode = newMode;
      selected = []; solved = []; guesses = []; mistakes = 0; done = false; busy = false;
      if (mode === "daily") {
        puzzle = puzzleForToday(); puzzleNo = A.dayNumber();
        var saved = A.daily.load(GAME_KEY);
        if (saved && saved.id === puzzle.id) { solved = saved.solved || []; guesses = saved.guesses || []; mistakes = saved.mistakes || 0; done = !!saved.done; order = saved.order || []; }
        meta.textContent = "Puzzle #" + puzzleNo + " · find four groups of four";
      } else {
        var today = puzzleForToday();
        var pool = data.puzzles.filter(function (p) { return p !== today; });
        puzzle = pool[Math.floor(Math.random() * pool.length)];
        meta.textContent = "Practice · find four groups of four";
      }
      if (!order.length || order.length !== remainingWords().length) order = shuffle(remainingWords(), mode === "daily" ? A.rng(A.dailySeed("groups")) : null);
      shell.hud.set("mode", mode === "daily" ? "#" + puzzleNo : "Practice");
      renderAll();
      syncHud();
      if (done) finish(solved.length === 4, true);
    }
    function syncHud() { var s = A.streak.get(GAME_KEY); shell.hud.set("streak", s.current); shell.hud.set("best", s.best); }
    function save() { if (mode === "daily") A.daily.save(GAME_KEY, { id: puzzle.id, solved: solved, guesses: guesses, mistakes: mistakes, done: done, order: order }); }

    // ---------- Render ----------
    function renderAll() {
      solvedWrap.textContent = "";
      puzzle.groups.slice().sort(function (a, b) { return solved.indexOf(a.level) - solved.indexOf(b.level); }).forEach(function (g) {
        if (solved.indexOf(g.level) === -1) return;
        solvedWrap.appendChild(band(g));
      });
      grid.textContent = "";
      order.forEach(function (w) {
        var b = el("button", "groups__word" + (w.length > 9 ? " is-xlong" : w.length > 6 ? " is-long" : "") + (selected.indexOf(w) !== -1 ? " is-selected" : ""), w);
        b.type = "button"; b.setAttribute("aria-pressed", selected.indexOf(w) !== -1 ? "true" : "false"); b.setAttribute("data-word", w);
        b.addEventListener("click", function (e) { e.preventDefault(); toggle(w, b); });
        grid.appendChild(b);
      });
      var dots = "";
      for (var i = 0; i < MAX_MISTAKES; i++) dots += i < MAX_MISTAKES - mistakes ? "●" : "○";
      mistakesRow.textContent = "Mistakes left: " + dots;
      mistakesRow.setAttribute("aria-label", "Mistakes left: " + (MAX_MISTAKES - mistakes));
      submitBtn.disabled = selected.length !== 4 || done;
      deselectBtn.disabled = !selected.length || done;
      shuffleBtn.disabled = done;
    }
    function band(g) {
      var d = el("div", "groups__band is-level-" + g.level);
      d.appendChild(el("strong", "groups__band-title", g.title));
      d.appendChild(el("span", "groups__band-words", g.words.join(", ")));
      return d;
    }

    // ---------- Play ----------
    function toggle(w, btn) {
      if (done || busy) return;
      var i = selected.indexOf(w);
      if (i !== -1) selected.splice(i, 1);
      else if (selected.length < 4) selected.push(w);
      else { shell.toast("Four at a time", 900); return; }
      synth.ensure(); synth.beep(i !== -1 ? 380 : 520, i !== -1 ? 360 : 540, 0.03, "triangle", 0.12);
      renderAll();
      var again = grid.querySelector('[data-word="' + w + '"]'); if (again) again.focus({ preventScroll: true });
    }
    function sameGuess(a, b) { return a.slice().sort().join("|") === b.slice().sort().join("|"); }
    function submit() {
      if (selected.length !== 4 || done || busy) return;
      for (var k = 0; k < guesses.length; k++) { if (sameGuess(guesses[k].words, selected)) { shell.toast("Already tried that one", 1100); return; } }
      var counts = {};
      selected.forEach(function (w) { var g = groupOf(w); counts[g.level] = (counts[g.level] || 0) + 1; });
      var levels = Object.keys(counts);
      var hit = levels.length === 1 ? Number(levels[0]) : 0;
      guesses.push({ words: selected.slice(), levels: selected.map(function (w) { return groupOf(w).level; }) });
      if (hit) {
        var g = puzzle.groups.filter(function (x) { return x.level === hit; })[0];
        solved.push(hit);
        order = order.filter(function (w) { return g.words.indexOf(w) === -1; });
        selected = [];
        synth.ensure(); synth.arp([523, 659, 784], 0.06, 0.14, "triangle", 0.35); A.haptics.pop();
        A.announce("Group found: " + g.title + ". " + g.words.join(", ") + ".");
        busy = true;
        renderAll();
        window.setTimeout(function () { busy = false; if (solved.length === 4) { done = true; save(); finish(true, false); } else save(); }, reduce ? 0 : 260);
      } else {
        mistakes += 1;
        var most = 0; levels.forEach(function (l) { most = Math.max(most, counts[l]); });
        var msg = most === 3 ? "One away" : "Not a group";
        shell.toast(msg, 1200); A.announce(msg + ". " + (MAX_MISTAKES - mistakes) + " mistakes left.");
        synth.ensure(); synth.beep(240, 200, 0.08, "square", 0.16); A.haptics.thump();
        grid.classList.remove("is-shake"); void grid.offsetWidth; grid.classList.add("is-shake");
        save();
        renderAll();
        if (mistakes >= MAX_MISTAKES) {
          done = true; save();
          // reveal the rest
          puzzle.groups.forEach(function (gr) { if (solved.indexOf(gr.level) === -1) solved.push(gr.level); });
          order = [];
          renderAll();
          finish(false, false);
        }
      }
    }
    function shuffleWords() { if (done) return; order = shuffle(order); renderAll(); save(); }
    function deselect() { selected = []; renderAll(); }
    shuffleBtn.addEventListener("click", function (e) { e.preventDefault(); shuffleWords(); });
    deselectBtn.addEventListener("click", function (e) { e.preventDefault(); deselect(); });
    submitBtn.addEventListener("click", function (e) { e.preventDefault(); submit(); });

    // ---------- End ----------
    function resultGrid() {
      return guesses.map(function (g) { return g.levels.map(function (l) { return LEVEL_EMOJI[l]; }).join(""); }).join("\n");
    }
    function shareText(won) {
      var head = mode === "daily" ? "Groupings #" + puzzleNo : "Groupings (practice)";
      return head + (won ? " · " + mistakes + (mistakes === 1 ? " mistake" : " mistakes") : " · not today") + "\n" + resultGrid() + "\ngrowingmindsscience.com/arcade";
    }
    function finish(won, restored) {
      if (mode === "daily" && !restored) A.streak.mark(GAME_KEY, won ? "win" : "loss");
      if (!restored) {
        A.progress.record(GAME_KEY, { score: won ? (MAX_MISTAKES - mistakes + 1) : 0 });
        if (won) { synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.4); A.haptics.win(); } else { A.haptics.thump(); }
      }
      syncHud();
      var s = A.streak.get(GAME_KEY);
      var titles = ["Perfect.", "Great.", "Solid.", "Phew."];
      shell.prompt.show({
        kicker: mode === "daily" ? "Puzzle #" + puzzleNo : "Practice",
        title: won ? titles[Math.min(mistakes, 3)] : "Next time.",
        text: won ? "All four groups in " + guesses.length + " guesses." : "Four mistakes. The groups are shown behind this card.",
        board: function (m) {
          var dl = el("dl", "gms-arcade-summary");
          [["Played", s.played], ["Won", s.played ? Math.round(100 * s.won / s.played) + "%" : "0%"], ["Streak", s.current], ["Best streak", s.best]].forEach(function (row) { dl.appendChild(el("dt", null, row[0])); dl.appendChild(el("dd", null, String(row[1]))); });
          m.appendChild(dl);
          var pre = el("pre", "daily__share", resultGrid()); pre.setAttribute("aria-hidden", "true"); m.appendChild(pre);
          if (mode === "daily") m.appendChild(el("p", "daily__next", "A new puzzle arrives at midnight."));
        },
        actions: [
          { label: "Share result", primary: true, onClick: function () { A.share(shareText(won), { sheet: true }); shell.toast("Copied", 1200); } },
          { label: won || mode !== "daily" ? "Practice puzzle" : "See the groups", onClick: function () { shell.prompt.hide(); if (won || mode !== "daily") { order = []; setup("practice"); } board.focus({ preventScroll: true }); } },
          { label: "Back to arcade", onClick: function () { A.closeGame(); } }
        ]
      });
      A.announce(won ? "Solved with " + mistakes + " mistakes." : "Out of mistakes.");
    }

    function showStart() {
      var s = A.streak.get(GAME_KEY);
      var todayDone = A.streak.result(GAME_KEY) !== null;
      shell.prompt.show({
        kicker: "Groupings",
        title: todayDone ? "Today's puzzle is done" : "Sixteen words, four groups",
        text: "Pick four words that share something, then Submit. Four mistakes end the round. Groups run from plain to sneaky." + (s.current ? " Current streak: " + s.current + "." : ""),
        actions: [
          { label: todayDone ? "See today's result" : "Play today's puzzle", primary: true, onClick: function () { shell.prompt.hide(); order = []; setup("daily"); board.focus({ preventScroll: true }); } },
          { label: "Practice", onClick: function () { shell.prompt.hide(); order = []; setup("practice"); board.focus({ preventScroll: true }); } }
        ]
      });
    }

    function onKeydown(e) {
      if (!data || !puzzle) return;
      if (e.key === "Enter" && !shell.prompt.shown() && selected.length === 4 && e.target === board) { e.preventDefault(); submit(); }
      else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); deselect(); }
      else if ((e.key === "s" || e.key === "S") && !shell.prompt.shown()) { e.preventDefault(); shuffleWords(); }
    }

    A.debug("groups", {
      state: function () { return { id: puzzle && puzzle.id, solved: solved, guesses: guesses, mistakes: mistakes, done: done, mode: mode }; },
      pick: function (words) { selected = words.slice(0, 4); renderAll(); submit(); },
      solveGroup: function (level) { var g = puzzle.groups.filter(function (x) { return x.level === level; })[0]; if (g) { selected = g.words.slice(); renderAll(); submit(); } },
      miss: function () { var ws = remainingWords(); var pick = []; puzzle.groups.forEach(function (g) { if (solved.indexOf(g.level) === -1 && pick.length < 4) pick.push(g.words.filter(function (w) { return ws.indexOf(w) !== -1; })[0]); }); while (pick.length < 4) pick.push(ws[pick.length]); selected = pick; renderAll(); submit(); }
    });

    return {
      activate: function () {
        syncHud(); shell.hud.set("mode", "…");
        if (data) { showStart(); return; }
        shell.prompt.show({ kicker: "Groupings", title: "Fetching today's puzzle…", text: "" });
        A.loadJSON(DATA_URL, function (d) { data = d; showStart(); }, function () {
          shell.prompt.show({ kicker: "Groupings", title: "The puzzle did not load", text: "Check your connection and try again.", actions: [{ label: "Back to arcade", primary: true, onClick: function () { A.closeGame(); } }] });
        });
      },
      deactivate: function () { synth.close(); },
      onKeydown: onKeydown,
      onKeyup: function () {}
    };
  }

  A.ready(function () {
    A.defineGame("groups", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Groupings",
        tagline: "Four groups hide in sixteen words.",
        label: "Groupings puzzle",
        canvas: false,
        hud: [{ id: "mode", label: "Puzzle", value: "…" }, { id: "streak", label: "Streak", value: 0 }, { id: "best", label: "Best", value: 0 }],
        help: "Tap or Tab to four words · Enter submits · Backspace clears · S shuffles · M mutes · Esc closes"
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
