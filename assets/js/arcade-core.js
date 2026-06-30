/* Growing Minds Science — arcade-core.js
   Shared plumbing for the site's hidden 8-bit easter-egg games
   (Brain Sprint on /classes, GMS Invaders on /articles).

   Exposes a single global, window.GMSArcade, with:
     - tearPageAway(done)            tumble the page off-screen, then run done()
     - leaderboard                   local (localStorage) top-scores, per game key
     - mountInitialsEntry(...)       3-letter initials capture for a new high score
     - renderLeaderboard(...)        small ranked table of local top scores

   No external deps, no eval, no inline handlers — CSP-safe. Self-contained so
   each game file only worries about its own gameplay.
*/
(function () {
  "use strict";

  var NS = "gms-arcade";

  // ---------- Local leaderboard ----------
  // Stored as { "<gameKey>": [ { initials, score, at }, ... ] } under one key.
  var STORE_KEY = "gms-arcade-leaderboard";
  var MAX_ENTRIES = 5;

  function readStore() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (e) { return {}; }
  }
  function writeStore(store) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }
  function sanitizeInitials(value) {
    var s = String(value == null ? "" : value).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!s) s = "GMS";
    return s.slice(0, 3);
  }

  var leaderboard = {
    /** Top entries for a game, highest first. */
    top: function (gameKey, n) {
      var list = readStore()[gameKey] || [];
      return list.slice(0, n || MAX_ENTRIES);
    },
    /** Highest score recorded for a game (0 if none). */
    best: function (gameKey) {
      var list = readStore()[gameKey] || [];
      return list.length ? list[0].score : 0;
    },
    /** Would `score` earn a spot on the (full) board? */
    qualifies: function (gameKey, score) {
      if (!(score > 0)) return false;
      var list = readStore()[gameKey] || [];
      if (list.length < MAX_ENTRIES) return true;
      return score > list[list.length - 1].score;
    },
    /** Record a score. Returns the 1-based rank, or -1 if it didn't place. */
    submit: function (gameKey, score, initials) {
      score = Math.max(0, Math.floor(score || 0));
      var store = readStore();
      var list = store[gameKey] || [];
      var entry = { initials: sanitizeInitials(initials), score: score, at: Date.now() };
      list.push(entry);
      list.sort(function (a, b) { return b.score - a.score || a.at - b.at; });
      list = list.slice(0, MAX_ENTRIES);
      store[gameKey] = list;
      writeStore(store);
      var rank = list.indexOf(entry);
      return rank === -1 ? -1 : rank + 1;
    },
  };

  // ---------- Initials entry (new high score) ----------
  // Renders a tiny form into `mount`; calls onDone(rank, initials) once saved.
  function mountInitialsEntry(mount, opts) {
    opts = opts || {};
    var gameKey = opts.gameKey;
    var score = opts.score || 0;

    var form = document.createElement("form");
    form.className = NS + "-initials";
    form.setAttribute("aria-label", "Enter your initials for the leaderboard");

    var label = document.createElement("label");
    label.className = NS + "-initials__label";
    label.textContent = opts.title || "New high score! Enter your initials:";

    var row = document.createElement("div");
    row.className = NS + "-initials__row";

    var input = document.createElement("input");
    input.className = NS + "-initials__input";
    input.type = "text";
    input.inputMode = "latin";
    input.autocapitalize = "characters";
    input.spellcheck = false;
    input.maxLength = 3;
    input.value = (opts.defaultInitials || "AAA").slice(0, 3);
    input.setAttribute("aria-label", "Three-letter initials");

    var save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn--primary " + NS + "-initials__save";
    save.textContent = "Save";

    row.appendChild(input);
    row.appendChild(save);
    form.appendChild(label);
    form.appendChild(row);
    mount.appendChild(form);

    input.addEventListener("input", function () {
      var caret = input.selectionStart;
      input.value = sanitizeInitials(input.value);
      try { input.setSelectionRange(caret, caret); } catch (e) {}
    });

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      var initials = sanitizeInitials(input.value);
      var rank = leaderboard.submit(gameKey, score, initials);
      if (typeof opts.onDone === "function") opts.onDone(rank, initials);
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); finish(); });

    // Focus + select so a keyboard player can just type.
    window.requestAnimationFrame(function () {
      try { input.focus(); input.select(); } catch (e) {}
    });

    return {
      el: form,
      focus: function () { try { input.focus(); } catch (e) {} },
      submitNow: finish,
    };
  }

  // ---------- Leaderboard table ----------
  // Renders the current top scores into `mount`. highlightRank (1-based) is
  // emphasized when provided (e.g. the score the player just set).
  function renderLeaderboard(mount, gameKey, opts) {
    opts = opts || {};
    mount.textContent = "";
    var wrap = document.createElement("div");
    wrap.className = NS + "-lb";

    var heading = document.createElement("p");
    heading.className = NS + "-lb__title";
    heading.textContent = opts.title || "Local top scores";
    wrap.appendChild(heading);

    var list = leaderboard.top(gameKey, MAX_ENTRIES);
    var ol = document.createElement("ol");
    ol.className = NS + "-lb__list";

    if (!list.length) {
      var empty = document.createElement("li");
      empty.className = NS + "-lb__empty";
      empty.textContent = "No scores yet — be the first.";
      ol.appendChild(empty);
    } else {
      list.forEach(function (entry, i) {
        var li = document.createElement("li");
        li.className = NS + "-lb__row";
        if (opts.highlightRank && opts.highlightRank === i + 1) {
          li.className += " is-you";
        }
        var who = document.createElement("span");
        who.className = NS + "-lb__who";
        who.textContent = (i + 1) + ". " + entry.initials;
        var pts = document.createElement("span");
        pts.className = NS + "-lb__pts";
        pts.textContent = String(entry.score).padStart(5, "0");
        li.appendChild(who);
        li.appendChild(pts);
        ol.appendChild(li);
      });
    }
    wrap.appendChild(ol);
    mount.appendChild(wrap);
    return wrap;
  }

  // ---------- Page tear-away ----------
  // Tumble the page (header, main content, footer) off the bottom of the
  // screen with a staggered fall, then run `done`. Honors reduced motion.
  function prefersReducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  function tearPageAway(done) {
    var pieces = [];
    var header = document.querySelector(".site-header");
    if (header) pieces.push(header);
    var main = document.getElementById("main");
    if (main) [].forEach.call(main.children, function (c) { pieces.push(c); });
    var footer = document.querySelector(".site-footer");
    if (footer) pieces.push(footer);

    document.body.classList.add(NS + "-lock");

    if (prefersReducedMotion() || !pieces.length) {
      pieces.forEach(function (p) { p.style.visibility = "hidden"; });
      done();
      return;
    }

    var maxDelay = 0;
    pieces.forEach(function (p, i) {
      var delay = i * 70;
      maxDelay = Math.max(maxDelay, delay);
      var dx = (Math.random() * 220 - 110);
      var rot = (Math.random() * 60 - 30);
      p.classList.add(NS + "-falling");
      p.style.transition =
        "transform .95s cubic-bezier(.55,.06,.68,.19) " + delay + "ms, " +
        "opacity .95s ease-in " + delay + "ms";
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          p.style.transform =
            "translate(" + dx.toFixed(0) + "px, 125vh) rotate(" + rot.toFixed(0) + "deg)";
          p.style.opacity = "0";
        });
      });
    });
    window.setTimeout(done, maxDelay + 1000);
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  window.GMSArcade = {
    ns: NS,
    ready: ready,
    prefersReducedMotion: prefersReducedMotion,
    tearPageAway: tearPageAway,
    leaderboard: leaderboard,
    mountInitialsEntry: mountInitialsEntry,
    renderLeaderboard: renderLeaderboard,
  };
})();
