/* Native scrolling guides the homepage Lens. Every lesson remains in the HTML. */
(function () {
  'use strict';
  var scope = document.querySelector('[data-guided-lens]');
  if (!scope || !('IntersectionObserver' in window)) return;
  var beats = Array.from(scope.querySelectorAll('[data-story-beat]'));
  var scene = scope.querySelector('.story-scene');
  var photo = scope.querySelector('.story-photo');
  var image = photo.querySelector('img');
  var frame = scope.querySelector('[data-story-focus]');
  var captions = Array.from(scope.querySelectorAll('[data-story-caption]'));
  var stages = Array.from(scope.querySelectorAll('[data-story-stage]'));
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Coordinates belong to the original photograph, so the hand stays the hand
  // when a narrow screen crops the image differently.
  var regions = {
    observe: [0.17, 0.16, 0.34, 0.68],
    understand: [0.20, 0.17, 0.29, 0.40],
    respond: [0.47, 0.48, 0.22, 0.13]
  };
  var current = '';
  var animation = null;
  var observer = null;
  var readingLine = 0;
  var resizeTimer;
  var scrollTimer;

  function placeFrame(key, animate) {
    var before = frame.getBoundingClientRect();
    if (animation) { animation.cancel(); animation = null; }
    var width = photo.clientWidth;
    var height = photo.clientHeight;
    var region = regions[key];
    var left = width * 0.08;
    var top = height * 0.08;
    var right = width * 0.92;
    var bottom = height * 0.92;
    if (region) {
      var sourceWidth = image.naturalWidth || 1122;
      var sourceHeight = image.naturalHeight || 1402;
      var scale = Math.max(width / sourceWidth, height / sourceHeight);
      var position = getComputedStyle(image).objectPosition.split(' ').map(parseFloat);
      var offsetX = (width - sourceWidth * scale) * position[0] / 100;
      var offsetY = (height - sourceHeight * scale) * position[1] / 100;
      left = Math.max(8, region[0] * sourceWidth * scale + offsetX);
      top = Math.max(8, region[1] * sourceHeight * scale + offsetY);
      right = Math.min(width - 8, (region[0] + region[2]) * sourceWidth * scale + offsetX);
      bottom = Math.min(height - 8, (region[1] + region[3]) * sourceHeight * scale + offsetY);
    }
    // Keep valid geometry even if a future art direction crops a subject out.
    left = Math.min(width - 16, Math.max(8, left));
    top = Math.min(height - 16, Math.max(8, top));
    right = Math.max(left + 8, right);
    bottom = Math.max(top + 8, bottom);
    frame.style.left = left + 'px';
    frame.style.top = top + 'px';
    frame.style.width = (right - left) + 'px';
    frame.style.height = (bottom - top) + 'px';
    if (animate && !motion.matches && frame.animate && before.width && before.height) {
      var after = frame.getBoundingClientRect();
      animation = frame.animate([
        { transform: 'translate(' + (before.left - after.left) + 'px,' + (before.top - after.top) + 'px) scale(' + before.width / after.width + ',' + before.height / after.height + ')' },
        { transform: 'none' }
      ], { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    }
  }

  function selectAtReadingLine() {
    var active = beats[0];
    beats.forEach(function (beat) {
      if (beat.getBoundingClientRect().top <= readingLine + 1) active = beat;
    });
    var key = active.getAttribute('data-story-beat');
    if (key === current) return;
    placeFrame(key, !!current);
    current = key;
    scope.setAttribute('data-step', key);
    captions.forEach(function (caption) { caption.hidden = caption.getAttribute('data-story-caption') !== key; });
    stages.forEach(function (stage) {
      if (stage.getAttribute('data-story-stage') === key) stage.setAttribute('aria-current', 'step');
      else stage.removeAttribute('aria-current');
    });
  }

  function observeReadingLine() {
    if (observer) observer.disconnect();
    var header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
    var phone = window.matchMedia('(max-width: 700px) and (min-height: 561px)').matches;
    readingLine = Math.round(Math.min(innerHeight - 60, phone ? header + scene.offsetHeight + 40 : Math.max(header + 100, innerHeight * 0.43)));
    observer = new IntersectionObserver(selectAtReadingLine, {
      rootMargin: '-' + readingLine + 'px 0px -' + (innerHeight - readingLine - 1) + 'px 0px',
      threshold: 0
    });
    beats.forEach(function (beat) { observer.observe(beat); });
    selectAtReadingLine();
    placeFrame(current, false);
  }

  observeReadingLine();
  scope.classList.add('story-is-enhanced');
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(observeReadingLine, 120);
  });
  // A large native jump can skip the one-pixel observer zone entirely. Settle
  // the scene at scroll end too, including browser find and restored positions.
  if ('onscrollend' in window) window.addEventListener('scrollend', selectAtReadingLine);
  else window.addEventListener('scroll', function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(selectAtReadingLine, 120);
  }, { passive: true });
  window.addEventListener('pageshow', observeReadingLine);
  image.addEventListener('load', observeReadingLine);
  if (document.fonts) document.fonts.ready.then(observeReadingLine);
  motion.addEventListener('change', function () {
    if (motion.matches && animation) { animation.cancel(); animation = null; }
  });
})();
