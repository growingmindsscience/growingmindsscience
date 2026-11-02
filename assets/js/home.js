/* Growing Minds Science: home.js
   The homepage's behavior, also loaded by inner pages on the same system for
   their entrances (every other part is guarded and does nothing there).
   The header, menu and theme live in chrome.js.
   - The plate: "Show what's beneath" reveals the typeset labels over the photograph.
   - The Lens: a four-step tablist; the plate's labels follow the active step.
   - The Lens sequence (homepage): a carousel of four frames; its rail, arrows and phone bar
     follow the scroll.
   - The age row: a progress bar for the sideways row on narrow screens.
   - Entrances: [data-rise] parts rise once. Anything in the first screen plays
     from load (field-guide.css); anything below it waits and plays as it enters.
   - Questions: an address or link naming a <details> (#id) opens it under the header.
   - Contents: nav[data-toc] opens beside the text on wide screens and marks the
     section in view with aria-current="location".
   Motion is gated by <html class="anim">; without it, content is simply visible.
   CSP-safe: external script, no inline handlers, no eval. */
(function () {
  "use strict";
  var root = document.documentElement;
  var body = document.body;
  body.classList.add("js");

  function listen(mql, fn) {
    if (mql.addEventListener) mql.addEventListener("change", fn);
    else if (mql.addListener) mql.addListener(fn);
  }

  /* Entrances. field-guide.css plays every [data-rise] once from page load. Here, anything that
     starts below the first screen is held (.rise-wait) and plays as it scrolls into view (.is-in),
     so the entrance happens where the reader is. Nothing is gated on it: whatever is in or above
     the first screen keeps its load sequence; keyboard focus, reaching the foot of the page and
     the print dialog show what is still held at once; without html.anim (no script, reduced
     motion) or IntersectionObserver nothing is held. */
  var rises = Array.prototype.slice.call(document.querySelectorAll("[data-rise]"));
  function enter(el) { el.classList.add("is-in"); }
  if (root.classList.contains("anim") && "IntersectionObserver" in window && rises.length) {
    var fold = window.innerHeight || root.clientHeight;
    // Read every position first, then write, so the page lays out once.
    var held = rises.filter(function (el) { return el.getBoundingClientRect().top >= fold; });
    rises.forEach(function (el) { if (held.indexOf(el) === -1) enter(el); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { enter(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    held.forEach(function (el) { el.classList.add("rise-wait"); io.observe(el); });
    var release = function (el) { if (!el.classList.contains("is-in")) { enter(el); io.unobserve(el); } };
    window.addEventListener("beforeprint", function () { held.forEach(release); });
    document.addEventListener("focusin", function (e) {
      for (var el = e.target; el && el.classList; el = el.parentElement) {
        if (el.classList.contains("rise-wait")) release(el);
      }
    });
    // A short part at the very foot of a page may never cross the observer's line: at the bottom,
    // show whatever is on screen.
    window.addEventListener("scroll", function () {
      if (window.innerHeight + window.pageYOffset < root.scrollHeight - 4) return;
      held.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) release(el); });
    }, { passive: true });
  } else {
    rises.forEach(enter);
  }

  /* Questions. A link or the address naming a <details> (or something inside one) opens it and
     brings it under the sticky header (scroll-margin-top in CSS), on load and on every hash
     change. Without script the link still lands on the closed question. */
  function openFromHash(smooth) {
    var id = "";
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    var target = id && document.getElementById(id);
    if (!target || !target.closest) return;
    var details = target.closest("details");
    if (!details || details.closest(".site-header")) return;
    for (var d = details; d; d = d.parentElement && d.parentElement.closest("details")) d.open = true;
    target.scrollIntoView({ block: "start", behavior: smooth && root.classList.contains("anim") ? "smooth" : "auto" });
  }
  openFromHash(false);
  window.addEventListener("hashchange", function () { openFromHash(true); });

  /* Contents: nav[data-toc]. Its <details> is open beside the text at 1100px and up (a label
     there, not a control) and a closed row below, which closes again once a section is chosen.
     The link for the section in view carries aria-current="location". */
  var wideToc = window.matchMedia("(min-width: 1100px)");
  var siteHeader = document.querySelector(".site-header");
  document.querySelectorAll("nav[data-toc]").forEach(function (nav) {
    var fold = nav.querySelector("details");
    var summary = fold && fold.querySelector("summary");
    if (fold && summary) {
      var syncFold = function () {
        fold.open = wideToc.matches;
        if (wideToc.matches) summary.setAttribute("tabindex", "-1"); else summary.removeAttribute("tabindex");
      };
      summary.addEventListener("click", function (e) { if (wideToc.matches) e.preventDefault(); });
      fold.addEventListener("click", function (e) {
        if (!wideToc.matches && e.target.closest && e.target.closest('a[href^="#"]')) fold.open = false;
      });
      syncFold();
      listen(wideToc, syncFold);
    }
    var items = [];
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var t = null;
      try { t = document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1))); } catch (_) {}
      if (t) items.push({ a: a, t: t });
    });
    if (!items.length) return;
    var current = null, ticking = false;
    function mark() {
      ticking = false;
      var line = (siteHeader ? siteHeader.getBoundingClientRect().bottom : 0) + 32;
      var next = null;
      if (window.innerHeight + window.pageYOffset >= root.scrollHeight - 2) next = items[items.length - 1];
      else {
        for (var i = 0; i < items.length; i++) {
          if (items[i].t.getBoundingClientRect().top <= line) next = items[i]; else break;
        }
      }
      if (next === current) return;
      if (current) current.a.removeAttribute("aria-current");
      if (next) next.a.setAttribute("aria-current", "location");
      current = next;
    }
    function queue() { if (!ticking) { ticking = true; window.requestAnimationFrame(mark); } }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue, { passive: true });
    mark();
  });

  /* The plate's labels */
  var toggle = document.querySelector("[data-plate-toggle]");
  var labels = toggle && document.getElementById(toggle.getAttribute("aria-controls"));
  if (toggle && labels) {
    // The name stays "Show what's beneath"; aria-pressed and the pressed fill carry the state.
    toggle.addEventListener("click", function () {
      var on = toggle.getAttribute("aria-pressed") !== "true";
      toggle.setAttribute("aria-pressed", String(on));
      labels.setAttribute("data-on", String(on));
    });
  }

  /* The Lens tablist */
  document.querySelectorAll("[data-tabs]").forEach(function (list) {
    var scope = list.closest("[data-tabs-scope]") || document;
    var tabs = Array.prototype.slice.call(list.querySelectorAll("[data-tab]"));
    var status = scope.querySelector("[data-tabs-status]");
    function select(id, focus) {
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-tab") === id;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      scope.querySelectorAll("[data-panel]").forEach(function (p) {
        var on = p.getAttribute("data-panel") === id;
        p.hidden = !on;
      });
      scope.querySelectorAll("[data-for]").forEach(function (el) {
        el.setAttribute("data-active", String(el.getAttribute("data-for").split(" ").indexOf(id) !== -1));
      });
      scope.setAttribute("data-step", id);
      if (status) status.textContent = "Showing " + id;
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t.getAttribute("data-tab"), false); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % tabs.length;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") n = 0;
        if (e.key === "End") n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(tabs[n].getAttribute("data-tab"), true); }
      });
    });
    scope.querySelectorAll("[data-goto]").forEach(function (b) {
      b.addEventListener("click", function () {
        select(b.getAttribute("data-goto"), true);
        var panel = scope.querySelector('[data-panel="' + b.getAttribute("data-goto") + '"]');
        if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: "start" });
      });
    });
    var initial = tabs[0].getAttribute("data-tab");
    var hash = location.hash.replace("#", "");
    tabs.forEach(function (t) { if (t.getAttribute("data-tab") === hash) initial = hash; });
    select(initial, false);
  });

  /* The Lens sequence: a carousel of frames. The rail, the arrows and the phone bar follow the
     scroll position, so swiping, tapping and the keyboard always agree. The track is only as tall
     as the frame in view, and on phones changing frames from partway down a frame brings the new
     frame's photograph back into view. */
  var phone = window.matchMedia("(max-width: 699px)");
  document.querySelectorAll("[data-seq]").forEach(function (seq) {
    var track = seq.querySelector("[data-seq-track]");
    var slides = Array.prototype.slice.call(track.children);
    var steps = Array.prototype.slice.call(seq.querySelectorAll("[data-seq-go]"));
    var dots = Array.prototype.slice.call(seq.querySelectorAll("[data-seq-dots] i"));
    var prev = seq.querySelector("[data-seq-prev]");
    var next = seq.querySelector("[data-seq-next]");
    var status = seq.querySelector("[data-seq-status]");
    var header = document.querySelector(".site-header");
    var current = -1, settled = 0, timer = 0, ticking = false;
    function motion() { return root.classList.contains("anim") ? "smooth" : "auto"; }
    function mark(i) {
      if (i === current) return;
      current = i;
      var state = function (k) { return k < i ? "past" : k === i ? "now" : "next"; };
      steps.forEach(function (s, k) {
        s.setAttribute("data-state", state(k));
        if (k === i) s.setAttribute("aria-current", "step"); else s.removeAttribute("aria-current");
      });
      dots.forEach(function (d, k) { d.setAttribute("data-state", state(k)); });
      // Only the frame in view is in the reading and tab order; the others stay tappable to move to them.
      slides.forEach(function (s, k) {
        if (k === i) { s.setAttribute("data-current", ""); s.removeAttribute("aria-hidden"); }
        else { s.removeAttribute("data-current"); s.setAttribute("aria-hidden", "true"); }
        s.querySelectorAll("a, button").forEach(function (el) { if (k === i) el.removeAttribute("tabindex"); else el.tabIndex = -1; });
      });
      // aria-disabled rather than disabled, so keyboard focus stays on the arrow at either end.
      if (prev) prev.setAttribute("aria-disabled", String(i === 0));
      if (next) next.setAttribute("aria-disabled", String(i === slides.length - 1));
    }
    function fit() {
      if (current >= 0) track.style.height = slides[current].offsetHeight + "px";
    }
    function reveal() {
      if (!phone.matches) return;
      var top = track.getBoundingClientRect().top;
      var under = header ? header.getBoundingClientRect().bottom : 0;
      if (top < under) window.scrollTo({ top: window.scrollY + top - under - 12, behavior: motion() });
    }
    function settle() {
      fit();
      if (current !== settled) {
        settled = current;
        reveal();
        if (status) status.textContent = "Frame " + slides[current].getAttribute("aria-label");
      }
    }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: slides[i].offsetLeft - slides[0].offsetLeft, behavior: motion() });
      mark(i);
      settled = i;
      reveal();
      clearTimeout(timer);
      timer = setTimeout(settle, 400);
      if (status) status.textContent = "Frame " + slides[i].getAttribute("aria-label");
    }
    track.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          var x = track.scrollLeft, best = 0, d = Infinity;
          slides.forEach(function (s, k) {
            var dk = Math.abs(s.offsetLeft - slides[0].offsetLeft - x);
            if (dk < d) { d = dk; best = k; }
          });
          mark(best);
        });
      }
      clearTimeout(timer);
      timer = setTimeout(settle, 150);
    }, { passive: true });
    steps.forEach(function (s, k) { s.addEventListener("click", function () { go(k); }); });
    if (prev) prev.addEventListener("click", function () { go(current - 1); });
    if (next) next.addEventListener("click", function () { go(current + 1); });
    // A tap on the frame peeking in at the edge moves to it.
    slides.forEach(function (s, k) { s.addEventListener("click", function () { if (k !== current) go(k); }); });
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(fit);
      slides.forEach(function (s) { ro.observe(s); });
    }
    mark(0);
    fit();
  });
  /* Age picker on the homepage classes section: choosing an age marks the class
     that covers it and shows that age in one line. Without script each age is a
     plain link to its Explore page. */
  var picker = document.querySelector("[data-agepick]");
  if (picker) {
    var note = picker.querySelector("[data-agepick-note]");
    var opts = Array.prototype.slice.call(picker.querySelectorAll(".agepick__opt"));
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-class-id]"));
    var classNames = {};
    items.forEach(function (it) { var a = it.querySelector("h3 a"); if (a) classNames[it.getAttribute("data-class-id")] = { name: a.textContent, href: a.getAttribute("href") }; });
    opts.forEach(function (o) { o.setAttribute("role", "button"); o.setAttribute("aria-pressed", "false"); });
    var choose = function (o) {
      opts.forEach(function (x) { x.setAttribute("aria-pressed", x === o ? "true" : "false"); });
      var cid = o.getAttribute("data-class"), yrs = o.textContent;
      items.forEach(function (it) {
        var on = it.getAttribute("data-class-id") === cid;
        it.classList.toggle("is-match", on);
        Array.prototype.forEach.call(it.querySelectorAll(".menu__windows li"), function (li) {
          var y = li.querySelector(".yrs");
          li.classList.toggle("is-match", on && !!y && y.textContent === yrs);
        });
      });
      var cls = classNames[cid] || { name: "", href: "/classes/" };
      note.innerHTML = "";
      var name = document.createElement("p"); name.className = "agepick__name"; name.textContent = o.getAttribute("data-name");
      var line = document.createElement("p"); line.className = "agepick__line"; line.textContent = o.getAttribute("data-line");
      var links = document.createElement("p"); links.className = "agepick__links";
      var c = document.createElement("a"); c.href = cls.href; c.textContent = "See " + cls.name;
      var e = document.createElement("a"); e.href = o.getAttribute("href"); e.textContent = "Explore " + yrs.toLowerCase().replace(/^birth/, "birth");
      links.appendChild(c); links.appendChild(e);
      note.appendChild(name); note.appendChild(line); note.appendChild(links);
      note.hidden = false;
    };
    opts.forEach(function (o) {
      o.addEventListener("click", function (ev) { ev.preventDefault(); choose(o); });
      o.addEventListener("keydown", function (ev) { if (ev.key === " ") { ev.preventDefault(); choose(o); } });
    });
  }
})();
