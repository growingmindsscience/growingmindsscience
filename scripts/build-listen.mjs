#!/usr/bin/env node
// Listen recordings: what every Listen button reads, and which ones have an MP3.
//
//   node scripts/build-listen.mjs extract    open every page that has Listen buttons in headless
//                                            Chromium, capture the exact text each button reads,
//                                            and write scripts/listen/clips.json
//   node scripts/build-listen.mjs record [hash...]
//                                            record every Listen text that has no MP3 yet (or just
//                                            the hashes given) through the ElevenLabs API, saving
//                                            assets/audio/listen/<hash>.mp3
//   node scripts/build-listen.mjs manifest   write assets/audio/listen/manifest.json from the MP3s
//                                            that exist for the current texts
//   node scripts/build-listen.mjs --check    exit 1 if a Listen text has no recording
//
// Recordings are named by a hash of the text the page reads (FNV-1a over the text with runs of
// whitespace collapsed, the same function as listenHash in assets/js/gms-tools.js). Editing an
// answer changes its hash, so a stale recording can never play over new words: the button stays
// hidden until the new text is recorded. The text sent to the voice is `narration` in clips.json
// (quote marks dropped, doubled punctuation fixed).
//
// Voice: Matthew's settings from his own v4 export (2026-10-17), set in VOICE below. Record through
// the API, not the ElevenLabs creative connector: the connector cannot set stability, similarity or
// speed, and its default-settings takes came out flat and rejected. The API key is read from
// ELEVENLABS_API_KEY or ~/.config/elevenlabs/api_key, never from the repo (this static site deploys
// every file it is given).
//
// The page side is GMS.mountListen in gms-tools.js: every text a Listen button is asked for lands in
// GMS._listenSeen, which extract reads. Needs Playwright (the global @playwright/cli install works)
// and Chrome for extract and --check.

import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CLIPS = path.join(ROOT, 'scripts/listen/clips.json');
const AUDIO_DIR = path.join(ROOT, 'assets/audio/listen');
const MANIFEST = path.join(AUDIO_DIR, 'manifest.json');
const VOICE = {
  id: 'KjZZHIOnbFqvGnNEwISh', // Matthew's Voice (professional clone)
  model: 'eleven_v4',
  settings: { stability: 0.3, similarity_boost: 0.9, speed: 1.05 },
};

// Pages whose answers carry a Listen button. right-now renders one answer per #situation.
const DECODER_PAGES = [
  'tools/beyond-less-is-better',
  'tools/co-regulation-primer',
  'tools/limits-without-escalation',
  'tools/regulating-yourself-first',
  'tools/repair-after-the-hard-moment',
  'tools/routines-transitions-night-waking',
  'tools/screens-language-attention',
  'tools/whats-typical-by-stage',
  'tools/whats-underneath-the-meltdown',
  'milestones',
  'tools/activity-library',
  'tools/checkup-prep',
  'tools/communication-snapshot',
  'tools/milestone-navigator',
  'tools/reading-prompt-cards',
];

export function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

// FNV-1a, 32 bit, over UTF-16 code units. Mirrors listenHash in gms-tools.js.
export function listenHash(text) {
  const s = normalize(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// What the voice is given. eleven_v4 performs quoted words as a second character, so quote marks
// go; age ranges like 0-2 read as "0 to 2"; doubled punctuation is smoothed.
// Spoken rewrites, applied before quote marks go (like PRONOUNCE in the class scripts). Each pair is
// [what the page says, what the voice reads]. A quote inside a sentence needs one here, or dropping
// its marks leaves a broken sentence. Abbreviations read as letters.
const SPOKEN = [
  ['keep narrating in plain turns. "What do you think happens next?" does more than the show does alone.',
    'keep narrating in plain turns. Asking what they think happens next does more than the show does alone.'],
  ['real life. "That\'s a tractor. We saw one at the farm, remember?"',
    'real life, something like: That\'s a tractor. We saw one at the farm, remember?'],
  ['AASM', 'A-A-S-M'],
  ['AAP', 'A-A-P'],
];

export function narration(text) {
  let t = normalize(text);
  for (const [from, to] of SPOKEN) t = t.split(from).join(to);
  return t
    .replace(/[“”"]/g, '')
    .replace(/(\d+)\s?[-–]\s?(\d+)/g, '$1 to $2')
    .replace(/(\d{1,2}:\d{2})\s?(a|p)m\b/gi, (m, t, x) => `${t} ${x.toLowerCase()}.m.`)
    .replace(/([.?!:;,])\s*\.(\s|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadPlaywright() {
  const roots = [];
  try { roots.push(execSync('npm root -g', { encoding: 'utf8' }).trim()); } catch {}
  for (const r of roots) {
    for (const p of ['@playwright/cli/node_modules/playwright', 'playwright', '@playwright/test/node_modules/playwright']) {
      const dir = path.join(r, p);
      if (existsSync(dir)) return createRequire(path.join(dir, 'package.json'))(dir);
    }
  }
  try { return createRequire(import.meta.url)('playwright'); } catch {}
  throw new Error('Playwright not found. Install it globally: npm i -g @playwright/cli');
}

async function startServer(port) {
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts/fg-gate.mjs'), '--serve', String(port)], {
    cwd: ROOT, stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return child; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error('local server did not start');
}

async function extract() {
  const { chromium } = loadPlaywright();
  const port = 4300 + Math.floor(Math.random() * 500);
  const server = await startServer(port);
  const base = `http://127.0.0.1:${port}/`;
  // Prefer the installed Chrome so a Playwright update does not force a browser download.
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const ctx = await browser.newContext();
  const clips = [];
  const add = (page, key, text) => {
    const hash = listenHash(text);
    clips.push({ page: '/' + page, key, hash, chars: narration(text).length, text: normalize(text), narration: narration(text) });
  };
  try {
    const p = await ctx.newPage();
    for (const page of DECODER_PAGES) {
      await p.goto(base + page, { waitUntil: 'load' });
      await p.waitForTimeout(300);
      const said = await p.evaluate(() => (window.GMS ? GMS._listenSeen : []).map((r, i) => {
        const o = r.row.closest('[data-output], .decoder-output, .pattern-output, .scenario-output');
        return { key: (o && o.dataset.output) || 'answer-' + (i + 1), text: r.text };
      }));
      for (const s of said) if (s.text) add(page, s.key, s.text);
      console.log(`${page}: ${said.length}`);
    }
    // right-now: one answer per situation id, each on its own #id load.
    await p.goto(base + 'tools/right-now', { waitUntil: 'load' });
    const ids = await p.evaluate(() => JSON.parse(document.getElementById('router-data').textContent).situations.map((s) => s.id));
    for (const id of ids) {
      // A hash-only change does not reload the page, so reload to run its start-up routing.
      await p.goto(base + 'tools/right-now#' + id, { waitUntil: 'load' });
      await p.reload({ waitUntil: 'load' });
      await p.waitForTimeout(200);
      const text = await p.evaluate(() => {
        const seen = window.GMS ? GMS._listenSeen : [];
        return seen.length ? seen[seen.length - 1].text : '';
      });
      if (text) add('tools/right-now', id, text);
    }
    console.log(`tools/right-now: ${ids.length}`);
  } finally {
    await browser.close();
    server.kill();
  }
  // One recording per distinct text.
  const seen = new Map();
  for (const c of clips) {
    if (seen.has(c.hash)) seen.get(c.hash).also.push(c.page + '#' + c.key);
    else seen.set(c.hash, { ...c, also: [] });
  }
  const unique = [...seen.values()];
  mkdirSync(path.dirname(CLIPS), { recursive: true });
  writeFileSync(CLIPS, JSON.stringify({ voice: VOICE, clips: unique }, null, 2) + '\n');
  const chars = unique.reduce((n, c) => n + c.chars, 0);
  console.log(`${clips.length} Listen buttons, ${unique.length} distinct texts, ${chars} characters to record`);
  return unique;
}

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const f = path.join(os.homedir(), '.config/elevenlabs/api_key');
  if (existsSync(f)) return readFileSync(f, 'utf8').trim();
  console.error('No ElevenLabs API key. Set ELEVENLABS_API_KEY or save the key to ~/.config/elevenlabs/api_key.');
  process.exit(2);
}

// Records one MP3 per Listen text that has none (or per hash given), one request at a time.
async function record(hashes) {
  const clips = readClips().filter((c) => (hashes.length ? hashes.includes(c.hash) : !recorded(c.hash)));
  if (!clips.length) { console.log('nothing to record'); return; }
  const key = apiKey();
  mkdirSync(AUDIO_DIR, { recursive: true });
  for (const c of clips) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: c.narration, model_id: VOICE.model, voice_settings: VOICE.settings }),
    });
    if (!res.ok) {
      console.log(`failed ${c.hash} ${c.page}#${c.key}: ${res.status} ${(await res.text()).slice(0, 300)}`);
      if ([401, 402, 403, 422].includes(res.status)) process.exit(1); // bad key, no credits, or bad settings: stop
      continue;
    }
    writeFileSync(path.join(AUDIO_DIR, c.hash + '.mp3'), Buffer.from(await res.arrayBuffer()));
    console.log(`recorded ${c.hash} ${c.page}#${c.key} (${c.chars} characters)`);
  }
}

function readClips() {
  if (!existsSync(CLIPS)) throw new Error('run extract first');
  return JSON.parse(readFileSync(CLIPS, 'utf8')).clips;
}

function recorded(hash) {
  const f = path.join(AUDIO_DIR, hash + '.mp3');
  return existsSync(f) && statSync(f).size > 2000;
}

function manifest() {
  const clips = readClips();
  const have = clips.filter((c) => recorded(c.hash)).map((c) => c.hash).sort();
  mkdirSync(AUDIO_DIR, { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify({ clips: have }) + '\n');
  const missing = clips.filter((c) => !recorded(c.hash));
  console.log(`manifest: ${have.length} recorded, ${missing.length} missing`);
  for (const m of missing) console.log(`  missing ${m.hash} ${m.page}#${m.key}`);
}

async function check() {
  const clips = await extract();
  const listed = existsSync(MANIFEST) ? new Set(JSON.parse(readFileSync(MANIFEST, 'utf8')).clips) : new Set();
  const missing = clips.filter((c) => !recorded(c.hash) || !listed.has(c.hash));
  for (const m of missing) console.log(`no recording: ${m.hash} ${m.page}#${m.key}`);
  if (missing.length) process.exit(1);
  console.log('every Listen text has a recording');
}

const cmd = process.argv[2];
if (cmd === 'extract') await extract();
else if (cmd === 'record') await record(process.argv.slice(3));
else if (cmd === 'manifest') manifest();
else if (cmd === '--check') await check();
else { console.error('usage: build-listen.mjs extract | record [hash...] | manifest | --check'); process.exit(2); }
