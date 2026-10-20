/* Growing Minds Science — daily-five.js
   "Five Letters": six guesses at a five-letter word. One puzzle a day for
   everyone (seeded from the date through GMSArcade.dailySeed), plus a
   practice mode with a fresh word each time. A DOM game on the arcade shell
   (no canvas): tiles, an on-screen keyboard, a results card with streaks and
   a shareable grid. Color is never the only cue: placed letters carry a tick,
   present letters a dot. Word data: /assets/data/arcade/five.json (built by
   scripts/arcade/build-words.mjs).
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "five-letters";
  var DATA_URL = "/assets/data/arcade/five.json";
  var ROWS = 6, COLS = 5;
  var KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  var el = A.el;

  function createGame(shell) {
    var reduce = A.prefersReducedMotion();
    var synth = A.makeSynth({ muteKey: "gms-five-muted" });
    shell.bindSynth(synth);

    // ---------- DOM ----------
    var board = el("div", "gms-arcade-board daily daily-five");
    board.tabIndex = 0; board.setAttribute("data-arcade-focus", ""); board.setAttribute("aria-label", "Five Letters board");
    var meta = el("p", "daily__meta");
    var grid = el("div", "five__grid"); grid.setAttribute("role", "grid"); grid.setAttribute("aria-label", "Guesses");
    var tiles = [];
    for (var r = 0; r < ROWS; r++) {
      var row = el("div", "five__row"); row.setAttribute("role", "row");
      tiles.push([]);
      for (var c = 0; c < COLS; c++) {
        var t = el("div", "five__tile"); t.setAttribute("role", "gridcell"); t.setAttribute("aria-label", "empty");
        row.appendChild(t); tiles[r].push(t);
      }
      grid.appendChild(row);
    }
    var kb = el("div", "five__kb"); kb.setAttribute("aria-label", "Keyboard");
    var keyEls = {};
    KEY_ROWS.forEach(function (rowStr, i) {
      var krow = el("div", "five__kbrow");
      if (i === 2) krow.appendChild(keyButton("Enter", "enter", "five__key is-wide"));
      rowStr.split("").forEach(function (ch) { krow.appendChild(keyButton(ch.toUpperCase(), ch, "five__key")); });
      if (i === 2) krow.appendChild(keyButton("⌫", "back", "five__key is-wide", "Backspace"));
      kb.appendChild(krow);
    });
    function keyButton(label, key, cls, aria) {
      var b = el("button", cls, label); b.type = "button"; b.setAttribute("data-key", key); if (aria) b.setAttribute("aria-label", aria);
      b.addEventListener("click", function (e) { e.preventDefault(); press(key); board.focus({ preventScroll: true }); });
      keyEls[key] = b; return b;
    }
    board.appendChild(meta); board.appendChild(grid); board.appendChild(kb);
    shell.stage.appendChild(board);

    // ---------- State ----------
    var data = null, answer = "", guesses = [], current = "", done = false, mode = "daily", puzzleNo = 0, busy = false;

    function wordAllowed(w) {
      var s = data.guesses, i = s.indexOf(w);
      while (i !== -1 && i % 5 !== 0) i = s.indexOf(w, i + 1);
      return i !== -1;
    }
    function evaluate(guess, ans) {
      var res = ["a", "a", "a", "a", "a"], left = {};
      for (var i = 0; i < 5; i++) { if (guess[i] === ans[i]) res[i] = "c"; else left[ans[i]] = (left[ans[i]] || 0) + 1; }
      for (var j = 0; j < 5; j++) { if (res[j] === "c") continue; if (left[guess[j]] > 0) { res[j] = "p"; left[guess[j]]--; } }
      return res;
    }
    function keyState(letter) {
      var best = "";
      var rank = { c: 3, p: 2, a: 1, "": 0 };
      guesses.forEach(function (g) {
        var ev = evaluate(g, answer);
        for (var i = 0; i < 5; i++) if (g[i] === letter && rank[ev[i]] > rank[best]) best = ev[i];
      });
      return best;
    }

    function setup(newMode) {
      mode = newMode;
      guesses = []; current = ""; done = false; busy = false;
      if (mode === "daily") {
        var rnd = A.rng(A.dailySeed("five"));
        answer = data.answers[rnd.int(data.answers.length)];
        puzzleNo = A.dayNumber();
        var saved = A.daily.load(GAME_KEY);
        if (saved && saved.answer === answer) { guesses = saved.guesses || []; done = !!saved.done; }
        meta.textContent = "Puzzle #" + puzzleNo + " · one a day, the same for everyone";
      } else {
        answer = data.answers[Math.floor(Math.random() * data.answers.length)];
        meta.textContent = "Practice · a fresh word each time";
      }
      shell.hud.set("mode", mode === "daily" ? "#" + puzzleNo : "Practice");
      renderAll();
      syncHud();
      if (done) { finish(guesses[guesses.length - 1] === answer, true); }
    }

    function syncHud() {
      var s = A.streak.get(GAME_KEY);
      shell.hud.set("streak", s.current);
      shell.hud.set("best", s.best);
    }

    function renderAll() {
      for (var r = 0; r < ROWS; r++) {
        var g = guesses[r];
        var ev = g ? evaluate(g, answer) : null;
        for (var c = 0; c < COLS; c++) {
          var t = tiles[r][c];
          t.className = "five__tile";
          var ch = g ? g[c] : (r === guesses.length ? (current[c] || "") : "");
          t.textContent = ch ? ch.toUpperCase() : "";
          if (ch && !g) t.classList.add("is-filled");
          if (ev) t.classList.add(ev[c] === "c" ? "is-correct" : ev[c] === "p" ? "is-present" : "is-absent");
          t.setAttribute("aria-label", ch ? ch.toUpperCase() + (ev ? (ev[c] === "c" ? ", correct spot" : ev[c] === "p" ? ", in the word" : ", not in the word") : "") : "empty");
        }
      }
      Object.keys(keyEls).forEach(function (k) {
        if (k.length !== 1) return;
        var st = keyState(k);
        keyEls[k].className = "five__key" + (st === "c" ? " is-correct" : st === "p" ? " is-present" : st === "a" ? " is-absent" : "");
      });
    }

    function press(key) {
      if (!data || done || busy) return;
      if (key === "enter") { submit(); return; }
      if (key === "back") { if (current.length) { current = current.slice(0, -1); renderRow(); } return; }
      if (/^[a-z]$/.test(key) && current.length < COLS) {
        current += key; renderRow();
        synth.ensure(); synth.beep(520, 520, 0.03, "triangle", 0.12);
      }
    }
    function renderRow() {
      var r = guesses.length; if (r >= ROWS) return;
      for (var c = 0; c < COLS; c++) {
        var t = tiles[r][c]; var ch = current[c] || "";
        t.textContent = ch.toUpperCase(); t.className = "five__tile" + (ch ? " is-filled" : "");
        if (ch && !reduce) { t.classList.remove("is-pop"); void t.offsetWidth; t.classList.add("is-pop"); }
      }
    }
    function shakeRow(msg) {
      var r = guesses.length;
      var row = tiles[r][0].parentNode;
      row.classList.remove("is-shake"); void row.offsetWidth; row.classList.add("is-shake");
      shell.toast(msg, 1200); A.announce(msg);
      synth.ensure(); synth.beep(220, 180, 0.08, "square", 0.18);
    }
    function submit() {
      if (current.length < COLS) { shakeRow("Not enough letters"); return; }
      if (!wordAllowed(current)) { shakeRow("Not in the word list"); return; }
      var guess = current; current = "";
      guesses.push(guess);
      var ev = evaluate(guess, answer);
      var r = guesses.length - 1;
      busy = true;
      var delay = reduce ? 0 : 260;
      for (var c = 0; c < COLS; c++) {
        (function (c) {
          window.setTimeout(function () {
            var t = tiles[r][c];
            t.classList.add("is-reveal");
            t.classList.add(ev[c] === "c" ? "is-correct" : ev[c] === "p" ? "is-present" : "is-absent");
            if (!synth.isMuted()) synth.beep(ev[c] === "c" ? 740 : ev[c] === "p" ? 560 : 300, ev[c] === "c" ? 900 : ev[c] === "p" ? 600 : 260, 0.05, "triangle", 0.14);
          }, c * delay);
        })(c);
      }
      window.setTimeout(function () {
        busy = false;
        renderAll();
        var won = guess === answer;
        var spoken = ev.map(function (e, i) { return guess[i].toUpperCase() + (e === "c" ? " correct" : e === "p" ? " present" : " absent"); }).join(", ");
        if (mode === "daily") A.daily.save(GAME_KEY, { answer: answer, guesses: guesses, done: won || guesses.length >= ROWS });
        if (won || guesses.length >= ROWS) { done = true; finish(won, false); }
        else A.announce("Row " + guesses.length + ": " + spoken);
      }, COLS * delay + 40);
    }

    function resultGrid() {
      return guesses.map(function (g) { return evaluate(g, answer).map(function (e) { return e === "c" ? "🟩" : e === "p" ? "🟨" : "⬜"; }).join(""); }).join("\n");
    }
    function shareText(won) {
      var head = mode === "daily" ? "Five Letters #" + puzzleNo : "Five Letters (practice)";
      return head + " " + (won ? guesses.length : "X") + "/6\n" + resultGrid() + "\ngrowingmindsscience.com/arcade";
    }
    function finish(won, restored) {
      if (mode === "daily" && !restored) A.streak.mark(GAME_KEY, won ? "win" : "loss");
      if (!restored) {
        A.progress.record(GAME_KEY, { score: won ? (7 - guesses.length) : 0 });
        if (won) { synth.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.4); A.haptics.win(); }
        else { synth.beep(220, 120, 0.3, "sawtooth", 0.25); A.haptics.thump(); }
      }
      syncHud();
      var s = A.streak.get(GAME_KEY);
      var titles = ["Genius", "Magnificent", "Impressive", "Splendid", "Great", "Phew"];
      var kicker = mode === "daily" ? "Puzzle #" + puzzleNo : "Practice";
      shell.prompt.show({
        kicker: kicker,
        title: won ? titles[guesses.length - 1] + "." : "The word was " + answer.toUpperCase() + ".",
        text: won ? "Solved in " + guesses.length + (guesses.length === 1 ? " guess." : " guesses.") : "Six guesses, no luck today. Tomorrow's word is new.",
        board: function (m) {
          var dl = el("dl", "gms-arcade-summary");
          [["Played", s.played], ["Won", s.played ? Math.round(100 * s.won / s.played) + "%" : "0%"], ["Streak", s.current], ["Best streak", s.best]].forEach(function (row) {
            dl.appendChild(el("dt", null, row[0])); dl.appendChild(el("dd", null, String(row[1])));
          });
          m.appendChild(dl);
          var pre = el("pre", "daily__share", resultGrid()); pre.setAttribute("aria-hidden", "true"); m.appendChild(pre);
          if (mode === "daily") { var next = el("p", "daily__next", "A new puzzle arrives at midnight."); m.appendChild(next); }
        },
        actions: [
          { label: "Share result", primary: true, onClick: function () { A.share(shareText(won), { sheet: true }); shell.toast("Copied", 1200); } },
          { label: "Practice word", onClick: function () { shell.prompt.hide(); setup("practice"); board.focus({ preventScroll: true }); } },
          { label: "Back to arcade", onClick: function () { A.closeGame(); } }
        ]
      });
      A.announce(won ? "Solved in " + guesses.length + " guesses." : "Out of guesses. The word was " + answer + ".");
    }

    function showStart() {
      var s = A.streak.get(GAME_KEY);
      var todayDone = A.streak.result(GAME_KEY) !== null;
      shell.prompt.show({
        kicker: "Five Letters",
        title: todayDone ? "Today's puzzle is done" : "Guess the word in six tries",
        text: "Each guess must be a real five-letter word. Green with a tick means the letter is in the right spot; gold with a dot means it is in the word, somewhere else." + (s.current ? " Current streak: " + s.current + "." : ""),
        actions: [
          { label: todayDone ? "See today's result" : "Play today's puzzle", primary: true, onClick: function () { shell.prompt.hide(); setup("daily"); board.focus({ preventScroll: true }); } },
          { label: "Practice", onClick: function () { shell.prompt.hide(); setup("practice"); board.focus({ preventScroll: true }); } }
        ]
      });
    }

    function onKeydown(e) {
      if (!data) return;
      var k = e.key;
      if (k === "Enter") { e.preventDefault(); if (shell.prompt.shown()) return; press("enter"); }
      else if (k === "Backspace") { e.preventDefault(); press("back"); }
      else if (/^[a-zA-Z]$/.test(k) && !e.metaKey && !e.ctrlKey && !e.altKey) { if (shell.prompt.shown()) return; e.preventDefault(); press(k.toLowerCase()); }
    }

    A.debug("five", {
      state: function () { return { answer: answer, guesses: guesses, done: done, mode: mode }; },
      type: function (w) { current = ""; w.toLowerCase().split("").forEach(function (ch) { press(ch); }); press("enter"); },
      solve: function () { current = ""; answer.split("").forEach(function (ch) { press(ch); }); press("enter"); },
      answer: function () { return answer; }
    });

    return {
      activate: function () {
        syncHud();
        shell.hud.set("mode", "…");
        if (data) { showStart(); return; }
        shell.prompt.show({ kicker: "Five Letters", title: "Fetching the word list…", text: "" });
        A.loadJSON(DATA_URL, function (d) { data = d; showStart(); }, function () {
          shell.prompt.show({ kicker: "Five Letters", title: "The word list did not load", text: "Check your connection and try again.", actions: [{ label: "Back to arcade", primary: true, onClick: function () { A.closeGame(); } }] });
        });
      },
      deactivate: function () { synth.close(); },
      onKeydown: onKeydown,
      onKeyup: function () {}
    };
  }

  A.ready(function () {
    A.defineGame("five", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Five Letters",
        tagline: "One word a day. Six guesses.",
        label: "Five Letters puzzle",
        canvas: false,
        hud: [{ id: "mode", label: "Puzzle", value: "…" }, { id: "streak", label: "Streak", value: 0 }, { id: "best", label: "Best", value: 0 }],
        help: "Type a word and press Enter · Backspace removes a letter · M mutes · Esc closes"
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
