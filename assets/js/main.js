/* Growing Minds Science — main.js
   - Sticky header scroll state
   - Mobile nav toggle (closed by default; hidden until opened)
   - Theme toggle (localStorage with safe fallback, respects system pref)
   - Class card CTAs preselect interest in waitlist form, then scroll to #signup
   - Waitlist form: client-side feedback only; Vercel API handles delivery
*/
(function () {
  "use strict";

  // Load the editorial refresh without requiring every static page to be edited.
  (function loadRefreshStyles() {
    if (document.querySelector('link[href$="assets/css/refresh.css"]')) return;
    var script = document.currentScript;
    var href = script && script.src
      ? script.src.replace(/assets\/js\/main\.js(?:\?.*)?$/, "assets/css/refresh.css")
      : "/assets/css/refresh.css";
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  })();

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

    function setStatus(node, message) {
      if (node) node.textContent = message || "";
    }

    function getSession() {
      return fetch("/api/session", {
        method: "GET",
        credentials: "same-origin",
        headers: { "accept": "application/json" },
      }).then(function (response) {
        return response.json().catch(function () { return {}; });
      }).catch(function () {
        return { authenticated: false };
      });
    }

    function updateAuthNav(session) {
      if (!navList || navList.querySelector("[data-auth-nav]")) return;
      var item = document.createElement("li");
      item.className = "nav__auth";
      item.setAttribute("data-auth-nav", "");

      var link = document.createElement("a");
      link.className = "nav__link";
      link.href = session && session.authenticated ? "/account" : "/login";
      link.textContent = session && session.authenticated ? "Account" : "Log in";
      if (window.location.pathname === "/login" || window.location.pathname === "/login.html" || window.location.pathname === "/account" || window.location.pathname === "/account.html") {
        link.setAttribute("aria-current", "page");
      }

      item.appendChild(link);
      navList.appendChild(item);
    }

    getSession().then(function (session) {
      updateAuthNav(session);

      var accountPrivate = document.querySelector("[data-account-private]");
      var accountGuest = document.querySelector("[data-account-guest]");
      var accountName = document.querySelector("[data-account-name]");
      if (accountPrivate || accountGuest) {
        if (session.authenticated) {
          if (accountName && session.profile && session.profile.name) accountName.textContent = session.profile.name;
          if (accountPrivate) accountPrivate.hidden = false;
        } else if (accountGuest) {
          accountGuest.hidden = false;
        }
      }
    });

    var passwordToggle = document.querySelector("[data-password-toggle]");
    if (passwordToggle) {
      passwordToggle.addEventListener("click", function () {
        var targetId = passwordToggle.getAttribute("aria-controls");
        var passwordInput = targetId ? document.getElementById(targetId) : null;
        if (!passwordInput) return;
        var showing = passwordInput.type === "text";
        passwordInput.type = showing ? "password" : "text";
        passwordToggle.textContent = showing ? "Show" : "Hide";
        passwordToggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      });
    }

    var loginForm = document.querySelector("[data-login-form]");
    if (loginForm) {
      var loginStatus = loginForm.querySelector("[data-login-status]");
      try {
        var authStatus = new URLSearchParams(window.location.search).get("auth");
        var authMessages = {
          google_not_configured: "Google sign-in is not configured yet.",
          google_cancelled: "Google sign-in was cancelled.",
          google_invalid: "Google sign-in expired. Please try again.",
          google_denied: "That Google account is not allowed to sign in.",
          google_error: "Google sign-in could not be completed. Please try again.",
        };
        if (authStatus && authMessages[authStatus]) setStatus(loginStatus, authMessages[authStatus]);
      } catch (_) {}

      loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var submit = loginForm.querySelector('button[type="submit"]');
        var formData = new FormData(loginForm);
        var payload = {
          email: String(formData.get("email") || ""),
          password: String(formData.get("password") || ""),
          remember: formData.get("remember") === "on",
        };

        if (submit) submit.disabled = true;
        setStatus(loginStatus, "Checking credentials…");

        fetch("/api/login", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "accept": "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) throw new Error(data.error || "Login failed.");
              return data;
            });
          })
          .then(function () {
            window.location.assign("/account");
          })
          .catch(function (error) {
            setStatus(loginStatus, error.message || "Login failed.");
          })
          .finally(function () {
            if (submit) submit.disabled = false;
          });
      });
    }

    var logoutButtons = document.querySelectorAll("[data-logout]");
    logoutButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        button.disabled = true;
        fetch("/api/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: { "accept": "application/json" },
        }).finally(function () {
          window.location.assign("/login");
        });
      });
    });

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

    // Waitlist form: friendly status while the Vercel API processes submission.
    var form = document.querySelector('form[data-newsletter]');
    if (form) {
      var status = form.querySelector(".form-status");
      form.addEventListener("submit", function () {
        if (status) status.textContent = "Sending…";
      });
    }

    // Growing Minds AI chat MVP.
    var aiForm = document.querySelector("[data-ai-chat]");
    if (aiForm) {
      var aiInput = aiForm.querySelector('textarea[name="question"]');
      var aiAccessCode = aiForm.querySelector('input[name="access-code"]');
      var aiStatus = document.querySelector("[data-ai-status]");
      var aiBody = document.querySelector(".ai-chat-preview__body");
      var aiSubmit = aiForm.querySelector('button[type="submit"]');
      var suggestedQuestions = document.querySelectorAll("[data-ai-question]");

      function addAiMessage(text, type) {
        if (!aiBody) return null;
        var node = document.createElement("div");
        node.className = "ai-message ai-message--" + type;
        text.split(/\n{2,}/).forEach(function (paragraph, index) {
          if (!paragraph.trim()) return;
          if (index > 0) node.appendChild(document.createElement("br"));
          if (index > 0) node.appendChild(document.createElement("br"));
          node.appendChild(document.createTextNode(paragraph.trim()));
        });
        aiForm.insertAdjacentElement("beforebegin", node);
        return node;
      }

      function setAiLoading(loading) {
        if (aiSubmit) aiSubmit.disabled = loading;
        if (aiInput) aiInput.disabled = loading;
        if (aiAccessCode) aiAccessCode.disabled = loading;
        if (aiStatus) aiStatus.textContent = loading ? "Thinking…" : "";
      }

      suggestedQuestions.forEach(function (button) {
        button.addEventListener("click", function () {
          if (!aiInput) return;
          aiInput.value = button.getAttribute("data-ai-question") || "";
          aiInput.focus();
        });
      });

      aiForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!aiInput) return;
        var question = aiInput.value.trim();
        var accessCode = aiAccessCode ? aiAccessCode.value.trim() : "";
        if (!accessCode) {
          if (aiStatus) aiStatus.textContent = "Please enter the class access code.";
          if (aiAccessCode) aiAccessCode.focus();
          return;
        }
        if (!question) {
          if (aiStatus) aiStatus.textContent = "Please enter a question.";
          return;
        }

        addAiMessage(question, "user");
        setAiLoading(true);

        fetch("/api/growing-minds-ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: question, accessCode: accessCode }),
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) throw new Error(data.error || "Growing Minds AI could not answer right now.");
              return data;
            });
          })
          .then(function (data) {
            addAiMessage(data.answer, "assistant");
            aiInput.value = "";
          })
          .catch(function (error) {
            addAiMessage(error.message || "Growing Minds AI could not answer right now. Please try again.", "assistant");
          })
          .finally(function () {
            setAiLoading(false);
          });
      });
    }
  });
})();
