/* Growing Minds Science: home.js
   The homepage's behaviour, also loaded by inner pages on the same system for
   their entrances (every other part is guarded and does nothing there).
   The header, menu and theme live in chrome.js.
   - The plate: "Show what's growing" reveals the typeset labels over the photograph.
   - The Lens: a four-step tablist; the plate's labels follow the active step.
   - The Lens sequence (homepage): a carousel of four frames; its rail, arrows and phone bar
     follow the scroll.
   - The age row: a progress bar for the sideways row on narrow screens.
   - Entrances: [data-rise] parts rise once as they enter; a failsafe reveals
     everything shortly after load so nothing ships blank.
   Gated by <html class="anim">; without it, content is simply visible.
   CSP-safe: external script, no inline handlers, no eval. */
(function () {
  "use strict";
  var root = document.documentElement;
  var body = document.body;
  body.classList.add("js");

  /* Entrances */
  var rises = Array.prototype.slice.call(document.querySelectorAll("[data-rise]"));
  if (root.classList.contains("anim") && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    rises.forEach(function (el) { io.observe(el); });
    setTimeout(function () { rises.forEach(function (el) { el.classList.add("is-in"); }); }, 2500);
  } else {
    rises.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* The plate's labels */
  var toggle = document.querySelector("[data-plate-toggle]");
  var labels = toggle && document.getElementById(toggle.getAttribute("aria-controls"));
  if (toggle && labels) {
    var label = toggle.querySelector("[data-plate-label]");
    toggle.addEventListener("click", function () {
      var on = toggle.getAttribute("aria-pressed") !== "true";
      toggle.setAttribute("aria-pressed", String(on));
      labels.setAttribute("data-on", String(on));
      if (label) label.textContent = on ? "Hide the labels" : "Show what’s growing";
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
    var now = seq.querySelector("[data-seq-now]");
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
      slides.forEach(function (s, k) { if (k === i) s.setAttribute("data-current", ""); else s.removeAttribute("data-current"); });
      var label = steps[i] && steps[i].querySelector("span");
      if (now) now.textContent = (i + 1) + " of " + slides.length + (label ? " \u00b7 " + label.textContent : "");
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
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
      if (current !== settled) { settled = current; reveal(); }
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

  /* The age row's progress bar */
  var row = document.querySelector("[data-agerow]");
  var bar = document.querySelector("[data-agebar]");
  if (row && bar) {
    var upd = function () {
      var max = row.scrollWidth - row.clientWidth;
      var p = max > 0 ? row.scrollLeft / max : 0;
      bar.style.transform = "translateX(" + (p * 400) + "%)";
    };
    row.addEventListener("scroll", upd, { passive: true });
    upd();
  }
})();
