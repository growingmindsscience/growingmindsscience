/* Growing Minds Science: terrain.js
   The homepage survey sheet. One live thing: an age cursor on the route.
   - A range input (months, 0 to 59) is the control; keyboard and screen
     readers get it as a slider labelled in years and months.
   - Pointer drag anywhere on the sheet moves the cursor too.
   - The readout beside the sheet swaps to the stage the cursor is in, and
     the legend cell for the class that teaches it is marked.
   - The route draws in once on load when motion is welcome.
   Without JS the sheet is a still map and all five stage panels show.
   CSP-safe: external 'self' script, no inline handlers, no eval. */
(function () {
  "use strict";

  var sheet = document.querySelector("[data-terrain]");
  if (!sheet) return;
  document.documentElement.classList.add("terrain-js");

  var svg = sheet.querySelector("svg");
  var route = sheet.querySelector("[data-route]");
  var cursorLine = sheet.querySelector("[data-cursor-line]");
  var cursorDot = sheet.querySelector("[data-cursor-dot]");
  var cursorLabel = sheet.querySelector("[data-cursor-label]");
  var range = document.querySelector("[data-age-range]");
  var ageOut = document.querySelectorAll("[data-age-out]");
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-stage-panel]"));
  var legendCells = Array.prototype.slice.call(document.querySelectorAll("[data-legend-class]"));
  var marks = Array.prototype.slice.call(sheet.querySelectorAll("[data-waymark]"));
  if (!svg || !route || !range) return;

  var X0 = 760, X1 = 1350;         // birth .. 5 yrs on the sheet's scale (viewBox units)
  var MONTHS = 60;
  var samples = [];
  var total = route.getTotalLength();
  for (var i = 0; i <= 400; i++) {
    samples.push(route.getPointAtLength(total * i / 400));
  }
  function pointAtX(x) {
    var best = samples[0], d = Infinity;
    for (var i = 0; i < samples.length; i++) {
      var dd = Math.abs(samples[i].x - x);
      if (dd < d) { d = dd; best = samples[i]; }
    }
    return best;
  }
  function xForMonths(m) { return X0 + (m / MONTHS) * (X1 - X0); }
  function stageFor(m) { return Math.min(4, Math.floor(m / 12)); }
  function ageText(m) {
    var y = Math.floor(m / 12), mo = m % 12;
    if (m === 0) return "Birth";
    if (y === 0) return mo + (mo === 1 ? " month" : " months");
    var s = y + (y === 1 ? " year" : " years");
    if (mo) s += ", " + mo + (mo === 1 ? " month" : " months");
    return s;
  }

  var current = -1;
  function render(m, announce) {
    m = Math.max(0, Math.min(MONTHS - 1, Math.round(m)));
    var x = xForMonths(m);
    var p = pointAtX(x);
    if (cursorLine) { cursorLine.setAttribute("x1", x); cursorLine.setAttribute("x2", x); cursorLine.setAttribute("y2", p.y); }
    if (cursorDot) { cursorDot.setAttribute("cx", p.x); cursorDot.setAttribute("cy", p.y); }
    if (cursorLabel) {
      cursorLabel.setAttribute("x", p.x);
      cursorLabel.setAttribute("y", p.y + 40);
      cursorLabel.textContent = ageText(m);
    }
    Array.prototype.forEach.call(ageOut, function (n) { n.textContent = ageText(m); });
    var s = stageFor(m);
    if (s !== current) {
      current = s;
      panels.forEach(function (panel, i) {
        var on = i === s;
        panel.hidden = !on;
        panel.classList.toggle("is-active", on);
      });
      marks.forEach(function (mark, i) { mark.classList.toggle("is-active", i === s); });
      var cls = panels[s] ? panels[s].getAttribute("data-class") : null;
      legendCells.forEach(function (cell) {
        var on = cell.getAttribute("data-legend-class") === cls;
        cell.classList.toggle("is-active", on);
        if (on) cell.setAttribute("aria-current", "true"); else cell.removeAttribute("aria-current");
      });
      sheet.setAttribute("data-stage", String(s));
    }
    if (String(range.value) !== String(m)) range.value = m;
    range.setAttribute("aria-valuetext", ageText(m));
  }

  // Waymarks sit exactly on the route at each stage's midpoint.
  marks.forEach(function (mark, i) {
    var q = pointAtX(xForMonths(i * 12 + 6));
    var c = mark.querySelector("circle"), t = mark.querySelector("text");
    if (c) { c.setAttribute("cx", q.x); c.setAttribute("cy", q.y); }
    if (t) { t.setAttribute("x", q.x); t.setAttribute("y", q.y - 26); }
  });

  // Phones see the route's own region of the sheet, not a crop of the whole.
  var narrow = window.matchMedia("(max-width: 1100px)");
  function fitSheet() {
    if (narrow.matches) { svg.setAttribute("viewBox", "700 60 740 780"); svg.setAttribute("preserveAspectRatio", window.matchMedia("(max-width: 720px)").matches ? "xMidYMid meet" : "xMidYMid slice"); }
    else { svg.setAttribute("viewBox", "0 0 1440 900"); svg.setAttribute("preserveAspectRatio", "xMidYMid slice"); }
  }
  fitSheet();
  if (narrow.addEventListener) narrow.addEventListener("change", fitSheet);

  range.addEventListener("input", function () { render(Number(range.value), true); });

  // Pointer drag on the sheet itself.
  var dragging = false;
  function monthsFromEvent(e) {
    var rect = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    var x = (e.clientX - rect.left) / rect.width * vb.width;
    return (x - X0) / (X1 - X0) * MONTHS;
  }
  svg.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    dragging = true;
    sheet.classList.add("is-dragging");
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    render(monthsFromEvent(e));
    e.preventDefault();
  });
  svg.addEventListener("pointermove", function (e) { if (dragging) render(monthsFromEvent(e)); });
  function stop(e) {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove("is-dragging");
    try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  svg.addEventListener("pointerup", stop);
  svg.addEventListener("pointercancel", stop);

  // Waymarks are buttons too: click one to jump to its stage.
  marks.forEach(function (mark, i) {
    mark.addEventListener("click", function () { render(i * 12 + 6); range.focus({ preventScroll: true }); });
  });

  render(Number(range.value) || 27);

  // Draw the route in once, when motion is welcome.
  var animOk = document.documentElement.classList.contains("anim");
  if (animOk && route.animate) {
    route.style.strokeDasharray = "14 10";
    var len = total;
    route.animate(
      [{ strokeDasharray: len + " " + len, strokeDashoffset: len }, { strokeDasharray: len + " " + len, strokeDashoffset: 0 }],
      { duration: 1800, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "none" }
    ).onfinish = function () { route.style.strokeDasharray = "14 10"; };
  }
})();
