/* Growing Minds Science: main.js
   Header, menu, theme toggle, and footer year live in chrome.js.
   - Theme preference applied on load (localStorage with safe fallback, respects system pref)
   - Waitlist / email forms ([data-newsletter]): inline validation, one request
     at a time, errors and success shown in place; native POST if the network
     call itself fails
   - Contact form ([data-contact]): inline validation; errors shown and announced in
     place; once sent, a confirmation panel takes the form's place and receives focus.
     Native POST (and the #sent note) without JS.
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
        "You're on the list. We'll send a note when the class opens, and an occasional research note in between.";
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
    //
    // The confirmation (styles: .hb-confirm in hubs.css) replaces the form:
    //   a Newsreader statement      form[data-confirm-title], else the default below
    //   one line under it           form[data-confirm-line] ("" for none), else the default below
    //   next steps                  the contents of <template data-confirm> inside the form,
    //                               else the first one on the page (optional)
    //   "Send another message"      brings the emptied form back
    // Focus moves to the panel so the statement is read out.
    var CONFIRM_TITLE = "Thanks, your message is on its way.";
    var CONFIRM_LINE = "Matthew reads every note personally and usually replies within a few business days.";
    var CHECK_SVG = '<svg class="hb-confirm__mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>';
    function showConfirmation(form) {
      var uid = "confirm-" + Math.random().toString(36).slice(2, 9);
      var panel = document.createElement("div");
      panel.className = "hb-confirm";
      panel.tabIndex = -1;
      panel.setAttribute("role", "group");
      panel.setAttribute("aria-labelledby", uid + "-title");

      var statement = document.createElement("p");
      statement.className = "hb-confirm__statement";
      statement.id = uid + "-title";
      statement.innerHTML = CHECK_SVG;
      var words = document.createElement("span");
      words.textContent = form.getAttribute("data-confirm-title") || CONFIRM_TITLE;
      statement.appendChild(words);
      panel.appendChild(statement);

      var lineText = form.hasAttribute("data-confirm-line") ? form.getAttribute("data-confirm-line") : CONFIRM_LINE;
      if (lineText) {
        var line = document.createElement("p");
        line.className = "hb-confirm__line";
        line.id = uid + "-line";
        line.textContent = lineText;
        panel.appendChild(line);
        panel.setAttribute("aria-describedby", line.id);
      }

      var tpl = form.querySelector("template[data-confirm]") || document.querySelector("template[data-confirm]");
      if (tpl && tpl.content) panel.appendChild(document.importNode(tpl.content, true));

      var again = document.createElement("button");
      again.type = "button";
      again.className = "hb-btn hb-btn--quiet";
      again.textContent = "Send another message";
      again.addEventListener("click", function () {
        if (panel.parentNode) panel.parentNode.removeChild(panel);
        form.hidden = false;
        var first = form.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([hidden]), textarea, select');
        if (first) first.focus();
      });
      panel.appendChild(again);

      form.hidden = true;
      form.parentNode.insertBefore(panel, form.nextSibling);
      panel.focus({ preventScroll: true });
      // Bring the panel to the reader if the taller form had left it off screen.
      var head = document.querySelector(".site-header");
      var top = panel.getBoundingClientRect().top;
      var under = head ? head.getBoundingClientRect().bottom : 0;
      if (top < under || top > window.innerHeight * 0.6) {
        var smooth = document.documentElement.classList.contains("anim");
        window.scrollTo({ top: window.pageYOffset + top - under - 24, behavior: smooth ? "smooth" : "auto" });
      }
    }

    var contactForm = document.querySelector("form[data-contact]");
    if (contactForm && window.fetch) {
      var contactStatus = contactForm.querySelector(".form-status");
      // Errors interrupt (role=alert); progress stays polite.
      var contactSay = function (text, tone) {
        if (!contactStatus) return;
        var error = tone === "error";
        contactStatus.setAttribute("role", error ? "alert" : "status");
        contactStatus.setAttribute("aria-live", error ? "assertive" : "polite");
        setStatus(contactStatus, text, tone);
      };
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
          contactSay("");
          firstInvalid.focus();
          return;
        }

        contactBusy = true;
        contactSay("Sending…");
        setBtnLoading(contactBtn, true, "Sending…");

        var payload = {
          name: contactForm.querySelector('[name="name"]') ? contactForm.querySelector('[name="name"]').value : "",
          email: email,
          message: message,
        };
        // Optional fields only some contact forms carry (the /programs form).
        ["organization", "topic"].forEach(function (key) {
          var field = contactForm.querySelector('[name="' + key + '"]');
          if (field && field.value) payload[key] = field.value;
        });

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
            contactSay("");
            showConfirmation(contactForm);
          })
          .catch(function (error) {
            var text = error && error.name === "TypeError"
              ? NETWORK_MESSAGE
              : (error && error.message) || "Your message couldn't be sent. Please try again.";
            contactSay(text, "error");
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
