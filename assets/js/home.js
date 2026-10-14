/* Growing Minds Science: home.js
   The homepage's own behaviour (the header, menu and theme live in chrome.js).
   - The plate: "Show what's growing" reveals the typeset labels over the photograph.
   - The Lens: a four-step tablist; the plate's labels follow the active step.
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
