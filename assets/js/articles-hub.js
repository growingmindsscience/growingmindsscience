/* Articles: remember which pieces a visitor has opened, and on the
   index, mark them and let the list be filtered by kind. Without JS the
   index shows every card and no filters. */
(function () {
  var KEY = "gms-articles-read";
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  // On an article page: note the visit.
  var m = location.pathname.match(/^\/articles\/([a-z0-9-]+?)(?:\.html)?\/?$/);
  if (m && m[1] !== "index") {
    var read = load();
    if (read.indexOf(m[1]) === -1) { read.push(m[1]); save(read); }
    return;
  }

  // On the index.
  var grid = document.querySelector("[data-cards]");
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
  var all = Array.prototype.slice.call(document.querySelectorAll("[data-slug]"));
  var seen = load();

  var count = 0;
  all.forEach(function (el) {
    if (seen.indexOf(el.getAttribute("data-slug")) === -1) return;
    var mark = el.querySelector(".card__read");
    if (mark) mark.hidden = false;
    count++;
  });
  var progress = document.querySelector(".ah-progress");
  if (progress && count) {
    progress.textContent = count === all.length
      ? "You’ve read all " + all.length + "."
      : "You’ve read " + count + " of " + all.length + ".";
    progress.hidden = false;
  }

  var chips = document.querySelector("[data-chips]");
  var status = document.querySelector(".ah-count");
  if (!chips) return;
  chips.hidden = false;
  var buttons = Array.prototype.slice.call(chips.querySelectorAll("[data-filter]"));
  chips.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-filter]");
    if (!btn) return;
    var kind = btn.getAttribute("data-filter");
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
    var shown = 0;
    cards.forEach(function (c) {
      var on = kind === "all" || c.getAttribute("data-kind") === kind;
      c.hidden = !on;
      if (on) { shown++; c.classList.add("is-in"); }
    });
    if (status) status.textContent = kind === "all" ? "" : "Showing " + shown + (shown === 1 ? " article" : " articles") + ": " + btn.textContent + ".";
  });
})();
