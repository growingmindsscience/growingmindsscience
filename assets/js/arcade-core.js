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

  // ======================================================================
  //  Shared "juice" toolkit — modern game-feel primitives the games opt
  //  into at their own trigger points. Primitives, not policies: core owns
  //  the how (crisp shake, hit-stop, bloom, punchy synth, combo math), each
  //  game owns the when + the theming. All are additive and reduced-motion
  //  aware. Keeps the six games feeling like one family.
  // ======================================================================

  // ---------- Camera: trauma-based screen shake + hit-stop ----------
  // shake(t) accumulates trauma 0..1; offset() returns an INTEGER logical-pixel
  // {x,y} (quadratic falloff — the detail that makes it feel good) to pass to
  // ctx.translate AFTER setTransform(backingScale,...) so pixels never fuzz.
  // freeze(frames) is hit-stop: the loop skips world ticks while frozen but
  // keeps rendering. Shake is suppressed under reduced-motion; hit-stop is not
  // motion (it's the absence of it) so it stays — the cheapest way to keep
  // "weight" for reduced-motion players.
  function makeCamera(opts) {
    opts = opts || {};
    var maxPx = opts.maxPx == null ? 4 : opts.maxPx;
    var decay = opts.decay == null ? 0.05 : opts.decay;
    var reduceMotion = opts.reduce != null ? opts.reduce : prefersReducedMotion();
    var trauma = 0, freezeFrames = 0;
    return {
      shake: function (t) { trauma = Math.min(1, trauma + (t || 0)); },
      setTrauma: function (t) { trauma = Math.max(trauma, Math.min(1, t || 0)); },
      freeze: function (frames) { if ((frames || 0) > freezeFrames) freezeFrames = frames; },
      frozen: function () { return freezeFrames > 0; },
      trauma: function () { return trauma; },
      tick: function (dt) {
        if (freezeFrames > 0) freezeFrames = Math.max(0, freezeFrames - dt);
        if (trauma > 0) trauma = Math.max(0, trauma - decay * dt);
      },
      offset: function () {
        if (reduceMotion || trauma <= 0) return { x: 0, y: 0 };
        var amt = trauma * trauma * maxPx;
        return {
          x: Math.round((Math.random() * 2 - 1) * amt),
          y: Math.round((Math.random() * 2 - 1) * amt)
        };
      }
    };
  }

  // ---------- Pixel glow: fake bloom that stays crisp ----------
  // Concentric translucent AXIS-ALIGNED squares (never shadowBlur / blurred
  // circles — those smear the grid). Uses normal source-over so it reads as a
  // soft colored halo on the warm cream background and can never blow out to
  // white. Alpha is clamped so bloom can't wash out the chunky-pixel identity.
  function pixelGlow(ctx, x, y, r, color, alpha) {
    var base = alpha == null ? 0.16 : alpha;
    ctx.save();
    ctx.fillStyle = color;
    var layers = [[r * 1.9, base * 0.7], [r * 1.25, base * 1.0], [r * 0.7, base * 1.3]];
    for (var i = 0; i < layers.length; i++) {
      ctx.globalAlpha = Math.min(0.5, layers[i][1]);
      var rr = layers[i][0];
      ctx.fillRect(Math.round(x - rr), Math.round(y - rr), Math.round(rr * 2), Math.round(rr * 2));
    }
    ctx.restore();
  }

  // ---------- Synth: richer, non-clipping Web Audio kit ----------
  // Superset of the old per-game beep(): same signature, plus filtered
  // noise bursts (punchy impacts) and arpeggios (musical stingers), a
  // compressor so layered SFX don't clip, and split sfx/music buses. Owns
  // mute persistence. Each game makes its own instance (own AudioContext)
  // and closes it on teardown.
  function makeSynth(opts) {
    opts = opts || {};
    var muteKey = opts.muteKey;
    var muted;
    try { muted = !!(muteKey && window.localStorage.getItem(muteKey) === "1"); } catch (e) { muted = false; }
    var actx = null, master = null, sfxGain = null, musicGain = null, comp = null, noiseBuf = null;

    function ensure() {
      if (muted) return;
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
        comp = actx.createDynamicsCompressor();
        master = actx.createGain(); master.gain.value = 1.0;
        sfxGain = actx.createGain(); sfxGain.gain.value = 0.1;
        musicGain = actx.createGain(); musicGain.gain.value = 0.05;
        sfxGain.connect(comp); musicGain.connect(comp);
        comp.connect(master); master.connect(actx.destination);
      }
      if (actx.state === "suspended") actx.resume();
    }
    function noiseBuffer() {
      if (noiseBuf || !actx) return noiseBuf;
      var len = Math.floor(actx.sampleRate * 0.4);
      noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return noiseBuf;
    }
    function beep(f0, f1, dur, type, vol) {
      if (muted || !actx) return;
      var t = actx.currentTime;
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.6, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + dur + 0.02);
    }
    // Filtered noise burst with a downward lowpass sweep — thumps, explosions.
    function noise(dur, f, vol, q) {
      if (muted || !actx) return;
      var buf = noiseBuffer(); if (!buf) return;
      var t = actx.currentTime;
      var src = actx.createBufferSource(); src.buffer = buf;
      var flt = actx.createBiquadFilter(); flt.type = "lowpass";
      flt.frequency.setValueAtTime(f || 1200, t);
      flt.frequency.exponentialRampToValueAtTime(Math.max(60, (f || 1200) * 0.25), t + dur);
      if (q) flt.Q.value = q;
      var g = actx.createGain();
      g.gain.setValueAtTime(vol || 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(flt); flt.connect(g); g.connect(sfxGain);
      src.start(t); src.stop(t + dur + 0.02);
    }
    // Quick sequence of notes — celebratory stingers (wave clear, bloom, etc.).
    function arp(freqs, spacing, dur, type, vol) {
      if (muted || !actx || !freqs || !freqs.length) return;
      spacing = spacing || 0.06; dur = dur || 0.14;
      for (var i = 0; i < freqs.length; i++) {
        var t = actx.currentTime + i * spacing;
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = type || "triangle";
        o.frequency.setValueAtTime(freqs[i], t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.4, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(sfxGain);
        o.start(t); o.stop(t + dur + 0.02);
      }
    }
    return {
      ensure: ensure,
      beep: beep,
      noise: noise,
      arp: arp,
      isMuted: function () { return muted; },
      toggleMute: function () {
        muted = !muted;
        try { if (muteKey) window.localStorage.setItem(muteKey, muted ? "1" : "0"); } catch (e) {}
        if (!muted) ensure();
        return muted;
      },
      setMuted: function (m) { muted = !!m; if (!muted) ensure(); },
      close: function () { if (actx) { try { actx.close(); } catch (e) {} actx = null; noiseBuf = null; } }
    };
  }

  // ---------- Combo: chain / multiplier tracker ----------
  // hit() extends the chain and bumps the multiplier if you're inside the
  // window; tick(dt) drains it; best() is the longest chain (for end screens).
  // Core owns the math so every game's combo feels identical; each game names
  // its own noun ("Curiosity", "Flow", ...).
  function makeCombo(opts) {
    opts = opts || {};
    var windowFrames = opts.window || 110;
    var maxMult = opts.max || 5;
    var count = 0, mult = 1, timer = 0, best = 0;
    return {
      hit: function () {
        mult = timer > 0 ? Math.min(maxMult, mult + 1) : 1;
        count += 1;
        if (count > best) best = count;
        timer = windowFrames;
        return mult;
      },
      tick: function (dt) { if (timer > 0) { timer -= dt; if (timer <= 0) { mult = 1; count = 0; } } },
      // Soft reset (default) drops the live chain but keeps best() — a mid-run
      // slip shouldn't erase the run's record. Pass hard=true at the start of a
      // NEW run to also zero best().
      reset: function (hard) { mult = 1; count = 0; timer = 0; if (hard) best = 0; },
      active: function () { return timer > 0; },
      mult: function () { return mult; },
      count: function () { return count; },
      best: function () { return best; },
      frac: function () { return windowFrames > 0 ? Math.max(0, Math.min(1, timer / windowFrames)) : 0; }
    };
  }

  window.GMSArcade = {
    ns: NS,
    ready: ready,
    prefersReducedMotion: prefersReducedMotion,
    tearPageAway: tearPageAway,
    leaderboard: leaderboard,
    mountInitialsEntry: mountInitialsEntry,
    renderLeaderboard: renderLeaderboard,
    // Shared juice toolkit
    makeCamera: makeCamera,
    pixelGlow: pixelGlow,
    makeSynth: makeSynth,
    makeCombo: makeCombo,
  };
})();
