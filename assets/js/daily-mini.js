/* Growing Minds Science — daily-mini.js
   "Little Crossword": a five-by-five crossword with short, plain clues. One
   grid a day for everyone, walked in order through
   /assets/data/arcade/mini.json, plus a practice mode. A DOM game on the
   arcade shell: tap a square (tap again to switch direction), type letters,
   arrow keys move, Check marks wrong letters, Reveal fills the word.
   Numbering is derived from the grid, so the data holds only the grid and
   the clues keyed by number and direction.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "little-crossword";
  var DATA_URL = "/assets/data/arcade/mini.json";
  var el = A.el;

  // Standard numbering: a square starts an across entry when it is white and
  // the square to its left is black or the edge (and the run is 2+ long), same
  // for down.
  function analyze(grid) {
    var n = grid.length, numbers = [], entries = { A: [], D: [] }, k = 0;
    for (var r = 0; r < n; r++) { numbers.push([]); for (var c = 0; c < n; c++) numbers[r].push(0); }
    for (var r2 = 0; r2 < n; r2++) {
      for (var c2 = 0; c2 < n; c2++) {
        if (grid[r2][c2] === "#") continue;
        var startsA = (c2 === 0 || grid[r2][c2 - 1] === "#") && c2 + 1 < n && grid[r2][c2 + 1] !== "#";
        var startsD = (r2 === 0 || grid[r2 - 1][c2] === "#") && r2 + 1 < n && grid[r2 + 1][c2] !== "#";
        if (startsA || startsD) {
          k++; numbers[r2][c2] = k;
          if (startsA) { var len = 0; while (c2 + len < n && grid[r2][c2 + len] !== "#") len++; entries.A.push({ n: k, r: r2, c: c2, len: len, dir: "A" }); }
          if (startsD) { var len2 = 0; while (r2 + len2 < n && grid[r2 + len2][c2] !== "#") len2++; entries.D.push({ n: k, r: r2, c: c2, len: len2, dir: "D" }); }
        }
      }
    }
    return { numbers: numbers, entries: entries };
  }
  function cellsOf(e) { var out = []; for (var i = 0; i < e.len; i++) out.push(e.dir === "A" ? [e.r, e.c + i] : [e.r + i, e.c]); return out; }

  function createGame(shell) {
    var synth = A.makeSynth({ muteKey: "gms-mini-muted" });
    shell.bindSynth(synth);

    var board = el("div", "gms-arcade-board daily daily-mini");
    board.tabIndex = 0; board.setAttribute("data-arcade-focus", ""); board.setAttribute("aria-label", "Little Crossword board");
    var meta = el("p", "daily__meta");
    var clueBar = el("div", "mini__clue"); clueBar.setAttribute("aria-live", "polite");
    var gridEl = el("div", "mini__grid"); gridEl.setAttribute("role", "grid"); gridEl.setAttribute("aria-label", "Crossword grid");
    var lists = el("div", "mini__lists");
    var acrossList = el("ol", "mini__list"), downList = el("ol", "mini__list");
    var aWrap = el("div", "mini__listwrap"), dWrap = el("div", "mini__listwrap");
    aWrap.appendChild(el("h3", "mini__listhead", "Across")); aWrap.appendChild(acrossList);
    dWrap.appendChild(el("h3", "mini__listhead", "Down")); dWrap.appendChild(downList);
    lists.appendChild(aWrap); lists.appendChild(dWrap);
    var tools = el("div", "mini__tools");
    var checkBtn = tool("Check"), revealBtn = tool("Reveal word"), clearBtn = tool("Clear");
    tools.appendChild(checkBtn); tools.appendChild(revealBtn); tools.appendChild(clearBtn);
    var kb = el("div", "five__kb mini__kb");
    ["qwertyuiop", "asdfghjkl", "zxcvbnm"].forEach(function (rowStr, i) {
      var krow = el("div", "five__kbrow");
      rowStr.split("").forEach(function (ch) { krow.appendChild(key(ch.toUpperCase(), ch)); });
      if (i === 2) krow.appendChild(key("⌫", "back", "Backspace"));
      kb.appendChild(krow);
    });
    function key(label, k, aria) { var b = el("button", "five__key" + (k === "back" ? " is-wide" : ""), label); b.type = "button"; b.setAttribute("data-key", k); if (aria) b.setAttribute("aria-label", aria); b.addEventListener("click", function (e) { e.preventDefault(); if (k === "back") backspace(); else type(k); board.focus({ preventScroll: true }); }); return b; }
    function tool(label) { var b = el("button", "groups__ctl", label); b.type = "button"; return b; }
    board.appendChild(meta); board.appendChild(clueBar); board.appendChild(gridEl); board.appendChild(tools); board.appendChild(lists); board.appendChild(kb);
    shell.stage.appendChild(board);
    if (!A.isCoarsePointer()) kb.hidden = true;

    // ---------- State ----------
    var data = null, puzzle = null, info = null, n = 5, letters = [], sel = null, dir = "A", done = false, mode = "daily", puzzleNo = 0, cellEls = [], startAt = 0, elapsed = 0, timer = null, checks = 0, reveals = 0, wrongMarks = {};

    function puzzleForToday() { var m = data.puzzles.length; return data.puzzles[((A.dayNumber() - 1) % m + m) % m]; }
    function setup(newMode) {
      mode = newMode; done = false; checks = 0; reveals = 0; wrongMarks = {}; elapsed = 0; dir = "A";
      if (mode === "daily") { puzzle = puzzleForToday(); puzzleNo = A.dayNumber(); }
      else { var today = puzzleForToday(); var pool = data.puzzles.filter(function (p) { return p !== today; }); puzzle = pool[Math.floor(Math.random() * pool.length)]; }
      n = puzzle.grid.length;
      info = analyze(puzzle.grid);
      letters = puzzle.grid.map(function (row) { return row.split("").map(function (ch) { return ch === "#" ? "#" : ""; }); });
      if (mode === "daily") {
        var saved = A.daily.load(GAME_KEY);
        if (saved && saved.id === puzzle.id) { letters = saved.letters || letters; done = !!saved.done; elapsed = saved.elapsed || 0; reveals = saved.reveals || 0; }
      }
      meta.textContent = (mode === "daily" ? "Puzzle #" + puzzleNo : "Practice") + (puzzle.by ? " · by " + puzzle.by : "");
      shell.hud.set("mode", mode === "daily" ? "#" + puzzleNo : "Practice");
      buildGrid(); buildLists();
      var first = info.entries.A[0]; sel = [first.r, first.c];
      startAt = Date.now() - elapsed * 1000;
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(tickTimer, 1000);
      renderAll(); syncHud();
      if (done) finish(true);
    }
    function tickTimer() { if (done) return; elapsed = Math.floor((Date.now() - startAt) / 1000); shell.hud.set("time", fmt(elapsed)); }
    function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return m + ":" + (x < 10 ? "0" : "") + x; }
    function syncHud() { var s = A.streak.get(GAME_KEY); shell.hud.set("streak", s.current); shell.hud.set("time", fmt(elapsed)); }
    function save() { if (mode === "daily") A.daily.save(GAME_KEY, { id: puzzle.id, letters: letters, done: done, elapsed: elapsed, reveals: reveals }); }

    function buildGrid() {
      gridEl.textContent = ""; cellEls = [];
      gridEl.style.setProperty("--n", n);
      for (var r = 0; r < n; r++) {
        var rowEl = el("div", "mini__row"); rowEl.setAttribute("role", "row"); cellEls.push([]);
        for (var c = 0; c < n; c++) {
          var black = puzzle.grid[r][c] === "#";
          var cell = el(black ? "div" : "button", "mini__cell" + (black ? " is-black" : ""));
          if (!black) { cell.type = "button"; cell.setAttribute("role", "gridcell"); (function (r, c) { cell.addEventListener("click", function (e) { e.preventDefault(); if (sel && sel[0] === r && sel[1] === c) dir = dir === "A" ? "D" : "A"; else { sel = [r, c]; if (!entryAt(r, c, dir)) dir = dir === "A" ? "D" : "A"; } renderAll(); board.focus({ preventScroll: true }); }); })(r, c); }
          if (!black && info.numbers[r][c]) cell.appendChild(el("span", "mini__num", String(info.numbers[r][c])));
          cell.appendChild(el("span", "mini__letter", ""));
          rowEl.appendChild(cell); cellEls[r].push(cell);
        }
        gridEl.appendChild(rowEl);
      }
    }
    function clueText(e) { return (puzzle.clues[e.dir] && puzzle.clues[e.dir][String(e.n)]) || ""; }
    function buildLists() {
      acrossList.textContent = ""; downList.textContent = "";
      info.entries.A.forEach(function (e) { acrossList.appendChild(clueItem(e)); });
      info.entries.D.forEach(function (e) { downList.appendChild(clueItem(e)); });
    }
    function clueItem(e) {
      var li = el("li", "mini__clueitem"); li.setAttribute("data-entry", e.dir + e.n);
      var b = el("button", "mini__cluebtn"); b.type = "button";
      b.appendChild(el("span", "mini__cluenum", String(e.n))); b.appendChild(el("span", "mini__cluetext", clueText(e)));
      b.addEventListener("click", function (ev) { ev.preventDefault(); sel = [e.r, e.c]; dir = e.dir; renderAll(); board.focus({ preventScroll: true }); });
      li.appendChild(b); return li;
    }
    function entryAt(r, c, d) {
      var list = info.entries[d];
      for (var i = 0; i < list.length; i++) { var cs = cellsOf(list[i]); for (var k = 0; k < cs.length; k++) if (cs[k][0] === r && cs[k][1] === c) return list[i]; }
      return null;
    }
    function entryDone(e) { return cellsOf(e).every(function (p) { return letters[p[0]][p[1]]; }); }

    function renderAll() {
      var cur = sel ? entryAt(sel[0], sel[1], dir) : null;
      var curCells = cur ? cellsOf(cur).map(function (p) { return p.join(","); }) : [];
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        var cell = cellEls[r][c]; if (puzzle.grid[r][c] === "#") continue;
        cell.classList.toggle("is-selected", !!sel && sel[0] === r && sel[1] === c);
        cell.classList.toggle("is-word", curCells.indexOf(r + "," + c) !== -1);
        cell.classList.toggle("is-wrong", !!wrongMarks[r + "," + c]);
        cell.lastChild.textContent = letters[r][c] ? letters[r][c].toUpperCase() : "";
        var num = info.numbers[r][c];
        cell.setAttribute("aria-label", (num ? num + ". " : "") + "Row " + (r + 1) + " column " + (c + 1) + (letters[r][c] ? ", " + letters[r][c].toUpperCase() : ", empty"));
      }
      if (cur) {
        clueBar.textContent = ""; clueBar.appendChild(el("strong", null, cur.n + (cur.dir === "A" ? " Across" : " Down") + " ")); clueBar.appendChild(document.createTextNode(clueText(cur)));
      }
      [].forEach.call(lists.querySelectorAll(".mini__clueitem"), function (li) {
        var id = li.getAttribute("data-entry");
        var e = (id[0] === "A" ? info.entries.A : info.entries.D).filter(function (x) { return x.dir + x.n === id; })[0];
        li.classList.toggle("is-current", !!cur && cur.dir + cur.n === id);
        li.classList.toggle("is-done", !!e && entryDone(e));
      });
    }

    // ---------- Input ----------
    function advance(step) {
      var cur = sel ? entryAt(sel[0], sel[1], dir) : null; if (!cur) return;
      var cs = cellsOf(cur); var idx = -1;
      for (var i = 0; i < cs.length; i++) if (cs[i][0] === sel[0] && cs[i][1] === sel[1]) idx = i;
      var next = idx + step;
      if (next >= 0 && next < cs.length) { sel = cs[next]; return; }
      // next entry in the list, wrapping to the other direction
      if (step > 0) {
        var list = info.entries[dir]; var pos = list.indexOf(cur);
        if (pos + 1 < list.length) { var e = list[pos + 1]; sel = [e.r, e.c]; }
        else { dir = dir === "A" ? "D" : "A"; var e2 = info.entries[dir][0]; sel = [e2.r, e2.c]; }
      }
    }
    function type(ch) {
      if (done || !sel) return;
      letters[sel[0]][sel[1]] = ch; delete wrongMarks[sel[0] + "," + sel[1]];
      synth.ensure(); synth.beep(520, 540, 0.03, "triangle", 0.1);
      // skip ahead to the next empty cell of the entry when possible
      var cur = entryAt(sel[0], sel[1], dir), cs = cellsOf(cur), idx = 0;
      for (var i = 0; i < cs.length; i++) if (cs[i][0] === sel[0] && cs[i][1] === sel[1]) idx = i;
      var moved = false;
      for (var j = idx + 1; j < cs.length; j++) if (!letters[cs[j][0]][cs[j][1]]) { sel = cs[j]; moved = true; break; }
      if (!moved) advance(1);
      renderAll(); save(); checkSolved();
    }
    function backspace() {
      if (done || !sel) return;
      if (letters[sel[0]][sel[1]]) { letters[sel[0]][sel[1]] = ""; delete wrongMarks[sel[0] + "," + sel[1]]; }
      else { advance(-1); letters[sel[0]][sel[1]] = ""; }
      renderAll(); save();
    }
    function moveSel(dr, dc) {
      if (!sel) return;
      var r = sel[0], c = sel[1];
      for (var k = 0; k < n; k++) { r = (r + dr + n) % n; c = (c + dc + n) % n; if (puzzle.grid[r][c] !== "#") { sel = [r, c]; break; } }
      var want = dr ? "D" : "A"; if (entryAt(sel[0], sel[1], want)) dir = want;
      renderAll();
    }
    function check() {
      if (done) return; checks++;
      var wrong = 0; wrongMarks = {};
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (letters[r][c] && letters[r][c] !== "#" && letters[r][c] !== puzzle.solution[r][c]) { wrong++; wrongMarks[r + "," + c] = true; }
      renderAll();
      shell.toast(wrong ? wrong + (wrong === 1 ? " letter is" : " letters are") + " off" : "All correct so far", 1300);
      A.announce(wrong ? wrong + " letters are wrong." : "All correct so far.");
    }
    function reveal() {
      if (done || !sel) return;
      var cur = entryAt(sel[0], sel[1], dir); if (!cur) return;
      cellsOf(cur).forEach(function (p) { letters[p[0]][p[1]] = puzzle.solution[p[0]][p[1]]; delete wrongMarks[p[0] + "," + p[1]]; });
      reveals++; renderAll(); save(); checkSolved();
    }
    function clearAll() { if (done) return; letters = puzzle.grid.map(function (row) { return row.split("").map(function (ch) { return ch === "#" ? "#" : ""; }); }); wrongMarks = {}; renderAll(); save(); }
    function checkSolved() {
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (puzzle.grid[r][c] !== "#" && letters[r][c] !== puzzle.solution[r][c]) return;
      done = true; save();
      if (mode === "daily") A.streak.mark(GAME_KEY, "win");
      A.progress.record(GAME_KEY, { score: Math.max(0, 600 - elapsed - reveals * 60) });
      synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.4); A.haptics.win();
      finish(false);
    }
    checkBtn.addEventListener("click", function (e) { e.preventDefault(); check(); board.focus({ preventScroll: true }); });
    revealBtn.addEventListener("click", function (e) { e.preventDefault(); reveal(); board.focus({ preventScroll: true }); });
    clearBtn.addEventListener("click", function (e) { e.preventDefault(); clearAll(); board.focus({ preventScroll: true }); });

    function shareText() { return (mode === "daily" ? "Little Crossword #" + puzzleNo : "Little Crossword (practice)") + " · " + fmt(elapsed) + (reveals ? " · " + reveals + " revealed" : " · nothing revealed") + "\ngrowingmindsscience.com/arcade"; }
    function finish(restored) {
      if (timer) { window.clearInterval(timer); timer = null; }
      syncHud();
      var s = A.streak.get(GAME_KEY);
      shell.prompt.show({
        kicker: mode === "daily" ? "Puzzle #" + puzzleNo : "Practice",
        title: reveals ? "Filled." : "Solved clean.",
        text: "Done in " + fmt(elapsed) + (reveals ? " with " + reveals + (reveals === 1 ? " word revealed." : " words revealed.") : "."),
        board: function (m) {
          var dl = el("gms-arcade-summary" ? "dl" : "dl", "gms-arcade-summary");
          [["Time", fmt(elapsed)], ["Revealed", reveals], ["Checks", checks], ["Streak", s.current], ["Best streak", s.best]].forEach(function (row) { dl.appendChild(el("dt", null, row[0])); dl.appendChild(el("dd", null, String(row[1]))); });
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
        kicker: "Little Crossword",
        title: todayDone ? "Today's grid is done" : "Five across, five down",
        text: "Tap a square and type. Tap it again to switch between across and down. Check marks what's off; Reveal fills the word you're on." + (s.current ? " Current streak: " + s.current + "." : ""),
        actions: [
          { label: todayDone ? "See today's grid" : "Play today's grid", primary: true, onClick: function () { shell.prompt.hide(); setup("daily"); board.focus({ preventScroll: true }); } },
          { label: "Practice", onClick: function () { shell.prompt.hide(); setup("practice"); board.focus({ preventScroll: true }); } }
        ]
      });
    }

    function onKeydown(e) {
      if (!puzzle || shell.prompt.shown()) return;
      var k = e.key;
      if (/^[a-zA-Z]$/.test(k) && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); type(k.toLowerCase()); }
      else if (k === "Backspace" || k === "Delete") { e.preventDefault(); backspace(); }
      else if (k === "ArrowLeft") { e.preventDefault(); moveSel(0, -1); }
      else if (k === "ArrowRight") { e.preventDefault(); moveSel(0, 1); }
      else if (k === "ArrowUp") { e.preventDefault(); moveSel(-1, 0); }
      else if (k === "ArrowDown") { e.preventDefault(); moveSel(1, 0); }
      else if (k === "Tab") { e.preventDefault(); advance(1); renderAll(); }
      else if (k === " " || k === "Enter") { e.preventDefault(); dir = dir === "A" ? "D" : "A"; if (!entryAt(sel[0], sel[1], dir)) dir = dir === "A" ? "D" : "A"; renderAll(); }
    }

    A.debug("mini", {
      state: function () { return { id: puzzle && puzzle.id, letters: letters, done: done, mode: mode }; },
      solve: function () { for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (puzzle.grid[r][c] !== "#") letters[r][c] = puzzle.solution[r][c]; renderAll(); checkSolved(); },
      typeWord: function (w) { w.split("").forEach(function (ch) { type(ch); }); },
      wrong: function () { for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (puzzle.grid[r][c] !== "#") { letters[r][c] = puzzle.solution[r][c] === "a" ? "b" : "a"; renderAll(); return; } }
    });

    return {
      activate: function () {
        syncHud(); shell.hud.set("mode", "…");
        if (data) { showStart(); return; }
        shell.prompt.show({ kicker: "Little Crossword", title: "Fetching today's grid…", text: "" });
        A.loadJSON(DATA_URL, function (d) {
          // derive solutions from the grid letters: data grids hold the answer letters, "#" for black
          d.puzzles.forEach(function (p) { p.solution = p.grid.map(function (row) { return row.toLowerCase().split(""); }); p.grid = p.grid.map(function (row) { return row.replace(/[^#]/g, "."); }); });
          data = d; showStart();
        }, function () {
          shell.prompt.show({ kicker: "Little Crossword", title: "The grid did not load", text: "Check your connection and try again.", actions: [{ label: "Back to arcade", primary: true, onClick: function () { A.closeGame(); } }] });
        });
      },
      deactivate: function () { if (timer) { window.clearInterval(timer); timer = null; } synth.close(); },
      onKeydown: onKeydown,
      onKeyup: function () {}
    };
  }

  A.ready(function () {
    A.defineGame("mini", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Little Crossword",
        tagline: "Five by five. Plain clues.",
        label: "Little Crossword puzzle",
        canvas: false,
        hud: [{ id: "mode", label: "Puzzle", value: "…" }, { id: "time", label: "Time", value: "0:00" }, { id: "streak", label: "Streak", value: 0 }],
        help: "Type to fill · arrows move · Space switches direction · Tab next clue · M mutes · Esc closes"
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
