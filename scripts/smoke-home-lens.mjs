/* Homepage playground story: integration checks.
   Run: node scripts/smoke-home-lens.mjs (requires playwright-core and Chrome).
   Set LENS_CAPTURE=1 to save a screenshot of every beat to output/playground-story/. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.LENS_TEST_PORT) || 8269;
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await sleep(500);
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }), args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const errors = [];
const keys = ['leave', 'acknowledge', 'hold', 'together'];
/* A scroll position well inside each beat's rest, as a fraction of the pinned travel. */
const rests = { leave: 0.05, acknowledge: 0.32, hold: 0.63, together: 0.92 };
/* The middle of each change between beats. */
const changes = [0.173, 0.482, 0.791];
const capture = process.env.LENS_CAPTURE === '1';
const output = root + 'output/playground-story';
if (capture) await mkdir(output, { recursive: true });
const check = (condition, message) => { assert.ok(condition, message); console.log('✓ ' + message); };

async function open(context, hash = '#lens') {
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/index.html' + hash, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}
/* Scroll so the pinned stage is at fraction p of its travel. Returns nothing; read state() after. */
const seek = (page, p) => page.evaluate(p => {
  const track = document.querySelector('[data-pg-track]'), stage = document.querySelector('[data-pg-stage]');
  const rect = track.getBoundingClientRect(), top = parseFloat(getComputedStyle(stage).top) || 0;
  scrollTo({ top: scrollY + rect.top - top + (rect.height - stage.offsetHeight) * p, behavior: 'instant' });
}, p);
const state = page => page.evaluate(() => {
  const scope = document.querySelector('[data-playground-story]');
  const opacity = el => +getComputedStyle(el).opacity;
  return {
    live: scope.classList.contains('pg-live'), beat: scope.dataset.beat || null,
    art: [...scope.querySelectorAll('.pg-cam')].map(opacity), text: [...scope.querySelectorAll('.pg-text')].map(opacity),
    ticks: [...scope.querySelectorAll('.pg-progress i')].map(i => i.classList.contains('is-on')),
    overflow: document.documentElement.scrollWidth > innerWidth
  };
});
const rested = async (page, p) => { await seek(page, p); await page.waitForTimeout(900); return state(page); };
const whole = (s, i) => s.art.every((v, j) => v === (j === i ? 1 : 0)) && s.text.every((v, j) => v === (j === i ? 1 : 0));

try {
  for (const [width, height] of [[320, 640], [390, 844], [430, 932], [768, 1024], [1440, 900], [1920, 1080]].filter(([w]) => !process.env.LENS_ONLY || w === Number(process.env.LENS_ONLY))) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await open(context);
    const scope = page.locator('[data-playground-story]');
    check((await state(page)).live, `${width}px: the stage goes live`);
    check(await scope.locator('button,details,[role="tab"]').count() === 0, `${width}px: nothing to operate, scrolling is the only input`);
    const focusBefore = await page.evaluate(() => document.activeElement.tagName);
    for (const key of keys) {
      const s = await rested(page, rests[key]);
      const i = keys.indexOf(key);
      check(s.beat === key && whole(s, i) && s.ticks.filter(Boolean).length === 1 && s.ticks[i], `${width}px: ${key} shows alone, picture and caption whole`);
      check(!s.overflow, `${width}px: ${key} has no horizontal overflow`);
      const fit = await page.evaluate(i => {
        const beat = document.querySelectorAll('[data-pg-beat]')[i], stage = document.querySelector('[data-pg-stage]').getBoundingClientRect();
        const text = beat.querySelector('.pg-text').getBoundingClientRect(), art = beat.querySelector('.pg-art').getBoundingClientRect();
        const img = beat.querySelector('img');
        const lines = beat.querySelector('.pg-line').getBoundingClientRect();
        const ticks = document.querySelector('.pg-progress').getBoundingClientRect();
        const stacked = getComputedStyle(beat).gridTemplateColumns.split(' ').length === 1;
        return { textInStage: text.top >= stage.top - 1 && lines.bottom <= stage.bottom + 1, artInStage: art.top >= stage.top - 1 && art.bottom <= stage.bottom + 1,
          clear: stacked ? lines.top >= art.bottom - 1 : text.right <= art.left + 1, ticksClear: lines.bottom <= ticks.top, loaded: img.complete && img.naturalWidth > 0, artHeight: Math.round(art.height) };
      }, i);
      check(fit.textInStage && fit.artInStage && fit.clear && fit.ticksClear && fit.loaded && fit.artHeight >= 180, `${width}px: ${key} fits the stage with caption clear of the picture`);
      if (capture) await page.screenshot({ path: `${output}/${width}-${i + 1}-${key}.png` });
    }
    const positions = await page.evaluate(() => [...document.querySelectorAll('.pg-name')].map(n => Math.round(n.getBoundingClientRect().top)));
    check(new Set(positions).size === 1, `${width}px: the caption starts at the same place on every beat`);
    for (const key of keys.slice().reverse()) {
      const s = await rested(page, rests[key]);
      check(s.beat === key && whole(s, keys.indexOf(key)), `${width}px: scrolling back restores ${key}`);
    }
    check(await page.evaluate(() => document.activeElement.tagName) === focusBefore, `${width}px: scrolling leaves keyboard focus alone`);
    for (const [n, p] of changes.entries()) {
      const s = await rested(page, p);
      check(whole(s, n) || whole(s, n + 1), `${width}px: stopping midway through change ${n + 1} settles on a whole beat`);
    }
    await context.close();
  }

  /* One desktop pass with a real wheel: slow there and back, then fast. */
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await open(context);
  await seek(page, -0.2); await page.waitForTimeout(400);
  await page.mouse.move(700, 500);
  const sample = async (delta, steps, gap) => {
    const seen = [];
    for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, delta); await page.waitForTimeout(gap); seen.push(await state(page)); }
    return seen;
  };
  const once = (seen, label) => {
    const twoPictures = seen.filter(s => s.art.filter(v => v > 0.02).length > 1).length;
    const twoCaptions = seen.filter(s => s.text.filter(v => v > 0.02).length > 1).length;
    check(twoPictures === 0 && twoCaptions === 0, `${label}: never two pictures or two captions at once (${seen.length} samples)`);
    const order = seen.map(s => s.beat).filter((b, i, all) => b && b !== all[i - 1]);
    return order;
  };
  const forward = once(await sample(40, 110, 35), 'slow wheel forward');
  check(forward.join() === keys.join(), 'slow wheel forward: beats arrive in order, once each');
  const backward = once(await sample(-40, 110, 35), 'slow wheel back');
  check(backward.join() === keys.slice().reverse().join(), 'slow wheel back: beats return in reverse order, once each');
  const fast = once(await sample(900, 6, 60), 'fast wheel');
  await page.waitForTimeout(700);
  check((await state(page)).beat === 'together' && fast.length <= keys.length, 'fast wheel: lands on the last beat');
  const before = await page.evaluate(() => scrollY);
  await seek(page, rests.acknowledge); await page.waitForTimeout(600);
  await page.keyboard.press('PageDown'); await page.waitForTimeout(700);
  check(await page.evaluate(y => scrollY !== y, before), 'native keyboard scrolling works, nothing is trapped');

  /* Arriving midway: the first frame is already the right beat. */
  await seek(page, rests.hold); await page.waitForTimeout(500);
  const frames = [];
  await page.exposeFunction('__pgFrame', f => frames.push(f));
  await page.addInitScript(() => { const watch = () => { const s = document.querySelector('[data-playground-story]'); if (s && s.classList.contains('pg-live')) window.__pgFrame([...s.querySelectorAll('.pg-cam')].map(c => +(+getComputedStyle(c).opacity).toFixed(2)).join('/') + '@' + Math.round(scrollY)); requestAnimationFrame(watch); }; requestAnimationFrame(watch); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);
  const restored = await state(page);
  const painted = [...new Set(frames.filter(f => !f.endsWith('@0')).map(f => f.split('@')[0]))];
  check(await page.evaluate(() => scrollY > 0) && painted.length === 1 && whole(restored, keys.indexOf(restored.beat)) && painted[0] === restored.art.join('/'), 'reloading midway: the restored position paints one whole beat and no other (' + painted.join(' ') + ')');
  /* Resizing across the breakpoint keeps a whole beat. */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(900);
  let resized = await state(page);
  check(resized.live && resized.art.filter(v => v === 1).length === 1 && !resized.overflow, 'resizing to a phone keeps one whole beat and no overflow');
  await page.setViewportSize({ width: 900, height: 420 }); await page.waitForTimeout(500);
  resized = await state(page);
  check(!resized.live && await page.locator('[data-pg-beat] .pg-line:visible').count() === 4, 'a very short window falls back to the plain sequence');
  /* The ground under the art is the page ground exactly: no rectangle. */
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(400);
  await rested(page, rests.hold);
  const shot = await page.screenshot({ clip: { x: 0, y: 80, width: 1440, height: 820 } });
  const bright = await page.evaluate(async data => {
    const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: image.width, height: image.height });
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const px = context.getImageData(0, 0, canvas.width, canvas.height).data; let over = 0, ground = 0;
    for (let i = 0; i < px.length; i += 4) { if (px[i] > 248 || px[i + 1] > 249 || px[i + 2] > 251) over++; if (px[i] === 248 && px[i + 1] === 249 && px[i + 2] === 251) ground++; }
    return { over, ground: ground / (px.length / 4) };
  }, shot.toString('base64'));
  check(bright.over === 0 && bright.ground > 0.6, 'the art sits on the exact page ground, no lighter rectangle around it');
  check(await page.locator('#lens a').count() === 2 && await page.locator('#lens a[href="/lens/leaving-the-playground"]').count() === 1 && await page.locator('#lens a[href="/classes/toddlerhood#sample"]').count() === 1, 'the class handoff and the full guide link are kept');
  await context.close();

  /* Dark mode keeps a sheet of paper under the art. */
  const darkContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  const dark = await open(darkContext);
  check(await dark.locator('html').getAttribute('data-theme') === 'dark', 'dark mode follows the site theme');
  for (const key of keys) {
    const s = await rested(dark, rests[key]);
    check(whole(s, keys.indexOf(key)), `dark: ${key} shows alone`);
    if (capture) await dark.screenshot({ path: `${output}/dark-390-${key}.png` });
  }
  check(await dark.evaluate(() => getComputedStyle(document.querySelector('.pg-art')).backgroundColor) === 'rgb(248, 249, 251)', 'dark: the art keeps its paper');
  await darkContext.close();

  /* Without motion or without the script, the whole story is on the page. */
  for (const fallback of ['reduced-motion', 'no-js', 'blocked-script']) {
    for (const [width, height] of [[390, 844], [1440, 900]]) {
      const context = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: fallback !== 'no-js', reducedMotion: fallback === 'reduced-motion' ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      if (fallback === 'blocked-script') await page.route('**/assets/js/home-lens.js*', route => route.abort());
      await page.goto(base + '/index.html#lens', { waitUntil: 'load' });
      const scope = page.locator('[data-playground-story]');
      const shown = await scope.evaluate(n => ({
        live: n.classList.contains('pg-live'), lines: [...n.querySelectorAll('.pg-line')].filter(l => l.getBoundingClientRect().height > 0 && +getComputedStyle(l.closest('.pg-text')).opacity === 1).length,
        pictures: [...n.querySelectorAll('.pg-art')].filter(a => a.getBoundingClientRect().height > 100 && +getComputedStyle(a.querySelector('.pg-cam')).opacity === 1).length,
        alts: [...n.querySelectorAll('.pg-art img')].filter(i => i.alt.length > 40).length, overflow: document.documentElement.scrollWidth > innerWidth,
        sticky: getComputedStyle(n.querySelector('[data-pg-stage]')).position
      }));
      check(!shown.live && shown.lines === 4 && shown.pictures === 4 && shown.alts === 4 && shown.sticky !== 'sticky' && !shown.overflow, `${fallback} at ${width}px: all four beats are laid out, pictures described, nothing pinned`);
      if (capture) { await scope.scrollIntoViewIfNeeded(); await scope.screenshot({ path: `${output}/${fallback}-${width}.png` }); }
      await context.close();
    }
  }
  check(errors.length === 0, 'no JavaScript errors');
  console.log('ALL PASSED');
} finally { await browser.close(); server.kill(); }
