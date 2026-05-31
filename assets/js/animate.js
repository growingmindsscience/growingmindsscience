/* Growing Minds Science — animate.js
   Scroll-triggered fades + staggered reveals via IntersectionObserver.
   CSS handles the actual transitions; JS only toggles .is-visible.
   Mirrors Framer Motion's whileInView / staggerChildren patterns.
*/
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var STAGGER_MS = 75;   // delay between staggered siblings
  var MARGIN     = '-50px 0px';

  function init() {
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

    // Single observer for every [data-animate] element on the page.
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: MARGIN, threshold: 0.01 });

    document.querySelectorAll('[data-animate]').forEach(function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
