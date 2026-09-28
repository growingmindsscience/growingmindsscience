/* Growing Minds Science — animate.js
   Scroll-triggered fades + staggered reveals via IntersectionObserver.
   CSS handles the actual transitions; JS only toggles .is-visible.
   Mirrors Framer Motion's whileInView / staggerChildren patterns.

   The reveal is an enhancement, never a gate on content:
   - refresh.css only hides [data-animate] under <html class="anim">. If this
     page's head did not add it, we add it here, and in the same task mark
     everything already on screen as visible, so nothing the visitor can see
     ever blinks out.
   - Reduced motion or no IntersectionObserver: everything is revealed at once.
   - Failsafes: reveal everything shortly after load (renderers that never
     scroll: link previews, screenshots, reader modes) and before printing.
     refresh.css adds a 2.5s CSS failsafe in case this file never runs.
*/
(function () {
  'use strict';

  var STAGGER_MS = 75;   // delay between staggered siblings
  var MARGIN     = '-50px 0px';
  var root = document.documentElement;

  function items() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-animate]'));
  }
  function revealAll() {
    items().forEach(function (el) { el.classList.add('is-visible'); });
  }

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function init() {
    var els = items();
    if (!els.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    if (!root.classList.contains('anim')) {
      var vh = window.innerHeight || root.clientHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) el.classList.add('is-visible');
      });
      root.classList.add('anim');
    }

    // Assign stagger delays to direct [data-animate] children of [data-stagger] containers.
    // Skip any element that already has an explicit --anim-delay set inline.
    document.querySelectorAll('[data-stagger]').forEach(function (wrap) {
      var kids = Array.prototype.slice.call(wrap.querySelectorAll(':scope > [data-animate]'));
      kids.forEach(function (kid, i) {
        if (!kid.style.getPropertyValue('--anim-delay')) {
          kid.style.setProperty('--anim-delay', (i * STAGGER_MS) + 'ms');
        }
      });
    });

    // Single observer for every [data-animate] element still waiting to reveal.
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: MARGIN, threshold: 0.01 });

    els.forEach(function (el) {
      if (!el.classList.contains('is-visible')) observer.observe(el);
    });

    function finish() {
      observer.disconnect();
      revealAll();
    }
    if (document.readyState === 'complete') window.setTimeout(finish, 900);
    else window.addEventListener('load', function () { window.setTimeout(finish, 900); });
    window.addEventListener('beforeprint', finish);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
