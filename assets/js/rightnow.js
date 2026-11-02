/* Right Now: presentation and controls for the situation router.
   Advice and narration are sourced only from #router-data. The interface-only
   safety lines (never shake, when to call, sources) come from #router-notes and
   never enter the narration. */
(function () {
  'use strict';

  var DATA = JSON.parse(document.getElementById('router-data').textContent);
  var NOTES = {};
  try { NOTES = JSON.parse(document.getElementById('router-notes').textContent) || {}; } catch (_) {}
  var main = document.getElementById('rn-main');
  var pocket = document.getElementById('rn-pocket');
  var svgNS = 'http://www.w3.org/2000/svg';

  function byId(id) {
    return DATA.situations.filter(function (s) { return s.id === id; })[0];
  }

  function note(s) { return NOTES[s.id] || {}; }

  // Typographic quotes and apostrophes for interface strings only. The narrated
  // fields (title, body, seq, tryLine) are shown and copied exactly as recorded.
  function smart(t) {
    return String(t == null ? '' : t)
      .replace(/(^|[\s(\[{])"/g, '$1\u201C').replace(/"/g, '\u201D')
      .replace(/(^|[\s(\[{\u201C])'/g, '$1\u2018').replace(/'/g, '\u2019');
  }

  // The saved child's age in months, unless only a stage was given long ago.
  function childMonths() {
    try {
      if (!window.GMS || !GMS.profile) return null;
      if (GMS.profile.isStale && GMS.profile.isStale()) return null;
      return GMS.profile.ageInMonths();
    } catch (_) { return null; }
  }

  // Where the full guide is. A baby under 12 months gets the first-year guide
  // instead of the toddler one (sleep); crying points to the first-year class.
  function onward(s) {
    var n = note(s);
    if (n.full) return { href: n.full.href, text: smart(n.full.text) };
    var m = childMonths();
    if (n.infant && m != null && m < 12) return { href: n.infant.href, text: smart(n.infant.text), infant: true };
    return { href: '/tools/' + s.toolSlug, text: 'Read the full tool' };
  }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) {
      if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function icon(name, className) {
    var paths = {
      arrow: 'M4 12h15m-6-6 6 6-6 6',
      back: 'M20 12H5m6-6-6 6 6 6',
      chevron: 'm6 9 6 6 6-6',
      copy: 'M9 9h11v11H9zM15 5V3H3v12h2'
    };
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', className || 'rn-icon');
    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', paths[name]);
    svg.appendChild(path);
    return svg;
  }

  function stopListening() {
    if (window.GMS && GMS.stopListening) GMS.stopListening();
  }

  function renderStart() {
    stopListening();
    pocket.innerHTML = '';
    main.innerHTML = '';
    var title = el('h1', { class: 'rn-step__title', text: 'What\u2019s happening?', tabindex: '-1' });
    var intro = el('div', { class: 'rn-intro' }, [
      title,
      el('p', { class: 'rn-step__eyebrow', text: 'It\u2019s hard right now' }),
      el('p', { class: 'rn-step__lead', text: 'Choose what feels closest. Let\u2019s find one small next step.' }),
      el('p', { class: 'rn-reassurance' }, ['You don\u2019t have to solve', el('br'), 'the whole day.'])
    ]);
    var choices = el('div', { class: 'rn-choices', role: 'group', 'aria-label': 'Choose your situation' });
    DATA.situations.forEach(function (s) {
      choices.appendChild(el('button', {
        type: 'button', class: 'rn-choice', onclick: function () { go(s.id); }
      }, [
        el('span', { class: 'rn-choice__text' }, [
          el('span', { class: 'rn-choice__name', text: smart(s.choice) }),
          el('span', { class: 'rn-choice__hint', text: smart(s.hint) })
        ]),
        icon('arrow', 'rn-choice__arrow')
      ]));
    });
    main.appendChild(el('div', { class: 'rn-step' }, [intro, choices]));
    title.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function guidance(s) {
    var guided = false;
    var index = 0;
    var guide = el('section', { class: 'rn-guide', 'aria-labelledby': 'rn-guide-title' });
    var toggle = el('button', {
      type: 'button', class: 'rn-text-button rn-guide__toggle',
      'aria-pressed': 'false', 'aria-controls': 'rn-sequence', text: 'One step at a time'
    });
    var seq = el('ol', { id: 'rn-sequence', class: 'rn-seq', role: 'list' });
    var items = s.seq.map(function (line, i) {
      // Emphasize the existing opening phrase without rewriting a single word.
      var parts = line.match(/^(.+?[.:])(\s+)([\s\S]+)$/);
      var copy = el('span', { class: 'rn-seq__copy' });
      if (parts) {
        copy.appendChild(el('strong', { text: parts[1] }));
        copy.appendChild(document.createTextNode(parts[2] + parts[3]));
      } else copy.textContent = line;
      var item = el('li', {}, [
        el('span', { class: 'rn-seq__number', 'aria-hidden': 'true', text: String(i + 1) }), copy
      ]);
      seq.appendChild(item);
      return item;
    });
    var progress = el('span');
    var markers = el('div', { class: 'rn-guide__markers', 'aria-hidden': 'true' });
    s.seq.forEach(function () { markers.appendChild(el('span')); });
    var previous = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Previous step' });
    var next = el('button', { type: 'button', class: 'btn', text: 'Next step' });
    var nav = el('div', { class: 'rn-guide__nav', hidden: '' }, [
      el('div', { class: 'rn-guide__progress' }, [progress, markers]),
      el('div', { class: 'rn-guide__buttons' }, [previous, next])
    ]);
    var status = el('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });

    function update(animate) {
      guide.classList.toggle('is-guided', guided);
      toggle.textContent = guided ? 'Show all steps' : 'One step at a time';
      toggle.setAttribute('aria-pressed', String(guided));
      nav.hidden = !guided;
      items.forEach(function (item, i) {
        item.hidden = guided && i !== index;
        if (guided && i === index) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      previous.disabled = index === 0;
      next.textContent = index === items.length - 1 ? 'See all steps' : 'Next step';
      progress.textContent = 'Step ' + (index + 1) + ' of ' + items.length;
      Array.prototype.forEach.call(markers.children, function (mark, i) {
        mark.classList.toggle('is-current', i === index);
      });
      status.textContent = guided ? progress.textContent + '. ' + s.seq[index] : 'All three steps are shown.';
      // One bounded transition explains the change of step. No entrance delay,
      // no loop, and reduced motion presents the new step immediately.
      if (animate && guided && items[index].animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        items[index].animate([
          { opacity: 0.65, transform: 'translateX(6px)' },
          { opacity: 1, transform: 'translateX(0)' }
        ], { duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      }
    }

    toggle.addEventListener('click', function () {
      guided = !guided;
      index = 0;
      update(true);
    });
    previous.addEventListener('click', function () {
      if (index > 0) index--;
      update(true);
      if (previous.disabled) next.focus({ preventScroll: true });
    });
    next.addEventListener('click', function () {
      if (index < items.length - 1) index++;
      else guided = false;
      update(true);
      if (!guided) toggle.focus({ preventScroll: true });
    });

    guide.appendChild(el('div', { class: 'rn-guide__header' }, [
      el('h2', { id: 'rn-guide-title', class: 'rn-guide__title', text: 'Start here' }), toggle
    ]));
    guide.appendChild(seq);
    guide.appendChild(nav);
    guide.appendChild(status);
    // A safety line outside the recorded steps (never shake; step away). It stays
    // in view in both the full and the one-step reading.
    if (note(s).edge) guide.appendChild(el('p', { class: 'rn-answer__edge', text: smart(note(s).edge) }));
    var full = onward(s);
    guide.appendChild(el('details', { class: 'rn-why' }, [
      el('summary', {}, ['Why this helps', icon('chevron')]),
      el('p', { class: 'rn-answer__body', text: s.body }),
      el('a', { class: 'rn-why__link', href: full.href }, [full.text, icon('arrow')])
    ]));
    return guide;
  }

  function phrase(s) {
    var quote = el('blockquote', { class: 'rn-answer__quote', tabindex: '-1', text: s.tryLine });
    var label = el('span', { text: 'Copy words' });
    var copy = el('button', { type: 'button', class: 'rn-text-button rn-copy' }, [icon('copy'), label]);
    var status = el('p', { class: 'rn-copy__status', role: 'status', 'aria-live': 'polite' });

    function selectWords() {
      var selection = window.getSelection && window.getSelection();
      if (selection && document.createRange) {
        quote.focus({ preventScroll: true });
        var range = document.createRange();
        range.selectNodeContents(quote);
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent = 'Words selected. Use your device\u2019s Copy command.';
      } else status.textContent = 'Select these words to copy them on your device.';
    }
    copy.addEventListener('click', function () {
      if (!navigator.clipboard || !navigator.clipboard.writeText) { selectWords(); return; }
      navigator.clipboard.writeText(s.tryLine).then(function () {
        label.textContent = 'Copied';
        status.textContent = 'Ready to paste wherever you need it.';
      }).catch(selectWords);
    });
    return el('aside', { class: 'rn-answer__try', 'aria-labelledby': 'rn-try-label' }, [
      el('span', { id: 'rn-try-label', class: 'rn-answer__try-label', text: 'Try saying' }), quote, copy, status
    ]);
  }

  function actionRow(s, status) {
    var key = 'right-now:' + s.id;
    var row = el('div', { class: 'rn-actions', role: 'group', 'aria-label': 'Keep this guide or get more support' });
    function isSaved() { return !!(window.GMS && GMS.shelf.has(key)); }
    // When the browser keeps no site data, a save lasts only for this visit; say so.
    function kept() { return !(window.GMS && GMS.persistent === false); }
    function savedText() { return kept() ? 'Saved' : 'Saved for this visit'; }
    var save = el('button', {
      type: 'button', class: 'btn btn--ghost', text: isSaved() ? savedText() : 'Save this', 'aria-pressed': String(isSaved())
    });
    save.addEventListener('click', function () {
      if (!window.GMS) return;
      var n = note(s);
      if (GMS.shelf.has(key)) GMS.shelf.removeByKey(key);
      else GMS.shelf.add({ key: key, toolSlug: 'right-now', toolTitle: 'It\u2019s hard right now',
        toolUrl: '/tools/right-now#' + s.id, title: s.title,
        // The safety lines (never shake, when to call) travel with the saved card.
        body: [s.body, smart(n.edge), smart(n.when)].filter(Boolean).join(' '),
        seq: s.seq, tryLine: s.tryLine });
      save.textContent = isSaved() ? savedText() : 'Save this';
      save.setAttribute('aria-pressed', String(isSaved()));
      status.textContent = !isSaved() ? 'Removed from Saved for you.'
        : kept() ? 'Find this again in Saved for you, under All tools.'
        : 'This browser isn\u2019t keeping site data, so this lasts only until you leave the page.';
    });
    row.appendChild(save);
    var ask = el('a', {
      class: 'btn btn--ghost', href: window.GMS ? GMS.askUrl(s.aiQuestion) : '/tools/ask-the-research', text: 'Ask about this'
    });
    row.appendChild(ask);

    // Recording identity depends on this exact script. Keep its words, order,
    // punctuation normalization, and "Try saying:" prefix unchanged. UI labels
    // and the guided view must never be included in the narration text.
    if (window.GMS && GMS.mountListen) {
      var text = [s.title, s.body].concat(s.seq).concat(['Try saying: ' + s.tryLine]).map(function (t) {
        t = String(t).trim();
        return /[.?!:;]$/.test(t) ? t : t + '.';
      }).join(' ');
      GMS.mountListen(row, text, 'btn btn--ghost', ask);
    }
    var print = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Print pocket card' });
    print.addEventListener('click', function () {
      fillPocket(s);
      if (window.GMS && GMS.printCard) GMS.printCard(); else window.print();
    });
    row.appendChild(print);
    return row;
  }

  function fillPocket(s) {
    pocket.innerHTML = '';
    pocket.appendChild(el('h2', { text: s.title }));
    var ol = el('ul', { class: 'pocket-seq' });
    s.seq.forEach(function (line, i) { ol.appendChild(el('li', { text: (i + 1) + '. ' + line })); });
    pocket.appendChild(ol);
    var n = note(s);
    if (n.edge) pocket.appendChild(el('p', { class: 'pocket-when', text: smart(n.edge) }));
    pocket.appendChild(el('div', { class: 'pocket-try', text: 'Try saying: ' + s.tryLine }));
    if (n.when) pocket.appendChild(el('p', { class: 'pocket-when', text: smart(n.when) }));
    pocket.appendChild(el('p', { class: 'pocket-help', text: 'If you might hurt your child, put them somewhere safe and step away. In the US, call or text 988 any time, or call 911 in an emergency.' }));
    pocket.appendChild(el('p', { class: 'pocket-foot', text: 'From Little Onward · fromlittleonward.com' }));
  }

  function renderAnswer(id) {
    stopListening();
    var s = byId(id);
    if (!s) return renderStart();
    fillPocket(s);
    main.innerHTML = '';
    var title = el('h1', { class: 'rn-answer__title', text: s.title, tabindex: '-1' });
    var saveStatus = el('p', { class: 'rn-save-status', role: 'status', 'aria-live': 'polite' });
    var n = note(s);
    var infant = onward(s).infant;
    // When to call: the pediatrician or 911, under the phrase (interface text,
    // not part of the recording). Its further read is dropped when the guide
    // link already goes there.
    var when = n.when ? el('p', { class: 'rn-answer__when' }, [
      smart(n.when),
      (n.whenLink && !infant) ? ' ' : null,
      (n.whenLink && !infant) ? el('a', { href: n.whenLink.href, text: smart(n.whenLink.text) }) : null
    ]) : null;
    var sources = (n.sources && n.sources.length) ? el('section', { class: 'rn-sources', 'aria-labelledby': 'rn-sources-title' }, [
      el('h2', { id: 'rn-sources-title', class: 'rn-sources__title', text: 'Sources' }),
      el('ul', {}, n.sources.map(function (src) {
        return el('li', {}, [el('a', { href: src.href, rel: 'noopener noreferrer', target: '_blank', text: smart(src.text) })]);
      }))
    ]) : null;
    var card = el('article', { class: 'rn-answer' }, [
      el('header', { class: 'rn-answer__header' }, [title, el('p', { class: 'rn-answer__state', text: smart(s.state) })]),
      el('div', { class: 'rn-answer__layout' }, [guidance(s), el('div', { class: 'rn-answer__side' }, [phrase(s), when])]),
      actionRow(s, saveStatus), saveStatus, sources
    ]);
    main.appendChild(card);
    main.appendChild(el('div', { class: 'rn-back' }, [
      el('button', { type: 'button', class: 'rn-text-button', onclick: goBack }, [icon('back'), 'Something else is happening'])
    ]));
    title.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // Keep the existing shareable hashes, saved-shelf links, and phone Back flow.
  function go(id) {
    try { history.pushState({ rn: id }, '', '#' + id); } catch (_) {}
    renderAnswer(id);
  }
  function goBack() {
    if (history.state && history.state.rn) { history.back(); return; }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    renderStart();
  }
  function fromHash() {
    var id = (location.hash || '').replace(/^#/, '');
    try { id = decodeURIComponent(id); } catch (_) {}
    if (id && byId(id)) renderAnswer(id); else renderStart();
  }
  window.addEventListener('popstate', fromHash);
  fromHash();
})();
