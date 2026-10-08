/* Growing Minds Science — main.js
   Header, menu, theme toggle, and footer year live in chrome.js.
   - Theme preference applied on load (localStorage with safe fallback, respects system pref)
   - Waitlist / email forms ([data-newsletter]): inline validation, one request
     at a time, errors and success shown in place; native POST if the network
     call itself fails
   - Contact form: inline validation and confirmation; native POST without JS
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

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    function setStatus(node, message, tone) {
      if (!node) return;
      node.textContent = message || "";
      if (tone) node.setAttribute("data-tone", tone);
      else node.removeAttribute("data-tone");
    }

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function isEmail(value) { return EMAIL_RE.test(String(value || "").trim()); }

    // The error slot is whichever aria-describedby target is a .field-error
    // (a field can also be described by a hint).
    function errorNodeFor(input) {
      if (!input) return null;
      var ids = (input.getAttribute("aria-describedby") || "").split(/\s+/);
      for (var i = 0; i < ids.length; i++) {
        var node = ids[i] ? document.getElementById(ids[i]) : null;
        if (node && node.classList.contains("field-error")) return node;
      }
      return null;
    }
    function showFieldError(input, message) {
      if (!input) return false;
      input.setAttribute("aria-invalid", "true");
      var errorNode = errorNodeFor(input);
      if (!errorNode) return false;
      errorNode.textContent = message;
      errorNode.setAttribute("data-shown", "");
      return true;
    }
    function clearFieldError(input) {
      if (!input) return;
      input.removeAttribute("aria-invalid");
      var errorNode = errorNodeFor(input);
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

    // Read a JSON body without ever surfacing a parse error: platform error
    // pages (HTML or plain text) become {} and fall back to a friendly message.
    function readJson(response) {
      return response.json().catch(function () { return {}; });
    }
    var NETWORK_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

    // ---------- Waitlist / email forms ----------
    // One handler for every [data-newsletter] form on pages that load main.js
    // (class-page waitlists, the articles signup). The homepage form has its
    // own richer version in home.js.
    document.querySelectorAll("form[data-newsletter]").forEach(function (form) {
      if (!window.fetch || !window.FormData) return; // native POST still works
      var email = form.querySelector('input[type="email"]');
      var status = form.querySelector("[data-form-status]") || form.querySelector(".form-status, .inline-signup__status");
      var submit = form.querySelector('button[type="submit"]');
      var successText = form.getAttribute("data-success") ||
        "You're on the list. We'll send one short note when the class opens.";
      var busy = false;

      // JS owns validation from here; without JS the native required /
      // type=email checks still run.
      form.noValidate = true;

      if (email) {
        email.addEventListener("input", function () {
          clearFieldError(email);
          if (status && status.getAttribute("data-tone") === "error") setStatus(status, "");
        });
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (busy) return; // one request at a time: no double sign-ups

        var value = email ? email.value.trim() : "";
        if (!isEmail(value)) {
          var message = value
            ? "That email looks off. Check for a missing @ or domain."
            : "Enter your email so we can reach you.";
          // Prefer the field's own error slot; otherwise use the status line.
          if (showFieldError(email, message)) setStatus(status, "");
          else setStatus(status, message, "error");
          if (email) email.focus();
          return;
        }
        clearFieldError(email);

        var payload = {};
        new FormData(form).forEach(function (val, key) { payload[key] = val; });

        busy = true;
        setBtnLoading(submit, true, "Sending…");
        setStatus(status, "Sending…");

        fetch(form.getAttribute("action") || "/api/waitlist", {
          method: "POST",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify(payload),
        })
          .then(function (response) {
            return readJson(response).then(function (data) {
              if (!response.ok) throw new Error(data.error || "We couldn't add you just now. Please try again.");
              return data;
            });
          })
          .then(function () {
            form.reset();
            setStatus(status, successText, "success");
          })
          .catch(function (error) {
            if (error && error.name === "TypeError") {
              // The request never reached us: fall back to a normal form POST
              // (the server answers with the thank-you page).
              busy = false;
              HTMLFormElement.prototype.submit.call(form);
              return;
            }
            setStatus(status, (error && error.message) || "Something went wrong. Please try again.", "error");
          })
          .finally(function () {
            busy = false;
            setBtnLoading(submit, false);
          });
      });
    });

    // ---------- Contact form ----------
    // Submit via fetch so we can show an inline confirmation instead of a
    // redirect. Falls back to a native POST (handled by /api/contact) when
    // JavaScript is unavailable.
    var contactForm = document.querySelector("form[data-contact]");
    if (contactForm && window.fetch) {
      var contactStatus = contactForm.querySelector(".form-status");
      var contactBtn = contactForm.querySelector('button[type="submit"]');
      var contactEmail = contactForm.querySelector('[name="email"]');
      var contactMessage = contactForm.querySelector('[name="message"]');
      var contactBusy = false;

      // JS owns validation now; the no-JS path keeps native required checks.
      contactForm.noValidate = true;

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
        if (contactBusy) return;
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

        contactBusy = true;
        setStatus(contactStatus, "Sending…");
        setBtnLoading(contactBtn, true, "Sending…");

        var payload = {
          name: contactForm.querySelector('[name="name"]') ? contactForm.querySelector('[name="name"]').value : "",
          email: email,
          message: message,
        };

        fetch("/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify(payload),
        })
          .then(function (response) {
            return readJson(response).then(function (data) {
              if (!response.ok || !data.ok) {
                throw new Error(data.error || "Your message couldn't be sent. Please try again.");
              }
            });
          })
          .then(function () {
            contactForm.reset();
            setStatus(contactStatus, "Thanks, your message is on its way. Matthew reads every note personally and usually replies within a few business days.", "success");
          })
          .catch(function (error) {
            var text = error && error.name === "TypeError"
              ? NETWORK_MESSAGE
              : (error && error.message) || "Your message couldn't be sent. Please try again.";
            setStatus(contactStatus, text, "error");
          })
          .finally(function () {
            contactBusy = false;
            setBtnLoading(contactBtn, false);
          });
      });
    }
  });

  // Class pages, phones: a slim enroll bar appears once the hero buttons have
  // scrolled away, and steps aside for the enroll section and the footer.
  ready(function () {
    var bar = document.querySelector("[data-enroll-bar]");
    var hero = document.querySelector(".class-hero .hero__ctas");
    if (!bar || !hero || !("IntersectionObserver" in window)) return;
    var seen = { hero: true, end: false };
    var ends = [document.getElementById("enroll"), document.querySelector(".site-footer")].filter(Boolean);
    var visibleEnds = new Set();
    function update() {
      var show = !seen.hero && !seen.end;
      if (show) bar.hidden = false;
      bar.classList.toggle("is-visible", show);
      bar.inert = !show;
    }
    new IntersectionObserver(function (entries) {
      seen.hero = entries[0].isIntersecting || entries[0].boundingClientRect.top > 0;
      update();
    }).observe(hero);
    var endObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visibleEnds.add(entry.target); else visibleEnds.delete(entry.target);
      });
      seen.end = visibleEnds.size > 0;
      update();
    });
    ends.forEach(function (node) { endObserver.observe(node); });
  });
})();
