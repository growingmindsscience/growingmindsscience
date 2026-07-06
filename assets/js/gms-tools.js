/* Growing Minds Science — gms-tools.js
   Shared, no-build helper layer for the parent tools. Exposes a single global
   `window.GMS`. Loaded alongside main.js on tool pages, the tools hub, the
   milestone tracker, and the "right now" router.

   Sections:
     - Safe storage (mirrors the main.js localStorage-with-memory-fallback pattern)
     - Child profile   (gms-child-v1)  — local only, no account, never transmitted
     - Saved shelf      (gms-shelf-v1)  — "what works for us"
     - Speech           (Web Speech API, feature-detected)
     - Ask-AI link builder
     - Decoder enhancer (generalizes the per-page meltdown toggle script)
     - UI mounts        (profile chip/editor, shelf view, age-aware reordering)

   Everything degrades safely: if localStorage is blocked we fall back to an
   in-memory store; if a feature is unsupported the affordance is hidden.
*/
(function () {
  "use strict";

  if (window.GMS) return; // idempotent — safe if included twice

  /* ---------- Safe storage (same shape as main.js) ---------- */
  var memoryStore = {};
  var storage = (function () {
    try {
      var k = "__gms_test__";
      var s = window["local" + "Storage"];
      s.setItem(k, "1"); s.removeItem(k);
      return s;
    } catch (_) { return null; }
  })();
  function readRaw(key) {
    if (storage) { try { return storage.getItem(key); } catch (_) {} }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }
  function writeRaw(key, value) {
    if (storage) { try { storage.setItem(key, value); return; } catch (_) {} }
    memoryStore[key] = value;
  }
  function removeRaw(key) {
    if (storage) { try { storage.removeItem(key); return; } catch (_) {} }
    delete memoryStore[key];
  }
  function readJSON(key, fallback) {
    var raw = readRaw(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }
  function writeJSON(key, value) { writeRaw(key, JSON.stringify(value)); }

  /* ---------- Small helpers ---------- */
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }
  function uid(prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 9);
  }
  function makeEmitter() {
    var subs = [];
    return {
      emit: function () { subs.slice().forEach(function (fn) { try { fn(); } catch (_) {} }); },
      on: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (s) { return s !== fn; }); }; }
    };
  }

  /* ---------- Age bands (shared with the milestone tracker) ---------- */
  // Each band maps to an inclusive month range. The seven strings are identical
  // to milestones.html's ageBands so a profile can deep-link into the tracker.
  var AGE_BANDS = [
    { band: "0-3 months",   key: "0-3",   min: 0,  max: 3,  label: "0–3 months" },
    { band: "4-6 months",   key: "4-6",   min: 4,  max: 6,  label: "4–6 months" },
    { band: "7-9 months",   key: "7-9",   min: 7,  max: 9,  label: "7–9 months" },
    { band: "10-12 months", key: "10-12", min: 10, max: 12, label: "10–12 months" },
    { band: "13-18 months", key: "13-18", min: 13, max: 18, label: "13–18 months" },
    { band: "19-24 months", key: "19-24", min: 19, max: 24, label: "19–24 months" },
    { band: "25-36 months", key: "25-36", min: 25, max: 36, label: "25–36 months" }
  ];
  function monthsToBand(months) {
    if (months == null || isNaN(months)) return null;
    var m = Math.max(0, Math.round(months));
    for (var i = 0; i < AGE_BANDS.length; i++) {
      if (m <= AGE_BANDS[i].max) return AGE_BANDS[i];
    }
    return AGE_BANDS[AGE_BANDS.length - 1]; // clamp anything over 3y to the top band
  }
  function bandByString(str) {
    for (var i = 0; i < AGE_BANDS.length; i++) if (AGE_BANDS[i].band === str) return AGE_BANDS[i];
    return null;
  }
  function monthsFromBirthdate(iso) {
    if (!iso) return null;
    var b = new Date(iso + "T00:00:00");
    if (isNaN(b.getTime())) return null;
    var now = new Date();
    var months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
    if (now.getDate() < b.getDate()) months -= 1;
    return Math.max(0, months);
  }
  // Coarse, human age phrase for AI prompts and labels — never sends birthdate.
  function agePhrase(months) {
    if (months == null) return "";
    if (months < 1) return "newborn";
    if (months < 24) return months + "-month-old";
    var years = Math.floor(months / 12);
    return years + "-year-old";
  }

  /* ---------- Child profile ---------- */
  var CHILD_KEY = "gms-child-v1";
  var profileEvents = makeEmitter();

  function loadChildState() {
    var s = readJSON(CHILD_KEY, null);
    if (!s || !Array.isArray(s.children)) return { activeId: null, children: [] };
    return s;
  }
  function saveChildState(s) { writeJSON(CHILD_KEY, s); profileEvents.emit(); }

  function childMonths(child) {
    if (!child) return null;
    if (child.birthdate) return monthsFromBirthdate(child.birthdate);
    if (child.band) { var b = bandByString(child.band); return b ? b.min : null; }
    return null;
  }
  function childBand(child) {
    if (!child) return null;
    if (child.birthdate) return monthsToBand(monthsFromBirthdate(child.birthdate));
    if (child.band) return bandByString(child.band);
    return null;
  }

  var profile = {
    getAll: function () { return loadChildState().children.slice(); },
    getActive: function () {
      var s = loadChildState();
      return s.children.filter(function (c) { return c.id === s.activeId; })[0] || s.children[0] || null;
    },
    setActive: function (id) { var s = loadChildState(); s.activeId = id; saveChildState(s); },
    add: function (data) {
      var s = loadChildState();
      var child = {
        id: uid("c"),
        name: (data.name || "").trim(),
        birthdate: data.birthdate || null,
        band: data.birthdate ? null : (data.band || null),
        createdAt: Date.now()
      };
      s.children.push(child);
      s.activeId = child.id;
      saveChildState(s);
      return child;
    },
    update: function (id, data) {
      var s = loadChildState();
      s.children = s.children.map(function (c) {
        if (c.id !== id) return c;
        return {
          id: c.id, createdAt: c.createdAt,
          name: (data.name != null ? data.name : c.name || "").trim(),
          birthdate: data.birthdate || null,
          band: data.birthdate ? null : (data.band || null)
        };
      });
      saveChildState(s);
    },
    remove: function (id) {
      var s = loadChildState();
      s.children = s.children.filter(function (c) { return c.id !== id; });
      if (s.activeId === id) s.activeId = s.children[0] ? s.children[0].id : null;
      saveChildState(s);
    },
    clearAll: function () { removeRaw(CHILD_KEY); profileEvents.emit(); },
    ageInMonths: function (child) { return childMonths(child || profile.getActive()); },
    ageBand: function (child) { return childBand(child || profile.getActive()); },
    agePhrase: function (child) { return agePhrase(childMonths(child || profile.getActive())); },
    onChange: profileEvents.on,
    BANDS: AGE_BANDS
  };

  /* ---------- Saved shelf ---------- */
  var SHELF_KEY = "gms-shelf-v1";
  var shelfEvents = makeEmitter();
  function loadShelf() {
    var s = readJSON(SHELF_KEY, null);
    return (s && Array.isArray(s.items)) ? s : { items: [] };
  }
  function saveShelf(s) { writeJSON(SHELF_KEY, s); shelfEvents.emit(); }

  var shelf = {
    list: function () { return loadShelf().items.slice().sort(function (a, b) { return b.savedAt - a.savedAt; }); },
    has: function (key) { return loadShelf().items.some(function (i) { return i.key === key; }); },
    add: function (item) {
      var s = loadShelf();
      if (s.items.some(function (i) { return i.key === item.key; })) return; // no dupes
      s.items.push({
        id: uid("s"),
        key: item.key,
        toolSlug: item.toolSlug || "",
        toolTitle: item.toolTitle || "",
        toolUrl: item.toolUrl || "",
        title: item.title || "",
        body: item.body || "",
        tryLine: item.tryLine || "",
        savedAt: Date.now()
      });
      saveShelf(s);
    },
    removeByKey: function (key) {
      var s = loadShelf();
      s.items = s.items.filter(function (i) { return i.key !== key; });
      saveShelf(s);
    },
    removeById: function (id) {
      var s = loadShelf();
      s.items = s.items.filter(function (i) { return i.id !== id; });
      saveShelf(s);
    },
    clear: function () { removeRaw(SHELF_KEY); shelfEvents.emit(); },
    onChange: shelfEvents.on
  };

  /* ---------- Speech (Listen) ---------- */
  var speechSupported = ("speechSynthesis" in window) && ("SpeechSynthesisUtterance" in window);
  var currentUtterance = null;
  function speak(text, onEnd) {
    if (!speechSupported || !text) return false;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.96; u.pitch = 1.0;
      u.onend = u.onerror = function () { currentUtterance = null; if (onEnd) onEnd(); };
      currentUtterance = u;
      window.speechSynthesis.speak(u);
      return true;
    } catch (_) { return false; }
  }
  function stopSpeaking() {
    if (!speechSupported) return;
    try { window.speechSynthesis.cancel(); } catch (_) {}
    currentUtterance = null;
  }
  // Stop narration when the page is hidden or navigated away.
  window.addEventListener("pagehide", stopSpeaking);
  window.addEventListener("beforeunload", stopSpeaking);

  /* ---------- Print a pocket card ---------- */
  // Adds a body flag so the scoped @media print rule shows only .pocket-card,
  // then restores normal printing afterward. Normal Ctrl+P is left untouched.
  function printCard() {
    document.body.classList.add("printing-pocket");
    var after = function () {
      document.body.classList.remove("printing-pocket");
      window.removeEventListener("afterprint", after);
    };
    window.addEventListener("afterprint", after);
    setTimeout(after, 1500); // fallback if afterprint never fires
    window.print();
  }

  /* ---------- Ask-AI link builder ---------- */
  // Builds a /tools/growing-minds-ai?q=... link. When a profile exists and
  // `personalize` is true, prepends a coarse age phrase (never name/birthdate).
  function askUrl(question, opts) {
    opts = opts || {};
    var q = question || "";
    if (opts.personalize !== false) {
      var child = profile.getActive();
      var phrase = child ? profile.agePhrase(child) : "";
      if (phrase) q = "For my " + phrase + ": " + q;
    }
    return "/tools/growing-minds-ai?q=" + encodeURIComponent(q);
  }

  /* ---------- Decoder enhancer ---------- */
  // Generalizes the per-page meltdown toggle. Any element:
  //   <div class="decoder" data-decoder> ...
  //     <button class="decoder-btn" data-pattern="x" aria-pressed="true|false">
  //     <article class="decoder-output" data-output="x" [hidden]>
  // is wired for tab toggling, and each output gets a Save / Listen / Ask row.
  function btnKey(b) { return b.dataset.pattern || b.dataset.scenario; }

  function initDecoders(root) {
    var scope = root || document;

    // 1) Toggle wiring — only for canonical .decoder / [data-decoder] blocks,
    //    i.e. the pages whose inline toggle script was removed. Pages that keep
    //    their own toggle (routines' .pattern-wrap, limits' .scenario-wrap) are
    //    intentionally left alone here to avoid double-binding.
    var decoders = scope.querySelectorAll(".decoder, [data-decoder]");
    [].forEach.call(decoders, function (dec) {
      if (dec.dataset.gmsDecoder === "on") return;
      dec.dataset.gmsDecoder = "on";
      var buttons = dec.querySelectorAll(".decoder-btn, [data-pattern], [data-scenario]");
      var outputs = dec.querySelectorAll(".decoder-output, [data-output]");
      function activate(key) {
        [].forEach.call(buttons, function (b) {
          var on = (btnKey(b) === key);
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        [].forEach.call(outputs, function (o) { o.hidden = (o.dataset.output !== key); });
      }
      [].forEach.call(buttons, function (b) {
        b.addEventListener("click", function () { activate(btnKey(b)); });
      });
    });

    // 2) Save / Listen / Ask — injected into every output article on the page,
    //    across all three decoder variants, however toggling is handled.
    var outputs = scope.querySelectorAll(".decoder-output, .pattern-output, .scenario-output, [data-output]");
    [].forEach.call(outputs, function (o) {
      enhanceOutput(o, o.closest("[data-decoder], .decoder, .pattern-wrap, .scenario-wrap"));
    });
  }

  function readOutputContent(output) {
    var heading = output.querySelector("h3, h4, .decoder-output__title");
    var paras = output.querySelectorAll("p:not(.small)");
    var tryEl = output.querySelector(".small");
    var body = [].map.call(paras, function (p) { return p.textContent.trim(); }).join(" ");
    return {
      title: heading ? heading.textContent.trim() : "",
      body: body,
      tryLine: tryEl ? tryEl.textContent.replace(/^Try:\s*/i, "").trim() : ""
    };
  }

  function toolMeta() {
    var h1 = document.querySelector("h1");
    var slug = location.pathname.replace(/^.*\/tools\//, "").replace(/\.html$/, "").replace(/\/$/, "") || "tools";
    return {
      slug: slug,
      title: (h1 ? h1.textContent.trim() : document.title.split("—")[0].trim()),
      url: location.pathname.replace(/\.html$/, "") + location.hash
    };
  }

  // Adds the Save / Listen / Ask action row to a decoder output (once).
  function enhanceOutput(output, dec) {
    if (output.dataset.gmsActions === "on") return;
    output.dataset.gmsActions = "on";
    var meta = toolMeta();
    var content = readOutputContent(output);
    var key = meta.slug + ":" + (output.dataset.output || uid("o"));
    var aiQuestion = (dec && dec.dataset.aiQuestion) || output.dataset.aiQuestion ||
      (content.title ? content.title.replace(/[.?!]+$/, "") + "?" : ("Tell me more about " + meta.title.toLowerCase()));
    output.appendChild(buildActionRow({
      key: key, meta: meta, content: content, aiQuestion: aiQuestion
    }));
  }

  function buildActionRow(cfg) {
    var row = el("div", { class: "gms-actions", role: "group", "aria-label": "Save, listen, or ask about this" });

    // Save
    var saved = shelf.has(cfg.key);
    var saveBtn = el("button", {
      type: "button", class: "gms-action gms-action--save" + (saved ? " is-saved" : ""),
      "aria-pressed": saved ? "true" : "false"
    }, [saved ? "Saved ✓" : "Save this"]);
    saveBtn.addEventListener("click", function () {
      if (shelf.has(cfg.key)) {
        shelf.removeByKey(cfg.key);
      } else {
        shelf.add({
          key: cfg.key, toolSlug: cfg.meta.slug, toolTitle: cfg.meta.title, toolUrl: cfg.meta.url,
          title: cfg.content.title, body: cfg.content.body, tryLine: cfg.content.tryLine
        });
      }
    });
    var syncSave = function () {
      var on = shelf.has(cfg.key);
      saveBtn.classList.toggle("is-saved", on);
      saveBtn.setAttribute("aria-pressed", on ? "true" : "false");
      saveBtn.textContent = on ? "Saved ✓" : "Save this";
    };
    shelf.onChange(syncSave);
    row.appendChild(saveBtn);

    // Listen
    if (speechSupported) {
      var speaking = false;
      var listenBtn = el("button", { type: "button", class: "gms-action gms-action--listen", "aria-pressed": "false" }, ["Listen"]);
      var toText = function () {
        return [cfg.content.title, cfg.content.body, cfg.content.tryLine ? ("Try saying: " + cfg.content.tryLine) : ""]
          .filter(Boolean).join(". ");
      };
      var reset = function () { speaking = false; listenBtn.textContent = "Listen"; listenBtn.setAttribute("aria-pressed", "false"); };
      listenBtn.addEventListener("click", function () {
        if (speaking) { stopSpeaking(); reset(); return; }
        if (speak(toText(), reset)) { speaking = true; listenBtn.textContent = "Stop"; listenBtn.setAttribute("aria-pressed", "true"); }
      });
      row.appendChild(listenBtn);
    }

    // Ask AI
    var askLink = el("a", { class: "gms-action gms-action--ask", href: askUrl(cfg.aiQuestion) }, ["Ask about this"]);
    askLink.addEventListener("click", function () { askLink.href = askUrl(cfg.aiQuestion); });
    row.appendChild(askLink);

    return row;
  }

  /* ---------- Public API ---------- */
  window.GMS = {
    profile: profile,
    shelf: shelf,
    speak: speak,
    stopSpeaking: stopSpeaking,
    speechSupported: speechSupported,
    printCard: printCard,
    askUrl: askUrl,
    agePhrase: agePhrase,
    monthsToBand: monthsToBand,
    bandByString: bandByString,
    initDecoders: initDecoders,
    el: el,
    ready: ready,
    _ui: {} // UI mounts attach here (see gms-tools-ui section below)
  };

  /* =========================================================================
     UI MOUNTS — profile chip/editor, shelf view, age-aware reordering.
     Kept in the same file to avoid extra requests on this no-build site.
     ========================================================================= */

  function fmtChildLabel(child) {
    var band = profile.ageBand(child);
    var name = child.name || "Your child";
    return band ? (name + " · " + band.label) : name;
  }

  /* ----- Profile chip + inline editor ----- */
  function mountProfile(host) {
    if (!host || host.dataset.gmsMounted === "on") return;
    host.dataset.gmsMounted = "on";

    function render() {
      host.innerHTML = "";
      var children = profile.getAll();
      var active = profile.getActive();

      var card = el("div", { class: "gms-profile" });
      var head = el("div", { class: "gms-profile__head" }, [
        el("span", { class: "gms-profile__label", text: "Your child" })
      ]);
      card.appendChild(head);

      if (children.length) {
        var chips = el("div", { class: "gms-profile__chips", role: "group", "aria-label": "Choose the active child" });
        children.forEach(function (c) {
          var isActive = active && c.id === active.id;
          var chip = el("button", {
            type: "button",
            class: "gms-chip" + (isActive ? " is-active" : ""),
            "aria-pressed": isActive ? "true" : "false",
            text: fmtChildLabel(c)
          });
          chip.addEventListener("click", function () { profile.setActive(c.id); });
          chips.appendChild(chip);
        });
        card.appendChild(chips);

        var actions = el("div", { class: "gms-profile__actions" }, [
          el("button", { type: "button", class: "gms-link", text: "Add another", onclick: function () { openEditor(card, null); } }),
          el("button", { type: "button", class: "gms-link gms-link--muted", text: "Remove",
            onclick: function () { if (active) profile.remove(active.id); } })
        ]);
        card.appendChild(actions);
      } else {
        card.appendChild(el("p", { class: "gms-profile__lede",
          text: "Add your child to see the tools that fit their stage first. Optional." }));
        card.appendChild(el("button", { type: "button", class: "btn btn--ghost gms-profile__add",
          text: "Add your child", onclick: function () { openEditor(card, null); } }));
      }

      card.appendChild(el("p", { class: "gms-profile__privacy",
        text: "Saved only in this browser. No account, and nothing is sent to us." }));
      host.appendChild(card);
    }

    function openEditor(card, child) {
      var existing = card.querySelector(".gms-editor");
      if (existing) { existing.remove(); return; }

      var nameId = uid("name"), dateId = uid("date");
      var form = el("form", { class: "gms-editor", novalidate: "novalidate" });
      var chosenBand = child && child.band ? child.band : null;

      form.appendChild(el("div", { class: "gms-field" }, [
        el("label", { for: nameId, text: "First name (optional)" }),
        el("input", { id: nameId, type: "text", autocomplete: "off", maxlength: "40",
          value: child ? (child.name || "") : "", placeholder: "e.g. Nora" })
      ]));

      form.appendChild(el("div", { class: "gms-field" }, [
        el("label", { for: dateId, text: "Birthday" }),
        el("input", { id: dateId, type: "date", value: child ? (child.birthdate || "") : "", max: todayISO() }),
        el("span", { class: "gms-field__hint", text: "Used only to work out your child's stage. Stays on this device." })
      ]));

      var orRow = el("div", { class: "gms-editor__or" }, [
        el("span", { text: "Prefer not to give a date? Pick a stage:" })
      ]);
      var bandWrap = el("div", { class: "gms-bands", role: "group", "aria-label": "Choose an age stage" });
      AGE_BANDS.forEach(function (b) {
        var btn = el("button", { type: "button", class: "gms-band" + (chosenBand === b.band ? " is-active" : ""),
          "aria-pressed": chosenBand === b.band ? "true" : "false", text: b.label });
        btn.addEventListener("click", function () {
          chosenBand = (chosenBand === b.band) ? null : b.band;
          [].forEach.call(bandWrap.children, function (x) {
            var on = x === btn && chosenBand === b.band;
            x.classList.toggle("is-active", on);
            x.setAttribute("aria-pressed", on ? "true" : "false");
          });
          if (chosenBand) form.querySelector("#" + dateId).value = ""; // band and date are mutually exclusive
        });
        bandWrap.appendChild(btn);
      });

      var buttons = el("div", { class: "gms-editor__buttons" }, [
        el("button", { type: "submit", class: "btn btn--primary", text: child ? "Save" : "Add child" }),
        el("button", { type: "button", class: "gms-link gms-link--muted", text: "Cancel",
          onclick: function () { form.remove(); } })
      ]);

      form.appendChild(orRow);
      form.appendChild(bandWrap);
      form.appendChild(buttons);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = form.querySelector("#" + nameId).value;
        var birthdate = form.querySelector("#" + dateId).value;
        if (!birthdate && !chosenBand && !name.trim()) { form.remove(); return; }
        if (child) profile.update(child.id, { name: name, birthdate: birthdate, band: chosenBand });
        else profile.add({ name: name, birthdate: birthdate, band: chosenBand });
      });
      card.appendChild(form);
      var first = form.querySelector("input");
      if (first) first.focus();
    }

    render();
    profile.onChange(render);
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ----- Shelf view ----- */
  function mountShelf(host) {
    if (!host || host.dataset.gmsMounted === "on") return;
    host.dataset.gmsMounted = "on";

    function render() {
      host.innerHTML = "";
      var items = shelf.list();
      if (!items.length) {
        host.appendChild(el("p", { class: "gms-shelf__empty",
          text: "Nothing saved yet. When a tool gives you an answer that fits, tap “Save this” and it will wait for you here." }));
        return;
      }
      var grid = el("div", { class: "gms-shelf__grid" });
      items.forEach(function (it) {
        var card = el("article", { class: "gms-shelf__card" }, [
          el("p", { class: "gms-shelf__tool", text: it.toolTitle || "Saved" }),
          el("h3", { class: "gms-shelf__title", text: it.title || "" }),
          it.tryLine ? el("p", { class: "gms-shelf__try", text: "Try: " + it.tryLine }) : null
        ]);
        var foot = el("div", { class: "gms-shelf__foot" }, [
          it.toolUrl ? el("a", { class: "gms-link", href: it.toolUrl, text: "Open tool" }) : null,
          el("button", { type: "button", class: "gms-link gms-link--muted", text: "Remove",
            onclick: function () { shelf.removeById(it.id); } })
        ]);
        card.appendChild(foot);
        grid.appendChild(card);
      });
      host.appendChild(grid);
    }
    render();
    shelf.onChange(render);
  }

  /* ----- Age-aware reordering of tool lists ----- */
  // Cards opt in with data-age-min / data-age-max (months). When an active
  // child's age falls in a card's range, it floats to the front of its grid and
  // gets a subtle "For your child" flag. No-JS order is the default.
  function reorderToolLists() {
    var active = profile.getActive();
    var months = active ? profile.ageInMonths(active) : null;
    var lists = document.querySelectorAll("[data-gms-tool-list]");
    [].forEach.call(lists, function (list) {
      var cards = [].slice.call(list.querySelectorAll("[data-age-min]"));
      cards.forEach(function (card) {
        var flag = card.querySelector(".gms-foryou");
        if (flag) flag.remove();
        card.classList.remove("is-foryou");
        card.style.order = "";
      });
      if (months == null) return;
      cards.forEach(function (card) {
        var min = parseInt(card.getAttribute("data-age-min"), 10);
        var max = parseInt(card.getAttribute("data-age-max"), 10);
        if (!isNaN(min) && !isNaN(max) && months >= min && months <= max) {
          card.classList.add("is-foryou");
          card.style.order = "-1";
          var eyebrow = card.querySelector(".tool-card__eyebrow");
          var flag = el("span", { class: "gms-foryou", text: "For your child" });
          if (eyebrow && eyebrow.parentNode) eyebrow.parentNode.insertBefore(flag, eyebrow);
          else card.insertBefore(flag, card.firstChild);
        }
      });
    });
  }

  window.GMS._ui = { mountProfile: mountProfile, mountShelf: mountShelf, reorderToolLists: reorderToolLists };

  /* ---------- Auto-init ---------- */
  ready(function () {
    initDecoders(document);
    [].forEach.call(document.querySelectorAll("[data-print-card]"), function (btn) {
      btn.addEventListener("click", printCard);
    });
    var pHost = document.querySelector("[data-gms-profile]");
    if (pHost) mountProfile(pHost);
    var sHost = document.querySelector("[data-gms-shelf]");
    if (sHost) mountShelf(sHost);
    if (document.querySelector("[data-gms-tool-list]")) {
      reorderToolLists();
      profile.onChange(reorderToolLists);
    }
  });
})();
