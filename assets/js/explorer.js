/* Growing Minds Science: explorer.js
   The age explorer (homepage section 3).
   - A range input (months, 0 to 59) is the cursor; its stage = floor(months / 12).
   - Five stage tabs follow the cursor; choosing a tab moves the cursor to that
     stage's midpoint (6, 18, 30, 42, 54 months).
   - Without JS every stage's bands are visible, stacked under its heading.
   CSP-safe: external 'self' script, no inline handlers, no eval. */
(function () {
  "use strict";

  var root = document.querySelector("[data-explorer]");
  if (!root) return;
  var range = root.querySelector("[data-age-range]");
  var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-stage-tab]"));
  var panels = Array.prototype.slice.call(root.querySelectorAll("[data-stage-panel]"));
  var outs = root.querySelectorAll("[data-age-out]");
  var live = root.querySelector("[data-explorer-live]");
  if (!range || !tabs.length || tabs.length !== panels.length) return;

  root.classList.add("explorer-js");

  var MONTHS = 60;
  var MID = [6, 18, 30, 42, 54];
  var current = -1;
  var enterTimer = null;

  function stageFor(m) { return Math.min(tabs.length - 1, Math.floor(m / 12)); }
  function ageText(m) {
    var y = Math.floor(m / 12), mo = m % 12;
    if (m === 0) return "Birth";
    if (y === 0) return mo + (mo === 1 ? " month" : " months");
    var s = y + (y === 1 ? " year" : " years");
    if (mo) s += ", " + mo + (mo === 1 ? " month" : " months");
    return s;
  }

  function showStage(s, animate) {
    current = s;
    tabs.forEach(function (tab, i) {
      var on = i === s;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.setAttribute("tabindex", on ? "0" : "-1");
    });
    panels.forEach(function (panel, i) {
      panel.hidden = i !== s;
      panel.classList.remove("is-entering");
    });
    if (animate) {
      void panels[s].offsetWidth; // restart the entrance
      panels[s].classList.add("is-entering");
      window.clearTimeout(enterTimer);
      enterTimer = window.setTimeout(function () {
        panels[s].classList.remove("is-entering");
      }, 1000);
    }
    if (live && animate) {
      live.textContent = "Showing: " + tabs[s].getAttribute("data-name") + ", " + tabs[s].getAttribute("data-age");
    }
  }

  function render(m) {
    m = Math.max(0, Math.min(MONTHS - 1, Math.round(m)));
    var text = ageText(m);
    Array.prototype.forEach.call(outs, function (n) { n.textContent = text; });
    if (String(range.value) !== String(m)) range.value = m;
    range.setAttribute("aria-valuetext", text);
    var s = stageFor(m);
    if (s !== current) showStage(s, current !== -1);
  }

  range.addEventListener("input", function () { render(Number(range.value)); });

  function activate(i, focus) {
    render(MID[i]);
    if (focus) tabs[i].focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { activate(i, false); });
    tab.addEventListener("keydown", function (e) {
      var k = e.key, n = tabs.length, t = -1;
      if (k === "ArrowDown" || k === "ArrowRight") t = (i + 1) % n;
      else if (k === "ArrowUp" || k === "ArrowLeft") t = (i - 1 + n) % n;
      else if (k === "Home") t = 0;
      else if (k === "End") t = n - 1;
      else if (k === " " || k === "Spacebar" || k === "Enter") { e.preventDefault(); activate(i, false); return; }
      if (t < 0) return;
      e.preventDefault();
      activate(t, true);
    });
  });

  render(Number(range.value) || 27);
})();
