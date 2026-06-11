/* Growing Minds Science — decor.js
   Tidepool accent motifs for the quiet corners of the site, with gentle
   scroll-linked motion. Purely decorative and progressively enhanced:

   - Injects shared motifs (tide-rings, coral sprig, seed-arc) into known
     dead spaces on inner pages: page/class/article heroes, waitlist bands,
     and CTA cards. Hand-placed motifs (homepage hero & waitlist) are left
     alone — this script only animates them.
   - [data-drift="speed"] elements drift slowly against the scroll
     (parallax), rAF-throttled and IntersectionObserver-gated. Positive
     speeds rise as you scroll down; negative speeds sink. The drift is
     measured from the parent section so the transform never feeds back
     into its own position.
   - .gms-reveal motifs surface shape-by-shape the first time they enter
     the viewport (CSS handles the transitions; JS only adds .is-visible).
   - All motion is gated behind html.gms-motion, added only when the
     visitor welcomes motion. With reduced motion or without JS, motifs
     are simply static decoration.
   CSP-safe: external 'self' script, no inline handlers, no eval.
*/
(function () {
  "use strict";

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var motion = !reduceMotion && "IntersectionObserver" in window;
  if (motion) document.documentElement.classList.add("gms-motion");

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ------------------------------------------------------------------
  // Motif library — same geometry and palette as the homepage hero.
  // Colors come from CSS (.gms-c-* in refresh.css) so motifs follow
  // the page theme, including dark mode.
  // ------------------------------------------------------------------
  var RINGS =
    '<svg viewBox="0 0 460 460" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<g class="gms-float">' +
        '<circle class="gms-c-ring1" cx="318" cy="150" r="206" stroke-width="2"/>' +
        '<circle class="gms-c-ring2" cx="318" cy="150" r="160" stroke-width="2"/>' +
        '<circle class="gms-c-dash gms-spin" cx="318" cy="150" r="116" stroke-width="2" stroke-dasharray="3 11"/>' +
        '<circle class="gms-c-ring1" cx="318" cy="150" r="74" stroke-width="2"/>' +
        '<path class="gms-c-arc" d="M70 360 C 150 322, 232 300, 318 244" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle class="gms-c-seed" cx="112" cy="338" r="6"/>' +
        '<circle class="gms-c-seed2" cx="206" cy="300" r="5"/>' +
        '<circle class="gms-c-seed" cx="318" cy="150" r="6"/>' +
      '</g>' +
    '</svg>';

  var SPRIG =
    '<svg viewBox="0 0 90 130" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<g class="gms-float gms-float--slow">' +
        '<path class="gms-c-stem" d="M45 128 C 44 92, 42 70, 56 40" stroke-width="3.5" stroke-linecap="round"/>' +
        '<path class="gms-c-leaf1" d="M48 86 C 28 82, 16 70, 14 50 C 38 50, 52 64, 48 86 Z"/>' +
        '<path class="gms-c-leaf2" d="M50 64 C 70 58, 82 44, 82 24 C 60 26, 46 42, 50 64 Z"/>' +
        '<circle class="gms-c-seed" cx="56" cy="40" r="6"/>' +
      '</g>' +
    '</svg>';

  var SEEDS =
    '<svg viewBox="0 0 150 110" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<g class="gms-float">' +
        '<path class="gms-c-arc" d="M10 96 C 48 80, 92 52, 138 18" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle class="gms-c-seed" cx="10" cy="96" r="5"/>' +
        '<circle class="gms-c-seed2" cx="72" cy="62" r="4"/>' +
        '<circle class="gms-c-seed" cx="138" cy="18" r="6"/>' +
      '</g>' +
    '</svg>';

  function make(variant, drift, svg) {
    var node = document.createElement("div");
    node.className = "gms-decor gms-decor--" + variant + " gms-reveal";
    node.setAttribute("aria-hidden", "true");
    if (drift) node.setAttribute("data-drift", drift);
    node.innerHTML = svg;
    return node;
  }

  // Skip hosts that already carry hand-placed decor (homepage sections).
  function bare(host) {
    return !host.querySelector(":scope > .gms-decor, :scope > svg, :scope > .hero__decor");
  }

  function inject() {
    document.querySelectorAll(".page-hero, .class-hero, .article-hero, .tool-hero").forEach(function (hero) {
      if (!bare(hero)) return;
      hero.insertBefore(make("hero-sprig", "-0.1", SPRIG), hero.firstChild);
      hero.insertBefore(make("hero-rings", "0.16", RINGS), hero.firstChild);
    });
    document.querySelectorAll("section.signup").forEach(function (band) {
      if (!bare(band)) return;
      band.insertBefore(make("band-rings", "-0.12", RINGS), band.firstChild);
    });
    document.querySelectorAll(".cta-strip, .article-cta").forEach(function (card) {
      if (!bare(card)) return;
      card.insertBefore(make("card-seeds", "", SEEDS), card.firstChild);
    });
  }

  // ------------------------------------------------------------------
  // Reveal — shapes surface one by one the first time a motif is seen
  // ------------------------------------------------------------------
  function initReveal() {
    if (!motion) return; // hidden states only exist under html.gms-motion
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "-30px 0px", threshold: 0.05 });
    document.querySelectorAll(".gms-reveal").forEach(function (n) { io.observe(n); });
  }

  // ------------------------------------------------------------------
  // Drift — slow parallax against the scroll, transform-only
  // ------------------------------------------------------------------
  function initDrift() {
    if (!motion) return;

    var items = [];
    document.querySelectorAll("[data-drift]").forEach(function (el) {
      var speed = parseFloat(el.getAttribute("data-drift"));
      if (!speed || !el.parentElement) return;
      items.push({ el: el, host: el.parentElement, speed: speed, on: false });
    });
    if (!items.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        for (var i = 0; i < items.length; i++) {
          if (items[i].el === entry.target) { items[i].on = entry.isIntersecting; break; }
        }
      });
      schedule();
    }, { rootMargin: "80px 0px" });
    items.forEach(function (d) { io.observe(d.el); });

    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight || 1;
      items.forEach(function (d) {
        if (!d.on) return;
        // Measure from the (untransformed) parent so the drift transform
        // never feeds back into its own input.
        var box = d.host.getBoundingClientRect();
        var progress = (box.top + box.height / 2 - vh / 2) / vh;
        // speed reads as a parallax factor: 0.2 = the motif lags the page
        // by 20% of the scroll distance — clearly visible, never frantic.
        var y = -progress * d.speed * vh;
        d.el.style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
      });
    }
    function schedule() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
  }

  ready(function () {
    inject();
    initReveal();
    initDrift();
  });
}());
