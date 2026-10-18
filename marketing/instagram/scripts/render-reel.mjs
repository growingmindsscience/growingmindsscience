#!/usr/bin/env node
// Renders a reel post to MP4: Matthew's ElevenLabs voice per beat, a music bed from
// ElevenLabs Music, frames captured from the reel template with headless Chrome at
// 30 fps and piped straight into ffmpeg (nothing frame-sized touches the disk),
// word-timed captions drawn by the page, and the mix.
//
//   node marketing/instagram/scripts/render-reel.mjs <post-folder> [--no-music] [--silent] [--fps 30]
//
// Output: <post>/out/reel.mp4, <post>/out/cover.jpg, <post>/out/timeline.json, <post>/out/check.json.
// Voice and music takes are cached in <post>/out/voice/ and <post>/out/music.mp3 by content
// hash, so re-rendering after a layout change spends no credits.
//
// The voice is Matthew's professional clone, the same one scripts/build-listen.mjs uses,
// with his settings (stability 0.3, similarity 0.9, speed 1.05, eleven_v4). It is never
// substituted: without an API key the reel renders with a silent track and says so.
// The key is read from ELEVENLABS_API_KEY, then ~/.config/elevenlabs/api_key, then
// nsc/.env.local, and is never written anywhere.

import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const IG = resolve(HERE, "..");
const ROOT = resolve(IG, "..", "..");
const TEMPLATES = join(IG, "templates", "reel");
const W = 1080, H = 1920;
const VOICE = { id: "KjZZHIOnbFqvGnNEwISh", model: "eleven_v4", settings: { stability: 0.3, similarity_boost: 0.9, speed: 1.05 } };
const MUSIC_MODEL = process.env.ELEVEN_MUSIC_MODEL || "music_v2_5";
const DUCK = 0.12, BED = 0.45; // music gain under the voice, and when the voice is silent

const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith("-"));
if (!folder) die("usage: render-reel.mjs <post-folder> [--no-music] [--silent] [--fps N]");
const NO_MUSIC = args.includes("--no-music");
const SILENT = args.includes("--silent");
const FPS = Number(args[args.indexOf("--fps") + 1]) || 30;

function die(m, code = 1) { console.error(`render-reel: ${m}`); process.exit(code); }
const log = (...a) => console.log(...a);
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");

// ---------- key ----------
function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const f = join(homedir(), ".config", "elevenlabs", "api_key");
  if (existsSync(f)) return readFileSync(f, "utf8").trim();
  const env = join(ROOT, "nsc", ".env.local");
  if (existsSync(env)) {
    const m = readFileSync(env, "utf8").match(/^ELEVENLABS_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}
const KEY = SILENT ? null : apiKey();

// ---------- narration, as the voice should read it ----------
// eleven_v4 performs quoted words as a second character, so quote marks go; age
// ranges read as "8 to 14"; doubled punctuation is smoothed.
function narration(s) {
  return String(s).replace(/[“”"]/g, "").replace(/(\d+)\s?[-–]\s?(\d+)/g, "$1 to $2").replace(/\.\.+/g, ".").replace(/\s+/g, " ").trim();
}

// ---------- audio helpers ----------
function probeDuration(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  return Number(out.trim());
}
function wordsFromAlignment(al) {
  const words = [];
  let cur = null;
  al.characters.forEach((ch, i) => {
    const s = al.character_start_times_seconds[i], e = al.character_end_times_seconds[i];
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { w: ch, t0: s, t1: e }; else { cur.w += ch; cur.t1 = e; }
  });
  if (cur) words.push(cur);
  return words;
}
function evenWords(text, dur) {
  const ws = text.split(/\s+/).filter(Boolean);
  const each = dur / Math.max(1, ws.length);
  return ws.map((w, i) => ({ w, t0: i * each, t1: (i + 1) * each }));
}
async function tts(text, prev, next, outMp3, outJson) {
  const body = { text, model_id: VOICE.model, voice_settings: VOICE.settings, previous_text: prev || undefined, next_text: next || undefined };
  const headers = { "xi-api-key": KEY, "content-type": "application/json" };
  // Preferred: speech with character timestamps in one call.
  let res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}/with-timestamps?output_format=mp3_44100_128`, { method: "POST", headers, body: JSON.stringify(body) });
  if (res.ok) {
    const json = await res.json();
    writeFileSync(outMp3, Buffer.from(json.audio_base64, "base64"));
    const words = wordsFromAlignment(json.alignment || json.normalized_alignment);
    writeJson(outJson, { text, words, how: "with-timestamps" });
    return;
  }
  const why = await res.text();
  // Fallback: plain speech, then forced alignment for the word times.
  res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}?output_format=mp3_44100_128`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) die(`voice request failed (${res.status}): ${(await res.text()).slice(0, 300)}; timestamps endpoint said: ${why.slice(0, 200)}`);
  const audio = Buffer.from(await res.arrayBuffer());
  writeFileSync(outMp3, audio);
  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/mpeg" }), "beat.mp3");
  form.append("text", text);
  const fa = await fetch("https://api.elevenlabs.io/v1/forced-alignment", { method: "POST", headers: { "xi-api-key": KEY }, body: form });
  if (fa.ok) {
    const j = await fa.json();
    const words = (j.words || []).filter((w) => w.text.trim()).map((w) => ({ w: w.text.trim(), t0: w.start, t1: w.end }));
    writeJson(outJson, { text, words, how: "forced-alignment" });
  } else {
    writeJson(outJson, { text, words: evenWords(text, probeDuration(outMp3)), how: "even (alignment unavailable)" });
  }
}
async function music(brief, seconds, out) {
  const attempt = async (withModel) => fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ prompt: brief, music_length_ms: Math.round(seconds * 1000), force_instrumental: true, ...(withModel ? { model_id: MUSIC_MODEL } : {}) }),
  });
  let res = await attempt(true);
  if (!res.ok) { const why = await res.text(); console.warn(`music with model ${MUSIC_MODEL} refused (${res.status}): ${why.slice(0, 160)}; retrying with the default model`); res = await attempt(false); }
  if (!res.ok) { console.warn(`music unavailable (${res.status}): ${(await res.text()).slice(0, 200)}. Rendering without a bed.`); return false; }
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  return true;
}

// ---------- plan ----------
const spec = readJson(join(folder, "spec.json"));
if (spec.kind !== "reel") die(`${basename(folder)}: spec.kind is not "reel"`);
const tpl = join(TEMPLATES, `${spec.series}.html`);
if (!existsSync(tpl)) die(`no reel template for series "${spec.series}"`);
const out = join(folder, "out");
mkdirSync(join(out, "voice"), { recursive: true });

if (!KEY && !SILENT) console.warn("render-reel: no ElevenLabs API key found; rendering with a SILENT track (no substitute voice is ever used).");

// Voice per beat, cached by text + voice.
const beats = spec.beats;
const voiced = beats.map((b) => b.say ? narration(b.say) : null);
for (let i = 0; i < beats.length; i++) {
  const b = beats[i];
  if (!voiced[i]) continue;
  const key = hash(`${VOICE.id}|${VOICE.model}|${JSON.stringify(VOICE.settings)}|${voiced[i]}`);
  b._mp3 = join(out, "voice", `${b.id}-${key}.mp3`);
  b._json = join(out, "voice", `${b.id}-${key}.json`);
  if (existsSync(b._mp3) && existsSync(b._json)) { log(`voice: ${b.id} (cached)`); continue; }
  if (!KEY) { b._mp3 = null; continue; }
  log(`voice: ${b.id}`);
  await tts(voiced[i], voiced[i - 1] || "", voiced[i + 1] || "", b._mp3, b._json);
}

// Timeline: each voiced beat lasts its audio plus a pause; silent beats use dur.
let t = 0;
const timeline = [], words = [];
for (const b of beats) {
  const say = b.say ? narration(b.say) : "";
  let dur;
  if (b._mp3) dur = probeDuration(b._mp3);
  else if (b.say) dur = Math.max(1.6, say.split(/\s+/).length / 2.6); // silent render: 2.6 words/s
  else dur = b.dur || 1;
  const pause = b.pause ?? 0.35;
  const entry = { ...b, say, start: +t.toFixed(3), voiceEnd: +(t + dur).toFixed(3), end: +(t + dur + pause).toFixed(3) };
  delete entry._mp3; delete entry._json;
  timeline.push(entry);
  const ws = b._json ? readJson(b._json).words : (b.say ? evenWords(say, dur) : []);
  for (const w of ws) words.push({ w: w.w, t0: +(t + w.t0).toFixed(3), t1: +(t + w.t1).toFixed(3), beat: b.id });
  t = entry.end;
}
const TOTAL = +t.toFixed(3);
writeJson(join(out, "timeline.json"), { total: TOTAL, timeline, words });
log(`timeline: ${timeline.length} beats, ${TOTAL}s`);
if (timeline[0].end < 2) console.warn("render-reel: the hook beat ends before 2 s; the README wants the hook on screen for the first two seconds.");

// Music bed, cached by brief + length.
let musicFile = null;
if (!NO_MUSIC && KEY && spec.music?.brief) {
  const mkey = hash(`${MUSIC_MODEL}|${spec.music.brief}|${Math.ceil(TOTAL + 2)}`);
  musicFile = join(out, `music-${mkey}.mp3`);
  if (existsSync(musicFile)) log("music: cached");
  else { log("music: generating"); if (!(await music(spec.music.brief, Math.ceil(TOTAL + 2), musicFile))) musicFile = null; }
}

// ---------- frames ----------
function loadPlaywright() {
  try { return createRequire(import.meta.url)("playwright"); } catch {}
  try {
    const root = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
    return createRequire(join(root, "@playwright/cli/node_modules/playwright", "package.json"))("playwright");
  } catch { return null; }
}
const pw = loadPlaywright();
if (!pw) die("Playwright is required for reel rendering (npm install --no-save playwright, or the global playwright-cli).");

const staged = join(TEMPLATES, `.stage-${spec.id}.html`);
writeFileSync(staged, readFileSync(tpl, "utf8").replace('<script src="_reel.js"></script>', `<script>window.REEL=${JSON.stringify({ spec, timeline, words })};</script>\n<script src="_reel.js"></script>`));

const browser = await (async () => { try { return await pw.chromium.launch({ channel: "chrome" }); } catch { return pw.chromium.launch(); } })();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(staged).href);
await page.waitForFunction(() => window.__READY === true, null, { timeout: 15000 });

// Cover: the hook, fully faded in.
await page.evaluate((tt) => window.setT(tt), 0.6);
await page.screenshot({ path: join(out, "cover.jpg"), type: "jpeg", quality: 90 });

// ffmpeg: frames on stdin, voice beats delayed to their start, music ducked under the voice.
const inputs = ["-f", "image2pipe", "-framerate", String(FPS), "-i", "pipe:0"];
const filters = [];
const voiceIn = timeline.filter((b) => b.say && beats.find((x) => x.id === b.id)?._mp3);
voiceIn.forEach((b, k) => {
  inputs.push("-i", beats.find((x) => x.id === b.id)._mp3);
  const ms = Math.round(b.start * 1000);
  filters.push(`[${k + 1}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms}[v${k}]`);
});
let audioMap = null;
if (voiceIn.length) {
  filters.push(`${voiceIn.map((_, k) => `[v${k}]`).join("")}amix=inputs=${voiceIn.length}:normalize=0:dropout_transition=0[voice]`);
  audioMap = "[voice]";
}
if (musicFile) {
  const mi = inputs.filter((a) => a === "-i").length; // index of the next input
  inputs.push("-i", musicFile);
  // Louder bed before the voice starts and after it ends; ducked while someone is talking.
  const lastVoice = voiceIn.length ? Math.max(...voiceIn.map((b) => b.voiceEnd)) : 0;
  const firstVoice = voiceIn.length ? Math.min(...voiceIn.map((b) => b.start)) : TOTAL;
  const vol = `if(lt(t\\,${firstVoice.toFixed(2)})\\,${BED}\\,if(gt(t\\,${(lastVoice + 0.3).toFixed(2)})\\,${BED}\\,${DUCK}))`;
  filters.push(`[${mi}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${TOTAL},volume='${vol}':eval=frame,afade=t=in:st=0:d=1.2,afade=t=out:st=${Math.max(0, TOTAL - 1.5).toFixed(2)}:d=1.5[music]`);
  if (audioMap) { filters.push(`[voice][music]amix=inputs=2:normalize=0:dropout_transition=0[aout]`); audioMap = "[aout]"; }
  else audioMap = "[music]";
}
const ff = ["-y", "-hide_banner", "-loglevel", "error", ...inputs];
if (filters.length) ff.push("-filter_complex", filters.join(";"));
ff.push("-map", "0:v");
if (audioMap) ff.push("-map", audioMap, "-c:a", "aac", "-b:a", "160k", "-ar", "44100");
ff.push("-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS), "-t", String(TOTAL), "-movflags", "+faststart", join(out, "reel.mp4"));

const proc = spawn("ffmpeg", ff, { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((res, rej) => { proc.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))); proc.on("error", rej); });
const N = Math.ceil(TOTAL * FPS);
for (let i = 0; i < N; i++) {
  await page.evaluate((tt) => window.setT(tt), i / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 86 });
  if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once("drain", r));
  if (i % (FPS * 5) === 0) log(`frames: ${i}/${N}`);
}
proc.stdin.end();
await done;
await browser.close();
rmSync(staged, { force: true });

const dur = probeDuration(join(out, "reel.mp4"));
writeJson(join(out, "check.json"), {
  id: spec.id, series: spec.series, duration: dur, fps: FPS, beats: timeline.length,
  voice: KEY ? VOICE.id : "SILENT (no API key)", music: musicFile ? basename(musicFile) : "none",
  hookEnds: timeline[0].end, captionWords: words.length,
  problems: [
    ...(timeline[0].end < 2 ? ["hook beat shorter than 2 s"] : []),
    ...(dur < 15 || dur > 90 ? [`duration ${dur.toFixed(1)}s outside 15 to 90 s`] : []),
    ...(!KEY ? ["rendered silent: no ElevenLabs API key"] : []),
  ],
});
log(`done: ${join(out, "reel.mp4")} (${dur.toFixed(1)}s, ${voiceIn.length} voiced beats, music ${musicFile ? "yes" : "no"})`);
