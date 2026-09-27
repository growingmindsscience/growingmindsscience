/* Growing Minds Science: site chrome behavior (the shared header and footer).
   One script for every page that uses the shared header; styles live in
   assets/css/chrome.css.
   - Theme toggle (key "gms-theme"; each page's head script applies it before paint)
   - Sticky header scrolled state
   - Free tools menu: a <details> that closes on outside click, Escape, or focus moving away
   - Menu layout below 1000px: open/close, Escape, focus return
   - Log in link becomes Account for signed-in visitors (shared session with /nsc)
   - Footer year
*/
(function () {
  "use strict";

  var THEME_KEY = "gms-theme";
  var compact = window.matchMedia("(max-width: 1000px)");

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    document.querySelectorAll("[data-year]").forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });

    var header = document.querySelector(".site-header");
    if (!header) return;
    var nav = header.querySelector(".nav");
    var list = header.querySelector(".nav__list");
    var toggle = header.querySelector(".nav-toggle");
    var themeBtn = header.querySelector(".theme-toggle");
    var menus = Array.prototype.slice.call(header.querySelectorAll(".nav__details"));

    // Theme
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var root = document.documentElement;
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        if (next === "dark") root.setAttribute("data-theme", "dark");
        else root.removeAttribute("data-theme");
        try { window.localStorage.setItem(THEME_KEY, next); } catch (_) {}
      });
    }

    // Scrolled state
    var ticking = false;
    function paintScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 6);
      ticking = false;
    }
    paintScroll();
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(paintScroll); }
    }, { passive: true });

    // Free tools menu
    function closeMenus(except) {
      menus.forEach(function (menu) { if (menu !== except) menu.open = false; });
    }
    menus.forEach(function (menu) {
      menu.addEventListener("toggle", function () { if (menu.open) closeMenus(menu); });
      // Only close when focus lands somewhere else; a null relatedTarget means a
      // click that has not moved focus yet (Safari links), which must still work.
      menu.addEventListener("focusout", function (e) {
        if (compact.matches) return;
        if (e.relatedTarget && !menu.contains(e.relatedTarget)) menu.open = false;
      });
    });

    // Compact menu
    function openNav() {
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
    }
    function closeNav(returnFocus) {
      if (!nav.classList.contains("is-open")) return;
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      closeMenus();
      if (returnFocus) toggle.focus();
    }
    if (nav && toggle && list) {
      toggle.addEventListener("click", function () {
        if (nav.classList.contains("is-open")) closeNav(false);
        else openNav();
      });
      list.addEventListener("click", function (e) {
        if (e.target.closest("a")) closeNav(false);
      });
      nav.addEventListener("focusout", function (e) {
        if (e.relatedTarget && !nav.contains(e.relatedTarget)) closeNav(false);
      });
      var onBreakpoint = function (e) { if (!e.matches) closeNav(false); };
      if (compact.addEventListener) compact.addEventListener("change", onBreakpoint);
      else if (compact.addListener) compact.addListener(onBreakpoint);
    }

    document.addEventListener("click", function (e) {
      menus.forEach(function (menu) { if (!menu.contains(e.target)) menu.open = false; });
      if (nav && nav.classList.contains("is-open") && !nav.contains(e.target)) closeNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var openMenu = menus.filter(function (menu) { return menu.open; })[0];
      if (openMenu) {
        openMenu.open = false;
        openMenu.querySelector("summary").focus();
        return;
      }
      if (nav) closeNav(true);
    });

    // Log in -> Account once the shared session says so. Links marked
    // data-auth-static (the private infant class) keep their own destination.
    var authLink = header.querySelector("[data-auth-nav] a");
    if (authLink && !authLink.hasAttribute("data-auth-static") && window.fetch) {
      window.fetch("/nsc/api/entitlements/me", {
        method: "GET",
        credentials: "same-origin",
        headers: { accept: "application/json" }
      }).then(function (response) {
        return response.ok ? response.json() : {};
      }).then(function (session) {
        if (session && session.authenticated) {
          authLink.href = "/account";
          authLink.textContent = "Account";
        }
      }).catch(function () {});
    }
  });
})();
