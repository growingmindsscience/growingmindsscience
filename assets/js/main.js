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

    function setStatus(node, message, tone) {
      if (!node) return;
      node.textContent = message || "";
      if (tone) node.setAttribute("data-tone", tone);
      else node.removeAttribute("data-tone");
    }

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function isEmail(value) { return EMAIL_RE.test(String(value || "").trim()); }

    function showFieldError(input, message) {
      if (!input) return;
      input.setAttribute("aria-invalid", "true");
      var describedby = input.getAttribute("aria-describedby");
      var errorNode = describedby ? document.getElementById(describedby) : null;
      if (errorNode) {
        errorNode.textContent = message;
        errorNode.setAttribute("data-shown", "");
      }
    }
    function clearFieldError(input) {
      if (!input) return;
      input.removeAttribute("aria-invalid");
      var describedby = input.getAttribute("aria-describedby");
      var errorNode = describedby ? document.getElementById(describedby) : null;
      if (errorNode) {
        errorNode.textContent = "";
        errorNode.removeAttribute("data-shown");
      }
    }

    // Toggle a submit button between idle and loading; preserves original label.
    function setBtnLoading(btn, on, loadingLabel) {
      if (!btn) return;
      if (on) {
        if (!btn.dataset.label) btn.dataset.label = btn.textContent;
        btn.disabled = true;
        btn.setAttribute("aria-busy", "true");
        btn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span>' + (loadingLabel || "Working…");
      } else {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        if (btn.dataset.label) { btn.textContent = btn.dataset.label; delete btn.dataset.label; }
      }
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

      var loginEmail = loginForm.querySelector("#login-email");
      var loginPassword = loginForm.querySelector("#login-password");

      // Validate on blur (flag once they leave), forgive on input.
      if (loginEmail) {
        loginEmail.addEventListener("blur", function () {
          var v = loginEmail.value.trim();
          if (v && !isEmail(v)) showFieldError(loginEmail, "Enter a valid email address.");
        });
        loginEmail.addEventListener("input", function () { clearFieldError(loginEmail); });
      }
      if (loginPassword) {
        loginPassword.addEventListener("input", function () { clearFieldError(loginPassword); });
      }

      loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var submit = loginForm.querySelector('button[type="submit"]');
        var email = loginEmail ? loginEmail.value.trim() : "";
        var password = loginPassword ? loginPassword.value : "";

        // Inline validation before any network call.
        var firstInvalid = null;
        if (!email) { showFieldError(loginEmail, "Enter your email."); firstInvalid = firstInvalid || loginEmail; }
        else if (!isEmail(email)) { showFieldError(loginEmail, "Enter a valid email address."); firstInvalid = firstInvalid || loginEmail; }
        if (!password) { showFieldError(loginPassword, "Enter your password."); firstInvalid = firstInvalid || loginPassword; }
        if (firstInvalid) {
          setStatus(loginStatus, "");
          firstInvalid.focus();
          return;
        }

        var payload = {
          email: email,
          password: password,
          remember: loginForm.querySelector('[name="remember"]') ? loginForm.querySelector('[name="remember"]').checked : false,
        };

        setBtnLoading(submit, true, "Checking…");
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
            setStatus(loginStatus, "Signed in. Taking you to your account…", "success");
            window.location.assign("/account");
          })
          .catch(function (error) {
            setStatus(loginStatus, error.message || "Login failed.", "error");
            setBtnLoading(submit, false);
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
      function getFocusableNavItems() {
        return Array.prototype.slice.call(
          nav.querySelectorAll("a, button, [tabindex]:not([tabindex='-1'])")
        ).filter(function (el) { return !el.closest(".nav__list") || nav.classList.contains("is-open"); });
      }

      function openMobileNav() {
        nav.classList.add("is-open");
        navToggle.setAttribute("aria-expanded", "true");
        // Move focus into nav list after CSS transition has a chance to render
        setTimeout(function () {
          var first = navList && navList.querySelector("a");
          if (first) first.focus();
        }, 50);
      }

      function closeMobileNav() {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navDetails.forEach(function (details) { details.open = false; });
        navToggle.focus();
      }

      navToggle.addEventListener("click", function () {
        if (nav.classList.contains("is-open")) { closeMobileNav(); } else { openMobileNav(); }
      });

      if (navList) {
        navList.addEventListener("click", function (e) {
          var a = e.target.closest("a");
          if (!a) return;
          closeMobileNav();
        });
      }

      document.addEventListener("click", function (e) {
        if (!e.target.closest(".nav__details")) {
          navDetails.forEach(function (details) { details.open = false; });
        }
        if (nav.classList.contains("is-open") && !e.target.closest(".nav")) {
          closeMobileNav();
        }
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          navDetails.forEach(function (details) { details.open = false; });
          if (nav.classList.contains("is-open")) closeMobileNav();
          return;
        }
        // Focus trap: only active on narrow viewports where the overlay is visible
        if (e.key === "Tab" && nav.classList.contains("is-open") && window.innerWidth < 768) {
          var items = Array.prototype.slice.call(navList.querySelectorAll("a, button"));
          if (!items.length) return;
          var first = items[0];
          var last = items[items.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
          } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
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

    // Contact form: submit via fetch so we can show an inline confirmation
    // instead of redirecting to the waitlist thank-you page. Falls back to a
    // native POST (handled by /api/contact) when JavaScript is unavailable.
    var contactForm = document.querySelector("form[data-contact]");
    if (contactForm) {
      var contactStatus = contactForm.querySelector(".form-status");
      var contactBtn = contactForm.querySelector('button[type="submit"]');
      var contactEmail = contactForm.querySelector('[name="email"]');
      var contactMessage = contactForm.querySelector('[name="message"]');

      if (contactEmail) {
        contactEmail.addEventListener("blur", function () {
          var v = contactEmail.value.trim();
          if (v && !isEmail(v)) showFieldError(contactEmail, "Enter a valid email address.");
        });
        contactEmail.addEventListener("input", function () { clearFieldError(contactEmail); });
      }
      if (contactMessage) {
        contactMessage.addEventListener("input", function () { clearFieldError(contactMessage); });
      }

      contactForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var email = contactEmail ? contactEmail.value.trim() : "";
        var message = contactMessage ? contactMessage.value.trim() : "";

        var firstInvalid = null;
        if (!email) { showFieldError(contactEmail, "Enter your email so I can reply."); firstInvalid = firstInvalid || contactEmail; }
        else if (!isEmail(email)) { showFieldError(contactEmail, "Enter a valid email address."); firstInvalid = firstInvalid || contactEmail; }
        if (!message) { showFieldError(contactMessage, "Add a short message."); firstInvalid = firstInvalid || contactMessage; }
        if (firstInvalid) {
          setStatus(contactStatus, "");
          firstInvalid.focus();
          return;
        }

        setStatus(contactStatus, "Sending…");
        setBtnLoading(contactBtn, true, "Sending…");

        var payload = {
          name: contactForm.querySelector('[name="name"]') ? contactForm.querySelector('[name="name"]').value : "",
          email: email,
          message: message,
        };

        fetch("/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok || !data.ok) {
                throw new Error(data.error || "Your message couldn't be sent. Please try again.");
              }
            });
          })
          .then(function () {
            contactForm.reset();
            setStatus(contactStatus, "Thanks — your message is on its way. Matthew reads every note personally and usually replies within a few business days.", "success");
          })
          .catch(function (error) {
            setStatus(contactStatus, error.message || "Your message couldn't be sent. Please try again.", "error");
          })
          .finally(function () {
            setBtnLoading(contactBtn, false);
          });
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
