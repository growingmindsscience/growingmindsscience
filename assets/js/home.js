/* Growing Minds Science — home.js (homepage script; header, menu, theme
   toggle, and footer year live in chrome.js)
   - Scroll-reveal ([data-animate] / [data-stagger]); gated by <html class="anim">
     so reduced-motion / no-JS always show content
   - Scripted AI conversation demo (scroll-triggered)
   - Waitlist form: in-voice success/error with graceful native fallback
   - Mobile sticky enrollment CTA
   CSP-safe: external 'self' script, no inline handlers, no eval.
*/
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animEnabled = document.documentElement.classList.contains("anim") && !reduceMotion;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // ------------------------------------------------------------------
  // Scroll reveal
  // ------------------------------------------------------------------
  function initReveal() {
    var animated = document.querySelectorAll("[data-animate]");
    if (!animEnabled || !("IntersectionObserver" in window)) {
      animated.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    document.querySelectorAll("[data-stagger]").forEach(function (wrap) {
      var kids = wrap.querySelectorAll(":scope > [data-animate]");
      Array.prototype.forEach.call(kids, function (kid, i) {
        if (!kid.style.getPropertyValue("--anim-delay")) {
          kid.style.setProperty("--anim-delay", (i * 75) + "ms");
        }
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "-50px 0px", threshold: 0.01 });
    animated.forEach(function (n) { io.observe(n); });

    // Failsafe: the reveal is an enhancement, never a gate on content.
    // JS-on renderers that don't scroll (social/OG preview bots, full-page
    // screenshots, print/PDF, reader modes) never trip the observer, so any
    // still-hidden section would otherwise ship blank. Reveal whatever the
    // observer hasn't caught shortly after load; humans who scroll sooner
    // still get the staggered entrance.
    function revealAll() {
      io.disconnect();
      animated.forEach(function (n) { n.classList.add("is-visible"); });
    }
    window.addEventListener("load", function () { window.setTimeout(revealAll, 900); });
    window.addEventListener("beforeprint", revealAll);
  }

  // ------------------------------------------------------------------
  // AI conversation demo (scripted)
  // ------------------------------------------------------------------
  var SCRIPT = [
    { who: "user", text: "My toddler says “no” to everything. Is something wrong?" },
    {
      who: "ai",
      text: ["Not at all. This is actually a healthy sign. Between 18 months and 3 years, toddlers are building autonomy. “No” is how they practice self-determination while their prefrontal cortex is still very immature.", "The key is to offer real choices where you can, and hold the line calmly where you need to."],
      sources: ["Kuczynski & Kochanska, 1990", "Kopp, 1982"]
    },
    { who: "user", text: "So I shouldn’t try to stop it?" },
    {
      who: "ai",
      text: ["The goal isn’t to stop it; it’s to channel it. When you offer choices (“the red cup or the blue cup?”), your toddler gets to say yes to something, which satisfies the autonomy drive without a battle."]
    }
  ];

  function enter(node) {
    if (!animEnabled || !node.animate) return;
    node.animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
      { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }
    );
  }

  function userMsg(text) { return el("div", "msg msg--user", text); }

  function aiMsg(paragraphs, sources) {
    var m = el("div", "msg msg--ai");
    paragraphs.forEach(function (p) { m.appendChild(el("p", null, p)); });
    if (sources && sources.length) {
      var strip = el("div", "msg__source");
      sources.forEach(function (s) { strip.appendChild(el("span", null, s)); });
      m.appendChild(strip);
    }
    return m;
  }

  // Purely visual: the dots are hidden from assistive tech (the finished
  // message is what matters, and the demo is not a live region).
  function typingDots() {
    var t = el("div", "typing");
    t.setAttribute("aria-hidden", "true");
    t.appendChild(el("span")); t.appendChild(el("span")); t.appendChild(el("span"));
    return t;
  }

  function initChat() {
    var chat = document.querySelector("[data-chat]");
    if (!chat) return;
    var body = chat.querySelector("[data-chat-body]");
    var form = chat.querySelector("[data-chat-form]");
    var input = chat.querySelector("[data-chat-input]");
    var note = chat.querySelector("[data-chat-note]");
    if (!body) return;

    var played = false;

    // The whole conversation is built up front, so the card is laid out at
    // its final height before anyone sees it. The animated version only
    // reveals messages that already occupy their space: nothing below the
    // card moves as the demo plays (no layout shift).
    var nodes = SCRIPT.map(function (s) {
      if (s.who === "user") return userMsg(s.text);
      var a = aiMsg(s.text, s.sources);
      a.appendChild(typingDots());
      return a;
    });
    nodes.forEach(function (n) { body.appendChild(n); });

    // Phones get the finished conversation: nobody should wait on a demo
    // mid-scroll on a small screen.
    var animate = animEnabled && ("IntersectionObserver" in window) &&
      !window.matchMedia("(max-width: 720px)").matches;
    if (!animate) return wireComposer();

    function show(n) { n.classList.remove("is-pending", "is-typing"); enter(n); }

    function play() {
      if (played) return;
      played = true;
      var i = 0;
      function step() {
        if (i >= nodes.length) return;
        var n = nodes[i];
        if (SCRIPT[i].who === "user") {
          show(n);
          i++; window.setTimeout(step, 850);
        } else {
          n.classList.remove("is-pending");
          n.classList.add("is-typing");
          window.setTimeout(function () {
            show(n);
            i++; window.setTimeout(step, 1100);
          }, 1500);
        }
      }
      step();
    }

    // The finished conversation is the default. Only a card that is still
    // below the fold is hidden, just before it arrives, so it can play in.
    // If that never happens (a reload mid-page, a fast jump, a renderer that
    // never scrolls), the messages simply stay visible.
    var armed = false;
    var arm = new IntersectionObserver(function (entries) {
      var e = entries[0];
      if (!e.isIntersecting) return;
      arm.disconnect();
      if (e.boundingClientRect.top < window.innerHeight) return;
      armed = true;
      nodes.forEach(function (n) { n.classList.add("is-pending"); });
      // Failsafe: if the reader stops short of the card, don't leave it blank.
      window.setTimeout(function () {
        if (played) return;
        played = true;
        nodes.forEach(show);
      }, 6000);
    }, { rootMargin: "0px 0px 240px 0px" });
    var go = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && armed) { play(); go.disconnect(); }
    }, { threshold: 0.3 });
    arm.observe(chat);
    go.observe(chat);
    wireComposer();

    function wireComposer() {
      // Composer: honest hand-off to the (free) full tutor. The question rides
      // along in sessionStorage, not the URL, so a parent's question about their
      // child never lands in browser history or a server log. The AI page
      // prefills it and never auto-sends, so nobody has to type it twice.
      if (form && input) {
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          var q = input.value.trim();
          if (!q) {
            if (note) note.textContent = "Type a question to see how it works.";
            input.focus();
            return;
          }
          if (note) note.textContent = "Opening Growing Minds AI with your question…";
          var target = "/tools/growing-minds-ai";
          try { window.sessionStorage.setItem("gms-ai-question", q.slice(0, 500)); }
          catch (e) { target += "?q=" + encodeURIComponent(q.slice(0, 500)); }
          window.location.assign(target);
        });
      }
    }
  }

  // ------------------------------------------------------------------
  // Waitlist form — progressive enhancement
  // ------------------------------------------------------------------
  function looksLikeEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function initWaitlist() {
    var form = document.querySelector('form[data-newsletter]');
    if (!form || !window.fetch || !window.FormData) return;

    var fields = form.querySelector("[data-form-fields]");
    var success = form.querySelector("[data-form-success]");
    var successTitle = form.querySelector("[data-success-title]");
    var resetBtn = form.querySelector("[data-form-reset]");
    var status = form.querySelector("[data-form-status]");
    var submit = form.querySelector("[data-submit]");
    var submitLabel = submit ? submit.querySelector(".btn__label") : null;
    var submitLabelText = submitLabel ? submitLabel.textContent : "Notify me";
    var emailField = form.querySelector("#email");
    var emailError = form.querySelector("#email-error");

    // JS owns validation now, so silence native bubbles. This line never runs
    // without JS, so the no-JS path keeps native required / type=email checks.
    form.noValidate = true;

    function setStatus(message, state) {
      if (!status) return;
      status.textContent = message || "";
      if (state) status.setAttribute("data-state", state);
      else status.removeAttribute("data-state");
    }
    function showFieldError(field, errNode, message) {
      if (field) field.setAttribute("aria-invalid", "true");
      if (errNode) { errNode.textContent = message; errNode.hidden = false; }
    }
    function clearFieldError(field, errNode) {
      if (field) field.removeAttribute("aria-invalid");
      if (errNode) { errNode.textContent = ""; errNode.hidden = true; }
    }
    function validateEmail(flagEmpty) {
      if (!emailField) return true;
      var v = emailField.value.trim();
      if (!v) {
        if (flagEmpty) { showFieldError(emailField, emailError, "Enter your email so we can reach you."); }
        else { clearFieldError(emailField, emailError); }
        return false;
      }
      if (!looksLikeEmail(v)) {
        showFieldError(emailField, emailError, "That email looks off. Check for a missing @ or domain.");
        return false;
      }
      clearFieldError(emailField, emailError);
      return true;
    }

    // Inline validation: flag on blur, forgive the moment they start fixing it.
    if (emailField) {
      emailField.addEventListener("blur", function () { validateEmail(false); });
      emailField.addEventListener("input", function () {
        if (emailField.getAttribute("aria-invalid") === "true") clearFieldError(emailField, emailError);
        if (status && status.getAttribute("data-state") === "error") setStatus("", null);
      });
    }

    function setLoading(on) {
      if (!submit) return;
      submit.disabled = on;
      submit.classList.toggle("is-loading", on);
      submit.setAttribute("aria-busy", on ? "true" : "false");
      if (submitLabel) submitLabel.textContent = on ? "Sending…" : submitLabelText;
    }
    function showSuccess() {
      if (fields) fields.hidden = true;
      if (success) success.hidden = false;
      if (successTitle && successTitle.focus) successTitle.focus(); // announce to screen readers
    }
    function showForm() {
      if (success) success.hidden = true;
      if (fields) fields.hidden = false;
      setStatus("", null);
      if (emailField) emailField.focus();
    }
    if (resetBtn) resetBtn.addEventListener("click", function () { form.reset(); showForm(); });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!validateEmail(true)) {
        setStatus("Please fix the highlighted field.", "error");
        if (emailField) emailField.focus();
        return;
      }

      var data = new FormData(form);
      var payload = {};
      data.forEach(function (value, key) { payload[key] = value; });

      setLoading(true);
      setStatus("Sending…", null);

      fetch(form.action, {
        method: "POST",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (b) {
            if (!res.ok) throw new Error(b.error || "We couldn't add you just now. Please try again.");
            return b;
          });
        })
        .then(function () {
          setStatus("", null);
          showSuccess();
        })
        .catch(function (error) {
          if (error && error.name === "TypeError") {
            // Offline: a native POST would only reach the browser's error page and
            // lose what they typed, so keep them here with their details intact.
            if (navigator.onLine === false) {
              setStatus("You seem to be offline. Your details are still here; send it again once you're back online.", "error");
              return;
            }
            // Any other network failure: fall back to a native full-page POST
            // (the server redirects to /thank-you).
            form.submit();
            return;
          }
          setStatus(error.message || "That didn\u2019t go through. Your details are still here, so try again in a moment.", "error");
        })
        .finally(function () {
          setLoading(false);
        });
    });
  }

  // ------------------------------------------------------------------
  // Mobile sticky enrollment CTA (jumps to the enrol band)
  // Visible only after the hero CTAs scroll away AND while no band that
  // carries its own CTA is in view — so the shortcut
  // is always reachable without ever duplicating a CTA already on screen.
  // Pure enhancement: CSS keeps it hidden on desktop and off-screen with no JS.
  // ------------------------------------------------------------------
  function initMobileCta() {
    var bar = document.querySelector("[data-mobile-cta]");
    var heroCtas = document.querySelector(".hero__ctas");
    if (!bar || !heroCtas || !("IntersectionObserver" in window)) return;

    var pastHero = false;
    // The bar steps aside wherever the page already offers the same choice:
    // the open-now strip, the curriculum (its own buttons), the enroll band,
    // and the footer.
    var endEls = [document.querySelector(".open-now"), document.getElementById("classes"), document.querySelector(".signup"), document.querySelector(".site-footer")].filter(Boolean);
    var visibleEnds = new Set();

    function update() {
      bar.classList.toggle("is-visible", pastHero && visibleEnds.size === 0);
    }

    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        // Past the hero once its CTAs have scrolled above the viewport top.
        pastHero = !e.isIntersecting && e.boundingClientRect.top < 0;
      });
      update();
    }, { threshold: 0 }).observe(heroCtas);

    if (endEls.length) {
      var endObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) visibleEnds.add(e.target); else visibleEnds.delete(e.target);
        });
        update();
      }, { threshold: 0 });
      endEls.forEach(function (el) { endObserver.observe(el); });
    }
  }

  ready(function () {
    initReveal();
    initChat();
    initWaitlist();
    initMobileCta();
  });
}());
