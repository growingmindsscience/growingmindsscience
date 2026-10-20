/* Growing Minds Science: field-guide.js
   The homepage's own behavior (the header, menu and theme live in chrome.js;
   the explorer and the Lens have their own scripts).
   - The masthead plate: four notes beside the plate are the controls; the
     callouts drawn on the plate mirror the active note.
   - The shutter: the plate opens once on load when motion is welcome.
   - Entrances: [data-reveal] parts rise once as they enter; a failsafe
     reveals everything shortly after load so nothing ships blank.
   Everything is gated by <html class="anim">, which the head script sets
   only when reduced motion is not requested; without it, content is simply
   visible. CSP-safe: external script, no inline handlers, no eval. */
(function () {
  "use strict";

  var anim = document.documentElement.classList.contains("anim");

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ------------------------------------------------------------------
  // The plate's notes
  // ------------------------------------------------------------------
  function initPlate() {
    var notes = document.querySelector("[data-notes]");
    var plate = document.querySelector("[data-plate]");
    if (!notes || !plate) return;
    var buttons = Array.prototype.slice.call(notes.querySelectorAll("[data-note]"));
    var callouts = Array.prototype.slice.call(plate.querySelectorAll("[data-callout]"));
    notes.classList.add("is-live");

    // Phones see the scene itself, not the whole sheet.
    var svg = plate.querySelector("svg");
    var narrow = window.matchMedia("(max-width: 720px)");
    function fit() {
      if (!svg) return;
      svg.setAttribute("viewBox", narrow.matches ? "150 70 940 350" : "0 0 1200 420");
    }
    fit();
    if (narrow.addEventListener) narrow.addEventListener("change", fit);

    function activate(id) {
      buttons.forEach(function (b) {
        var on = b.getAttribute("data-note") === id;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      callouts.forEach(function (c) {
        c.classList.toggle("is-active", c.getAttribute("data-callout") === id);
      });
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { activate(b.getAttribute("data-note")); });
    });
    callouts.forEach(function (c) {
      c.addEventListener("click", function () {
        var id = c.getAttribute("data-callout");
        activate(id);
        var b = notes.querySelector('[data-note="' + id + '"]');
        if (b) b.focus({ preventScroll: true });
      });
    });
  }

  // ------------------------------------------------------------------
  // The shutter, once
  // ------------------------------------------------------------------
  function initShutter() {
    var s = document.querySelector("[data-shutter]");
    if (!s) return;
    if (!anim) { s.classList.add("is-in"); return; }
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { s.classList.add("is-in"); });
    });
  }

  // ------------------------------------------------------------------
  // Entrances, once
  // ------------------------------------------------------------------
  function initReveal() {
    var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (!targets.length) return;
    if (!anim || !("IntersectionObserver" in window)) {
      targets.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    targets.forEach(function (n) { io.observe(n); });

    // Failsafe: the entrance is an enhancement, never a gate on content.
    function revealAll() {
      io.disconnect();
      targets.forEach(function (n) { n.classList.add("is-in"); });
    }
    window.addEventListener("load", function () { window.setTimeout(revealAll, 1800); });
    window.addEventListener("beforeprint", revealAll);
  }

  ready(function () {
    initPlate();
    initShutter();
    initReveal();
  });
})();
