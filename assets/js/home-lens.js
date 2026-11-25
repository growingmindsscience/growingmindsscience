/* The homepage playground story. One number, how far the reader has scrolled
   through the section, decides everything on the stage. Scrolling is never
   intercepted. Every beat is in the HTML: without this script, with reduced
   motion, or on a very short screen, the section is a plain illustrated
   sequence (see home-lens.css). */
(function () {
  'use strict';
  var root = document.querySelector('[data-playground-story]');
  if (!root || !window.requestAnimationFrame || !window.matchMedia) return;
  var track = root.querySelector('[data-pg-track]');
  var stage = root.querySelector('[data-pg-stage]');
  var beats = Array.prototype.map.call(root.querySelectorAll('[data-pg-beat]'), function (el) {
    return { key: el.getAttribute('data-pg-beat'), cam: el.querySelector('.pg-cam'), text: el.querySelector('.pg-text'), img: el.querySelector('img'), last: '' };
  });
  var ticks = Array.prototype.slice.call(root.querySelectorAll('.pg-progress i'));
  if (!track || !stage || beats.length < 2) return;

  /* ---- Timing and camera. Edit here. -------------------------------------
     Lengths are in screens of scrolling. REST is how long each beat holds
     still; CHANGE is the travel from one beat to the next. */
  var REST = [0.25, 0.35, 0.35, 0.3];
  var CHANGE = 0.2;
  /* Each beat's camera across its time on stage: scale from/to, and a sideways
     drift as a fraction of the stage width. Beat 3 does not move at all. */
  var CAMERA = [
    { from: 1, to: 1.03, drift: 0 },       // wide, easing in
    { from: 1, to: 1.04, drift: 0 },       // gently closer
    { from: 1.04, to: 1.04, drift: 0 },    // still
    { from: 1.03, to: 1, drift: 0.022 }    // opens out, toward the way home
  ];
  /* How far (px) the drawing slides as it hands over to the next one. 0 means
     it changes in place, which keeps the parent planted between beats 2 and 3. */
  var PAN = [26, 0, 34];
  var TEXT_RISE = 10;                      // px the caption travels as it changes
  var SMALL = 0.5;                         // phones: multiply every distance by this
  /* ------------------------------------------------------------------------ */

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var roomy = window.matchMedia('(min-height: 540px)');
  var phone = window.matchMedia('(max-width: 760px)');
  var sticky = !window.CSS || !CSS.supports || CSS.supports('position', 'sticky');

  var n = beats.length;
  var restStart = [], restEnd = [], total = 0;
  for (var i = 0; i < n; i++) {
    restStart[i] = total; total += REST[i] || REST[REST.length - 1]; restEnd[i] = total;
    if (i < n - 1) total += CHANGE;
  }

  var live = false, frame = 0, shown = -1, target = 0, lastTime = 0, activeIndex = -1, completed = false;
  var resting = true, restTimer = 0, arrived = document.readyState === 'complete';
  var stickyTop = 0, stageHeight = 0, decoded = false;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ramp(u, a, b) { var t = clamp((u - a) / (b - a)); return t * t * (3 - 2 * t); }

  function measure() {
    stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
    stageHeight = stage.offsetHeight;
  }

  /* 0 before the stage pins, 1 when it lets go. */
  function progress() {
    var rect = track.getBoundingClientRect();
    var travel = rect.height - stageHeight;
    if (!decoded && rect.top < innerHeight * 2 && rect.bottom > -innerHeight) {
      decoded = true;   // have every drawing ready before its turn
      beats.forEach(function (b) { if (b.img && b.img.decode) { b.img.loading = 'eager'; b.img.decode().catch(function () {}); } });
    }
    return { p: travel > 0 ? clamp((stickyTop - rect.top) / travel) : 0, near: rect.top < innerHeight && rect.bottom > 0 };
  }

  function render(p) {
    var x = p * total;
    var k = phone.matches ? SMALL : 1;
    var width = stage.clientWidth;
    var current = 0;
    for (var i = 0; i < n; i++) {
      var art = 0, text = 0, slide = 0, rise = 0, u;
      if (x >= restStart[i] && x <= restEnd[i]) { art = 1; text = 1; }
      else if (i > 0 && x > restEnd[i - 1] && x < restStart[i]) {            // arriving
        u = (x - restEnd[i - 1]) / CHANGE;
        art = ramp(u, 0.5, 0.88); text = ramp(u, 0.6, 0.94);
        slide = PAN[i - 1] * k * (1 - ramp(u, 0.5, 1)); rise = TEXT_RISE * k * (1 - text);
      } else if (i < n - 1 && x > restEnd[i] && x < restStart[i + 1]) {      // leaving
        u = (x - restEnd[i]) / CHANGE;
        art = 1 - ramp(u, 0.12, 0.5); text = 1 - ramp(u, 0.06, 0.4);
        slide = -PAN[i] * k * ramp(u, 0, 0.5); rise = -TEXT_RISE * k * (1 - text);
      }
      if (i < n - 1 && x >= restEnd[i] + CHANGE * 0.5) current = i + 1;
      var from = i === 0 ? 0 : restStart[i] - CHANGE * 0.5;
      var to = i === n - 1 ? total : restEnd[i] + CHANGE * 0.5;
      var life = clamp((x - from) / (to - from));
      var cam = CAMERA[i] || CAMERA[CAMERA.length - 1];
      var scale = 1 + ((cam.from - 1) + (cam.to - cam.from) * life) * k;
      var tx = slide + cam.drift * k * width * (life - 0.5);
      var next = art.toFixed(3) + '|' + text.toFixed(3) + '|' + tx.toFixed(1) + '|' + scale.toFixed(4) + '|' + rise.toFixed(1);
      var b = beats[i];
      if (next === b.last) continue;
      b.last = next;
      b.cam.style.opacity = art.toFixed(3);
      b.cam.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,0,0) scale(' + scale.toFixed(4) + ')';
      b.text.style.opacity = text.toFixed(3);
      b.text.style.transform = 'translate3d(0,' + rise.toFixed(1) + 'px,0)';
    }
    if (current !== activeIndex) {
      activeIndex = current;
      root.setAttribute('data-beat', beats[current].key);
      ticks.forEach(function (tick, j) { tick.classList.toggle('is-on', j === current); });
      // Funnel: a reader who reaches the last beat has seen the whole moment.
      if (current === n - 1 && !completed && window.floTrack) { completed = true; window.floTrack('Lens Completed', {}); }
    }
  }

  /* Ease toward the scroll position so wheel steps and flicks land softly.
     Runs only while there is a gap to close. */
  function tick(now) {
    frame = 0;
    if (!live) return;
    var state = progress();
    target = resting ? settled(state.p) : state.p;
    var gap = target - shown;
    // Jumps (a restored position, an anchor, find-in-page) cut straight to the beat.
    if (shown < 0 || !arrived || !state.near || Math.abs(gap) > 0.3 || Math.abs(gap) < 0.0004) shown = target;
    else shown += gap * (1 - Math.exp(-Math.max(8, Math.min(64, now - lastTime)) / 85));
    lastTime = now;
    render(shown);
    if (shown !== target) frame = requestAnimationFrame(tick);
  }
  /* When scrolling stops between two beats, the picture finishes the change to
     the nearer one, so the page never rests on a half-made scene. Only the
     drawing moves; the scroll position is left alone. */
  function settled(p) {
    var x = p * total;
    for (var i = 0; i < n - 1; i++) {
      if (x > restEnd[i] && x < restStart[i + 1]) return (x - restEnd[i] < CHANGE * 0.5 ? restEnd[i] : restStart[i + 1]) / total;
    }
    return p;
  }
  function request() { if (live && !frame) { lastTime = performance.now(); frame = requestAnimationFrame(tick); } }
  function onScroll() {
    if (!live) return;
    resting = false;
    clearTimeout(restTimer);
    restTimer = setTimeout(function () { resting = true; request(); }, 160);
    request();
  }
  function settle() { if (!live) return; measure(); shown = -1; resting = true; request(); }

  function start() {
    if (live) return;
    live = true;
    root.classList.add('pg-live');
    track.style.setProperty('--pg-travel', total.toFixed(3));
    beats.forEach(function (b) { b.last = ''; });
    activeIndex = -1; shown = -1;
    measure();
    shown = settled(progress().p);   // first paint is already a whole beat
    render(shown);
  }
  function stop() {
    if (!live) return;
    live = false;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    clearTimeout(restTimer);
    root.classList.remove('pg-live');
    root.removeAttribute('data-beat');
    track.style.removeProperty('--pg-travel');
    beats.forEach(function (b) {
      b.cam.style.opacity = b.cam.style.transform = b.text.style.opacity = b.text.style.transform = '';
    });
  }
  function choose() { if (sticky && roomy.matches && !reduce.matches) start(); else stop(); }

  choose();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', settle);
  window.addEventListener('pageshow', settle);
  window.addEventListener('load', function () { settle(); setTimeout(function () { arrived = true; }, 250); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  [reduce, roomy].forEach(function (query) {
    var onChange = function () { choose(); settle(); };
    if (query.addEventListener) query.addEventListener('change', onChange); else if (query.addListener) query.addListener(onChange);
  });
})();
