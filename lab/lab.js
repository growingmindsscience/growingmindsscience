/* Shared behavior for the homepage compositions: nav toggle, entrances, tablists. */
(function () {
  var nav = document.querySelector('.lab-nav');
  var toggle = document.querySelector('.nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { toggle.click(); toggle.focus(); }
    });
  }

  if (document.documentElement.classList.contains('anim') && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll('[data-rise]').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('[data-rise]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Generic tablist: [data-tabs] holds buttons[data-tab=id]; panels [data-panel=id]. */
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-tab]'));
    var scope = root.closest('[data-tabs-scope]') || document;
    var status = scope.querySelector('[data-tabs-status]');
    function select(id, focus) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tab') === id;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      scope.querySelectorAll('[data-panel]').forEach(function (p) {
        var on = p.getAttribute('data-panel') === id;
        p.hidden = !on;
        p.setAttribute('data-active', String(on));
      });
      scope.querySelectorAll('[data-for]').forEach(function (el) {
        el.setAttribute('data-active', String(el.getAttribute('data-for').split(' ').indexOf(id) !== -1));
      });
      scope.setAttribute('data-step', id);
      if (status) status.textContent = 'Showing: ' + id.charAt(0).toUpperCase() + id.slice(1);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t.getAttribute('data-tab'), false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(tabs[n].getAttribute('data-tab'), true); }
      });
    });
    scope.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-goto'), true); });
    });
    root.setAttribute('data-tabs-ready', '');
    select(tabs[0].getAttribute('data-tab'), false);
  });
})();
