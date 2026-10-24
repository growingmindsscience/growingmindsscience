/* Growing Minds Science — daily-six.js
   "Six Sudoku": a 6 by 6 sudoku with 2 by 3 boxes. Digits 1 to 6 once per
   row, column and box. The daily grid is generated from the date seed
   (GMSArcade.dailySeed) and checked for a unique solution, so everyone gets
   the same puzzle without any data file. Practice makes a fresh one. A DOM
   game on the arcade shell: tap a cell, type or tap a digit, pencil marks
   with a toggle, a check that marks conflicts, a timer for the share text.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "six-sudoku";
  var N = 6, BOX_R = 2, BOX_C = 3;
  var el = A.el;

  // ---------- Generator ----------
  function boxOf(r, c) { return Math.floor(r / BOX_R) * (N / BOX_C) + Math.floor(c / BOX_C); }
  function canPlace(g, r, c, v) {
    for (var i = 0; i < N; i++) { if (g[r][i] === v || g[i][c] === v) return false; }
    var br = Math.floor(r / BOX_R) * BOX_R, bc = Math.floor(c / BOX_C) * BOX_C;
    for (var y = br; y < br + BOX_R; y++) for (var x = bc; x < bc + BOX_C; x++) if (g[y][x] === v) return false;
    return true;
  }
  function fullGrid(rnd) {
    var g = []; for (var r = 0; r < N; r++) { g.push([]); for (var c = 0; c < N; c++) g[r].push(0); }
    function fill(i) {
      if (i === N * N) return true;
      var r = Math.floor(i / N), c = i % N;
      var vals = rnd.shuffle([1, 2, 3, 4, 5, 6]);
      for (var k = 0; k < vals.length; k++) { if (canPlace(g, r, c, vals[k])) { g[r][c] = vals[k]; if (fill(i + 1)) return true; g[r][c] = 0; } }
      return false;
    }
    fill(0);
    return g;
  }
  // Counts solutions up to `limit`.
  function countSolutions(g, limit) {
    var count = 0;
    function solve() {
      if (count >= limit) return;
      var best = null, bestOpts = null;
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        if (g[r][c]) continue;
        var opts = [];
        for (var v = 1; v <= N; v++) if (canPlace(g, r, c, v)) opts.push(v);
        if (!opts.length) return;
        if (!best || opts.length < bestOpts.length) { best = [r, c]; bestOpts = opts; }
      }
      if (!best) { count++; return; }
      for (var k = 0; k < bestOpts.length; k++) { g[best[0]][best[1]] = bestOpts[k]; solve(); g[best[0]][best[1]] = 0; if (count >= limit) return; }
    }
    solve();
    return count;
  }
  function copy(g) { return g.map(function (row) { return row.slice(); }); }
  // Remove cells while the puzzle stays unique; `givens` is the target count.
  function makePuzzle(rnd, givens) {
    var solution = fullGrid(rnd);
    var puzzle = copy(solution);
    var cells = []; for (var i = 0; i < N * N; i++) cells.push(i);
    cells = rnd.shuffle(cells);
    var remaining = N * N;
    for (var k = 0; k < cells.length && remaining > givens; k++) {
      var r = Math.floor(cells[k] / N), c = cells[k] % N;
      var saved = puzzle[r][c]; puzzle[r][c] = 0;
      if (countSolutions(copy(puzzle), 2) !== 1) puzzle[r][c] = saved; else remaining--;
    }
    return { puzzle: puzzle, solution: solution, givens: remaining };
  }

  function createGame(shell) {
    var synth = A.makeSynth({ muteKey: "gms-six-muted" });
    shell.bindSynth(synth);

    // ---------- DOM ----------
    var board = el("div", "gms-arcade-board daily daily-six");
    board.tabIndex = 0; board.setAttribute("data-arcade-focus", ""); board.setAttribute("aria-label", "Six Sudoku board");
    var meta = el("p", "daily__meta");
    var gridEl = el("div", "six__grid"); gridEl.setAttribute("role", "grid"); gridEl.setAttribute("aria-label", "Sudoku grid");
    var cellEls = [];
    for (var r = 0; r < N; r++) {
      var rowEl = el("div", "six__row"); rowEl.setAttribute("role", "row");
      cellEls.push([]);
      for (var c = 0; c < N; c++) {
        var cell = el("button", "six__cell" + (c % BOX_C === BOX_C - 1 && c < N - 1 ? " is-box-right" : "") + (r % BOX_R === BOX_R - 1 && r < N - 1 ? " is-box-bottom" : ""));
        cell.type = "button"; cell.setAttribute("role", "gridcell"); cell.setAttribute("data-r", r); cell.setAttribute("data-c", c);
        (function (r, c) { cell.addEventListener("click", function (e) { e.preventDefault(); select(r, c); board.focus({ preventScroll: true }); }); })(r, c);
        rowEl.appendChild(cell); cellEls[r].push(cell);
      }
      gridEl.appendChild(rowEl);
    }
    var pad = el("div", "six__pad");
    var digitBtns = [];
    for (var d = 1; d <= N; d++) {
      var b = el("button", "six__digit", String(d)); b.type = "button"; b.setAttribute("aria-label", "Enter " + d);
      (function (d) { b.addEventListener("click", function (e) { e.preventDefault(); enter(d); board.focus({ preventScroll: true }); }); })(d);
      pad.appendChild(b); digitBtns.push(b);
    }
    var tools = el("div", "six__tools");
    var pencilBtn = tool("Pencil", "Toggle pencil marks"), eraseBtn = tool("Erase", "Clear the cell"), checkBtn = tool("Check", "Mark mistakes"), hintBtn = tool("Hint", "Fill the selected cell");
    pencilBtn.setAttribute("aria-pressed", "false");
    tools.appendChild(pencilBtn); tools.appendChild(eraseBtn); tools.appendChild(checkBtn); tools.appendChild(hintBtn);
    board.appendChild(meta); board.appendChild(gridEl); board.appendChild(pad); board.appendChild(tools);
    shell.stage.appendChild(board);
    function tool(label, aria) { var b = el("button", "groups__ctl", label); b.type = "button"; b.setAttribute("aria-label", aria); return b; }

    // ---------- State ----------
    var puzzle = null, solution = null, values = [], notes = [], fixed = [], sel = null, pencil = false, done = false, mode = "daily", puzzleNo = 0, hints = 0, startAt = 0, elapsed = 0, timer = null, checks = 0;

    function setup(newMode) {
      mode = newMode; sel = null; pencil = false; done = false; hints = 0; checks = 0; elapsed = 0;
      pencilBtn.setAttribute("aria-pressed", "false");
      var seed = mode === "daily" ? A.dailySeed("six") : (Math.random() * 4294967295) >>> 0;
      var made = makePuzzle(A.rng(seed), 14);
      puzzle = made.puzzle; solution = made.solution;
      values = copy(puzzle); notes = []; fixed = [];
      for (var r = 0; r < N; r++) { notes.push([]); fixed.push([]); for (var c = 0; c < N; c++) { notes[r].push([]); fixed[r].push(puzzle[r][c] !== 0); } }
      if (mode === "daily") {
        puzzleNo = A.dayNumber();
        var saved = A.daily.load(GAME_KEY);
        if (saved && saved.seed === seed) { values = saved.values || values; notes = saved.notes || notes; done = !!saved.done; elapsed = saved.elapsed || 0; hints = saved.hints || 0; }
        meta.textContent = "Puzzle #" + puzzleNo + " · " + made.givens + " givens";
      } else {
        meta.textContent = "Practice · " + made.givens + " givens";
      }
      shell.hud.set("mode", mode === "daily" ? "#" + puzzleNo : "Practice");
      startAt = Date.now() - elapsed * 1000;
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(tickTimer, 1000);
      renderAll();
      syncHud();
      if (done) finish(true);
    }
    function tickTimer() { if (done) return; elapsed = Math.floor((Date.now() - startAt) / 1000); shell.hud.set("time", fmt(elapsed)); }
    function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return m + ":" + (x < 10 ? "0" : "") + x; }
    function syncHud() { var s = A.streak.get(GAME_KEY); shell.hud.set("streak", s.current); shell.hud.set("time", fmt(elapsed)); }
    function save() { if (mode === "daily") A.daily.save(GAME_KEY, { seed: A.dailySeed("six"), values: values, notes: notes, done: done, elapsed: elapsed, hints: hints }); }

    function conflicts(r, c) {
      var v = values[r][c]; if (!v) return false;
      for (var i = 0; i < N; i++) { if (i !== c && values[r][i] === v) return true; if (i !== r && values[i][c] === v) return true; }
      var br = Math.floor(r / BOX_R) * BOX_R, bc = Math.floor(c / BOX_C) * BOX_C;
      for (var y = br; y < br + BOX_R; y++) for (var x = bc; x < bc + BOX_C; x++) if ((y !== r || x !== c) && values[y][x] === v) return true;
      return false;
    }
    function renderAll() {
      var selV = sel ? values[sel[0]][sel[1]] : 0;
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        var cell = cellEls[r][c], v = values[r][c];
        cell.className = cell.className.replace(/ is-(fixed|selected|peer|same|conflict|wrong)/g, "");
        if (fixed[r][c]) cell.classList.add("is-fixed");
        if (sel && sel[0] === r && sel[1] === c) cell.classList.add("is-selected");
        else if (sel && (sel[0] === r || sel[1] === c || boxOf(r, c) === boxOf(sel[0], sel[1]))) cell.classList.add("is-peer");
        if (selV && v === selV && !(sel[0] === r && sel[1] === c)) cell.classList.add("is-same");
        if (v && conflicts(r, c)) cell.classList.add("is-conflict");
        if (cell.getAttribute("data-wrong") === "1") cell.classList.add("is-wrong");
        cell.textContent = "";
        if (v) { cell.appendChild(el("span", "six__value", String(v))); }
        else if (notes[r][c].length) {
          var nb = el("span", "six__notes");
          for (var d = 1; d <= N; d++) nb.appendChild(el("i", notes[r][c].indexOf(d) !== -1 ? "is-on" : null, notes[r][c].indexOf(d) !== -1 ? String(d) : ""));
          cell.appendChild(nb);
        }
        cell.setAttribute("aria-label", "Row " + (r + 1) + " column " + (c + 1) + (v ? ", " + v + (fixed[r][c] ? ", given" : "") : notes[r][c].length ? ", notes " + notes[r][c].join(" ") : ", empty"));
      }
      // digit pad: dim completed digits
      for (var d2 = 1; d2 <= N; d2++) {
        var count = 0; for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (values[y][x] === d2) count++;
        digitBtns[d2 - 1].classList.toggle("is-done", count >= N);
      }
    }
    function select(r, c) { if (done) return; sel = [r, c]; renderAll(); }
    function move(dr, dc) { if (!sel) { select(0, 0); return; } select((sel[0] + dr + N) % N, (sel[1] + dc + N) % N); }
    function enter(d) {
      if (done || !sel) { if (!sel) shell.toast("Pick a cell first", 900); return; }
      var r = sel[0], c = sel[1];
      if (fixed[r][c]) { shell.toast("That one's a given", 900); return; }
      cellEls[r][c].removeAttribute("data-wrong");
      synth.ensure();
      if (pencil) {
        var i = notes[r][c].indexOf(d);
        if (i === -1) notes[r][c].push(d); else notes[r][c].splice(i, 1);
        values[r][c] = 0;
        synth.beep(440, 440, 0.03, "triangle", 0.1);
      } else {
        values[r][c] = values[r][c] === d ? 0 : d; notes[r][c] = [];
        synth.beep(520, 560, 0.04, "triangle", 0.14);
        // clear this digit from peers' notes
        for (var i2 = 0; i2 < N; i2++) { dropNote(r, i2, d); dropNote(i2, c, d); }
        var br = Math.floor(r / BOX_R) * BOX_R, bc = Math.floor(c / BOX_C) * BOX_C;
        for (var y = br; y < br + BOX_R; y++) for (var x = bc; x < bc + BOX_C; x++) dropNote(y, x, d);
      }
      renderAll(); save();
      checkSolved();
    }
    function dropNote(r, c, d) { var i = notes[r][c].indexOf(d); if (i !== -1) notes[r][c].splice(i, 1); }
    function erase() { if (done || !sel || fixed[sel[0]][sel[1]]) return; values[sel[0]][sel[1]] = 0; notes[sel[0]][sel[1]] = []; cellEls[sel[0]][sel[1]].removeAttribute("data-wrong"); renderAll(); save(); }
    function check() {
      if (done) return;
      checks++;
      var wrong = 0;
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        if (values[r][c] && values[r][c] !== solution[r][c]) { wrong++; cellEls[r][c].setAttribute("data-wrong", "1"); }
      }
      renderAll();
      shell.toast(wrong ? wrong + (wrong === 1 ? " cell is" : " cells are") + " off" : "Nothing wrong so far", 1300);
      A.announce(wrong ? wrong + " cells are wrong, marked in clay." : "No mistakes so far.");
    }
    function hint() {
      if (done) return;
      if (!sel || fixed[sel[0]][sel[1]]) {
        // pick the first empty cell
        for (var r = 0; r < N && !(sel && !fixed[sel[0]][sel[1]] && !values[sel[0]][sel[1]]); r++) for (var c = 0; c < N; c++) if (!values[r][c]) { sel = [r, c]; r = N; break; }
      }
      if (!sel) return;
      values[sel[0]][sel[1]] = solution[sel[0]][sel[1]]; notes[sel[0]][sel[1]] = []; hints++;
      cellEls[sel[0]][sel[1]].removeAttribute("data-wrong");
      synth.ensure(); synth.arp([392, 523], 0.05, 0.1, "triangle", 0.25);
      renderAll(); save(); checkSolved();
    }
    function checkSolved() {
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (values[r][c] !== solution[r][c]) return;
      done = true; save();
      if (mode === "daily") A.streak.mark(GAME_KEY, "win");
      A.progress.record(GAME_KEY, { score: Math.max(0, 1000 - elapsed - hints * 60) });
      synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.4); A.haptics.win();
      finish(false);
    }
    pencilBtn.addEventListener("click", function (e) { e.preventDefault(); pencil = !pencil; pencilBtn.setAttribute("aria-pressed", pencil ? "true" : "false"); shell.toast(pencil ? "Pencil on" : "Pencil off", 800); board.focus({ preventScroll: true }); });
    eraseBtn.addEventListener("click", function (e) { e.preventDefault(); erase(); board.focus({ preventScroll: true }); });
    checkBtn.addEventListener("click", function (e) { e.preventDefault(); check(); board.focus({ preventScroll: true }); });
    hintBtn.addEventListener("click", function (e) { e.preventDefault(); hint(); board.focus({ preventScroll: true }); });

    function shareText() {
      return (mode === "daily" ? "Six Sudoku #" + puzzleNo : "Six Sudoku (practice)") + " · " + fmt(elapsed) + (hints ? " · " + hints + (hints === 1 ? " hint" : " hints") : " · no hints") + "\nfromlittleonward.com/arcade";
    }
    function finish(restored) {
      if (timer) { window.clearInterval(timer); timer = null; }
      syncHud();
      var s = A.streak.get(GAME_KEY);
      shell.prompt.show({
        kicker: mode === "daily" ? "Puzzle #" + puzzleNo : "Practice",
        title: hints ? "Solved." : "Solved, no hints.",
        text: "Finished in " + fmt(elapsed) + (hints ? " with " + hints + (hints === 1 ? " hint." : " hints.") : "."),
        board: function (m) {
          var dl = el("dl", "gms-arcade-summary");
          [["Time", fmt(elapsed)], ["Hints", hints], ["Checks", checks], ["Streak", s.current], ["Best streak", s.best]].forEach(function (row) { dl.appendChild(el("dt", null, row[0])); dl.appendChild(el("dd", null, String(row[1]))); });
          m.appendChild(dl);
          if (mode === "daily") m.appendChild(el("p", "daily__next", "A new grid arrives at midnight."));
        },
        actions: [
          { label: "Share result", primary: true, onClick: function () { A.share(shareText(), { sheet: true }); shell.toast("Copied", 1200); } },
          { label: "Practice grid", onClick: function () { shell.prompt.hide(); setup("practice"); board.focus({ preventScroll: true }); } },
          { label: "Back to arcade", onClick: function () { A.closeGame(); } }
        ]
      });
      if (!restored) A.announce("Solved in " + fmt(elapsed) + ".");
    }
    function showStart() {
      var s = A.streak.get(GAME_KEY);
      var todayDone = A.streak.result(GAME_KEY) !== null;
      shell.prompt.show({
        kicker: "Six Sudoku",
        title: todayDone ? "Today's grid is done" : "Six digits, six rows, six boxes",
        text: "Every row, column and 2 by 3 box holds 1 to 6 once. Tap a cell, then a digit. Pencil marks for maybes; Check marks what's off." + (s.current ? " Current streak: " + s.current + "." : ""),
        actions: [
          { label: todayDone ? "See today's grid" : "Play today's grid", primary: true, onClick: function () { shell.prompt.hide(); setup("daily"); board.focus({ preventScroll: true }); } },
          { label: "Practice", onClick: function () { shell.prompt.hide(); setup("practice"); board.focus({ preventScroll: true }); } }
        ]
      });
    }

    function onKeydown(e) {
      if (!puzzle || shell.prompt.shown()) return;
      var k = e.key;
      if (/^[1-6]$/.test(k)) { e.preventDefault(); enter(Number(k)); }
      else if (k === "Backspace" || k === "Delete" || k === "0") { e.preventDefault(); erase(); }
      else if (k === "ArrowLeft") { e.preventDefault(); move(0, -1); }
      else if (k === "ArrowRight") { e.preventDefault(); move(0, 1); }
      else if (k === "ArrowUp") { e.preventDefault(); move(-1, 0); }
      else if (k === "ArrowDown") { e.preventDefault(); move(1, 0); }
      else if (k === "n" || k === "N" || k === "p" || k === "P") { e.preventDefault(); pencilBtn.click(); }
      else if (k === "c" || k === "C") { e.preventDefault(); check(); }
      else if (k === "h" || k === "H") { e.preventDefault(); hint(); }
    }

    A.debug("six", {
      state: function () { return { values: values, done: done, mode: mode, hints: hints }; },
      solution: function () { return solution; },
      solve: function (leave) { for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) values[r][c] = solution[r][c]; if (leave) { values[0][0] = fixed[0][0] ? values[0][0] : 0; } renderAll(); checkSolved(); },
      wrong: function () { for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!fixed[r][c]) { values[r][c] = (solution[r][c] % N) + 1; renderAll(); return; } }
    });

    return {
      activate: function () { syncHud(); shell.hud.set("mode", "…"); showStart(); },
      deactivate: function () { if (timer) { window.clearInterval(timer); timer = null; } synth.close(); },
      onKeydown: onKeydown,
      onKeyup: function () {}
    };
  }

  A.ready(function () {
    A.defineGame("six", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Six Sudoku",
        tagline: "A small grid, a clear head.",
        label: "Six Sudoku puzzle",
        canvas: false,
        hud: [{ id: "mode", label: "Puzzle", value: "…" }, { id: "time", label: "Time", value: "0:00" }, { id: "streak", label: "Streak", value: 0 }],
        help: "Arrows move · 1–6 enter · N pencil · C check · H hint · Backspace clears · M mutes · Esc closes"
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
