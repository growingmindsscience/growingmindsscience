/* Growing Minds Science: the Developmental Lens.
   Progressive enhancement for every [data-lens] root on the page. Without this
   script the four step sections stack and read in order; with it they become
   a tablist (Observe, Understand, Respond, Reflect), the plate shows the
   callouts for the active step, and the Understand readings link to their
   callouts on the plate. Styles: assets/css/lens.css. No inline handlers. */
(function () {
  "use strict";

  var counter = 0;

  function toArray(list) { return Array.prototype.slice.call(list); }

  function prefersReducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return true; }
  }

  function initLens(root) {
    if (root.getAttribute("data-lens-ready") === "true") return;
    var panels = toArray(root.querySelectorAll("[data-lens-step]"));
    if (!panels.length) return;

    counter += 1;
    var baseId = root.id || ("lens-" + counter);
    if (!root.id) root.id = baseId;

    var status = root.querySelector("[data-lens-status]");
    var body = root.querySelector(".lens__body") || panels[0].parentNode;
    var steps = panels.map(function (panel) { return panel.getAttribute("data-lens-step"); });
    var tabs = [];
    var current = null;

    // ---------- Tablist ----------
    var tablist = document.createElement("div");
    tablist.className = "lens__tabs";
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Developmental Lens steps");

    panels.forEach(function (panel, i) {
      var step = steps[i];
      var label = panel.getAttribute("data-lens-label") || step;
      if (!panel.id) panel.id = baseId + "-" + step;
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "lens__tab";
      tab.id = panel.id + "-tab";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);
      tab.setAttribute("aria-selected", "false");
      tab.setAttribute("tabindex", "-1");
      tab.setAttribute("data-step", step);
      tab.textContent = label;
      tablist.appendChild(tab);
      tabs.push(tab);

      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.setAttribute("tabindex", "0");

      // Back / Next, so a visitor can walk the sequence from the end of a panel
      var walk = document.createElement("div");
      walk.className = "lens__walk";
      if (i > 0) walk.appendChild(walkButton("back", panels[i - 1].getAttribute("data-lens-label") || steps[i - 1], steps[i - 1]));
      if (i < panels.length - 1) walk.appendChild(walkButton("next", panels[i + 1].getAttribute("data-lens-label") || steps[i + 1], steps[i + 1]));
      panel.appendChild(walk);
    });
    root.insertBefore(tablist, body);

    function walkButton(kind, label, target) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lens__walk-btn lens__walk-btn--" + kind;
      btn.setAttribute("data-lens-go", target);
      var arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      if (kind === "next") {
        arrow.textContent = " →";
        btn.appendChild(document.createTextNode("Next: " + label));
        btn.appendChild(arrow);
      } else {
        arrow.textContent = "← ";
        btn.appendChild(arrow);
        btn.appendChild(document.createTextNode("Back: " + label));
      }
      return btn;
    }

    // ---------- Activation ----------
    function activate(step, opts) {
      opts = opts || {};
      var index = steps.indexOf(step);
      if (index < 0 || step === current) return;
      current = step;
      root.setAttribute("data-active-step", step);
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.setAttribute("tabindex", on ? "0" : "-1");
        if (on) panels[i].removeAttribute("hidden");
        else panels[i].setAttribute("hidden", "");
      });
      setMechanism(null);
      if (opts.announce && status) {
        var heading = panels[index].querySelector("h3");
        status.textContent = tabs[index].textContent + ". " + (heading ? heading.textContent : "");
      }
      if (opts.focusPanel) {
        try { panels[index].focus({ preventScroll: true }); } catch (e) { panels[index].focus(); }
        var top = root.getBoundingClientRect().top;
        if (top < 0) {
          try { root.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" }); }
          catch (e2) { root.scrollIntoView(true); }
        }
      }
    }

    tablist.addEventListener("click", function (e) {
      var tab = e.target.closest ? e.target.closest(".lens__tab") : null;
      if (!tab) return;
      activate(tab.getAttribute("data-step"), { announce: true });
    });

    tablist.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      switch (e.key) {
        case "ArrowRight": case "Right": next = (i + 1) % tabs.length; break;
        case "ArrowLeft": case "Left": next = (i - 1 + tabs.length) % tabs.length; break;
        case "Home": next = 0; break;
        case "End": next = tabs.length - 1; break;
        default: return;
      }
      e.preventDefault();
      tabs[next].focus();
    });

    root.addEventListener("click", function (e) {
      var go = e.target.closest ? e.target.closest("[data-lens-go]") : null;
      if (go && root.contains(go)) {
        activate(go.getAttribute("data-lens-go"), { announce: true, focusPanel: true });
      }
    });

    // ---------- Understand: callouts and readings light together ----------
    var mechs = toArray(root.querySelectorAll("[data-mechanism]"));
    var callouts = toArray(root.querySelectorAll(".lens__callout[data-callout]"));
    var activeMech = null;

    function pairFor(n) {
      return {
        mech: mechs.filter(function (m) { return m.getAttribute("data-mechanism") === n; })[0] || null,
        callout: callouts.filter(function (c) { return c.getAttribute("data-callout") === n; })[0] || null
      };
    }

    function setMechanism(n) {
      activeMech = n;
      mechs.forEach(function (m) {
        var on = m.getAttribute("data-mechanism") === n;
        m.classList.toggle("is-active", on);
        var btn = m.querySelector(".lens__mech-btn");
        if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      callouts.forEach(function (c) {
        c.classList.toggle("is-active", c.getAttribute("data-callout") === n);
      });
      if (n) root.setAttribute("data-active-mechanism", n);
      else root.removeAttribute("data-active-mechanism");
    }

    function setHover(n, on) {
      var pair = pairFor(n);
      if (pair.mech) pair.mech.classList.toggle("is-hover", on);
      if (pair.callout) pair.callout.classList.toggle("is-hover", on);
    }

    mechs.forEach(function (m) {
      var n = m.getAttribute("data-mechanism");
      var btn = m.querySelector(".lens__mech-btn");
      if (btn) {
        btn.addEventListener("click", function () {
          setMechanism(activeMech === n ? null : n);
        });
      }
      m.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") setHover(n, true); });
      m.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") setHover(n, false); });
    });

    callouts.forEach(function (c) {
      var n = c.getAttribute("data-callout");
      c.addEventListener("click", function () {
        if (current !== "understand") return;
        setMechanism(activeMech === n ? null : n);
        var pair = pairFor(n);
        if (activeMech && pair.mech) {
          var r = pair.mech.getBoundingClientRect();
          var vh = window.innerHeight || document.documentElement.clientHeight;
          if (r.top < 0 || r.bottom > vh) {
            try { pair.mech.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" }); }
            catch (e) { pair.mech.scrollIntoView(false); }
          }
        }
      });
      c.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "mouse" && current === "understand") setHover(n, true);
      });
      c.addEventListener("pointerleave", function (e) {
        if (e.pointerType === "mouse") setHover(n, false);
      });
    });

    // ---------- Start ----------
    root.classList.add("is-enhanced");
    root.setAttribute("data-lens-ready", "true");
    var start = steps[0];
    var hash = (window.location.hash || "").replace(/^#/, "");
    panels.forEach(function (panel, i) { if (hash && panel.id === hash) start = steps[i]; });
    activate(start, {});
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    toArray(document.querySelectorAll("[data-lens]")).forEach(initLens);
  });
})();
