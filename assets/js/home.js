/* Growing Minds Science — home.js (self-contained homepage script)
   - Theme toggle (shared "gms-theme" key; head script applies before paint)
   - Sticky header scrolled state (rAF-throttled, passive)
   - Footer year
   - Mobile nav toggle
   - Scroll-reveal ([data-animate] / [data-stagger]); gated by <html class="anim">
     so reduced-motion / no-JS always show content
   - Growth-arc stage tabs (proper tabs semantics, arrow keys)
   - Scripted AI conversation demo (scroll-triggered)
   - Waitlist form: in-voice success/error with graceful native fallback
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
  // Theme toggle (same storage key as main.js so the choice follows
  // the visitor across pages; head script applies it before paint)
  // ------------------------------------------------------------------
  var THEME_KEY = "gms-theme";
  function initTheme() {
    var btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      var next = dark ? "light" : "dark";
      if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
      try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
    });
  }

  // ------------------------------------------------------------------
  // Sticky header scrolled state
  // ------------------------------------------------------------------
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 6);
      ticking = false;
    }
    update();
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
  }

  // ------------------------------------------------------------------
  // Footer year
  // ------------------------------------------------------------------
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (n) {
      n.textContent = String(new Date().getFullYear());
    });
  }

  // ------------------------------------------------------------------
  // Mobile nav
  // ------------------------------------------------------------------
  function initNav() {
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".nav-toggle");
    var list = document.querySelector(".nav__list");
    if (!nav || !toggle) return;

    function close() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    if (list) {
      list.addEventListener("click", function (e) {
        if (e.target.closest("a")) close();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        close();
        toggle.focus();
      }
    });
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
  // Growth arc — stage tabs (arrow keys, Home/End, proper ARIA)
  // ------------------------------------------------------------------
  function initArc() {
    var device = document.querySelector("[data-arc]");
    if (!device) return;
    var tabs = Array.prototype.slice.call(device.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(device.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length || tabs.length !== panels.length) return;

    function select(index, focus) {
      tabs.forEach(function (tab, i) {
        var active = i === index;
        tab.setAttribute("aria-selected", active ? "true" : "false");
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      if (focus) tabs[index].focus();
    }

    // Panels ship un-hidden so the no-JS page shows all five stages in order;
    // collapse to the marked-selected tab only once JS is running.
    var initial = tabs.findIndex(function (tab) {
      return tab.getAttribute("aria-selected") === "true";
    });
    select(initial === -1 ? 0 : initial, false);

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(i, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          select(next, true);
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // AI conversation demo (scripted)
  // ------------------------------------------------------------------
  var SCRIPT = [
    { who: "user", text: "My toddler says “no” to everything. Is something wrong?" },
    {
      who: "ai",
      text: ["Not at all — this is actually a healthy sign. Between 18 months and 3 years, toddlers are building autonomy. “No” is how they practice self-determination while their prefrontal cortex is still very immature.", "The key is to offer real choices where you can, and hold the line calmly where you need to."],
      sources: ["autonomy · ages 1–3", "developmental science", "not medical advice"]
    },
    { who: "user", text: "So I shouldn’t try to stop it?" },
    {
      who: "ai",
      text: ["The goal isn’t to stop it — it’s to channel it. When you offer choices (“the red cup or the blue cup?”), your toddler gets to say yes to something, which satisfies the autonomy drive without a battle."]
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
      strip.setAttribute("aria-label", "How this answer is grounded");
      sources.forEach(function (s) { strip.appendChild(el("span", null, s)); });
      m.appendChild(strip);
    }
    return m;
  }

  function typingMsg() {
    var m = el("div", "msg msg--ai");
    var t = el("div", "typing");
    t.setAttribute("aria-label", "Growing Minds AI is typing");
    t.appendChild(el("span")); t.appendChild(el("span")); t.appendChild(el("span"));
    m.appendChild(t);
    return m;
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

    function playStatic() {
      SCRIPT.forEach(function (step) {
        body.appendChild(step.who === "user" ? userMsg(step.text) : aiMsg(step.text, step.sources));
      });
    }

    function playAnimated() {
      var i = 0;
      function step() {
        if (i >= SCRIPT.length) return;
        var s = SCRIPT[i];
        if (s.who === "user") {
          var u = userMsg(s.text); body.appendChild(u); enter(u);
          i++; window.setTimeout(step, 850);
        } else {
          var typing = typingMsg(); body.appendChild(typing); enter(typing);
          window.setTimeout(function () {
            var a = aiMsg(s.text, s.sources);
            body.replaceChild(a, typing); enter(a);
            i++; window.setTimeout(step, 1100);
          }, 1500);
        }
      }
      step();
    }

    function play() {
      if (played) return;
      played = true;
      if (animEnabled) playAnimated(); else playStatic();
    }

    if (!animEnabled || !("IntersectionObserver" in window)) {
      play();
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { play(); io.disconnect(); }
        });
      }, { threshold: 0.3 });
      io.observe(chat);
    }

    // Composer: honest hand-off to the (free) full tutor.
    if (form && input) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var q = input.value.trim();
        if (!q) {
          if (note) note.textContent = "Type a question to see how it works.";
          input.focus();
          return;
        }
        var typed = userMsg(q); body.appendChild(typed); enter(typed);
        input.value = "";
        var reply = function () {
          var a = aiMsg(
            ["That’s exactly the kind of question Growing Minds AI is built for — free, grounded in developmental science. Open the full tutor to ask about your specific situation."],
            ["free · grounded in research"]
          );
          body.appendChild(a); enter(a);
          if (note) note.textContent = "Growing Minds AI is free — use the “Try it free” button to ask your own questions.";
          body.scrollTop = body.scrollHeight;
        };
        if (!animEnabled) { reply(); return; }
        var typing = typingMsg(); body.appendChild(typing); enter(typing);
        body.scrollTop = body.scrollHeight;
        window.setTimeout(function () { body.removeChild(typing); reply(); }, 1100);
      });
    }
  }

  // ------------------------------------------------------------------
  // Waitlist form — progressive enhancement
  // ------------------------------------------------------------------
  function looksLikeEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function initWaitlist() {
    var form = document.querySelector('form[data-newsletter]');
    if (!form || !window.fetch || !window.FormData) return;
    var status = form.querySelector("[data-form-status]");
    var submit = form.querySelector('button[type="submit"]');
    var submitLabel = submit ? submit.textContent : "";

    function setStatus(message, state) {
      if (!status) return;
      status.textContent = message || "";
      if (state) status.setAttribute("data-state", state);
      else status.removeAttribute("data-state");
    }

    form.addEventListener("submit", function (event) {
      var emailField = form.querySelector("#email");
      var email = emailField ? emailField.value.trim() : "";
      if (!looksLikeEmail(email)) {
        event.preventDefault();
        setStatus("Please enter a valid email address so we can reach you.", "error");
        if (emailField) emailField.focus();
        return;
      }
      event.preventDefault();
      var data = new FormData(form);
      var payload = {};
      data.forEach(function (value, key) { payload[key] = value; });

      if (submit) { submit.disabled = true; submit.textContent = "Sending…"; }
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
          form.reset();
          setStatus("You're in! Watch your inbox for the milestone tracker and founding-member news.", "success");
        })
        .catch(function (error) {
          if (error && error.name === "TypeError") { form.submit(); return; }
          setStatus(error.message || "Something went wrong — please try again.", "error");
        })
        .finally(function () {
          if (submit) { submit.disabled = false; submit.textContent = submitLabel; }
        });
    });
  }

  ready(function () {
    initTheme();
    initHeader();
    initYear();
    initNav();
    initReveal();
    initArc();
    initChat();
    initWaitlist();
  });
}());
