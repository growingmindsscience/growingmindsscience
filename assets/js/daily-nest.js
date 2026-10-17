/* Growing Minds Science — daily-nest.js
   "Letter Nest": seven letters in a hive, one in the centre that every word
   must use. Words are four letters or longer; a word that uses all seven is a
   pangram. One nest a day for everyone, walked in order through
   /assets/data/arcade/nest.json (built by scripts/arcade/build-words.mjs),
   plus a practice mode. A DOM game on the arcade shell (no canvas).
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A || !A.makeShell) return;

  var GAME_KEY = "letter-nest";
  var DATA_URL = "/assets/data/arcade/nest.json";
  var el = A.el;
  // Rank thresholds as a fraction of the nest's maximum score.
  var RANKS = [["Beginner", 0], ["Good start", 0.02], ["Moving up", 0.05], ["Good", 0.08], ["Solid", 0.15], ["Nice", 0.25], ["Great", 0.4], ["Amazing", 0.5], ["Genius", 0.7]];

  function wordScore(w, letters) {
    if (w.length === 4) return 1;
    var pts = w.length;
    var seen = {}; var n = 0;
    for (var i = 0; i < w.length; i++) if (!seen[w[i]]) { seen[w[i]] = true; n++; }
    if (n === 7) pts += 7;
    return pts;
  }

  function createGame(shell) {
    var synth = A.makeSynth({ muteKey: "gms-nest-muted" });
    shell.bindSynth(synth);

    // ---------- DOM ----------
    var board = el("div", "gms-arcade-board daily daily-nest");
    board.tabIndex = 0; board.setAttribute("data-arcade-focus", ""); board.setAttribute("aria-label", "Letter Nest board");
    var meta = el("p", "daily__meta");
    var rank = el("div", "nest__rank");
    var rankName = el("strong", null, "Beginner"); var rankBar = el("div", "nest__rankbar"); var rankFill = el("span"); rankBar.appendChild(rankFill);
    var rankPts = el("span", "nest__pts", "0 pts");
    rank.appendChild(rankName); rank.appendChild(rankBar); rank.appendChild(rankPts);
    var input = el("div", "nest__input"); input.setAttribute("aria-live", "polite"); input.setAttribute("aria-label", "Your word");
    var hive = el("div", "nest__hive"); hive.setAttribute("aria-label", "Letters");
    var cells = [];
    for (var i = 0; i < 7; i++) {
      var c = el("button", "nest__cell" + (i === 0 ? " is-center" : ""), ""); c.type = "button"; c.setAttribute("data-pos", String(i));
      (function (c) { c.addEventListener("click", function (e) { e.preventDefault(); typeLetter(c.textContent.toLowerCase()); board.focus({ preventScroll: true }); }); })(c);
      hive.appendChild(c); cells.push(c);
    }
    var controls = el("div", "nest__controls");
    var delBtn = ctl("Delete"), shufBtn = ctl("Shuffle"), enterBtn = ctl("Enter", true);
    controls.appendChild(delBtn); controls.appendChild(shufBtn); controls.appendChild(enterBtn);
    var found = el("div", "nest__found"); found.setAttribute("aria-label", "Words found"); found.setAttribute("aria-live", "polite");
    board.appendChild(meta); board.appendChild(rank); board.appendChild(input); board.appendChild(hive); board.appendChild(controls); board.appendChild(found);
    shell.stage.appendChild(board);
    function ctl(label, primary) { var b = el("button", "groups__ctl" + (primary ? " is-primary" : ""), label); b.type = "button"; return b; }

    // ---------- State ----------
    var data = null, set = null, outer = [], current = "", foundWords = [], score = 0, maxScore = 0, mode = "daily", puzzleNo = 0, celebrated = false;

    function setForToday() { var n = data.sets.length; return data.sets[((A.dayNumber() - 1) % n + n) % n]; }
    function setup(newMode) {
      mode = newMode; current = ""; foundWords = []; score = 0; celebrated = false;
      if (mode === "daily") {
        set = setForToday(); puzzleNo = A.dayNumber();
        var saved = A.daily.load(GAME_KEY);
        if (saved && saved.letters === set.letters) { foundWords = saved.found || []; }
        meta.textContent = "Nest #" + puzzleNo + " · " + set.words.length + " words to find";
      } else {
        var today = setForToday();
        var pool = data.sets.filter(function (s) { return s !== today; });
        set = pool[Math.floor(Math.random() * pool.length)];
        meta.textContent = "Practice · " + set.words.length + " words to find";
      }
      outer = set.letters.split("").filter(function (ch) { return ch !== set.center; });
      maxScore = 0; set.words.forEach(function (w) { maxScore += wordScore(w, set.letters); });
      foundWords.forEach(function (w) { score += wordScore(w, set.letters); });
      shell.hud.set("mode", mode === "daily" ? "#" + puzzleNo : "Practice");
      shuffleOuter(false);
      renderAll();
      syncHud();
    }
    function syncHud() { var s = A.streak.get(GAME_KEY); shell.hud.set("streak", s.current); shell.hud.set("found", foundWords.length + "/" + (set ? set.words.length : 0)); }
    function save() { if (mode === "daily") A.daily.save(GAME_KEY, { letters: set.letters, found: foundWords }); }

    function rankFor(pts) {
      var r = RANKS[0];
      for (var i = 0; i < RANKS.length; i++) if (pts >= Math.round(RANKS[i][1] * maxScore)) r = RANKS[i];
      return r;
    }
    function renderAll() {
      cells[0].textContent = set.center.toUpperCase();
      for (var i = 0; i < 6; i++) cells[i + 1].textContent = outer[i].toUpperCase();
      renderInput();
      var r = rankFor(score);
      rankName.textContent = r[0];
      rankFill.style.width = Math.min(100, Math.round(100 * score / Math.max(1, Math.round(RANKS[RANKS.length - 1][1] * maxScore)))) + "%";
      rankPts.textContent = score + (score === 1 ? " pt" : " pts");
      found.textContent = "";
      if (!foundWords.length) { found.appendChild(el("span", null, "Your words will appear here.")); }
      foundWords.slice().sort().forEach(function (w) { found.appendChild(el("span", set.pangrams.indexOf(w) !== -1 ? "is-pangram" : null, w)); });
      shell.hud.set("score", score);
    }
    function renderInput() {
      input.textContent = "";
      current.split("").forEach(function (ch) { input.appendChild(el("span", ch === set.center ? "is-center" : null, ch.toUpperCase())); });
      input.appendChild(el("span", "nest__caret"));
    }

    // ---------- Play ----------
    function typeLetter(ch) {
      if (!set || set.letters.indexOf(ch) === -1 || current.length >= 19) return;
      current += ch; renderInput();
      synth.ensure(); synth.beep(500, 520, 0.03, "triangle", 0.1);
    }
    function del() { if (current.length) { current = current.slice(0, -1); renderInput(); } }
    function shuffleOuter(sound) {
      for (var i = outer.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = outer[i]; outer[i] = outer[j]; outer[j] = t; }
      for (var k = 0; k < 6; k++) cells[k + 1].textContent = outer[k].toUpperCase();
      if (sound) { synth.ensure(); synth.beep(380, 440, 0.05, "triangle", 0.12); }
    }
    function reject(msg) { shell.toast(msg, 1100); A.announce(msg); synth.ensure(); synth.beep(220, 190, 0.07, "square", 0.14); current = ""; renderInput(); }
    function submit() {
      if (!current) return;
      var w = current;
      if (w.length < 4) { reject("Too short"); return; }
      if (w.indexOf(set.center) === -1) { reject("Missing the centre letter"); return; }
      if (foundWords.indexOf(w) !== -1) { reject("Already found"); return; }
      if (set.words.indexOf(w) === -1) { reject("Not in the word list"); return; }
      var pts = wordScore(w, set.letters);
      var pangram = set.pangrams.indexOf(w) !== -1;
      foundWords.push(w); score += pts; current = "";
      var before = rankFor(score - pts)[0], after = rankFor(score)[0];
      renderAll(); syncHud(); save();
      synth.ensure();
      if (pangram) { synth.arp([523, 659, 784, 1046, 1318], 0.06, 0.16, "triangle", 0.4); A.haptics.win(); shell.toast("Pangram! +" + pts, 1600); }
      else { synth.arp([660, 880], 0.05, 0.1, "triangle", 0.3); A.haptics.pop(); shell.toast((pts >= 7 ? "Lovely! +" : pts >= 5 ? "Nice! +" : "+") + pts, 1000); }
      A.announce(w + ", " + pts + " points." + (pangram ? " Pangram." : "") + (after !== before ? " Rank: " + after + "." : ""));
      if (after !== before && after === "Genius" && !celebrated) { celebrated = true; if (mode === "daily") A.streak.mark(GAME_KEY, "win"); syncHud(); finish(false); }
      else if (foundWords.length === set.words.length) { if (mode === "daily") A.streak.mark(GAME_KEY, "win"); finish(true); }
    }
    delBtn.addEventListener("click", function (e) { e.preventDefault(); del(); board.focus({ preventScroll: true }); });
    shufBtn.addEventListener("click", function (e) { e.preventDefault(); shuffleOuter(true); board.focus({ preventScroll: true }); });
    enterBtn.addEventListener("click", function (e) { e.preventDefault(); submit(); board.focus({ preventScroll: true }); });

    function shareText() {
      var r = rankFor(score)[0];
      return (mode === "daily" ? "Letter Nest #" + puzzleNo : "Letter Nest (practice)") + " · " + r + "\n" + foundWords.length + " words · " + score + " points" + (foundWords.some(function (w) { return set.pangrams.indexOf(w) !== -1; }) ? " · pangram ✦" : "") + "\ngrowingmindsscience.com/arcade";
    }
    function finish(all) {
      A.progress.record(GAME_KEY, { score: score });
      var s = A.streak.get(GAME_KEY);
      shell.prompt.show({
        kicker: mode === "daily" ? "Nest #" + puzzleNo : "Practice",
        title: all ? "Every word found." : "Genius.",
        text: all ? "All " + set.words.length + " words, " + score + " points." : score + " points so far. There are " + (set.words.length - foundWords.length) + " more words if you want them.",
        board: function (m) {
          var dl = el("dl", "gms-arcade-summary");
          [["Words", foundWords.length + " of " + set.words.length], ["Points", score], ["Days at Genius", s.won], ["Streak", s.current]].forEach(function (row) { dl.appendChild(el("dt", null, row[0])); dl.appendChild(el("dd", null, String(row[1]))); });
          m.appendChild(dl);
        },
        actions: [
          { label: "Share result", primary: true, onClick: function () { A.share(shareText(), { sheet: true }); shell.toast("Copied", 1200); } },
          { label: all ? "Practice nest" : "Keep going", onClick: function () { shell.prompt.hide(); if (all) setup("practice"); board.focus({ preventScroll: true }); } },
          { label: "Back to arcade", onClick: function () { A.closeGame(); } }
        ]
      });
    }
    function showEnd() { // the player asked to see the summary mid-game
      var s = A.streak.get(GAME_KEY);
      shell.prompt.show({
        kicker: mode === "daily" ? "Nest #" + puzzleNo : "Practice", title: rankFor(score)[0] + ".", text: foundWords.length + " words, " + score + " points. Genius is " + Math.round(RANKS[RANKS.length - 1][1] * maxScore) + ".",
        board: function (m) { var dl = el("dl", "gms-arcade-summary"); [["Streak", s.current], ["Best", s.best]].forEach(function (row) { dl.appendChild(el("dt", null, row[0])); dl.appendChild(el("dd", null, String(row[1]))); }); m.appendChild(dl); },
        actions: [{ label: "Keep going", primary: true, onClick: function () { shell.prompt.hide(); board.focus({ preventScroll: true }); } }, { label: "Share so far", onClick: function () { A.share(shareText(), { sheet: true }); shell.toast("Copied", 1200); } }, { label: "Back to arcade", onClick: function () { A.closeGame(); } }]
      });
    }

    function showStart() {
      var s = A.streak.get(GAME_KEY);
      shell.prompt.show({
        kicker: "Letter Nest",
        title: "How many words can you make?",
        text: "Words need four letters or more and must use the centre letter. Letters can repeat. A word that uses all seven is a pangram and scores extra." + (s.current ? " Current streak: " + s.current + "." : ""),
        actions: [
          { label: "Today's nest", primary: true, onClick: function () { shell.prompt.hide(); setup("daily"); board.focus({ preventScroll: true }); } },
          { label: "Practice", onClick: function () { shell.prompt.hide(); setup("practice"); board.focus({ preventScroll: true }); } }
        ]
      });
    }
    shell.onTap(function (id) { if (id === "summary") showEnd(); });

    function onKeydown(e) {
      if (!data || !set || shell.prompt.shown()) return;
      var k = e.key;
      if (k === "Enter") { e.preventDefault(); submit(); }
      else if (k === "Backspace") { e.preventDefault(); del(); }
      else if (k === " ") { e.preventDefault(); shuffleOuter(true); }
      else if (/^[a-zA-Z]$/.test(k) && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); typeLetter(k.toLowerCase()); }
    }

    A.debug("nest", {
      state: function () { return { letters: set && set.letters, center: set && set.center, found: foundWords, score: score, max: maxScore, mode: mode }; },
      type: function (w) { current = w.toLowerCase(); submit(); },
      findAll: function (n) { var words = set.words.filter(function (w) { return foundWords.indexOf(w) === -1; }).slice(0, n || 999); words.forEach(function (w) { current = w; submit(); }); },
      summary: showEnd
    });

    return {
      activate: function () {
        if (set) syncHud(); shell.hud.set("mode", "…");
        if (data) { showStart(); return; }
        shell.prompt.show({ kicker: "Letter Nest", title: "Fetching today's nest…", text: "" });
        A.loadJSON(DATA_URL, function (d) { data = d; showStart(); }, function () {
          shell.prompt.show({ kicker: "Letter Nest", title: "The nest did not load", text: "Check your connection and try again.", actions: [{ label: "Back to arcade", primary: true, onClick: function () { A.closeGame(); } }] });
        });
      },
      deactivate: function () { synth.close(); },
      onKeydown: onKeydown,
      onKeyup: function () {}
    };
  }

  A.ready(function () {
    A.defineGame("nest", function () {
      var shell = A.makeShell({
        key: GAME_KEY,
        title: "Letter Nest",
        tagline: "Seven letters. One in the middle. Make words.",
        label: "Letter Nest puzzle",
        canvas: false,
        hud: [{ id: "mode", label: "Nest", value: "…" }, { id: "score", label: "Points", value: 0 }, { id: "found", label: "Found", value: "0/0" }, { id: "streak", label: "Streak", value: 0 }],
        help: "Type letters and press Enter · Backspace deletes · Space shuffles · M mutes · Esc closes",
        touch: [{ id: "summary", label: "Summary", aria: "Show the summary", tap: true }]
      });
      var game = createGame(shell);
      return shell.mount(game);
    });
  });
})();
