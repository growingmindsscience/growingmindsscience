/* Growing Minds Science — arcade-core.js
   Shared plumbing for the site's 8-bit arcade games, which live only on
   /arcade (each opens from its Play button; there are no triggers elsewhere).

   Exposes a single global, window.GMSArcade, with:
     - play(key, opener)             load a game on demand (JS + any game CSS), then open it
     - defineGame(key, build)        register a game's overlay with the open/close lifecycle
     - launch(opts) / closeGame()    tear the page away, make it inert, focus the dialog;
                                     close in place: teardown, restore page, scroll and focus
     - tearPageAway(done)            tumble the page off-screen, then run done()
     - announce(text)                polite live-region message
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

  // Returns what it changed (each piece's original inline styles) so
  // restorePage() can put the page back exactly when the game closes.
  function tearPageAway(done) {
    var pieces = [];
    var header = document.querySelector(".site-header");
    if (header) pieces.push(header);
    var main = document.getElementById("main");
    if (main) [].forEach.call(main.children, function (c) { pieces.push(c); });
    var footer = document.querySelector(".site-footer");
    if (footer) pieces.push(footer);

    var saved = pieces.map(function (p) {
      return {
        el: p,
        transition: p.style.transition,
        transform: p.style.transform,
        opacity: p.style.opacity,
        visibility: p.style.visibility
      };
    });

    document.body.classList.add(NS + "-lock");

    // Once the page is gone it is hidden outright, not just transparent.
    function finish() {
      pieces.forEach(function (p) { p.style.visibility = "hidden"; });
      done();
    }

    if (prefersReducedMotion() || !pieces.length) {
      finish();
      return saved;
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
    window.setTimeout(finish, maxDelay + 1000);
    return saved;
  }

  // Put the torn-away pieces back. With motion allowed they fade in briefly
  // in place (no fall-back-up); with reduced motion it is instant.
  function restorePage(saved) {
    var reduce = prefersReducedMotion();
    saved.forEach(function (s) {
      var p = s.el;
      p.classList.remove(NS + "-falling");
      p.style.transition = "none";
      p.style.transform = s.transform;
      p.style.visibility = s.visibility;
      if (reduce) { p.style.opacity = s.opacity; p.style.transition = s.transition; }
    });
    document.body.classList.remove(NS + "-lock");
    if (reduce || !saved.length) return;
    void document.body.offsetWidth; // commit the reset before fading back in
    saved.forEach(function (s, i) {
      s.el.style.transition = "opacity 260ms ease " + Math.min(i * 30, 150) + "ms";
      s.el.style.opacity = s.opacity;
    });
    window.setTimeout(function () {
      saved.forEach(function (s) { s.el.style.transition = s.transition; });
    }, 460);
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

  // ======================================================================
  // Mobile toolkit — shared capability layer for phones/tablets. Same
  // philosophy as the juice kit: primitives, not policies. Each game decides
  // when to buzz, when to pause, where its stick lives. Everything degrades
  // to a no-op where the platform lacks the API (iOS Safari has no vibrate;
  // old browsers have no wake lock) so games call these unconditionally.
  // ======================================================================

  // ---------- Pointer class ----------
  function isCoarsePointer() {
    try {
      if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
    } catch (e) {}
    return (navigator.maxTouchPoints | 0) > 0;
  }

  // ---------- Haptics ----------
  // Named patterns instead of raw ms so all six games speak the same physical
  // language: tick = steering/paddle, pop = pickup, thump = big hit,
  // crash = death, win = stinger. Persisted opt-out shared across games.
  var HAPTIC_KEY = "gms-arcade-haptics-off";
  var haptics = (function () {
    var off;
    try { off = window.localStorage.getItem(HAPTIC_KEY) === "1"; } catch (e) { off = false; }
    function buzz(pattern) {
      if (off) return;
      try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
    }
    return {
      supported: !!navigator.vibrate,
      tick: function () { buzz(8); },
      pop: function () { buzz(14); },
      thump: function () { buzz([10, 20, 26]); },
      crash: function () { buzz([0, 46, 34, 60]); },
      win: function () { buzz([0, 18, 26, 18, 26, 34]); },
      enabled: function () { return !off; },
      setEnabled: function (on) {
        off = !on;
        try {
          if (off) window.localStorage.setItem(HAPTIC_KEY, "1");
          else window.localStorage.removeItem(HAPTIC_KEY);
        } catch (e) {}
      }
    };
  })();

  // ---------- Screen wake lock ----------
  // Phones dim/sleep mid-run without this. `want` survives tab switches: the
  // visibilitychange hook re-acquires when the player comes back.
  function makeWakeLock() {
    var lock = null, want = false;
    function request() {
      if (!want || lock || !navigator.wakeLock || document.visibilityState !== "visible") return;
      navigator.wakeLock.request("screen").then(function (l) {
        lock = l;
        l.addEventListener("release", function () { lock = null; });
      }).catch(function () {});
    }
    function onVis() { request(); }
    return {
      acquire: function () {
        want = true;
        document.addEventListener("visibilitychange", onVis);
        request();
      },
      release: function () {
        want = false;
        document.removeEventListener("visibilitychange", onVis);
        if (lock) { try { lock.release(); } catch (e) {} lock = null; }
      }
    };
  }

  // ---------- Hidden-tab hook ----------
  // Games auto-pause with this instead of burning a run while the player
  // answers a text. Returns an unsubscribe.
  function onHidden(fn) {
    var h = function () { if (document.visibilityState === "hidden") fn(); };
    document.addEventListener("visibilitychange", h);
    return function () { document.removeEventListener("visibilitychange", h); };
  }

  // ---------- Viewport watcher ----------
  // window.resize alone misses iOS URL-bar collapse and orientation quirks;
  // visualViewport catches both. Debounced one frame. Returns unsubscribe.
  function onViewportChange(fn) {
    var raf = null;
    var h = function () {
      if (raf) return;
      raf = window.requestAnimationFrame(function () { raf = null; fn(); });
    };
    window.addEventListener("resize", h);
    window.addEventListener("orientationchange", h);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", h);
    return function () {
      window.removeEventListener("resize", h);
      window.removeEventListener("orientationchange", h);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", h);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }

  // ---------- Floating virtual stick ----------
  // Thumbstick that anchors wherever the finger lands in `zone` and follows
  // the drag: no fixed dead corner, works left- or right-handed. Pointer
  // events (capture) so it keeps tracking outside the zone. Visuals are two
  // DOM rings styled in arcade.css; games read vec()/mag()/angle() per frame.
  function makeStick(zone, opts) {
    opts = opts || {};
    var radius = opts.radius == null ? 48 : opts.radius;
    var dead = opts.dead == null ? 0.18 : opts.dead;
    var pid = null, ox = 0, oy = 0, vx = 0, vy = 0;

    var base = document.createElement("div");
    base.className = NS + "-stick";
    var nub = document.createElement("div");
    nub.className = NS + "-stick__nub";
    base.appendChild(nub);
    base.style.display = "none";
    zone.appendChild(base);

    function place(px, py) {
      base.style.left = px + "px";
      base.style.top = py + "px";
    }
    function setNub(dx, dy) {
      nub.style.transform = "translate(-50%, -50%) translate(" + dx.toFixed(0) + "px, " + dy.toFixed(0) + "px)";
    }
    function down(e) {
      if (pid != null) return;
      if (opts.accept && !opts.accept(e)) return;
      pid = e.pointerId;
      var r = zone.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      vx = 0; vy = 0;
      place(ox, oy); setNub(0, 0);
      base.style.display = "";
      try { zone.setPointerCapture(pid); } catch (err) {}
      e.preventDefault();
    }
    function move(e) {
      if (e.pointerId !== pid) return;
      var r = zone.getBoundingClientRect();
      var dx = (e.clientX - r.left) - ox, dy = (e.clientY - r.top) - oy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > radius) { dx = dx / d * radius; dy = dy / d * radius; d = radius; }
      setNub(dx, dy);
      var m = d / radius;
      if (m < dead) { vx = 0; vy = 0; }
      else {
        var scaled = (m - dead) / (1 - dead);
        vx = (dx / (d || 1)) * scaled;
        vy = (dy / (d || 1)) * scaled;
      }
      e.preventDefault();
    }
    function up(e) {
      if (e.pointerId !== pid) return;
      pid = null; vx = 0; vy = 0;
      base.style.display = "none";
    }
    zone.addEventListener("pointerdown", down);
    zone.addEventListener("pointermove", move);
    zone.addEventListener("pointerup", up);
    zone.addEventListener("pointercancel", up);

    return {
      active: function () { return pid != null; },
      vec: function () { return { x: vx, y: vy }; },
      mag: function () { return Math.min(1, Math.sqrt(vx * vx + vy * vy)); },
      angle: function () { return Math.atan2(vy, vx); },
      destroy: function () {
        zone.removeEventListener("pointerdown", down);
        zone.removeEventListener("pointermove", move);
        zone.removeEventListener("pointerup", up);
        zone.removeEventListener("pointercancel", up);
        if (base.parentNode) base.parentNode.removeChild(base);
      }
    };
  }

  // ======================================================================
  //  Game sessions: open in place, close in place
  //  One game at a time. launch() tears the page away, then makes everything
  //  behind the dialog inert, shows the game and moves focus into it.
  //  closeGame() runs the game's own teardown, puts the page back, restores
  //  the scroll position and returns focus to whatever opened the game. No
  //  reload, so the reader keeps their place.
  // ======================================================================
  var session = null;
  var live = null, liveTimer = null;
  var SR_ONLY = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;" +
    "overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0";

  // Polite live region (same idea as Echo's): game over, scores, load errors.
  function liveRegion() {
    if (live && live.parentNode) return live;
    live = document.createElement("div");
    live.className = NS + "-live";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.style.cssText = SR_ONLY;
    document.body.appendChild(live);
    return live;
  }
  function announce(text) {
    var el = liveRegion();
    el.textContent = "";
    if (liveTimer) window.clearTimeout(liveTimer);
    // Clear first, then set, so a repeated phrase is announced again.
    liveTimer = window.setTimeout(function () { el.textContent = text; }, 80);
  }

  function isShown(el) {
    return !!(el && el.getClientRects && el.getClientRects().length);
  }
  function canFocus(el) {
    return !!(el && typeof el.focus === "function" && document.documentElement.contains(el) &&
      !(el.closest && el.closest("[inert]")) && isShown(el));
  }
  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} }
  }
  function scrollBack(s) {
    try { window.scrollTo({ left: s.x, top: s.y, behavior: "instant" }); }
    catch (e) { window.scrollTo(s.x, s.y); }
  }

  // Everything on the page except the dialog (and the live region) goes
  // inert: no focus, no clicks, hidden from assistive tech.
  var supportsInert = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;
  function inertPage(s) {
    [].forEach.call(document.body.children, function (el) {
      if (el === live || el.contains(s.dialog) || el.hasAttribute("inert")) return;
      if (/^(SCRIPT|STYLE|LINK|TEMPLATE|NOSCRIPT)$/.test(el.tagName)) return;
      el.setAttribute("inert", "");
      s.inerted.push(el);
      if (!supportsInert && !el.hasAttribute("aria-hidden")) {
        el.setAttribute("aria-hidden", "true");
        s.ariaHidden.push(el);
      }
    });
  }
  function uninertPage(s) {
    s.inerted.forEach(function (el) { el.removeAttribute("inert"); });
    s.ariaHidden.forEach(function (el) { el.removeAttribute("aria-hidden"); });
    s.inerted = []; s.ariaHidden = [];
  }

  // The dialog's help line (controls) becomes its description.
  var helpSeq = 0;
  function describeDialog(dialog) {
    if (dialog.hasAttribute("aria-describedby")) return;
    var help = dialog.querySelector("." + NS + "-help");
    if (!help) return;
    if (!help.id) help.id = NS + "-help-" + (++helpSeq);
    dialog.setAttribute("aria-describedby", help.id);
  }

  // First sensible control: the prompt's Start/Play button when it shows,
  // else the play area.
  function initialFocus(s) {
    if (s.opts.focus) {
      var f = typeof s.opts.focus === "function" ? s.opts.focus() : s.opts.focus;
      if (canFocus(f)) return f;
    }
    var primary = s.dialog.querySelectorAll(".btn--primary");
    for (var i = 0; i < primary.length; i++) if (canFocus(primary[i])) return primary[i];
    return fallbackFocus(s);
  }
  function fallbackFocus(s) {
    var c = s.opts.canvas || s.dialog.querySelector("canvas[tabindex]");
    if (canFocus(c)) return c;
    var any = s.dialog.querySelectorAll("button, [href], input, [tabindex]:not([tabindex='-1'])");
    for (var i = 0; i < any.length; i++) if (canFocus(any[i])) return any[i];
    return null;
  }
  // When the focused control disappears (Start hides with its prompt, the
  // initials form is replaced) focus would fall to <body>. Pull it back to
  // the play area so keys and Tab stay inside the dialog.
  function keepFocus(s) {
    if (session !== s || !s.open) return;
    var a = document.activeElement;
    if (a && a !== document.body && s.dialog.contains(a) && isShown(a)) return;
    focusEl(fallbackFocus(s));
  }

  function promptText(prompt) {
    var title = prompt.querySelector("[data-egg-prompt-title], h2");
    var text = prompt.querySelector("[data-egg-prompt-text]") || prompt.querySelector("h2 ~ p");
    return [title, text].map(function (el) { return el ? el.textContent.trim() : ""; })
      .filter(Boolean).join(". ");
  }
  // Watch the start / pause / game-over prompt: rescue focus when its
  // buttons vanish, and announce it (final score included) when it appears.
  // Dialogs with their own live region (Echo) announce for themselves.
  function watchDialog(s) {
    var prompt = s.opts.prompt || s.dialog.querySelector("[data-egg-prompt]");
    if (!prompt || typeof MutationObserver === "undefined") return;
    var speaks = !s.dialog.querySelector("[aria-live]");
    var wasShown = !prompt.hidden;
    var queued = false;
    s.observer = new MutationObserver(function () {
      var shown = !prompt.hidden;
      if (shown && !wasShown && speaks) announce(promptText(prompt));
      wasShown = shown;
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; keepFocus(s); });
    });
    s.observer.observe(prompt, { attributes: true, attributeFilter: ["hidden"], childList: true, subtree: true });
  }

  /** Open a game. opts: { dialog, show, hide, opener, prompt?, canvas?, focus? }.
      show() makes the dialog visible and starts the game; hide() must undo
      everything show() did (loop, timers, listeners, audio). Returns false
      when another game is already open or opening. */
  function launch(opts) {
    if (session) return false;
    var opener = opts.opener;
    if (!opener || opener === document.body) opener = document.activeElement;
    var s = session = {
      opts: opts, dialog: opts.dialog, opener: opener,
      x: window.pageXOffset || 0, y: window.pageYOffset || 0,
      inerted: [], ariaHidden: [], saved: [], open: false, closing: false,
      observer: null, keeper: null
    };
    liveRegion();
    s.saved = tearPageAway(function () {
      if (session !== s) return;
      inertPage(s);
      describeDialog(s.dialog);
      opts.show();
      s.open = true;
      watchDialog(s);
      s.keeper = function () { keepFocus(s); };
      document.addEventListener("keydown", s.keeper, true);
      // Focus right away (the dialog is laid out now), and check again on
      // the next frame in case the game was still building its prompt.
      focusEl(initialFocus(s));
      window.requestAnimationFrame(function () { keepFocus(s); });
    });
    return true;
  }

  /** Close the open game in place and hand the page back. */
  function closeGame() {
    var s = session;
    if (!s || !s.open || s.closing) return;
    s.closing = true;
    document.removeEventListener("keydown", s.keeper, true);
    if (s.observer) { s.observer.disconnect(); s.observer = null; }
    try { s.opts.hide(); }
    catch (err) { window.setTimeout(function () { throw err; }); } // still restore the page
    uninertPage(s);
    restorePage(s.saved);
    scrollBack(s);
    if (canFocus(s.opener)) focusEl(s.opener);
    scrollBack(s); // in case focusing nudged the page
    session = null;
  }

  function isOpen() { return !!session; }

  // ---------- Game registry + on-demand loader ----------
  // Game files register an opener; play() loads a game's script (and any
  // game-only stylesheet) the first time it is asked for, then opens it.
  var registry = {};
  var busy = {};
  // Each game file and game-only stylesheet is one whole URL literal, so
  // scripts/stamp-assets.mjs can version it: /assets is served immutable, and a
  // URL that never changes would keep serving a stale game.
  var GAME_JS = {
    asteroids: "/assets/js/asteroids-game.js?v=3f98d07fcc",
    blocks: "/assets/js/blocks-game.js?v=28dd8fcd62",
    breakout: "/assets/js/breakout-game.js?v=0605709d07",
    dino: "/assets/js/dino-game.js?v=1686f36596",
    echo: "/assets/js/echo-game.js?v=7d68dc5c21",
    hopper: "/assets/js/hopper-game.js?v=ff1902f10d",
    invaders: "/assets/js/invaders-game.js?v=5602abb99f",
    maze: "/assets/js/maze-game.js?v=eb5fa5046d",
    pong: "/assets/js/pong-game.js?v=ec48566888",
    snake: "/assets/js/snake-game.js?v=92c90cc71a"
  };
  var GAME_CSS = { pong: ["/assets/css/pong.css?v=08e7f7f61f"] };

  function registerGame(key, open) { registry[key] = open; }

  /** The usual arcade-overlay game: build() returns the overlay element with
      .game (activate/deactivate), ._onKeydown, optional ._onKeyup, ._canvas
      and ._fitCanvas. Core owns showing, hiding and listener bookkeeping. */
  function defineGame(key, build) {
    var overlay = null;
    function show() {
      if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
      overlay.classList.add("is-open");
      if (overlay._fitCanvas) overlay._fitCanvas();
      document.addEventListener("keydown", overlay._onKeydown);
      if (overlay._onKeyup) document.addEventListener("keyup", overlay._onKeyup);
      // resize alone misses iOS URL-bar collapse and rotation.
      if (overlay._fitCanvas) overlay._gmsOffViewport = onViewportChange(overlay._fitCanvas);
      overlay.game.activate();
    }
    function hide() {
      document.removeEventListener("keydown", overlay._onKeydown);
      if (overlay._onKeyup) document.removeEventListener("keyup", overlay._onKeyup);
      if (overlay._gmsOffViewport) { overlay._gmsOffViewport(); overlay._gmsOffViewport = null; }
      overlay.game.deactivate();
      // Keys released after the listener is gone must not stay "held".
      var held = overlay.game.held;
      if (held) for (var k in held) { if (held.hasOwnProperty(k) && held[k] === true) held[k] = false; }
      overlay.classList.remove("is-open");
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    registerGame(key, function (opener) {
      if (session) return;
      if (!overlay) overlay = build();
      launch({
        opener: opener, dialog: overlay, show: show, hide: hide,
        prompt: overlay.querySelector("[data-egg-prompt]"), canvas: overlay._canvas
      });
    });
  }

  function loadScript(src, ok, fail) {
    var s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = ok;
    s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); fail(); };
    document.head.appendChild(s);
  }
  function loadCss(href, ok, fail) {
    var a = document.createElement("a");
    a.href = href;
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].href !== a.href) continue;
      if (links[i].sheet) { ok(); return; }
      links[i].addEventListener("load", ok);
      links[i].addEventListener("error", fail);
      return;
    }
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = ok;
    link.onerror = function () { if (link.parentNode) link.parentNode.removeChild(link); fail(); };
    document.head.appendChild(link);
  }

  var NO_UI = {
    start: function () {},
    stop: function () {},
    error: function () { announce("The game did not load. Please try again in a moment."); }
  };

  /** Open game `key`, loading it first if needed. `opener` gets focus back
      on close; `ui` ({start, stop, error}) shows loading and failure. */
  function play(key, opener, ui) {
    if (!/^[a-z]+$/.test(key || "") || busy[key] || session) return;
    ui = ui || NO_UI;
    busy[key] = true;
    var css = GAME_CSS[key] || [];
    var waiting = css.length + 1;
    var failed = false;
    function done() {
      if (failed || --waiting > 0) return;
      busy[key] = false;
      ui.stop();
      if (registry[key]) registry[key](opener);
      else fail();
    }
    function fail() {
      if (failed) return;
      failed = true;
      busy[key] = false;
      ui.stop();
      ui.error();
    }
    ui.start();
    css.forEach(function (href) { loadCss(href, done, fail); });
    if (registry[key]) done();
    else if (GAME_JS[key]) loadScript(GAME_JS[key], done, fail);
    else fail();
  }

  // Loading / failure state for a visible Play button (the /arcade cards).
  // The loading label only appears if the fetch takes a noticeable moment.
  function buttonUi(btn) {
    var timer = null;
    function clearError() {
      var next = btn.nextElementSibling;
      if (next && next.classList.contains(NS + "-load-error")) next.parentNode.removeChild(next);
    }
    function stop() {
      if (timer) { window.clearTimeout(timer); timer = null; }
      btn.classList.remove("is-loading");
      btn.removeAttribute("aria-busy");
    }
    return {
      start: function () {
        clearError();
        timer = window.setTimeout(function () {
          timer = null;
          btn.classList.add("is-loading");
          btn.setAttribute("aria-busy", "true");
          announce("Loading the game.");
        }, 180);
      },
      stop: stop,
      error: function () {
        stop();
        clearError();
        var msg = document.createElement("p");
        msg.className = NS + "-load-error";
        msg.setAttribute("role", "alert");
        msg.textContent = "This game did not load. Check your connection, then press Play to try again.";
        btn.parentNode.insertBefore(msg, btn.nextSibling);
      }
    };
  }

  // Any [data-arcade-game] button on the page opens its game on click
  // (click already fires on tap, and never on a scroll that starts there).
  function bindPlayButtons() {
    [].forEach.call(document.querySelectorAll("button[data-arcade-game]"), function (btn) {
      if (btn.hasAttribute("data-arcade-bound")) return;
      btn.setAttribute("data-arcade-bound", "");
      var ui = buttonUi(btn);
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        play(btn.getAttribute("data-arcade-game"), btn, ui);
      });
    });
  }
  ready(bindPlayButtons);

  window.GMSArcade = {
    ns: NS,
    ready: ready,
    prefersReducedMotion: prefersReducedMotion,
    tearPageAway: tearPageAway,
    // Open / close lifecycle + loader
    launch: launch,
    closeGame: closeGame,
    isOpen: isOpen,
    defineGame: defineGame,
    registerGame: registerGame,
    play: play,
    announce: announce,
    leaderboard: leaderboard,
    mountInitialsEntry: mountInitialsEntry,
    renderLeaderboard: renderLeaderboard,
    // Shared juice toolkit
    makeCamera: makeCamera,
    pixelGlow: pixelGlow,
    makeSynth: makeSynth,
    makeCombo: makeCombo,
    // Shared mobile toolkit
    isCoarsePointer: isCoarsePointer,
    haptics: haptics,
    makeWakeLock: makeWakeLock,
    onHidden: onHidden,
    onViewportChange: onViewportChange,
    makeStick: makeStick,
  };
})();
