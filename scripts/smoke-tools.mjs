/* Headless smoke test for the parent-tools layer.
   Usage: node scripts/smoke-tools.mjs
   Serves the repo root on :8199 and drives Chromium via playwright-core. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8267;
const BASE = `http://localhost:${PORT}`;
let fails = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };

const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: process.cwd(), stdio: 'ignore' });
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
  ok(await page.locator('.tool-card.is-foryou').count() > 0, 'hub: age-matched card flagged "For your child"');

  // --- Persistence across reload ---
  await page.reload({ waitUntil: 'networkidle' });
  ok(await page.locator('[data-gms-profile] .gms-chip.is-active').count() > 0, 'hub: profile persists across reload');

  // --- Milestones auto-opens to band ---
  await page.goto(`${BASE}/milestones.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const ageVal = await page.locator('#ageFilter').inputValue();
  ok(/months/.test(ageVal) && ageVal !== 'All', `milestones: auto-opened to band (${ageVal})`);

  // --- Existing decoder still toggles (meltdown) via shared module ---
  await page.goto(`${BASE}/tools/whats-underneath-the-meltdown.html`, { waitUntil: 'networkidle' });
  await page.click('.decoder-btn[data-pattern="limit"]');
  ok(await page.locator('.decoder-output[data-output="limit"]').isVisible(), 'meltdown: shared decoder toggles output');
  ok(await page.locator('.decoder-output[data-output="limit"] .gms-action--save').count() > 0, 'meltdown: Save action injected');

  // --- All three decoder variants get Save actions + keep their toggle ---
  const variants = [
    { slug: 'limits-without-escalation', btn: '.scenario-btn', out: '.scenario-output', key: 'meltdown' },
    { slug: 'whats-typical-by-stage', btn: '.stage-btn', out: '.stage-output', key: 'late' },
    { slug: 'routines-transitions-night-waking', btn: '.pattern-btn', out: '.pattern-output', key: 'fear' },
  ];
  for (const v of variants) {
    await page.goto(`${BASE}/tools/${v.slug}.html`, { waitUntil: 'networkidle' });
    ok(await page.locator(`${v.out} .gms-action--save`).count() > 0, `${v.slug}: Save actions injected`);
    await page.click(`${v.btn}[data-pattern="${v.key}"], ${v.btn}[data-scenario="${v.key}"], ${v.btn}[data-stage="${v.key}"]`);
    ok(await page.locator(`${v.out}[data-output="${v.key}"]`).isVisible(), `${v.slug}: own toggle still works`);
  }

  // --- Right-now router ---
  await page.goto(`${BASE}/tools/right-now.html`, { waitUntil: 'networkidle' });
  ok(await page.locator('.rn-choice').count() === 5, 'right-now: 5 situation choices');
  await page.locator('.rn-choice', { hasText: 'Meltdown' }).click();
  ok(await page.locator('.rn-answer__title').isVisible(), 'right-now: answer renders');
  ok(await page.locator('.rn-seq li').count() === 3, 'right-now: 3-step sequence');
  const askHref = await page.locator('.rn-actions a', { hasText: 'Ask about this' }).getAttribute('href');
  ok(/growing-minds-ai\?q=/.test(askHref), 'right-now: Ask link seeds ?q=');
  await page.locator('.rn-actions button', { hasText: 'Save this' }).click();
  ok(await page.locator('.rn-actions button', { hasText: 'Saved ✓' }).count() > 0, 'right-now: Save toggles to Saved');
  await page.locator('button', { hasText: 'Something else is happening' }).click();
  ok(await page.locator('.rn-choice').count() === 5, 'right-now: back returns to choices');
  // Saved item shows on the hub shelf
  await page.goto(`${BASE}/tools/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  ok(await page.locator('[data-gms-shelf] .gms-shelf__card').count() > 0, 'hub: saved item appears on shelf');

  // Print pocket card wired on meltdown page
  await page.goto(`${BASE}/tools/whats-underneath-the-meltdown.html`, { waitUntil: 'networkidle' });
  ok(await page.locator('[data-print-card]').count() > 0, 'meltdown: print pocket card button present');
  ok(await page.locator('.pocket-card .pocket-seq li').count() === 3, 'meltdown: pocket card has 3 steps');

  // --- Communication Snapshot: full run-through to a report ---
  await page.goto(`${BASE}/tools/communication-snapshot.html`, { waitUntil: 'networkidle' });
  await page.fill('#cs-age', '20');
  await page.locator('.cs-chip', { hasText: 'No, full term or close' }).click();
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

  // --- Milestone Navigator: hearing concern routes discuss (audiology-led) ---
  await page.goto(`${BASE}/tools/milestone-navigator.html`, { waitUntil: 'networkidle' });
  ok(await page.locator('.nv-domain').count() === 8, 'navigator: 8 worry domains render');
  await page.locator('.nv-domain', { hasText: 'Hearing and responding' }).click();
  await page.fill('#nv-age', '8');
  await page.locator('.nv-chip', { hasText: 'No, full term or close' }).click();
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
