/* Articles: remember which pieces a visitor has opened.
   - On an article: note the visit; keep the "Updated" date in the meta line in step with the
     page's JSON-LD dateModified; let "Print this checklist" print that panel alone.
   - On the index: mark the pieces already read, offer the next unread one, and let the list be
     filtered by kind.
   Without JS every article and every row shows; the print button and the filters stay hidden. */
(function () {
  var KEY = "gms-articles-read";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  // Pairings shared with each article's Keep reading block.
  var RELATED = {
    "serve-and-return": ["screen-time", "milestone-worry"],
    "screen-time": ["serve-and-return", "toddler-no"],
    "toddler-no": ["self-regulation", "parents-nervous-system"],
    "self-regulation": ["parents-nervous-system", "toddler-no"],
    "parents-nervous-system": ["self-regulation", "toddler-no"],
    "counting-ladder": ["milestone-worry", "serve-and-return"],
    "cliff-at-three": ["milestone-worry", "serve-and-return"],
    "milestone-worry": ["cliff-at-three", "counting-ladder"]
  };
  function load() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  var m = location.pathname.match(/^\/articles\/([a-z0-9-]+?)(?:\.html)?\/?$/);
  if (m && m[1] !== "index") { article(m[1]); return; }
  index();

  function article(slug) {
    var read = load();
    var at = read.indexOf(slug);
    if (at !== -1) read.splice(at, 1);
    read.push(slug); // most recent last
    save(read);

    // "Updated <Month YYYY>" follows the structured data, the one source for the date.
    var updated = document.querySelector("time[data-updated]");
    if (updated) {
      var mod = null;
      document.querySelectorAll('script[type="application/ld+json"]').forEach(function (el) {
        if (mod) return;
        var t = el.textContent.match(/"dateModified"\s*:\s*"(\d{4})-(\d{2})-(\d{2})/);
        if (t) mod = t;
      });
      if (mod) {
        updated.setAttribute("datetime", mod[1] + "-" + mod[2] + "-" + mod[3]);
        updated.textContent = MONTHS[parseInt(mod[2], 10) - 1] + " " + mod[1];
      }
    }

    // Print one checklist on its own (article.css hides the rest of the page for print).
    document.querySelectorAll("[data-print-checklist]").forEach(function (btn) {
      var act = btn.closest(".checklist__act");
      if (act) act.hidden = false;
      btn.addEventListener("click", function () {
        var body = document.body;
        var done = function () { body.classList.remove("art-print-checklist"); window.removeEventListener("afterprint", done); };
        body.classList.add("art-print-checklist");
        window.addEventListener("afterprint", done);
        window.print();
        // Some browsers return from print() before afterprint; clear on the next turn too.
        setTimeout(done, 1000);
      });
    });
  }

  function index() {
    var list = document.querySelector("[data-cards]");
    if (!list) return;
    var rows = Array.prototype.slice.call(list.querySelectorAll("[data-slug]"));
    var seen = load();

    var count = 0;
    rows.forEach(function (el) {
      if (seen.indexOf(el.getAttribute("data-slug")) === -1) return;
      var mark = el.querySelector(".ah-read");
      if (mark) mark.hidden = false;
      count++;
    });
    var feature = document.querySelector(".feature[data-slug]");
    if (feature && seen.indexOf(feature.getAttribute("data-slug")) !== -1) {
      var fm = feature.querySelector(".ah-read");
      if (fm) fm.hidden = false;
    }

    var progress = document.querySelector(".ah-progress");
    if (progress && count) {
      var title = function (slug) {
        var row = list.querySelector('[data-slug="' + slug + '"]');
        var a = row && row.querySelector(".row__name a");
        return a ? { href: a.getAttribute("href"), text: a.textContent } : null;
      };
      var next = null;
      if (count < rows.length) {
        // A piece paired with the last one read, else the first unread in the list.
        var last = null;
        for (var i = seen.length - 1; i >= 0 && !last; i--) if (RELATED[seen[i]]) last = seen[i];
        var pool = (last ? RELATED[last] : []).concat(rows.map(function (r) { return r.getAttribute("data-slug"); }));
        for (var j = 0; j < pool.length && !next; j++) if (seen.indexOf(pool[j]) === -1) next = pool[j];
      }
      progress.textContent = count === rows.length
        ? "You’ve read all " + rows.length + "."
        : "You’ve read " + count + " of " + rows.length + ".";
      var t = next && title(next);
      if (t) {
        var go = document.createElement("a");
        go.className = "ah-next";
        go.href = t.href;
        go.textContent = "Next: " + t.text;
        progress.appendChild(document.createTextNode(" "));
        progress.appendChild(go);
      }
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
      rows.forEach(function (r) {
        var on = kind === "all" || r.getAttribute("data-kind") === kind;
        r.hidden = !on;
        r.classList.toggle("is-lead", on && shown === 0);
        if (on) { shown++; r.classList.add("is-in"); }
      });
      if (status) status.textContent = kind === "all" ? "" : "Showing " + shown + (shown === 1 ? " article" : " articles") + ": " + btn.textContent + ".";
    });
  }
})();
