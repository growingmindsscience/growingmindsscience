/* Growing Minds Science — arcade-core.js
   Shared plumbing for the arcade games, which live only on /arcade (each
   opens from its Play button; there are no triggers elsewhere).

   Core v2 (see docs/arcade/plan.md) adds the field-guide toolkit at the end
   of this file: theme() reads the live brand tokens, makeCanvas draws at
   device resolution, draw.* is the illustration grammar, makeShell builds
   the one overlay every game shares, and makeStory / makePowerups /
   progress / dailySeed / streak / share carry chapters, timed effects and
   the daily puzzles. Everything older is kept so a game converts one at a time.

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
      empty.textContent = "No scores yet. Be the first.";
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

    // Once the page is gone it is hidden outright, not just transparent, and
    // its fall transform is cleared: a piece left translated 125vh and rotated
    // widens the document (375px became 943px on a phone), which lets mobile
    // browsers pan and zoom behind the game and toggles the URL bar.
    function finish() {
      pieces.forEach(function (p) {
        p.style.visibility = "hidden";
        p.style.transition = "none";
        p.style.transform = "none";
      });
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
      // "suspended" before the first gesture; "interrupted" on iOS after a
      // call or a switch away. Either way, resume on the next gesture.
      if (actx.state !== "running") { try { actx.resume(); } catch (e) {} }
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
    // The zone must not pan or zoom: preventDefault on pointer events does
    // not stop a touch scroll, only touch-action does.
    var zoneTouchAction = zone.style.touchAction;
    zone.style.touchAction = "none";

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
        zone.style.touchAction = zoneTouchAction;
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
    var c = s.opts.canvas || s.dialog.querySelector("[data-arcade-focus]") || s.dialog.querySelector("canvas[tabindex]");
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
      lockScroll(s);
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
    unlockScroll(s);
    restorePage(s.saved);
    scrollBack(s);
    if (canFocus(s.opener)) focusEl(s.opener);
    scrollBack(s); // in case focusing nudged the page
    session = null;
  }

  // Scroll lock for touch browsers. overflow:hidden on body does not stop
  // iOS Safari from panning the document under a fixed overlay, and every pan
  // collapses or reveals the URL bar, which resizes the game. Pinning the body
  // at its current scroll offset leaves nothing to pan. closeGame() restores
  // the offset through scrollBack().
  function lockScroll(s) {
    var b = document.body;
    s.bodyTop = b.style.top;
    b.style.top = (-s.y) + "px";
    b.classList.add(NS + "-fixed");
  }
  function unlockScroll(s) {
    var b = document.body;
    b.classList.remove(NS + "-fixed");
    b.style.top = s.bodyTop || "";
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
    asteroids: "/assets/js/asteroids-game.js?v=ec66f43dd7",
    blocks: "/assets/js/blocks-game.js?v=5e2c8990af",
    breakout: "/assets/js/breakout-game.js?v=7586ab1234",
    dino: "/assets/js/dino-game.js?v=6b7ac939d1",
    echo: "/assets/js/echo-game.js?v=277f25f3df",
    hopper: "/assets/js/hopper-game.js?v=1c5a997842",
    invaders: "/assets/js/invaders-game.js?v=524418a582",
    maze: "/assets/js/maze-game.js?v=bc32394d7d",
    pong: "/assets/js/pong-game.js?v=bb9b028bed",
    snake: "/assets/js/snake-game.js?v=d2a3500dcc",
    // Daily puzzles (DOM games on the same shell)
    five: "/assets/js/daily-five.js?v=54e0a74c2d",
    groups: "/assets/js/daily-groups.js?v=060460edf9",
    nest: "/assets/js/daily-nest.js?v=986c1ed050",
    mini: "/assets/js/daily-mini.js?v=2d0d539012",
    six: "/assets/js/daily-six.js?v=639eb12940"
  };
  var GAME_CSS = {};

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

  // Hub chips: best local score per game, today's state per daily puzzle.
  function decorateHub() {
    [].forEach.call(document.querySelectorAll("[data-arcade-best]"), function (chip) {
      var best = leaderboard.best(chip.getAttribute("data-arcade-best"));
      chip.textContent = best ? "Best " + best.toLocaleString() : "Not played yet";
      chip.classList.toggle("is-empty", !best);
    });
    var n = dayNumber();
    [].forEach.call(document.querySelectorAll("[data-arcade-daily]"), function (chip) {
      var key = chip.getAttribute("data-arcade-daily");
      var s = streak.get(key), res = streak.result(key);
      var text = res ? (res === "win" ? "Done today" : "Played today") : "Puzzle #" + n;
      if (s.current > 1) text += " · " + s.current + "-day streak";
      chip.textContent = text;
      chip.classList.toggle("is-done", !!res);
    });
  }

  // ======================================================================
  //  Core v2 — the field-guide arcade.
  //  Everything below is additive. Games built on it read the live brand
  //  tokens (so the night page gets night games), draw at device resolution
  //  through makeCanvas, share one overlay shell, and get story chapters,
  //  timed power-ups, a progress store, daily seeds and streaks for free.
  //  See docs/arcade/plan.md for the contract.
  // ======================================================================

  // ---------- Theme: the brand palette, read live ----------
  // Token name -> palette key. Fallbacks are the light-theme values from
  // tokens-field-guide.css so a canvas never paints black on black if a
  // stylesheet is late.
  var THEME_VARS = [
    ["paper", "paper", "#F7F4EC"], ["paper-2", "paper2", "#EFEBE0"],
    ["surface", "surface", "#FFFDF8"], ["surface-2", "surface2", "#E6E3D7"],
    ["ink", "ink", "#193C39"], ["ink-soft", "inkSoft", "#35504C"], ["ink-muted", "inkMuted", "#546965"],
    ["forest", "forest", "#245F58"], ["forest-deep", "forestDeep", "#1C4D47"], ["on-forest", "onForest", "#FFFDF8"],
    ["sage", "sage", "#A9C3B2"], ["sage-deep", "sageDeep", "#8DAE9A"],
    ["sage-mist", "sageMist", "#E0EBE5"], ["sage-mist-2", "sageMist2", "#CFDFD6"],
    ["note-amber", "ochre", "#D2A453"], ["note-warm", "clay", "#C46C4D"], ["clay-text", "clayText", "#9E5236"],
    ["research", "research", "#426B91"], ["danger", "danger", "#A6371F"], ["success", "success", "#2F6B4A"],
    ["border", "border", "#CDD3CB"], ["border-soft", "borderSoft", "#DEE2D8"],
    ["field-ink", "fieldInk", "#193C39"], ["on-ink", "onInk", "#F2EFE6"], ["on-ink-muted", "onInkMuted", "#9FAEA8"]
  ];
  var FONT_DISPLAY = '"Newsreader", "Newsreader Fallback", Georgia, "Times New Roman", serif';
  var FONT_BODY = '"Inter", "DM Sans", "DM Sans Fallback", "Helvetica Neue", Arial, sans-serif';

  function parseHex(hex) {
    var s = String(hex || "").trim();
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
    if (m) {
      var h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var r = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(s);
    if (r) return [+r[1], +r[2], +r[3]];
    return [0, 0, 0];
  }
  function toHex(rgb) {
    function c(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }
    return "#" + c(rgb[0]) + c(rgb[1]) + c(rgb[2]);
  }
  function alphaColor(hex, a) {
    var c = parseHex(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, Math.min(1, a == null ? 1 : a)) + ")";
  }
  function mixColor(a, b, t) {
    var x = parseHex(a), y = parseHex(b);
    t = Math.max(0, Math.min(1, t == null ? 0.5 : t));
    return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  }
  function shadeColor(hex, t) { return t < 0 ? mixColor(hex, "#000000", -t) : mixColor(hex, "#FFFFFF", t); }

  var themeCache = null, themeKey = null;
  function theme() {
    var attr = document.documentElement.getAttribute("data-theme") || "light";
    if (themeCache && themeKey === attr) return themeCache;
    var cs = null;
    try { cs = window.getComputedStyle(document.documentElement); } catch (e) {}
    var pal = {};
    THEME_VARS.forEach(function (row) {
      var v = cs ? cs.getPropertyValue("--" + row[0]).trim() : "";
      pal[row[1]] = v || row[2];
    });
    pal.isDark = attr === "dark";
    pal.fontDisplay = FONT_DISPLAY;
    pal.fontBody = FONT_BODY;
    pal.alpha = alphaColor;
    pal.mix = mixColor;
    pal.shade = shadeColor;
    // A low-alpha ink for shadows and rules, so every game casts the same shadow.
    pal.shadow = alphaColor(pal.ink, pal.isDark ? 0.35 : 0.12);
    pal.rule = alphaColor(pal.ink, pal.isDark ? 0.22 : 0.14);
    pal.grid = alphaColor(pal.ink, pal.isDark ? 0.1 : 0.07);
    themeCache = pal; themeKey = attr;
    return pal;
  }
  // Fires fn(theme()) whenever data-theme changes (the chrome's toggle).
  function onThemeChange(fn) {
    if (typeof MutationObserver === "undefined") return function () {};
    var mo = new MutationObserver(function () { themeCache = null; fn(theme()); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return function () { mo.disconnect(); };
  }

  // ---------- Canvas: logical coordinates, device-resolution pixels ----------
  // The game thinks in w x h logical units. fit() sizes the element to the
  // stage (letterboxed), allocates a backing store at devicePixelRatio, and
  // begin() applies the transform (plus a camera offset) so drawing code
  // never sees a scale factor. Smoothing is on by default: this is the
  // vector-illustration arcade, not the pixel one.
  function makeCanvas(stage, opts) {
    opts = opts || {};
    var w = opts.w || 320, h = opts.h || 200;
    var smooth = opts.smooth !== false;
    var el = document.createElement("canvas");
    el.className = NS + "-canvas is-fit" + (smooth ? " is-smooth" : "");
    el.tabIndex = 0;
    el.setAttribute("aria-label", opts.label || "Play area");
    el.width = w; el.height = h;
    stage.appendChild(el);
    var ctx = el.getContext("2d");
    var scale = 1, cssW = w, cssH = h;
    function fit() {
      var r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var s = Math.min(r.width / w, r.height / h);
      cssW = Math.max(1, Math.floor(w * s)); cssH = Math.max(1, Math.floor(h * s));
      el.style.width = cssW + "px"; el.style.height = cssH + "px";
      var dpr = Math.min(3, window.devicePixelRatio || 1);
      var bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
      if (el.width !== bw || el.height !== bh) { el.width = bw; el.height = bh; }
      scale = bw / w;
      ctx.imageSmoothingEnabled = smooth;
      // CSS px per logical unit, readable from outside (the mobile sweep and tests).
      el.setAttribute("data-scale", s.toFixed(3));
    }
    function begin(camera) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, el.width, el.height);
      var o = camera && camera.offset ? camera.offset() : { x: 0, y: 0 };
      ctx.setTransform(scale, 0, 0, scale, o.x * scale, o.y * scale);
      ctx.imageSmoothingEnabled = smooth;
      ctx.lineJoin = "round"; ctx.lineCap = "round";
    }
    function end() { ctx.setTransform(1, 0, 0, 1, 0, 0); }
    function toLogical(clientX, clientY) {
      var r = el.getBoundingClientRect();
      return { x: (clientX - r.left) / (r.width || 1) * w, y: (clientY - r.top) / (r.height || 1) * h };
    }
    var api = { el: el, ctx: ctx, w: w, h: h, fit: fit, begin: begin, end: end, toLogical: toLogical,
      scale: function () { return scale; },
      // Change the logical size (a game may pick a tall grid for a portrait phone), then refit.
      setSize: function (nw, nh) { w = api.w = nw; h = api.h = nh; fit(); },
      // Stage aspect right now: width / height. Below 1 is portrait.
      aspect: function () { var r = stage.getBoundingClientRect(); return r.height ? r.width / r.height : 1; } };
    return api;
  }

  // ---------- Drawing kit: the field-guide illustration grammar ----------
  // Fills are flat. Outlines are ink at 1.25 to 1.5 logical px. Shadows are
  // an offset copy in low-alpha ink, never a blur. Text is Newsreader for
  // anything a reader would call a title and Inter for numbers and labels.
  function pathRoundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, Math.min(w, h) / 2));
    ctx.beginPath();
    if (r === 0) { ctx.rect(x, y, w, h); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // Paints the current path with a style: { fill, stroke, lineWidth, shadow (px), shadowColor, alpha }.
  function paintPath(ctx, style) {
    style = style || {};
    var lw = style.lineWidth == null ? 1.4 : style.lineWidth;
    if (style.alpha != null) { ctx.save(); ctx.globalAlpha *= style.alpha; }
    if (style.fill) { ctx.fillStyle = style.fill; ctx.fill(); }
    if (style.stroke) { ctx.strokeStyle = style.stroke; ctx.lineWidth = lw; ctx.stroke(); }
    if (style.alpha != null) ctx.restore();
  }
  // shape(ctx, drawPath, style): drawPath(ctx) builds the path. Draws the
  // shadow copy first (translated down), then the shape.
  function shape(ctx, drawPath, style) {
    style = style || {};
    if (style.shadow) {
      ctx.save();
      ctx.translate(style.shadowX || 0, style.shadow);
      drawPath(ctx);
      ctx.fillStyle = style.shadowColor || "rgba(25,60,57,0.12)";
      ctx.fill();
      ctx.restore();
    }
    drawPath(ctx);
    paintPath(ctx, style);
  }
  var draw = {
    roundRect: pathRoundRect,
    shape: shape,
    paint: paintPath,
    // The paper ground: flat fill, a faint dot grid, an optional quiet frame.
    // The dot grid is hundreds of arcs a frame, which a throttled phone feels,
    // so it is painted once per (size, colours, device scale) into an
    // offscreen canvas and stamped from then on. One cache per target canvas.
    paper: function (ctx, w, h, pal, opts) {
      opts = opts || {};
      var fill = opts.fill || pal.paper, step = opts.step || 16, r = opts.dot || 0.9;
      var gridOn = opts.grid !== false, gridColor = opts.gridColor || pal.grid;
      var scale = 1;
      try { var m = ctx.getTransform(); scale = m.a || 1; } catch (e) {}
      var key = [w, h, fill, gridOn ? gridColor : "", step, r, scale.toFixed(3)].join("|");
      var cache = ctx.canvas._gmsPaper;
      if (!cache || cache.key !== key) {
        var off = document.createElement("canvas");
        off.width = Math.max(1, Math.round(w * scale)); off.height = Math.max(1, Math.round(h * scale));
        var oc = off.getContext("2d");
        oc.setTransform(scale, 0, 0, scale, 0, 0);
        oc.fillStyle = fill;
        oc.fillRect(0, 0, w, h);
        if (gridOn) {
          oc.fillStyle = gridColor;
          for (var y = step / 2; y < h; y += step) {
            for (var x = step / 2; x < w; x += step) {
              oc.beginPath(); oc.arc(x, y, r, 0, Math.PI * 2); oc.fill();
            }
          }
        }
        cache = ctx.canvas._gmsPaper = { key: key, el: off };
      }
      ctx.drawImage(cache.el, 0, 0, w, h);
      if (opts.frame) {
        ctx.strokeStyle = pal.rule; ctx.lineWidth = 1;
        ctx.strokeRect(opts.frame + 0.5, opts.frame + 0.5, w - opts.frame * 2 - 1, h - opts.frame * 2 - 1);
      }
    },
    box: function (ctx, x, y, w, h, r, style) {
      shape(ctx, function (c) { pathRoundRect(c, x, y, w, h, r); }, style);
    },
    pill: function (ctx, x, y, w, h, style) {
      shape(ctx, function (c) { pathRoundRect(c, x, y, w, h, h / 2); }, style);
    },
    circle: function (ctx, x, y, r, style) {
      shape(ctx, function (c) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }, style);
    },
    ring: function (ctx, x, y, r, frac, style) {
      style = style || {};
      ctx.beginPath();
      ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, frac)));
      ctx.strokeStyle = style.stroke || "#000"; ctx.lineWidth = style.lineWidth || 2; ctx.stroke();
    },
    // A leaf: two curves meeting at the tip. angle in radians, size = length.
    leaf: function (ctx, x, y, size, angle, style) {
      shape(ctx, function (c) {
        c.save(); c.translate(x, y); c.rotate(angle || 0);
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(size * 0.55, -size * 0.45, size, 0);
        c.quadraticCurveTo(size * 0.55, size * 0.45, 0, 0);
        c.closePath();
        c.restore();
      }, style);
    },
    // A seed: ochre bead, ink rim, a leaf sprouting up-right. The arcade's pickup.
    seed: function (ctx, x, y, r, pal, opts) {
      opts = opts || {};
      shape(ctx, function (c) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); },
        { fill: opts.fill || pal.ochre, stroke: pal.ink, lineWidth: Math.max(1, r * 0.28), shadow: opts.shadow == null ? r * 0.35 : opts.shadow, shadowColor: pal.shadow });
      draw.leaf(ctx, x + r * 0.2, y - r * 0.9, r * 1.3, -Math.PI / 3, { fill: opts.leaf || pal.sageDeep, stroke: pal.ink, lineWidth: Math.max(0.8, r * 0.2) });
      // a highlight dot
      ctx.fillStyle = alphaColor("#FFFFFF", 0.6);
      ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
    },
    star: function (ctx, x, y, r, points, inner, style) {
      points = points || 5; inner = inner == null ? 0.45 : inner;
      shape(ctx, function (c) {
        c.beginPath();
        for (var i = 0; i < points * 2; i++) {
          var rad = i % 2 ? r * inner : r;
          var a = -Math.PI / 2 + i * Math.PI / points;
          var px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath();
      }, style);
    },
    dashes: function (ctx, x1, y1, x2, y2, dash, gap, style) {
      style = style || {};
      ctx.save();
      ctx.setLineDash([dash || 4, gap || 4]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = style.stroke || "#000"; ctx.lineWidth = style.lineWidth || 1; ctx.stroke();
      ctx.restore();
    },
    // Two eyes with pupils that look toward (lookX, lookY) in -1..1.
    eyes: function (ctx, x, y, gap, r, lookX, lookY, pal, opts) {
      opts = opts || {};
      var white = opts.white || pal.surface, ink = opts.ink || pal.ink;
      var blink = opts.blink || 0; // 0 open .. 1 shut
      for (var s = -1; s <= 1; s += 2) {
        var ex = x + s * gap / 2;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(ex, y, r, r * (1 - blink * 0.9), 0, 0, Math.PI * 2);
        ctx.fillStyle = white; ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.8, r * 0.25); ctx.stroke();
        ctx.clip();
        ctx.beginPath(); ctx.arc(ex + (lookX || 0) * r * 0.4, y + (lookY || 0) * r * 0.4, r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = ink; ctx.fill();
        ctx.restore();
      }
    },
    // Text in the brand faces. opts: { font: "display"|"body", size, weight, italic, color, align, baseline, tracking, maxWidth }
    label: function (ctx, text, x, y, opts) {
      opts = opts || {};
      var fam = opts.font === "display" ? FONT_DISPLAY : FONT_BODY;
      var weight = opts.weight || (opts.font === "display" ? 500 : 600);
      ctx.font = (opts.italic ? "italic " : "") + weight + " " + (opts.size || 10) + "px " + fam;
      ctx.fillStyle = opts.color || "#000";
      ctx.textAlign = opts.align || "center";
      ctx.textBaseline = opts.baseline || "middle";
      if (opts.tracking && typeof ctx.letterSpacing !== "undefined") ctx.letterSpacing = opts.tracking;
      if (opts.maxWidth) ctx.fillText(String(text), x, y, opts.maxWidth); else ctx.fillText(String(text), x, y);
      if (opts.tracking && typeof ctx.letterSpacing !== "undefined") ctx.letterSpacing = "0px";
    },
    // A paper tag: box with a folded corner, for labels inside the play field.
    tag: function (ctx, x, y, w, h, pal, style) {
      style = style || {};
      shape(ctx, function (c) {
        var f = Math.min(6, h * 0.4);
        c.beginPath();
        c.moveTo(x, y); c.lineTo(x + w - f, y); c.lineTo(x + w, y + f); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath();
      }, { fill: style.fill || pal.surface, stroke: style.stroke || pal.ink, lineWidth: style.lineWidth || 1.2, shadow: style.shadow == null ? 2 : style.shadow, shadowColor: pal.shadow });
    }
  };

  // ---------- Particles and floaters: pooled, reduced-motion aware ----------
  // kinds: "dot" (circle), "square", "leaf", "ring", "spark" (short line).
  function makeParticles(opts) {
    opts = opts || {};
    var cap = opts.cap || 80, reduce = opts.reduce != null ? opts.reduce : prefersReducedMotion();
    var pool = [];
    function spawn(x, y, p) {
      if (reduce && !p.always) return;
      var it = null;
      for (var i = 0; i < pool.length; i++) { if (pool[i].life <= 0) { it = pool[i]; break; } }
      if (!it) { if (pool.length >= cap) return; it = {}; pool.push(it); }
      it.x = x; it.y = y; it.vx = p.vx || 0; it.vy = p.vy || 0;
      it.life = it.maxLife = p.life || 24; it.color = p.color || "#000";
      it.size = p.size || 2; it.kind = p.kind || "dot"; it.gravity = p.gravity || 0; it.drag = p.drag == null ? 0.96 : p.drag;
      it.rot = p.rot || Math.random() * Math.PI * 2; it.spin = p.spin || 0; it.fade = p.fade !== false; it.shrink = p.shrink !== false;
    }
    function burst(x, y, p) {
      p = p || {};
      var n = p.n || 8, sp = p.speed || 1.4, spread = p.spread == null ? Math.PI * 2 : p.spread, base = p.angle || 0;
      for (var i = 0; i < n; i++) {
        var a = base + (spread >= Math.PI * 2 ? Math.random() * Math.PI * 2 : (Math.random() - 0.5) * spread);
        var s = sp * (0.4 + Math.random() * 0.9);
        spawn(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: (p.life || 22) * (0.7 + Math.random() * 0.6),
          color: Array.isArray(p.color) ? p.color[i % p.color.length] : p.color, size: (p.size || 2) * (0.6 + Math.random() * 0.8),
          kind: Array.isArray(p.kind) ? p.kind[i % p.kind.length] : p.kind, gravity: p.gravity, drag: p.drag, spin: (Math.random() - 0.5) * 0.3 });
      }
    }
    function tick(dt) {
      for (var i = 0; i < pool.length; i++) {
        var it = pool[i]; if (it.life <= 0) continue;
        it.life -= dt; it.vy += it.gravity * dt; it.vx *= Math.pow(it.drag, dt); it.vy *= Math.pow(it.drag, dt);
        it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.spin * dt;
      }
    }
    function render(ctx) {
      for (var i = 0; i < pool.length; i++) {
        var it = pool[i]; if (it.life <= 0) continue;
        var t = it.life / it.maxLife;
        var s = it.size * (it.shrink ? (0.3 + 0.7 * t) : 1);
        ctx.save();
        ctx.globalAlpha = it.fade ? Math.min(1, t * 1.6) : 1;
        ctx.fillStyle = it.color; ctx.strokeStyle = it.color;
        ctx.translate(it.x, it.y); ctx.rotate(it.rot);
        if (it.kind === "square") ctx.fillRect(-s, -s, s * 2, s * 2);
        else if (it.kind === "leaf") { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 1.2, -s, s * 2.2, 0); ctx.quadraticCurveTo(s * 1.2, s, 0, 0); ctx.fill(); }
        else if (it.kind === "ring") { ctx.lineWidth = Math.max(0.8, s * 0.4); ctx.beginPath(); ctx.arc(0, 0, s * (2 - t), 0, Math.PI * 2); ctx.stroke(); }
        else if (it.kind === "spark") { ctx.lineWidth = Math.max(0.8, s * 0.5); ctx.beginPath(); ctx.moveTo(-s * 1.5, 0); ctx.lineTo(s * 1.5, 0); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
    }
    return { spawn: spawn, burst: burst, tick: tick, render: render,
      clear: function () { for (var i = 0; i < pool.length; i++) pool[i].life = 0; },
      count: function () { var n = 0; for (var i = 0; i < pool.length; i++) if (pool[i].life > 0) n++; return n; } };
  }
  // Floating text ("+50", "Myelin!") that rises and fades.
  function makeFloaters(opts) {
    opts = opts || {};
    var cap = opts.cap || 12, reduce = opts.reduce != null ? opts.reduce : prefersReducedMotion();
    var pool = [];
    function spawn(x, y, text, color, o) {
      o = o || {};
      var it = null;
      for (var i = 0; i < pool.length; i++) { if (pool[i].life <= 0) { it = pool[i]; break; } }
      if (!it) { if (pool.length >= cap) return; it = {}; pool.push(it); }
      it.x = x; it.y = y; it.text = text; it.color = color || "#000";
      it.life = it.maxLife = o.life || (reduce ? 40 : 30); it.size = o.size || 9; it.font = o.font || "body";
      it.vy = reduce ? 0 : (o.vy == null ? -0.45 : o.vy); it.stroke = o.stroke;
    }
    function tick(dt) { for (var i = 0; i < pool.length; i++) { var it = pool[i]; if (it.life > 0) { it.life -= dt; it.y += it.vy * dt; } } }
    function render(ctx) {
      for (var i = 0; i < pool.length; i++) {
        var it = pool[i]; if (it.life <= 0) continue;
        var t = it.life / it.maxLife;
        ctx.save(); ctx.globalAlpha = Math.min(1, t * 2.2);
        if (it.stroke) { ctx.lineWidth = 3; ctx.strokeStyle = it.stroke; ctx.lineJoin = "round";
          ctx.font = "600 " + it.size + "px " + (it.font === "display" ? FONT_DISPLAY : FONT_BODY); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.strokeText(it.text, it.x, it.y); }
        draw.label(ctx, it.text, it.x, it.y, { font: it.font, size: it.size, color: it.color, weight: it.font === "display" ? 500 : 600 });
        ctx.restore();
      }
    }
    return { spawn: spawn, tick: tick, render: render, clear: function () { for (var i = 0; i < pool.length; i++) pool[i].life = 0; } };
  }

  // ---------- Story: chapters with a banner and an intro card ----------
  // chapters: [{ name, at, text? }] sorted by `at` (score, sparks, waves...).
  // advance(value) moves to the highest chapter whose `at` <= value; on a
  // change it starts a banner timer and calls onEnter(chapter, index).
  function makeStory(chapters, opts) {
    opts = opts || {};
    var idx = 0, bannerT = 0, bannerLen = opts.bannerFrames || 150;
    var api = {
      reset: function () { idx = 0; bannerT = 0; },
      advance: function (value) {
        var ci = 0;
        for (var i = chapters.length - 1; i >= 0; i--) { if (value >= chapters[i].at) { ci = i; break; } }
        if (ci === idx) return false;
        idx = ci; bannerT = bannerLen;
        if (typeof opts.onEnter === "function") opts.onEnter(chapters[idx], idx);
        return true;
      },
      set: function (i) { idx = Math.max(0, Math.min(chapters.length - 1, i)); bannerT = bannerLen; },
      tick: function (dt) { if (bannerT > 0) bannerT = Math.max(0, bannerT - dt); },
      index: function () { return idx; },
      current: function () { return chapters[idx]; },
      next: function () { return chapters[idx + 1] || null; },
      count: function () { return chapters.length; },
      // frac runs 1 -> 0 over the banner's life; 0 means no banner.
      banner: function () { return bannerT > 0 ? { name: chapters[idx].name, text: chapters[idx].text || "", frac: bannerT / bannerLen } : null; },
      // Progress toward the next chapter, 0..1 (1 at the last chapter).
      progress: function (value) {
        var n = chapters[idx + 1]; if (!n) return 1;
        var a = chapters[idx].at; return Math.max(0, Math.min(1, (value - a) / Math.max(1, n.at - a)));
      }
    };
    return api;
  }

  // ---------- Power-ups: timed effects with HUD pips ----------
  // defs: { id: { label, color: paletteKey, duration (frames), uses? } }.
  // A def with `uses` is a counted charge (shield), not a timer.
  function makePowerups(defs, opts) {
    opts = opts || {};
    var state = {};
    var order = [];
    function grant(id, amount) {
      var d = defs[id]; if (!d) return;
      var s = state[id];
      if (!s) { s = state[id] = { id: id, t: 0, max: 0, uses: 0 }; order.push(id); }
      if (d.uses) { s.uses = Math.min(d.uses, s.uses + (amount || 1)); }
      else { s.max = d.duration || 300; s.t = d.extend ? Math.min(s.max * 2, s.t + s.max) : s.max; }
      if (typeof opts.onGrant === "function") opts.onGrant(id, d);
    }
    function remove(id) {
      if (!state[id]) return;
      delete state[id];
      order.splice(order.indexOf(id), 1);
      if (typeof opts.onExpire === "function") opts.onExpire(id, defs[id]);
    }
    return {
      defs: defs,
      grant: grant,
      remove: remove,
      // Spend one charge of a counted power-up; returns true if one was there.
      use: function (id) { var s = state[id]; if (!s || s.uses <= 0) return false; s.uses -= 1; if (s.uses <= 0) remove(id); return true; },
      active: function (id) { var s = state[id]; return !!s && (s.t > 0 || s.uses > 0); },
      frac: function (id) { var s = state[id]; if (!s) return 0; return defs[id].uses ? s.uses / defs[id].uses : s.t / (s.max || 1); },
      uses: function (id) { var s = state[id]; return s ? s.uses : 0; },
      tick: function (dt) {
        for (var i = order.length - 1; i >= 0; i--) {
          var s = state[order[i]]; if (!s || defs[s.id].uses) continue;
          s.t -= dt; if (s.t <= 0) remove(s.id);
        }
      },
      list: function () { return order.map(function (id) { var d = defs[id]; return { id: id, label: d.label, color: d.color, frac: this.frac(id), uses: state[id].uses }; }, this); },
      clear: function () { state = {}; order.length = 0; },
      any: function () { return order.length > 0; }
    };
  }

  // ---------- Progress: per-game stats beyond the leaderboard ----------
  var PROGRESS_KEY = "gms-arcade-progress";
  function readProgress() { try { var p = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || "{}"); return p && typeof p === "object" ? p : {}; } catch (e) { return {}; } }
  function writeProgress(p) { try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {} }
  var progress = {
    get: function (key) { return readProgress()[key] || { plays: 0, best: 0, chapter: 0, badges: [], last: 0 }; },
    record: function (key, run) {
      run = run || {};
      var all = readProgress();
      var p = all[key] || { plays: 0, best: 0, chapter: 0, badges: [], last: 0 };
      p.plays += 1;
      if ((run.score || 0) > p.best) p.best = Math.floor(run.score);
      if ((run.chapter || 0) > p.chapter) p.chapter = run.chapter;
      (run.badges || []).forEach(function (b) { if (p.badges.indexOf(b) === -1) p.badges.push(b); });
      p.last = Date.now();
      all[key] = p; writeProgress(all);
      return p;
    },
    badge: function (key, id) {
      var all = readProgress(); var p = all[key] || { plays: 0, best: 0, chapter: 0, badges: [], last: 0 };
      if (p.badges.indexOf(id) !== -1) return false;
      p.badges.push(id); all[key] = p; writeProgress(all); return true;
    }
  };

  // ---------- Daily seeds, RNG, streaks, saved daily state, share ----------
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dayKey(offsetDays) {
    var d = new Date(); if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function hashString(s) { // FNV-1a 32-bit
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function dailySeed(salt, offsetDays) { return hashString(dayKey(offsetDays) + "|" + (salt || "")); }
  // Day number since the arcade's epoch, for "Puzzle #N" labels.
  var DAILY_EPOCH = Date.UTC(2026, 9, 17);
  function dayNumber(offsetDays) {
    var d = new Date(); if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - DAILY_EPOCH) / 86400000) + 1;
  }
  // mulberry32: small, fast, good enough for puzzles. Returns a function with helpers.
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    function next() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    next.int = function (n) { return Math.floor(next() * n); };
    next.pick = function (arr) { return arr[Math.floor(next() * arr.length)]; };
    next.shuffle = function (arr) { var a2 = arr.slice(); for (var i = a2.length - 1; i > 0; i--) { var j = Math.floor(next() * (i + 1)); var t = a2[i]; a2[i] = a2[j]; a2[j] = t; } return a2; };
    next.range = function (lo, hi) { return lo + next() * (hi - lo); };
    return next;
  }

  var STREAK_KEY = "gms-arcade-streaks";
  function readStreaks() { try { var p = JSON.parse(window.localStorage.getItem(STREAK_KEY) || "{}"); return p && typeof p === "object" ? p : {}; } catch (e) { return {}; } }
  function writeStreaks(p) { try { window.localStorage.setItem(STREAK_KEY, JSON.stringify(p)); } catch (e) {} }
  function prevDay(key) { var p = key.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() - 1); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  var streak = {
    get: function (key) {
      var s = readStreaks()[key] || { current: 0, best: 0, lastDay: null, played: 0, won: 0, results: {} };
      // A streak only counts if yesterday or today was played.
      var today = dayKey();
      if (s.lastDay && s.lastDay !== today && s.lastDay !== prevDay(today)) s.current = 0;
      return s;
    },
    // result: "win" | "loss" | string. Returns the updated record.
    mark: function (key, result, day) {
      day = day || dayKey();
      var all = readStreaks();
      var s = all[key] || { current: 0, best: 0, lastDay: null, played: 0, won: 0, results: {} };
      if (s.results[day]) return s; // one result per day
      s.results[day] = result;
      s.played += 1; if (result === "win") s.won += 1;
      if (result === "win") {
        s.current = (s.lastDay === prevDay(day)) ? s.current + 1 : 1;
        if (s.current > s.best) s.best = s.current;
      } else { s.current = 0; }
      s.lastDay = day;
      // keep the results map small
      var keys = Object.keys(s.results).sort(); while (keys.length > 60) delete s.results[keys.shift()];
      all[key] = s; writeStreaks(all);
      return s;
    },
    result: function (key, day) { var s = readStreaks()[key]; return s && s.results ? (s.results[day || dayKey()] || null) : null; }
  };

  // In-progress daily state, one day per game (so a half-done puzzle survives a reload).
  var DAILY_KEY = "gms-arcade-daily";
  var daily = {
    load: function (key, day) {
      try { var all = JSON.parse(window.localStorage.getItem(DAILY_KEY) || "{}"); var s = all[key]; return s && s.day === (day || dayKey()) ? s.state : null; } catch (e) { return null; }
    },
    save: function (key, state, day) {
      try { var all = JSON.parse(window.localStorage.getItem(DAILY_KEY) || "{}"); all[key] = { day: day || dayKey(), state: state }; window.localStorage.setItem(DAILY_KEY, JSON.stringify(all)); } catch (e) {}
    }
  };

  // Copies text for the player to paste; the Web Share sheet on phones when it exists.
  function share(text, opts) {
    opts = opts || {};
    var done = function (ok) { announce(ok ? (opts.announce || "Copied. Paste it anywhere.") : "Could not copy. Select the text to copy it."); if (typeof opts.onDone === "function") opts.onDone(ok); };
    if (opts.sheet && navigator.share && isCoarsePointer()) {
      navigator.share({ text: text }).then(function () { done(true); }).catch(function () { copyText(text, done); });
      return;
    }
    copyText(text, done);
  }
  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }).catch(function () { legacyCopy(text, done); });
    } else legacyCopy(text, done);
  }
  function legacyCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = SR_ONLY;
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      done(!!ok);
    } catch (e) { done(false); }
  }

  // ---------- Input: one map for keys, swipes, taps and the pointer ----------
  // keys: { "ArrowLeft": "left", "a": "left", " ": "action" ... } mapping
  // KeyboardEvent.key (case-insensitive for letters) to an action name.
  // held[action] is true while down; pressed(action) is true for one frame
  // after a keydown (consume() clears it each frame). Swipes and taps come
  // from pointer events on `surface`; pointer.x/y are logical canvas coords
  // when a canvas is given.
  function makeInput(surface, opts) {
    opts = opts || {};
    var keys = {}; Object.keys(opts.keys || {}).forEach(function (k) { keys[k.length === 1 ? k.toLowerCase() : k] = opts.keys[k]; });
    var held = {}, pressed = {}, swipeMin = opts.swipeMin || 24, tapMax = opts.tapMax || 14;
    var pointer = { x: 0, y: 0, down: false, active: false, id: null, sx: 0, sy: 0, moved: false, t: 0 };
    var canvas = opts.canvas || null;
    function actionFor(e) { var k = e.key; if (!k) return null; if (k.length === 1) k = k.toLowerCase(); return keys[k] || null; }
    function onKeydown(e) {
      var a = actionFor(e); if (!a) return false;
      if (!held[a]) pressed[a] = true;
      held[a] = true;
      if (typeof opts.onAction === "function") opts.onAction(a, e.repeat === true, e);
      return true;
    }
    function onKeyup(e) { var a = actionFor(e); if (!a) return false; held[a] = false; return true; }
    function toLogical(e) { if (canvas && canvas.toLogical) return canvas.toLogical(e.clientX, e.clientY); var r = surface.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function down(e) {
      if (e.button != null && e.button !== 0) return;
      if (opts.accept && !opts.accept(e)) return;
      var p = toLogical(e);
      pointer.x = p.x; pointer.y = p.y; pointer.sx = e.clientX; pointer.sy = e.clientY;
      pointer.down = true; pointer.active = true; pointer.id = e.pointerId; pointer.moved = false; pointer.t = Date.now();
      try { surface.setPointerCapture(e.pointerId); } catch (err) {}
      if (typeof opts.onDown === "function") opts.onDown(p, e);
      if (e.pointerType !== "mouse" && e.cancelable) e.preventDefault();
    }
    function move(e) {
      var p = toLogical(e);
      pointer.x = p.x; pointer.y = p.y;
      if (pointer.down && e.pointerId === pointer.id) {
        var dx = e.clientX - pointer.sx, dy = e.clientY - pointer.sy;
        if (!pointer.moved && Math.sqrt(dx * dx + dy * dy) > tapMax) pointer.moved = true;
        if (opts.onSwipe && Math.sqrt(dx * dx + dy * dy) >= swipeMin) {
          var dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
          opts.onSwipe(dir, { dx: dx, dy: dy }, e);
          // chain swipes: re-anchor so a continuing drag can turn again
          pointer.sx = e.clientX; pointer.sy = e.clientY;
        }
        if (typeof opts.onDrag === "function") opts.onDrag(p, { dx: dx, dy: dy }, e);
      }
      if (typeof opts.onMove === "function") opts.onMove(p, e);
    }
    function up(e) {
      if (e.pointerId !== pointer.id) return;
      var p = toLogical(e);
      pointer.down = false; pointer.id = null;
      if (!pointer.moved && typeof opts.onTap === "function" && Date.now() - pointer.t < 600) opts.onTap(p, e);
      if (typeof opts.onUp === "function") opts.onUp(p, e);
    }
    function leave() { pointer.active = false; }
    surface.addEventListener("pointerdown", down);
    surface.addEventListener("pointermove", move);
    surface.addEventListener("pointerup", up);
    surface.addEventListener("pointercancel", up);
    surface.addEventListener("pointerleave", leave);
    return {
      held: held, pointer: pointer,
      pressed: function (a) { return pressed[a] === true; },
      consume: function () { for (var k in pressed) if (pressed.hasOwnProperty(k)) pressed[k] = false; },
      release: function () { for (var k in held) if (held.hasOwnProperty(k)) held[k] = false; pointer.down = false; },
      onKeydown: onKeydown, onKeyup: onKeyup,
      press: function (a, on) { if (on && !held[a]) pressed[a] = true; held[a] = !!on; if (on && typeof opts.onAction === "function") opts.onAction(a, false, null); },
      destroy: function () {
        surface.removeEventListener("pointerdown", down); surface.removeEventListener("pointermove", move);
        surface.removeEventListener("pointerup", up); surface.removeEventListener("pointercancel", up); surface.removeEventListener("pointerleave", leave);
      }
    };
  }

  // ---------- Shell: the one overlay every game shares ----------
  // opts: { key, title, tagline, label, hud: [{id,label,value}], help, touch: [{id,label,aria,tap}],
  //         canvas: {w,h,smooth,label} | false, muteKey, onClose }
  // Returns the shell; the game calls shell.mount({...}) from its defineGame build().
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function makeShell(opts) {
    opts = opts || {};
    var overlay = el("div", NS + "-overlay");
    overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", opts.label || (opts.title + " game"));
    var backdrop = el("div", NS + "-backdrop"); overlay.appendChild(backdrop);
    var panel = el("div", NS + "-panel " + NS + "-panel--v2"); overlay.appendChild(panel);

    // Head: title and tagline, then sound and close.
    var head = el("div", NS + "-panel__head");
    var title = el("h2", NS + "-title", opts.title || "Game");
    if (opts.tagline) { var tg = el("span", null, " " + opts.tagline); title.appendChild(tg); }
    var actions = el("div", NS + "-head__actions");
    var muteBtn = el("button", NS + "-iconbtn", null); muteBtn.type = "button"; muteBtn.setAttribute("aria-label", "Sound on"); muteBtn.setAttribute("aria-pressed", "false"); muteBtn.setAttribute("data-egg-mute", "");
    muteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z"/><path class="w1" d="M16.5 9a4 4 0 0 1 0 6"/><path class="w2" d="M19 6.5a7.5 7.5 0 0 1 0 11"/><path class="x" d="M16 10l5 5M21 10l-5 5"/></svg>';
    var closeBtn = el("button", NS + "-iconbtn", null); closeBtn.type = "button"; closeBtn.setAttribute("aria-label", "Close game"); closeBtn.setAttribute("data-egg-close", "");
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    actions.appendChild(muteBtn); actions.appendChild(closeBtn);
    head.appendChild(title); head.appendChild(actions); panel.appendChild(head);

    // HUD row.
    var hudRow = el("div", NS + "-scores"); hudRow.setAttribute("aria-live", "off");
    var hudEls = {};
    (opts.hud || []).forEach(function (h) {
      var cell = el("span", NS + "-hud__cell"); cell.setAttribute("data-hud", h.id);
      var lab = el("span", NS + "-hud__label", h.label); var val = el("strong", NS + "-hud__value", h.value == null ? "0" : String(h.value));
      cell.appendChild(lab); cell.appendChild(val); hudRow.appendChild(cell); hudEls[h.id] = { cell: cell, val: val, last: null };
    });
    panel.appendChild(hudRow);

    // Stage with optional canvas, pips, prompt and toast.
    var stage = el("div", NS + "-stage"); panel.appendChild(stage);
    var canvas = null;
    if (opts.canvas !== false) canvas = makeCanvas(stage, opts.canvas || {});
    var pips = el("div", NS + "-pips"); pips.setAttribute("aria-hidden", "true"); stage.appendChild(pips);
    var toastEl = el("div", NS + "-toast"); toastEl.hidden = true; stage.appendChild(toastEl);
    // A portrait field on a phone held sideways shrinks until its labels are
    // hard to read. The hint sits over the top of the field, taps away, and
    // disappears on its own once the phone turns.
    var rotateHint = null, rotateDismissed = false;
    if (canvas) {
      rotateHint = el("button", NS + "-rotate", "Turn your phone upright for a bigger field");
      rotateHint.type = "button"; rotateHint.hidden = true;
      rotateHint.setAttribute("aria-label", "Turn your phone upright for a bigger field. Dismiss this hint.");
      rotateHint.addEventListener("click", function () { rotateDismissed = true; rotateHint.hidden = true; });
      stage.appendChild(rotateHint);
    }
    function checkFit() {
      if (!rotateHint) return;
      var s = parseFloat(canvas.el.getAttribute("data-scale")) || 1;
      var portraitField = canvas.h > canvas.w;
      // The window's shape, not the stage's: with the sideways layout the
      // stage is nearly square even on a phone held lengthwise.
      var sideways = window.innerWidth > window.innerHeight && window.innerHeight < 500;
      rotateHint.hidden = !(portraitField && sideways && s < 0.72 && !rotateDismissed && isCoarsePointer());
    }
    var prompt = el("div", NS + "-prompt"); prompt.setAttribute("data-egg-prompt", ""); prompt.hidden = true;
    var pCard = el("div", NS + "-prompt__card");
    var pKicker = el("p", NS + "-prompt__kicker"); pKicker.hidden = true;
    var pTitle = el("h2", NS + "-prompt__title"); pTitle.setAttribute("data-egg-prompt-title", "");
    var pText = el("p", NS + "-prompt__text"); pText.setAttribute("data-egg-prompt-text", "");
    var pBoard = el("div", NS + "-prompt__board");
    var pActions = el("div", NS + "-prompt__actions");
    pCard.appendChild(pKicker); pCard.appendChild(pTitle); pCard.appendChild(pText); pCard.appendChild(pBoard); pCard.appendChild(pActions);
    prompt.appendChild(pCard); stage.appendChild(prompt);

    // Help line and touch row.
    var help = el("p", NS + "-help", opts.help || ""); panel.appendChild(help);
    var touchRow = null, touchBtns = {};
    var held = {};
    var tapHandler = null;
    if (opts.touch && opts.touch.length) {
      touchRow = el("div", NS + "-touchrow");
      opts.touch.forEach(function (t) {
        var b = el("button", NS + "-touchbtn" + (t.wide ? " is-wide" : ""), t.label);
        b.type = "button"; b.setAttribute("aria-label", t.aria || t.label); b.setAttribute("data-egg-touch", t.id);
        if (t.tap) {
          b.addEventListener("click", function (e) { e.preventDefault(); if (tapHandler) tapHandler(t.id); });
        } else {
          var pid = null;
          function on(e) { if (pid != null) return; pid = e.pointerId; held[t.id] = true; b.classList.add("is-held"); try { b.setPointerCapture(pid); } catch (err) {} e.preventDefault(); if (tapHandler && t.alsoTap) tapHandler(t.id); }
          function off(e) { if (e.pointerId !== pid) return; pid = null; held[t.id] = false; b.classList.remove("is-held"); }
          b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off);
          b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        }
        touchRow.appendChild(b); touchBtns[t.id] = b;
      });
      panel.appendChild(touchRow);
    }

    // Mute wiring: the game hands over its synth.
    var synth = null;
    function syncMute() {
      var m = synth ? synth.isMuted() : false;
      muteBtn.setAttribute("aria-pressed", m ? "true" : "false");
      muteBtn.setAttribute("aria-label", m ? "Sound off" : "Sound on");
      muteBtn.classList.toggle("is-muted", m);
    }
    muteBtn.addEventListener("click", function () { if (synth) { synth.toggleMute(); syncMute(); announce(synth.isMuted() ? "Sound off" : "Sound on"); } });
    closeBtn.addEventListener("click", function () { closeGame(); });
    backdrop.addEventListener("click", function () { closeGame(); });

    var toastTimer = null;
    var shell = {
      key: opts.key, overlay: overlay, panel: panel, stage: stage, canvas: canvas, held: held,
      hud: {
        set: function (id, value) { var h = hudEls[id]; if (!h) return; var s = String(value); if (s !== h.last) { h.val.textContent = s; h.last = s; } },
        show: function (id, on) { var h = hudEls[id]; if (h) h.cell.hidden = !on; },
        flash: function (id) { var h = hudEls[id]; if (!h) return; h.cell.classList.remove("is-flash"); void h.cell.offsetWidth; h.cell.classList.add("is-flash"); }
      },
      prompt: {
        el: prompt,
        // show({ kicker, title, text, actions: [{label, primary, onClick, autofocus}], board: fn(mount), compact })
        show: function (p) {
          p = p || {};
          pKicker.hidden = !p.kicker; pKicker.textContent = p.kicker || "";
          pTitle.textContent = p.title || "";
          pText.textContent = p.text || ""; pText.hidden = !p.text;
          pBoard.textContent = "";
          pActions.textContent = "";
          pCard.classList.toggle("is-compact", !!p.compact);
          if (typeof p.board === "function") p.board(pBoard);
          (p.actions || []).forEach(function (a) {
            var b = el("button", "btn " + (a.primary ? "btn--primary" : "btn--ghost") + " " + NS + "-prompt__btn", a.label);
            b.type = "button"; if (a.autofocus) b.setAttribute("data-autofocus", "");
            b.addEventListener("click", function (e) { e.preventDefault(); if (typeof a.onClick === "function") a.onClick(); });
            pActions.appendChild(b);
          });
          pActions.hidden = !(p.actions && p.actions.length);
          prompt.hidden = false;
          var f = pActions.querySelector("[data-autofocus]") || pActions.querySelector(".btn--primary");
          if (f) window.requestAnimationFrame(function () { try { f.focus({ preventScroll: true }); } catch (e) {} });
        },
        hide: function () { prompt.hidden = true; },
        shown: function () { return !prompt.hidden; },
        board: pBoard
      },
      toast: function (text, ms) {
        if (canvas) toastEl.style.top = (canvas.el.offsetTop + 12) + "px";
        toastEl.textContent = text; toastEl.hidden = false;
        toastEl.classList.remove("is-in"); void toastEl.offsetWidth; toastEl.classList.add("is-in");
        if (toastTimer) window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { toastEl.hidden = true; }, ms || 1400);
      },
      setHelp: function (text) { help.textContent = text; },
      setTagline: function (text) { var s = title.querySelector("span"); if (s) s.textContent = " " + text; },
      bindSynth: function (s) { synth = s; syncMute(); },
      syncMute: syncMute,
      onTap: function (fn) { tapHandler = fn; },
      touchButton: function (id) { return touchBtns[id] || null; },
      showTouch: function (on) { if (touchRow) touchRow.hidden = !on; },
      // Render power-up pips from makePowerups().list(). Cheap: only touches DOM when the set changes; bars update by transform.
      renderPips: function (list, pal) {
        var ids = list.map(function (p) { return p.id; }).join("|");
        // Anchor the pips to the canvas's top-left corner, not the stage's,
        // so they sit inside the field whatever the letterboxing.
        if (canvas && list.length) { pips.style.left = (canvas.el.offsetLeft + 10) + "px"; pips.style.top = (canvas.el.offsetTop + 10) + "px"; }
        if (pips.getAttribute("data-ids") !== ids) {
          pips.setAttribute("data-ids", ids); pips.textContent = "";
          list.forEach(function (p) {
            var pip = el("span", NS + "-pip"); pip.setAttribute("data-pip", p.id);
            var lab = el("span", NS + "-pip__label", p.label); var bar = el("span", NS + "-pip__bar");
            pip.style.setProperty("--pip", pal && pal[p.color] ? pal[p.color] : (p.color || "currentColor"));
            pip.appendChild(lab); pip.appendChild(bar); pips.appendChild(pip);
          });
        }
        var kids = pips.children;
        for (var i = 0; i < kids.length && i < list.length; i++) {
          var bar2 = kids[i].lastChild; bar2.style.transform = "scaleX(" + Math.max(0, Math.min(1, list[i].frac)).toFixed(3) + ")";
          if (list[i].uses) kids[i].setAttribute("data-uses", list[i].uses); else kids[i].removeAttribute("data-uses");
        }
      },
      // Fill in defineGame's contract. game: { activate, deactivate, onKeydown(e), onKeyup(e), held }
      mount: function (game) {
        // Orientation class: the stage's shape (portrait below 0.9, as the
        // games choose their field) and the window's. When either flips
        // mid-session the game hears onViewport(portraitStage): it pauses a
        // run, or re-lays an idle field.
        var orient = null;
        function orientation() {
          return (canvas.aspect() < 0.9 ? "p" : "l") + (window.innerWidth > window.innerHeight ? "L" : "P");
        }
        function fitAll() {
          canvas.fit();
          checkFit();
          var o = orientation();
          if (orient !== null && o !== orient && typeof game.onViewport === "function") game.onViewport(o.charAt(0) === "p");
          orient = o;
        }
        overlay.game = {
          activate: function () { if (canvas) orient = orientation(); game.activate(); checkFit(); },
          deactivate: game.deactivate, held: game.held || held
        };
        overlay._canvas = canvas ? canvas.el : null;
        overlay._fitCanvas = canvas ? fitAll : null;
        overlay._onKeydown = function (e) {
          var t = e.target;
          var tag = t && t.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
          if (tag === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
          if (e.key === "Escape") { e.preventDefault(); if (typeof opts.onClose === "function") opts.onClose(); closeGame(); return; }
          if (e.key === "m" || e.key === "M") { if (synth) { synth.toggleMute(); syncMute(); } return; }
          if (typeof game.onKeydown === "function") game.onKeydown(e);
        };
        overlay._onKeyup = function (e) { if (typeof game.onKeyup === "function") game.onKeyup(e); };
        return overlay;
      }
    };
    return shell;
  }

  // A run summary board for the game-over prompt: chapter reached, best chain,
  // then the leaderboard (with the initials form first when the score places).
  // opts: { gameKey, score, lines: [[label, value], ...], onSaved }
  function runSummary(mount, opts) {
    opts = opts || {};
    var dl = el("dl", NS + "-summary");
    (opts.lines || []).forEach(function (row) {
      var dt = el("dt", null, row[0]); var dd = el("dd", null, String(row[1]));
      dl.appendChild(dt); dl.appendChild(dd);
    });
    if (opts.lines && opts.lines.length) mount.appendChild(dl);
    var lbMount = el("div", NS + "-summary__board");
    mount.appendChild(lbMount);
    if (opts.gameKey && leaderboard.qualifies(opts.gameKey, opts.score)) {
      var entry = mountInitialsEntry(lbMount, {
        gameKey: opts.gameKey, score: opts.score, defaultInitials: lastInitials(),
        onDone: function (rank, initials) {
          rememberInitials(initials);
          lbMount.textContent = "";
          renderLeaderboard(lbMount, opts.gameKey, { highlightRank: rank });
          if (typeof opts.onSaved === "function") opts.onSaved(rank);
        }
      });
      return { initials: entry };
    }
    if (opts.gameKey) renderLeaderboard(lbMount, opts.gameKey, {});
    return { initials: null };
  }
  var INITIALS_KEY = "gms-arcade-initials";
  function lastInitials() { try { return window.localStorage.getItem(INITIALS_KEY) || "AAA"; } catch (e) { return "AAA"; } }
  function rememberInitials(v) { try { window.localStorage.setItem(INITIALS_KEY, sanitizeInitials(v)); } catch (e) {} }

  // Fetch a JSON data file once and share it between opens of the same game.
  var jsonCache = {};
  function loadJSON(url, ok, fail) {
    if (jsonCache[url]) { ok(jsonCache[url]); return; }
    if (!window.fetch) { fail(new Error("no fetch")); return; }
    window.fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (data) { jsonCache[url] = data; ok(data); }).catch(function (err) { fail(err); });
  }

  // Local-only debug handles (window.__gmsArcade[key]) so a game's states can
  // be driven from the console while verifying. Never registered on the live site.
  var debugHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  function debug(key, api) {
    if (!debugHost) return;
    window.__gmsArcade = window.__gmsArcade || {};
    window.__gmsArcade[key] = api;
  }

  // Frame loop with a fixed logical step (60 Hz) and a render per frame.
  // update(dtFrames) is called with dt clamped to 3 frames so a background
  // tab never fast-forwards the world when it returns.
  function makeLoop(update, render) {
    var raf = null, last = 0, running = false;
    function frame(now) {
      if (!running) return;
      var dt = last ? (now - last) / (1000 / 60) : 1;
      last = now;
      if (dt > 3) dt = 3;
      if (dt < 0.05) dt = 0.05;
      update(dt);
      render(dt);
      raf = window.requestAnimationFrame(frame);
    }
    return {
      start: function () { if (running) return; running = true; last = 0; raf = window.requestAnimationFrame(frame); },
      stop: function () { running = false; if (raf) { window.cancelAnimationFrame(raf); raf = null; } },
      running: function () { return running; }
    };
  }

  window.GMSArcade = {
    ns: NS,
    ready: ready,
    // Core v2
    theme: theme,
    onThemeChange: onThemeChange,
    color: { alpha: alphaColor, mix: mixColor, shade: shadeColor, parse: parseHex, hex: toHex },
    makeCanvas: makeCanvas,
    draw: draw,
    makeParticles: makeParticles,
    makeFloaters: makeFloaters,
    makeStory: makeStory,
    makePowerups: makePowerups,
    progress: progress,
    dayKey: dayKey,
    dayNumber: dayNumber,
    dailySeed: dailySeed,
    hashString: hashString,
    rng: rng,
    streak: streak,
    daily: daily,
    share: share,
    makeInput: makeInput,
    makeShell: makeShell,
    runSummary: runSummary,
    makeLoop: makeLoop,
    debug: debug,
    decorateHub: decorateHub,
    loadJSON: loadJSON,
    el: el,
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
  // After the export: decorateHub reads stores defined above, and ready()
  // runs synchronously when the script is deferred.
  ready(decorateHub);
})();
