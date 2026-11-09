/* Homepage hero (the annotated plate): integration checks.
   Run: node scripts/smoke-home-hero.mjs (requires playwright-core and Chrome).
   Set HERO_CAPTURE=1 to save a screenshot of every size to output/home-hero/. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.HERO_TEST_PORT) || 8271;
const base = `http://127.0.0.1:${port}/index.html`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await sleep(500);
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }), args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const errors = [];
const capture = process.env.HERO_CAPTURE === '1';
const output = root + 'output/home-hero';
if (capture) await mkdir(output, { recursive: true });
const check = (condition, message) => { assert.ok(condition, message); console.log('✓ ' + message); };
/* The plate's own sequence (painting, three strokes, three notes, the name) takes about 4.2s. */
const DRAWN = 4800;

async function open(options, { settle = DRAWN } = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__shift = 0;
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__shift += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  });
  await page.goto(base, { waitUntil: 'load' });
  if (settle) { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(settle); }
  return page;
}

/* Everything the layout checks need, in one read. Boxes are [left, top, right, bottom]. */
const measure = page => page.evaluate(() => {
  const box = s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
  const shown = s => { const e = document.querySelector(s), c = getComputedStyle(e); return c.opacity === '1' && c.visibility === 'visible' && c.display !== 'none' && e.getClientRects().length > 0; };
  const title = document.querySelector('.hero__title');
  return {
    vw: innerWidth, vh: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth,
    title: box('.hero__title'), lead: box('.hero__lead'), go: box('.hero__go'), more: box('.hero__more'), next: box('.hero__next'),
    stage: box('.hero__stage'), people: box('.hero__piece--people'), cat: box('.hero__piece--cat'), name: box('.hero__name'),
    notes: [1, 2, 3].map(n => box(`.hero__note[data-s="${n}"]`)),
    noteText: [...document.querySelectorAll('.hero__note')].map(n => n.textContent.trim()),
    lines: Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)),
    shown: ['.hero__title', '.hero__lead', '.hero__go', '.hero__more', '.hero__piece--people', '.hero__piece--cat', '.hero__note[data-s="1"]', '.hero__note[data-s="2"]', '.hero__note[data-s="3"]', '.hero__name', '.hero__next'].every(shown),
    pointing: ['wide', 'narrow'].filter(k => getComputedStyle(document.querySelector('.hero__ink--' + k)).display !== 'none'),
    numerals: [...document.querySelectorAll('.hero__num')].filter(n => getComputedStyle(n).display !== 'none').length,
    /* naturalWidth is corrected by the sizes hint, so the file's real width is read from its name. */
    images: [...document.querySelectorAll('.hero__piece img')].map(i => ({ ok: i.complete && i.naturalWidth > 0, sharp: Number((i.currentSrc.match(/-(\d+)\.webp$/) || [])[1]) >= Math.floor(i.getBoundingClientRect().width * Math.min(devicePixelRatio, 2)), alt: i.alt })),
    hrefs: [...document.querySelectorAll('.hero__actions a, .hero__next')].map(a => a.getAttribute('href')),
    next_id: document.querySelector('.hero').nextElementSibling.id,
    ground: getComputedStyle(document.body).backgroundColor,
    shift: window.__shift,
  };
});
const apart = (a, b) => a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1];
const step = page => page.evaluate(() => document.querySelector('[data-hero-plate]').getAttribute('data-step'));

/* The colours of a screenshot's pixels just inside the edges of an element, read in the page (no
   image library needed). The element is scrolled into view first, since a short screen holds the
   painting below the fold, and the pencil is put away so only the paper is read. */
async function edgeColours(page, selector) {
  await page.addStyleTag({ content: '.hero__ink, .hero__num, .hero__notes, .hero__name { visibility: hidden !important; }' });
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), selector);
  await page.waitForTimeout(150);
  const shot = (await page.screenshot()).toString('base64');
  const colours = await page.evaluate(async ({ shot, selector }) => {
    const rect = document.querySelector(selector).getBoundingClientRect();
    const header = document.querySelector('.site-header').getBoundingClientRect().bottom;   // the header stays on screen and may cover the top
    const bitmap = await createImageBitmap(await (await fetch('data:image/png;base64,' + shot)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); const g = canvas.getContext('2d'); g.drawImage(bitmap, 0, 0);
    const k = bitmap.width / innerWidth, seen = new Set();
    const l = Math.max(0, Math.ceil(rect.left * k)), t = Math.max(Math.ceil(header * k), Math.ceil(rect.top * k)), r = Math.min(bitmap.width, Math.floor(rect.right * k)), b = Math.min(bitmap.height, Math.floor(rect.bottom * k));
    const read = (x, y, w, h) => { if (w < 1 || h < 1) return; const d = g.getImageData(x, y, w, h).data; for (let i = 0; i < d.length; i += 4) seen.add(`rgb(${d[i]}, ${d[i + 1]}, ${d[i + 2]})`); };
    if (rect.top >= header) read(l, t, r - l, 3);   // under the header there is no top edge to read, only painting
    read(l, t, 3, b - t); read(r - 3, t, 3, b - t);
    return [...seen];
  }, { shot, selector });
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  return colours;
}

const sizes = [[320, 568], [390, 844], [844, 390], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080]];
try {
  for (const [width, height] of sizes) {
    const at = `${width}x${height}`;
    const page = await open({ viewport: { width, height }, isMobile: width < 768 && height > width, hasTouch: width < 768 });
    /* A short phone holds the sequence until the painting is on screen: bring it up and let it play. */
    await page.evaluate(() => document.querySelector('.hero__stage').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => !document.querySelector('[data-hero-plate]').classList.contains('is-waiting'));
    await page.waitForTimeout(DRAWN); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(150);
    const m = await measure(page);
    const wide = width > 900;
    check(m.overflow <= 0, `${at}: no sideways scroll`);
    check(m.shown, `${at}: title, line, actions, both pieces of the painting, all three notes and the lesson's name are showing`);
    check(m.noteText.join('|') === 'They notice the cat.|They point, to share it with you.|You look too.', `${at}: the three notes read in order`);
    check(m.lines === 2, `${at}: the title sits on two lines, one sentence each`);
    check(m.go[3] <= m.vh && m.go[1] >= 0, `${at}: the first action is inside the first screen`);
    check(m.more[3] - m.more[1] >= 44 && m.go[3] - m.go[1] >= 48 && m.next[3] - m.next[1] >= 44, `${at}: the actions and the way on are each a full touch target tall`);
    check(m.hrefs.join() === '/tools/right-now,/classes/,#lens', `${at}: the actions go to the right-now tool and the classes, and the way on to the playground story`);
    check(m.images.every(i => i.ok && i.sharp), `${at}: both pictures loaded at a size that fills their box`);
    check(m.images.filter(i => i.alt).length === 1 && m.images[0].alt === '', `${at}: one description for the whole scene, on the people`);
    check(m.cat[2] <= m.people[0] + 0.5, `${at}: the cat's sheet and the people's sheet do not overlap`);
    check(Math.abs(m.cat[3] - m.people[3]) < 1 && Math.abs(m.people[3] - m.stage[3]) < 1, `${at}: cat and people stand on one ground line`);
    check(m.cat[0] >= -0.5 && m.people[2] <= m.vw + 0.5, `${at}: nothing of the painting is cut by the screen's edges`);
    check(m.pointing.join() === (wide ? 'wide' : 'narrow'), `${at}: one pointing line is drawn, the ${wide ? 'wide' : 'narrow'} one`);
    if (wide) {
      check(m.numerals === 0, `${at}: the notes sit on their strokes, so nothing is numbered`);
      check(m.next[3] <= m.vh, `${at}: the whole plate, to its foot, is inside the first screen`);
      check([m.title, m.lead, m.go, m.more].every(b => apart(b, m.cat) && apart(b, m.people)), `${at}: the words and actions are clear of the cat and the people`);
      check([m.title, m.lead, m.go, m.more].every(b => m.notes.every(n => apart(b, n))), `${at}: the words and actions are clear of the three notes`);
      check(apart(m.notes[0], m.notes[1]) && apart(m.notes[1], m.notes[2]) && apart(m.notes[0], m.notes[2]), `${at}: the three notes are clear of each other`);
      check(m.notes[0][3] <= m.cat[1] + (m.cat[3] - m.cat[1]) * 0.1 && m.notes[2][3] <= m.stage[1] + 12, `${at}: the first note is over the cat and the third over the parent's arc`);
      check(m.notes.every(n => n[0] >= 0 && n[2] <= m.vw), `${at}: every note is on the page`);
      check(m.people[2] - m.people[0] >= 0.25 * Math.min(m.vw, 1320), `${at}: the toddler and parent take at least a quarter of the page width`);
      check(m.name[1] >= m.stage[3] && apart(m.name, m.next), `${at}: the lesson's name hangs under the ground, clear of the way on`);
    } else {
      check(m.numerals === 3, `${at}: the three strokes are numbered`);
      check(m.more[3] <= m.stage[1], `${at}: the painting starts under the actions`);
      check(m.stage[3] - m.stage[1] <= m.vh, `${at}: the painting is no taller than the screen`);
      check(m.stage[3] <= m.notes[0][1] && m.notes[0][3] <= m.notes[1][1] && m.notes[1][3] <= m.notes[2][1] && m.notes[2][3] <= m.name[1] && m.name[3] <= m.next[1], `${at}: under the painting come the three notes, the name, then the way on`);
    }
    check(m.shift < 0.01, `${at}: nothing shifts while the page loads (${m.shift.toFixed(4)})`);
    check(m.next_id === 'lens', `${at}: the playground story follows the hero`);
    if (capture) await page.screenshot({ path: `${output}/${at}.png` });
    for (const piece of ['people', 'cat']) {
      const colours = await edgeColours(page, '.hero__piece--' + piece);
      check(colours.length === 1 && colours[0] === m.ground, `${at}: the ${piece} sheet's edges are exactly the page colour` + (colours.length === 1 && colours[0] === m.ground ? '' : ' (saw ' + colours.slice(0, 6).join(' ') + ')'));
    }
    await page.context().close();
  }

  /* Motion: the painting settles, the plate is read aloud once, then a small drift as the page scrolls. */
  {
    const page = await open({ viewport: { width: 1440, height: 900 } }, { settle: 0 });
    const words = await page.evaluate(() => ['.hero__title', '.hero__lead', '.hero__go', '.hero__more'].every(s => { const e = document.querySelector(s), c = getComputedStyle(e); return c.opacity === '1' && e.getAnimations().length === 0; }));
    check(words, 'motion: the words and actions are at rest from the first paint, with no animation on them');
    const early = await page.evaluate(() => ({ pieces: [...document.querySelectorAll('.hero__piece')].every(e => e.getAnimations().some(a => a.animationName === 'hero-settle')), name: getComputedStyle(document.querySelector('.hero__name')).opacity, waiting: document.querySelector('[data-hero-plate]').classList.contains('is-waiting') }));
    check(early.pieces && early.name === '0' && !early.waiting, 'motion: with the painting on screen the sequence starts at once, and the lesson is not named before it is drawn');
    await page.waitForTimeout(1700);
    const settled = await page.evaluate(() => [...document.querySelectorAll('.hero__piece')].every(e => { const c = getComputedStyle(e); return c.opacity === '1' && (c.transform === 'none' || c.transform === 'matrix(1, 0, 0, 1, 0, 0)'); }));
    check(settled, 'motion: the cat and the people have settled within 1.7 seconds');
    await page.waitForTimeout(DRAWN - 1700);
    const rest = await page.evaluate(() => ({
      running: [...document.querySelectorAll('.hero__reveal, .hero__note, .hero__name, .hero__dot, .hero__stroke--tip')].filter(e => e.getClientRects().length && e.getAnimations().some(a => a.playState === 'running' && a.animationName !== 'hero-drift')).length,
      /* Only the pointing line for this width is laid out; the other one's drawing has not been asked for. */
      drawn: [...document.querySelectorAll('.hero__reveal')].filter(e => getComputedStyle(e.closest('svg')).display !== 'none').every(e => parseFloat(getComputedStyle(e).strokeDashoffset) === 0),
      shown: ['.hero__note[data-s="1"]', '.hero__note[data-s="2"]', '.hero__note[data-s="3"]', '.hero__name'].every(s => getComputedStyle(document.querySelector(s)).opacity === '1'),
    }));
    check(rest.running === 0 && rest.drawn && rest.shown, `motion: within ${DRAWN / 1000} seconds every stroke is drawn, every note is set down and nothing is still moving`);
    const drift = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'));
    const shiftAt = async y => { await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await page.waitForTimeout(120); return page.evaluate(() => ['.hero__stage', '.hero__notes'].map(s => parseFloat((getComputedStyle(document.querySelector(s)).translate.split(' ')[1]) || 0))); };
    const mid = await shiftAt(450), end = await shiftAt(2000), back = await shiftAt(0);
    if (drift) {
      check(mid.every((v, i) => v > 0 && v < end[i]) && end.every(v => v <= 40) && end[0] === end[1], `motion: scrolling moves the sheet and its notes together, a little, and never more than 40px (${end.join(', ')})`);
      check(back.every(v => v === 0), 'motion: back at the top the plate is where it started');
    } else console.log('· this browser has no scroll timeline; the drift is skipped');

    /* Pointing at a figure picks out its stroke. */
    const centre = s => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, s);
    for (const [selector, n, what] of [['.hero__piece--cat', '1', 'the cat'], ['.hero__hit--toddler', '2', 'the toddler'], ['.hero__hit--parent', '3', 'the parent'], ['.hero__note[data-s="1"]', '1', 'the first note']]) {
      const [x, y] = await centre(selector);
      await page.mouse.move(x, y); await page.waitForTimeout(320);
      const state = await page.evaluate(n => ({
        step: document.querySelector('[data-hero-plate]').getAttribute('data-step'),
        others: [...document.querySelectorAll('.hero__ink [data-s]')].filter(e => e.getAttribute('data-s') !== n && e.getClientRects().length).every(e => parseFloat(getComputedStyle(e).opacity) < 0.5),
        chosen: [...document.querySelectorAll('.hero__ink [data-s="' + n + '"]')].filter(e => e.getClientRects().length).every(e => getComputedStyle(e).opacity === '1'),
        redraw: [...document.querySelectorAll('.hero__reveal[data-draw="' + n + '"]')].some(e => e.getAnimations().length > 0),
      }), n);
      check(state.step === n && state.others && state.chosen && state.redraw, `hover: pointing at ${what} draws stroke ${n} again and lets the other two fall back`);
    }
    await page.mouse.move(700, 160); await page.waitForTimeout(320);
    check(await step(page) === null, 'hover: moving away puts the plate back');
    await page.context().close();
  }
  {
    /* A phone has no hover: a tap picks a stroke, a tap elsewhere puts the plate back. */
    const page = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.tap('.hero__note[data-s="2"]'); await page.waitForTimeout(300);
    const picked = await page.evaluate(() => ({ step: document.querySelector('[data-hero-plate]').getAttribute('data-step'), colours: [...document.querySelectorAll('.hero__note')].map(n => getComputedStyle(n).color) }));
    check(picked.step === '2' && picked.colours[1] !== picked.colours[0] && picked.colours[0] === picked.colours[2], 'tap: tapping the second note picks out its stroke and quiets the other two notes');
    await page.tap('.hero__piece--cat'); await page.waitForTimeout(200);
    check(await step(page) === '1', 'tap: tapping the cat moves to the first stroke');
    await page.tap('.hero__piece--cat'); await page.waitForTimeout(200);
    check(await step(page) === null, 'tap: tapping it again puts the plate back');
    await page.tap('.hero__hit--parent'); await page.waitForTimeout(200); await page.tap('.hero__title'); await page.waitForTimeout(200);
    check(await step(page) === null, 'tap: so does a tap anywhere else');
    await page.context().close();
  }
  {
    /* A screen too short to show the painting holds the sequence until the painting arrives. */
    const page = await open({ viewport: { width: 375, height: 520 }, isMobile: true, hasTouch: true }, { settle: 2500 });
    const held = await page.evaluate(() => ({ waiting: document.querySelector('[data-hero-plate]').classList.contains('is-waiting'), cat: getComputedStyle(document.querySelector('.hero__piece--cat')).opacity, action: document.querySelector('.hero__go').getBoundingClientRect().bottom <= innerHeight }));
    check(held.waiting && held.cat === '0' && held.action, 'short phone: the first action is on screen and the plate waits, undrawn, below it');
    await page.evaluate(() => document.querySelector('.hero__stage').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(DRAWN);
    const played = await page.evaluate(() => ({ waiting: document.querySelector('[data-hero-plate]').classList.contains('is-waiting'), name: getComputedStyle(document.querySelector('.hero__name')).opacity, cat: getComputedStyle(document.querySelector('.hero__piece--cat')).opacity }));
    check(!played.waiting && played.name === '1' && played.cat === '1', 'short phone: scrolled into view, the plate plays through to the lesson\'s name');
    await page.context().close();
  }
  {
    const page = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }, { settle: 0 });
    const still = await page.evaluate(() => [...document.querySelectorAll('.hero__piece, .hero__stage, .hero__reveal, .hero__note, .hero__name, .hero__dot')].every(e => getComputedStyle(e).opacity === '1' && e.getAnimations().length === 0));
    check(still, 'reduced motion: the finished plate is simply there, with no entrance, no drawing and no drift');
    const [x, y] = await page.evaluate(() => { const r = document.querySelector('.hero__piece--cat').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.move(x, y); await page.waitForTimeout(100);
    const calm = await page.evaluate(() => ({ step: document.querySelector('[data-hero-plate]').getAttribute('data-step'), moving: [...document.querySelectorAll('.hero__reveal')].some(e => e.getAnimations().length > 0) }));
    check(calm.step === '1' && !calm.moving, 'reduced motion: pointing at the cat still picks out its stroke, without redrawing it');
    await page.context().close();
  }
  for (const [label, options] of [['no-js', { javaScriptEnabled: false }], ['dark', { colorScheme: 'dark' }]]) {
    for (const [width, height] of [[390, 844], [1440, 900]]) {
      const page = await open({ viewport: { width, height }, ...options });
      const state = await page.evaluate(() => ({
        shown: ['.hero__title', '.hero__go', '.hero__more', '.hero__piece--people', '.hero__piece--cat', '.hero__note[data-s="1"]', '.hero__note[data-s="3"]', '.hero__name'].every(s => { const c = getComputedStyle(document.querySelector(s)); return c.opacity === '1' && c.visibility === 'visible'; }),
        sheet: getComputedStyle(document.querySelector('.hero__stage'), '::before').backgroundColor,
        noteInk: getComputedStyle(document.querySelector('.hero__note')).color, pageInk: getComputedStyle(document.querySelector('.hero__title')).color,
        clear: (() => { const s = document.querySelector('.hero__stage').getBoundingClientRect(), a = document.querySelector('.hero__actions').getBoundingClientRect(); return a.bottom <= s.top; })(),
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      check(state.shown && state.overflow <= 0, `${label} at ${width}px: the whole plate is showing, notes and name included, and nothing overflows`);
      if (label === 'dark') {
        check(state.sheet === 'rgb(248, 249, 251)' && state.clear, `dark at ${width}px: the painting keeps its sheet of paper, and the words stand clear above it`);
        check(width > 900 ? state.noteInk === 'rgb(25, 60, 57)' : state.noteInk === state.pageInk, `dark at ${width}px: the notes are in ${width > 900 ? 'the sheet\'s ink, since they sit on it' : 'the page\'s ink, since they sit under the sheet'}`);
      }
      if (capture) await page.screenshot({ path: `${output}/${label}-${width}x${height}.png` });
      await page.context().close();
    }
  }
  {
    /* Keyboard: the two actions and the way on are reachable in order and show a focus ring. */
    const page = await open({ viewport: { width: 1440, height: 900 } });
    await page.focus('.nav__cta a'); await page.keyboard.press('Tab');
    const seen = [];
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); seen.push(await page.evaluate(() => { const a = document.activeElement, c = getComputedStyle(a); return a.className.split(' ').pop() + '|' + c.outlineStyle + '|' + (parseFloat(c.outlineWidth) >= 2); })); }
    check(seen.join() === 'hero__go|solid|true,hero__more|solid|true,hero__next|solid|true', 'keyboard: after the header, Tab reaches the first action, the second, then the way on, each with a visible ring');
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    check(await page.evaluate(() => location.hash === '#lens' && document.querySelector('#lens').getBoundingClientRect().top < innerHeight / 2), 'keyboard: the way on lands on the playground story');
    await page.context().close();
  }
  check(errors.length === 0, 'no JavaScript errors');
  console.log('ALL PASSED');
} catch (error) {
  console.error('FAILED: ' + error.message);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}
