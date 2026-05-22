/* Growing Minds Science — main.js
   - Sticky header scroll state
   - Mobile nav toggle (closed by default; hidden until opened)
   - Theme toggle (localStorage with safe fallback, respects system pref)
   - Class card CTAs preselect interest in waitlist form, then scroll to #signup
   - Waitlist form: client-side feedback only; Netlify Forms handles delivery
*/
(function () {
  "use strict";

  // ---------- Theme ----------
  var THEME_KEY = "gms-theme";
  var root = document.documentElement;

  var memoryStore = {};
  var storage = (function () {
    try {
      var k = "__gms_test__";
      var s = window["local" + "Storage"];
      s.setItem(k, "1"); s.removeItem(k);
      return s;
    } catch (_) { return null; }
  })();
  function readPref(key) {
    if (storage) { try { return storage.getItem(key); } catch (_) {} }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }
  function writePref(key, value) {
    if (storage) { try { storage.setItem(key, value); return; } catch (_) {} }
    memoryStore[key] = value;
  }

  function applyTheme(theme) {
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  }

  function initTheme() {
    var saved = readPref(THEME_KEY);
    if (saved === "dark" || saved === "light") {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      applyTheme("dark");
    }
  }
  initTheme();

  function toggleTheme() {
    var current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    var next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    writePref(THEME_KEY, next);
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var header = document.querySelector(".site-header");
    var nav = document.querySelector(".nav");
    var navToggle = document.querySelector(".nav-toggle");
    var navList = document.querySelector(".nav__list");
    var navDetails = document.querySelectorAll(".nav__details");
    var themeBtn = document.querySelector(".theme-toggle");
    var year = document.querySelector("[data-year]");

    // Footer year
    if (year) year.textContent = String(new Date().getFullYear());

    // Theme toggle
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    // Sticky header scrolled state
    if (header) {
      var onScroll = function () {
        if (window.scrollY > 6) header.classList.add("is-scrolled");
        else header.classList.remove("is-scrolled");
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    // Mobile nav: closed by default. CSS hides .nav__list until .nav.is-open is set.
    if (navToggle && nav) {
      navToggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      if (navList) {
        navList.addEventListener("click", function (e) {
          var a = e.target.closest("a");
          if (!a) return;
          nav.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
          navDetails.forEach(function (details) { details.open = false; });
        });
      }
      document.addEventListener("click", function (e) {
        if (!e.target.closest(".nav__details")) {
          navDetails.forEach(function (details) { details.open = false; });
        }
      });
      // Close on Escape
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          navDetails.forEach(function (details) { details.open = false; });
        }
        if (e.key === "Escape" && nav.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
          navToggle.focus();
        }
      });
    }

    // Class CTA -> preselect waitlist interest, scroll to signup
    var interestSelect = document.getElementById("interest");
    var classCtas = document.querySelectorAll(".class-cta");
    function setInterestValue(value) {
      if (!interestSelect || !value) return;
      var options = Array.prototype.slice.call(interestSelect.options || []);
      var match = options.find(function (option) { return option.value === value; });
      if (match) interestSelect.value = value;
    }

    if (classCtas.length) {
      classCtas.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var interest = btn.getAttribute("data-interest") || "";
          setInterestValue(interest);
          var signup = document.getElementById("signup");
          if (signup) {
            // Use hash so back button works; smooth scroll handled by CSS scroll-behavior
            history.replaceState(null, "", "#signup");
            signup.scrollIntoView({ behavior: "smooth", block: "start" });
            // Focus email after a short delay so smooth scroll can settle
            setTimeout(function () {
              var email = document.getElementById("email");
              if (email) email.focus({ preventScroll: true });
            }, 450);
          }
        });
      });
    }

    // Allow ?interest=... query string to preselect (e.g. from class detail page CTA)
    try {
      var params = new URLSearchParams(window.location.search);
      var qInterest = params.get("interest");
      setInterestValue(qInterest);
    } catch (_) {}

    // Waitlist form: friendly status while Netlify processes submission.
    var form = document.querySelector('form[data-newsletter]');
    if (form) {
      var status = form.querySelector(".form-status");
      form.addEventListener("submit", function () {
        if (status) status.textContent = "Sending…";
      });
    }
  });
})();
