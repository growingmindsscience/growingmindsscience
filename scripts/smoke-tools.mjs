/* Headless smoke test for the parent-tools layer.
   Usage: node scripts/smoke-tools.mjs   (from the repo root, after `npm i --no-save playwright-core`)
   Serves the repo root on :8267 (override with SMOKE_PORT) and drives Chromium via
   playwright-core (override the browser binary with CHROMIUM_PATH). */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const EXE = process.env.CHROMIUM_PATH ||
  ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);
const PORT = Number(process.env.SMOKE_PORT) || 8267;
const BASE = `http://127.0.0.1:${PORT}`;
let fails = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const pdfPages = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await sleep(700);

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const errors = [];
const ctx = await browser.newContext();
ctx.on('weberror', e => errors.push(String(e.error())));
const page = await ctx.newPage();
// Ignore benign network noise that only exists off-Vercel (insights beacon,
// Google Fonts / external assets blocked locally). We only care about real JS.
const benign = /Failed to load resource|ERR_CONNECTION|net::ERR|insights|fonts\.g|favicon|_vercel/i;
page.on('console', m => { if (m.type() === 'error' && !benign.test(m.text())) errors.push(m.text()); });
page.on('pageerror', e => { if (!benign.test(String(e))) errors.push(String(e)); });

try {
  // --- Tools hub: profile empty state ---
  await page.goto(`${BASE}/tools/index.html`, { waitUntil: 'networkidle' });
  ok(await page.locator('[data-gms-profile] .gms-profile__add').count() > 0, 'hub: "Add your child" renders');

  // --- Add a toddler by birthdate (24 months old) ---
  const bd = new Date(); bd.setMonth(bd.getMonth() - 24);
  const iso = bd.toISOString().slice(0, 10);
  await page.click('[data-gms-profile] .gms-profile__add');
  await page.fill('.gms-editor input[type="text"]', 'Nora');
  await page.fill('.gms-editor input[type="date"]', iso);
  await page.click('.gms-editor button[type="submit"]');
  await page.waitForTimeout(200);
  const chip = await page.locator('[data-gms-profile] .gms-chip.is-active').innerText();
  ok(/Nora/.test(chip) && /13–18|19–24|25–36/.test(chip), `hub: chip shows name + band (${chip.replace(/\n/g,' ')})`);
  ok(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('gms-chip')), 'hub: focus lands on the new child chip');
  ok(await page.locator('.tool-card.is-foryou').count() > 0, 'hub: age-matched card flagged "For your child"');
  ok(/is-foryou/.test(await page.locator('#sleep [data-gms-tool-list] > .tool-card').first().getAttribute('class')),
    'hub: age-matched card moves first in DOM order (keyboard order matches the screen)');

  // --- Future birthdays are refused with a calm inline message ---
  await page.locator('[data-gms-profile] .gms-link', { hasText: 'Add another' }).click();
  const future = new Date(); future.setMonth(future.getMonth() + 2);
  await page.fill('.gms-editor input[type="date"]', future.toISOString().slice(0, 10));
  await page.click('.gms-editor button[type="submit"]');
  ok(await page.locator('.gms-field__error:not([hidden])').count() === 1, 'hub: a future birthday is not accepted');
  await page.locator('.gms-editor .gms-link', { hasText: 'Cancel' }).click();

  // --- Persistence across reload ---
  await page.reload({ waitUntil: 'networkidle' });
  ok(await page.locator('[data-gms-profile] .gms-chip.is-active').count() > 0, 'hub: profile persists across reload');

  // --- Milestones auto-opens to band ---
  await page.goto(`${BASE}/milestones.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const ageVal = await page.locator('#ageFilter').inputValue();
  ok(/months/.test(ageVal) && ageVal !== 'All', `milestones: auto-opened to band (${ageVal})`);

  // --- Shared decoder toggle (meltdown) ---
  await page.goto(`${BASE}/tools/whats-underneath-the-meltdown.html`, { waitUntil: 'networkidle' });
  await page.click('.decoder-btn[data-pattern="limit"]');
  ok(await page.locator('.decoder-output[data-output="limit"]').isVisible(), 'meltdown: shared decoder toggles output');
  ok(await page.locator('.decoder-output[data-output="limit"] .gms-action--save').count() > 0, 'meltdown: Save action injected');
  const askMelt = await page.locator('.decoder-output[data-output="limit"] .gms-action--ask').getAttribute('href');
  ok(/melts%20down%20after%20I%20say%20no/.test(askMelt), 'meltdown: "Ask about this" carries the answer\'s own question');

  // --- Every chooser variant uses the shared toggle and gets Save actions ---
  const variants = [
    { slug: 'limits-without-escalation', btn: '.scenario-btn', out: '.scenario-output', key: 'meltdown' },
    { slug: 'repair-after-the-hard-moment', btn: '.scenario-btn', out: '.scenario-output', key: 'guilt' },
    { slug: 'whats-typical-by-stage', btn: '.stage-btn', out: '.stage-output', key: 'late' },
    { slug: 'routines-transitions-night-waking', btn: '.pattern-btn', out: '.pattern-output', key: 'fear' },
  ];
  for (const v of variants) {
    await page.goto(`${BASE}/tools/${v.slug}.html`, { waitUntil: 'networkidle' });
    ok(await page.locator(`${v.out} .gms-action--save`).count() > 0, `${v.slug}: Save actions injected`);
    await page.click(`${v.btn}[data-pattern="${v.key}"], ${v.btn}[data-scenario="${v.key}"], ${v.btn}[data-stage="${v.key}"]`);
    ok(await page.locator(`${v.out}[data-output="${v.key}"]`).isVisible(), `${v.slug}: toggle shows the chosen answer`);
  }

  // --- A saved-answer link (#answer=) opens that answer ---
  await page.goto(`${BASE}/tools/whats-underneath-the-meltdown.html#answer=sensory`, { waitUntil: 'networkidle' });
  ok(await page.locator('.decoder-output[data-output="sensory"]').isVisible() &&
    !(await page.locator('.decoder-output[data-output="overloaded"]').isVisible()), 'meltdown: #answer= deep link opens the saved answer');

  // --- Right-now router ---
  await page.goto(`${BASE}/tools/right-now.html`, { waitUntil: 'networkidle' });
  ok(await page.locator('.rn-choice').count() === 5, 'right-now: 5 situation choices');
  await page.locator('.rn-choice', { hasText: 'Meltdown' }).click();
  ok(await page.locator('.rn-answer__title').isVisible(), 'right-now: answer renders');
  ok(new URL(page.url()).hash === '#meltdown', 'right-now: the answer has its own #hash');
  ok(await page.locator('.rn-seq li').count() === 3, 'right-now: 3-step sequence');
  const askHref = await page.locator('.rn-actions a', { hasText: 'Ask about this' }).getAttribute('href');
  ok(/growing-minds-ai\?q=/.test(askHref), 'right-now: Ask link seeds ?q=');
  await page.locator('.rn-actions button', { hasText: 'Save this' }).click();
  ok(await page.locator('.rn-actions button', { hasText: 'Saved ✓' }).count() > 0, 'right-now: Save toggles to Saved');
  await page.locator('button', { hasText: 'Something else is happening' }).click();
  await page.waitForTimeout(150);
  ok(await page.locator('.rn-choice').count() === 5, 'right-now: back returns to choices');
  await page.locator('.rn-choice', { hasText: 'sleep' }).click();
  await page.goBack();
  await page.waitForTimeout(150);
  ok(/right-now/.test(page.url()) && await page.locator('.rn-choice').count() === 5, 'right-now: browser Back returns to the choices');
  await page.goto(`${BASE}/tools/right-now.html#repair`, { waitUntil: 'networkidle' });
  ok(/Repair/.test(await page.locator('.rn-answer__title').innerText()), 'right-now: #repair opens that answer directly');

  // Saved item shows on the hub shelf, with its answer and a link back to it
  await page.goto(`${BASE}/tools/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  ok(await page.locator('[data-gms-shelf] .gms-shelf__card').count() > 0, 'hub: saved item appears on shelf');
  ok(await page.locator('[data-gms-shelf] .gms-shelf__body').count() > 0, 'hub: shelf card shows the saved answer text');
  ok(await page.locator('[data-gms-shelf] a[href="/tools/right-now#meltdown"]').count() > 0, 'hub: "Open tool" reopens the saved answer');
  ok(await page.locator('[data-gms-shelf-link]:not([hidden])').count() > 0, 'hub: "Saved for you" shortcut is shown');

  // Print pocket card: the card is lifted to <body> and prints on a single page
  await page.goto(`${BASE}/tools/whats-underneath-the-meltdown.html`, { waitUntil: 'networkidle' });
  ok(await page.locator('[data-print-card]').count() > 0, 'meltdown: print pocket card button present');
  ok(await page.locator('.pocket-card .pocket-seq li').count() === 3, 'meltdown: pocket card has 3 steps');
  await page.evaluate(() => {
    window.print = () => { window.__printState = document.body.classList.contains('printing-pocket') && document.querySelector('.pocket-card').parentNode === document.body; };
  });
  await page.click('[data-print-card]');
  ok(await page.evaluate(() => window.__printState === true), 'meltdown: print mode isolates the pocket card');
  await page.evaluate(() => document.body.classList.add('printing-pocket'));
  await page.emulateMedia({ media: 'print' });
  ok(pdfPages(await page.pdf({ format: 'Letter' })) === 1, 'meltdown: pocket card prints on one page (no blank pages)');
  await page.emulateMedia({ media: 'screen' });

  // --- Communication Snapshot: full run-through to a report ---
  await page.goto(`${BASE}/tools/communication-snapshot.html`, { waitUntil: 'networkidle' });
  await page.fill('#cs-age', '20');
  await page.locator('.cs-chip', { hasText: 'No, full term or close' }).click();
  ok(await page.locator('#cs-age').inputValue() === '20', 'snapshot: typed age survives the born-early answer');
  await page.locator('.cs-nav .btn--primary', { hasText: 'Continue' }).click();
  ok(await page.locator('.cs-step-title', { hasText: 'Words' }).count() > 0, 'snapshot: words step renders');
  await page.locator('.cs-chip', { hasText: 'None yet' }).first().click();
  await page.locator('.cs-item').nth(1).locator('.cs-chip', { hasText: '50 to 199' }).click();
  await page.locator('.cs-nav .btn--primary', { hasText: 'Continue' }).click();
  ok(await page.locator('.cs-item[data-behavior]').count() >= 8, 'snapshot: behavior items render');
  // Answer every behavior 'Yes' except lost_skills ('No'); zero words at 20m must flag.
  for (const item of await page.locator('.cs-item[data-behavior]').all()) {
    const id = await item.getAttribute('data-behavior');
    await item.locator('.cs-chip', { hasText: id === 'lost_skills' ? 'No' : 'Yes' }).first().click();
  }
  await page.locator('.cs-nav .btn--primary', { hasText: 'See the snapshot' }).click();
  ok(await page.locator('.cs-sev--discuss').count() > 0, 'snapshot: no words at 20m compiles to discuss');
  ok(await page.locator('.cs-flag', { hasText: 'No words yet' }).count() > 0, 'snapshot: no_words_16m flag surfaces');
  ok(await page.locator('.cs-report .btn--primary', { hasText: 'Print notes' }).count() > 0, 'snapshot: print visit notes offered');
  const csAsk = await page.locator('.cs-report a', { hasText: 'Ask Growing Minds AI' }).getAttribute('href');
  ok(decodeURIComponent(csAsk.split('?q=')[1]).length <= 500 && /while%20we%20wait/.test(csAsk), 'snapshot: AI question fits the 500-character prefill and keeps its ask');

  // --- Milestone Navigator: hearing concern routes discuss (audiology-led) ---
  await page.goto(`${BASE}/tools/milestone-navigator.html`, { waitUntil: 'networkidle' });
  ok(await page.locator('.nv-domain').count() === 8, 'navigator: 8 worry domains render');
  await page.locator('.nv-domain', { hasText: 'Hearing and responding' }).click();
  await page.fill('#nv-age', '8');
  await page.locator('.nv-chip', { hasText: 'No, full term or close' }).click();
  ok(await page.locator('#nv-age').inputValue() === '8', 'navigator: typed age survives the born-early answer');
  await page.locator('.nv-nav .btn--primary', { hasText: 'Continue' }).click();
  // hr_skill_loss No, hr_concern Yes, hr_loud Yes, hr_turn Yes (name asked from 9m, so not at 8m)
  await page.locator('.nv-answer', { hasText: 'No' }).click();
  await page.locator('.nv-answer', { hasText: 'Yes' }).first().click();
  await page.locator('.nv-answer', { hasText: 'Yes' }).first().click();
  await page.locator('.nv-answer', { hasText: 'Yes' }).first().click();
  ok(await page.locator('.nv-class--discuss').count() > 0, 'navigator: hearing concern lands discuss');
  ok(/audiology/i.test(await page.locator('.nv-result').innerText()), 'navigator: action sheet leads with audiology');

  // --- Navigator: clean walking path lands typical with invitation ---
  await page.locator('.gms-link', { hasText: 'Check another area' }).click();
  await page.locator('.nv-domain', { hasText: 'Walking and movement' }).click();
  await page.fill('#nv-age', '14');
  await page.locator('.nv-chip', { hasText: 'No, full term or close' }).click();
  await page.locator('.nv-nav .btn--primary', { hasText: 'Continue' }).click();
  for (let i = 0; i < 6; i++) {
    const yes = page.locator('.nv-answer', { hasText: /^Yes$/ });
    const no = page.locator('.nv-answer', { hasText: /^No$/ });
    const q = await page.locator('.nv-title').innerText();
    // Answer so nothing flags: loss/asymmetry get No, skills get Yes.
    if (/lost|less than the other/i.test(q)) await no.first().click(); else await yes.first().click();
    if (await page.locator('.nv-class').count()) break;
  }
  ok(await page.locator('.nv-class--typical_range').count() > 0, 'navigator: clean walking path lands typical_range');
  ok(/bring it up with your pediatrician anyway/i.test(await page.locator('.nv-result').innerText()), 'navigator: typical result carries the standing invitation');

  // --- Activity Library: profile-aware filters + Today's 3 ---
  await page.goto(`${BASE}/tools/activity-library.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  ok(await page.locator('#al-grid .al-card').count() >= 8, 'activities: age-filtered grid renders');
  ok(await page.locator('#al-today-panel:not([hidden]) .al-card').count() === 3, "activities: Today's 3 renders for the profiled child");
  await page.locator('.al-chip', { hasText: 'All ages' }).click();
  ok(await page.locator('#al-grid .al-card').count() === 24, 'activities: All ages shows the full sampler');
  ok(await page.evaluate(() => (document.activeElement.textContent || '').trim() === 'All ages'), 'activities: focus stays on the chosen filter');
  await page.locator('#al-today .al-done').first().click();
  ok(await page.locator('#al-today .al-done.is-done').count() === 1, 'activities: mark-done toggles');

  // --- Reading Prompt Cards: filters compose ---
  await page.goto(`${BASE}/tools/reading-prompt-cards.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  ok(await page.locator('.rp-card').count() > 0, 'prompt cards: deck renders');
  await page.locator('.rp-chip', { hasText: 'Completion' }).click();
  const typeBadges = await page.locator('.rp-card .rp-badge--type').allInnerTexts();
  ok(typeBadges.length > 0 && typeBadges.every(t => /Completion/.test(t)), 'prompt cards: CROWD filter narrows to one type');

  // --- Claims Library: hub + a claim page ---
  await page.goto(`${BASE}/claims/index.html`, { waitUntil: 'networkidle' });
  ok(await page.locator('.cl-card').count() === 10, 'claims: hub lists all 10 claims');
  await page.goto(`${BASE}/claims/teething-fever.html`, { waitUntil: 'networkidle' });
  ok(/Contradicted by evidence/.test(await page.locator('.cl-badges').first().innerText()), 'claims: grade badge renders');
  ok(await page.locator('.cl-sources li').count() >= 2, 'claims: sources listed');

  // AI ?q= prefill — fills the box, does NOT send, cleans the URL
  await page.goto(`${BASE}/tools/growing-minds-ai.html?q=Why%20does%20my%20toddler%20melt%20down`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  ok((await page.locator('#chatInput').inputValue()).includes('melt down'), 'ai: ?q= prefills the textarea');
  ok(await page.locator('.msg--user').count() === 0, 'ai: prefill does not auto-send');
  ok(!/[?]q=/.test(page.url()), 'ai: URL cleaned after prefill');

  ok(errors.length === 0, `no console/page errors (${errors.length})`);
  if (errors.length) errors.slice(0, 8).forEach(e => console.log('   !', e));
} catch (e) {
  console.log('✗ threw:', e.message); fails++;
} finally {
  await browser.close();
  server.kill('SIGKILL');
  console.log(fails ? `\nFAILED (${fails})` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
}
