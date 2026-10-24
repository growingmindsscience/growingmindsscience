#!/usr/bin/env node
// Publishes approved, due Instagram posts through the Instagram Graph API.
//
//   node marketing/instagram/scripts/publish.mjs                 # publish what is due
//   node marketing/instagram/scripts/publish.mjs --dry-run       # plan only, no uploads, no API calls
//   node marketing/instagram/scripts/publish.mjs --as-of 2026-10-30T12:00:00-04:00   # pretend it is that moment
//   node marketing/instagram/scripts/publish.mjs --only <post-id> [--now]   # --now ignores the slot for that one post
//   node marketing/instagram/scripts/publish.mjs --check-token   # verify the token works and report its age
//   node marketing/instagram/scripts/publish.mjs --refresh-token # exchange the token for a fresh 60-day one (run locally)
//   node marketing/instagram/scripts/publish.mjs --maintain-token # refresh and store it when it is 30 days old (CI, daily)
//
// What it does for each post in calendar.json whose status is "approved" and whose
// scheduled_at has arrived:
//   1. renders the slides (render-carousel.mjs), so CI never depends on committed renders;
//   2. uploads them to the public "social" bucket in the science Supabase project;
//   3. creates one container per slide (is_carousel_item), one CAROUSEL container with
//      the caption, waits for it to finish, and publishes it;
//   4. records the media id and permalink in calendar.json, appends the topic to
//      ledger.json, and rewrites the destination list on from-instagram.html.
//
// Environment: IG_USER_ID, IG_ACCESS_TOKEN (Instagram Login, long-lived),
//              SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional SITE_ORIGIN, and
//              ELEVENLABS_API_KEY for reels (read by render-reel.mjs).
// With nothing due it exits 0 without needing any of them. With something due and
// a variable missing it fails loudly: an approved post that cannot go out is an error.
//
// Token life: a long-lived Instagram Login token lasts 60 days and can be refreshed
// once it is a day old. The script tracks the last refresh in token.json and warns
// from day 45, fails from day 56. --maintain-token (run by the workflow) refreshes it
// from day 30 and keeps the new token in the private "ops" bucket of the science
// Supabase project, which every run then reads ahead of IG_ACCESS_TOKEN, so the
// token never lapses and no secret needs pasting. --refresh-token is the manual
// fallback: it prints the new token for the repository secret. The token is never
// written to the repository or a log.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const IG = resolve(HERE, "..");

// Local runs: values not in the environment are read from
// ~/.config/growingminds/instagram.env (KEY=VALUE lines, outside the repo, never
// logged). CI sets them as repository secrets and never has this file.
{
  const envFile = join(process.env.HOME || "", ".config", "growingminds", "instagram.env");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
const ROOT = resolve(IG, "..", "..");
const CALENDAR = process.env.PUBLISH_CALENDAR || join(IG, "calendar.json"); // override for tests
const LEDGER = join(IG, "ledger.json");
const TOKEN_FILE = join(IG, "token.json");
const LANDING = join(ROOT, "from-instagram.html");
const GRAPH = "https://graph.instagram.com/v22.0";
const SITE = process.env.SITE_ORIGIN || "https://www.fromlittleonward.com";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const DRY = flag("--dry-run");
const NOW = opt("--as-of") ? new Date(opt("--as-of")) : new Date();
const ONLY = opt("--only");
// --now with --only: publish that one approved post ahead of its slot (a watched first post).
const FORCE_NOW = flag("--now");
if (FORCE_NOW && !ONLY) die("--now needs --only <post-id>");
if (Number.isNaN(NOW.getTime())) die("--as-of is not a date");

function die(msg, code = 1) { console.error(`publish: ${msg}`); process.exit(code); }
const log = (...a) => console.log(...a);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const days = (ms) => ms / 86400000;

// ---------- token ----------
function tokenAge() {
  if (!existsSync(TOKEN_FILE)) return null;
  const t = readJson(TOKEN_FILE);
  return t.refreshed_at ? days(NOW - new Date(t.refreshed_at)) : null;
}
async function graph(path, params = {}, method = "GET") {
  const url = new URL(`${GRAPH}/${path}`);
  const body = new URLSearchParams({ ...params, access_token: process.env.IG_ACCESS_TOKEN });
  const res = method === "GET"
    ? await fetch(`${url}?${body}`)
    : await fetch(url, { method, body, headers: { "content-type": "application/x-www-form-urlencoded" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`${method} ${path}: ${json.error?.message || res.status}`);
  return json;
}
async function checkToken() {
  if (!process.env.IG_ACCESS_TOKEN || !process.env.IG_USER_ID) die("IG_ACCESS_TOKEN and IG_USER_ID are required");
  const me = await graph("me", { fields: "id,username" });
  const age = tokenAge();
  log(`token ok: @${me.username} (${me.id})${age == null ? ", age unknown (no token.json)" : `, refreshed ${age.toFixed(0)} days ago`}`);
  if (age != null && age >= 56) die(`token is ${age.toFixed(0)} days old; it expires at 60. Run --refresh-token locally and update the IG_ACCESS_TOKEN secret.`, 2);
  if (age != null && age >= 45) console.warn(`publish: token is ${age.toFixed(0)} days old. Refresh it before day 56.`);
  return me;
}
// The refreshed token lives in Supabase storage, private bucket "ops", readable only
// with the service role key that publishing already needs.
const STORE = "ops", STORE_PATH = "instagram/token.json";
function storeAuth() {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return base && key ? { base, headers: { authorization: `Bearer ${key}`, apikey: key } } : null;
}
async function useStoredToken() {
  const s = storeAuth();
  if (!s) return false;
  const res = await fetch(`${s.base}/storage/v1/object/authenticated/${STORE}/${STORE_PATH}`, { headers: s.headers }).catch(() => null);
  if (!res?.ok) return false;
  const t = await res.json().catch(() => null);
  if (!t?.access_token) return false;
  process.env.IG_ACCESS_TOKEN = t.access_token;
  return true;
}
async function storeToken(token) {
  const s = storeAuth();
  if (!s) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to store the token");
  // Create the private bucket on first use; an "already exists" answer is fine.
  await fetch(`${s.base}/storage/v1/bucket`, { method: "POST", headers: { ...s.headers, "content-type": "application/json" }, body: JSON.stringify({ id: STORE, name: STORE, public: false }) });
  const res = await fetch(`${s.base}/storage/v1/object/${STORE}/${STORE_PATH}`, {
    method: "POST", headers: { ...s.headers, "content-type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({ access_token: token, refreshed_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`storing the token failed: ${res.status} ${await res.text()}`);
}
async function maintainToken(minAge = 30) {
  if (!process.env.IG_ACCESS_TOKEN) die("IG_ACCESS_TOKEN is required");
  const age = tokenAge();
  if (age != null && age < minAge) { log(`token is ${age.toFixed(0)} days old; refreshed at ${minAge}`); return; }
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(process.env.IG_ACCESS_TOKEN)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) die(`refresh failed: ${json.error?.message || res.status}`);
  await storeToken(json.access_token);
  process.env.IG_ACCESS_TOKEN = json.access_token;
  writeJson(TOKEN_FILE, { refreshed_at: new Date().toISOString(), expires_in_days: Math.round(json.expires_in / 86400), note: "Age tracking only. The current token lives in the private ops bucket of the science Supabase project (written by --maintain-token); the IG_ACCESS_TOKEN secret is the fallback." });
  log(`token refreshed (valid ${Math.round(json.expires_in / 86400)} days) and stored`);
}
async function refreshToken() {
  if (!process.env.IG_ACCESS_TOKEN) die("IG_ACCESS_TOKEN is required");
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(process.env.IG_ACCESS_TOKEN)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) die(`refresh failed: ${json.error?.message || res.status}`);
  writeJson(TOKEN_FILE, { refreshed_at: new Date().toISOString(), expires_in_days: Math.round(json.expires_in / 86400), note: "Age tracking only. The token itself lives in the repository secret IG_ACCESS_TOKEN." });
  log(`New long-lived token (valid ${Math.round(json.expires_in / 86400)} days). Paste it into the repository secret IG_ACCESS_TOKEN now, then commit token.json:\n\n${json.access_token}\n`);
}

// ---------- posts ----------
function loadPost(id) {
  const folder = join(IG, "posts", id);
  if (!existsSync(join(folder, "spec.json"))) throw new Error(`${id}: no spec.json`);
  const spec = readJson(join(folder, "spec.json"));
  const md = readFileSync(join(folder, "caption.md"), "utf8");
  const [body, tags = ""] = md.split(/\n## Hashtags\s*\n/);
  const caption = `${body.replace(/^#.*\n+/, "").trim()}\n\n${tags.trim()}`.trim();
  if (caption.length > 2200) throw new Error(`${id}: caption is ${caption.length} characters (Instagram allows 2,200)`);
  return { id, folder, spec, caption };
}
function renderPost(p) {
  const out = join(p.folder, "out");
  if (p.spec.kind === "reel") {
    execFileSync(process.execPath, [join(HERE, "render-reel.mjs"), p.folder], { stdio: "inherit" });
    const check = readJson(join(out, "check.json"));
    if (check.problems?.length) throw new Error(`${p.id}: reel checks fail:\n  ${check.problems.join("\n  ")}`);
    return [join(out, "reel.mp4"), join(out, "cover.jpg")];
  }
  execFileSync(process.execPath, [join(HERE, "render-carousel.mjs"), p.folder], { stdio: "inherit" });
  const slides = readdirSync(out).filter((f) => /^slide-\d+\.jpg$/.test(f)).sort();
  if (slides.length < 2 || slides.length > 10) throw new Error(`${p.id}: ${slides.length} slides; a carousel takes 2 to 10`);
  const check = readJson(join(out, "check.json"));
  if (check.problems?.length) throw new Error(`${p.id}: slide rules fail:\n  ${check.problems.join("\n  ")}`);
  return slides.map((f) => join(out, f));
}

// ---------- storage ----------
async function upload(p, file, name) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) die("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const path = `instagram/${p.id}/${name}`;
  const type = name.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
  const res = await fetch(`${base}/storage/v1/object/social/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, apikey: key, "content-type": type, "x-upsert": "true", "cache-control": "public, max-age=31536000" },
    body: readFileSync(file),
  });
  if (!res.ok) throw new Error(`${p.id}: upload of ${path} failed: ${res.status} ${await res.text()}`);
  return `${base}/storage/v1/object/public/social/${path}`;
}

// ---------- graph publishing ----------
async function waitFinished(containerId, label, maxMs = 5 * 60000) {
  const start = Date.now();
  for (;;) {
    const r = await graph(containerId, { fields: "status_code,status" });
    if (r.status_code === "FINISHED") return;
    if (r.status_code === "ERROR" || r.status_code === "EXPIRED") throw new Error(`${label}: container ${r.status_code} ${r.status || ""}`);
    if (Date.now() - start > maxMs) throw new Error(`${label}: container not finished after ${maxMs / 1000}s`);
    await sleep(15000);
  }
}
async function publishCarousel(p, urls) {
  const ig = process.env.IG_USER_ID;
  const children = [];
  for (const u of urls) {
    const r = await graph(`${ig}/media`, { image_url: u, is_carousel_item: "true" }, "POST");
    children.push(r.id);
  }
  for (const c of children) await waitFinished(c, `${p.id} item`);
  const car = await graph(`${ig}/media`, { media_type: "CAROUSEL", children: children.join(","), caption: p.caption }, "POST");
  await waitFinished(car.id, `${p.id} carousel`);
  const pub = await graph(`${ig}/media_publish`, { creation_id: car.id }, "POST");
  const media = await graph(pub.id, { fields: "id,permalink,timestamp" });
  return media;
}
async function publishReel(p, videoUrl, coverUrl) {
  const ig = process.env.IG_USER_ID;
  const c = await graph(`${ig}/media`, { media_type: "REELS", video_url: videoUrl, cover_url: coverUrl, caption: p.caption, share_to_feed: "true" }, "POST");
  await waitFinished(c.id, `${p.id} reel`); // video processing: up to five minutes
  const pub = await graph(`${ig}/media_publish`, { creation_id: c.id }, "POST");
  return graph(pub.id, { fields: "id,permalink,timestamp" });
}

// ---------- records ----------
function utm(url, id) {
  const u = new URL(url, SITE);
  u.searchParams.set("utm_source", "instagram");
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", id);
  return u.pathname + u.search;
}
// Carousels open on slides[0]; reels open on beats[0]. A correction post's cover
// states the debunked claim, so the landing page shows the correction ("now") instead.
const opener = (spec) => spec.slides?.[0] ?? spec.beats?.[0] ?? {};
const hookOf = (spec) => { const s = opener(spec); return s.lead || s.now || s.text || s.claim || ""; };
function rewriteLanding(calendar) {
  if (!existsSync(LANDING)) { console.warn("publish: from-instagram.html missing; skipped the landing page"); return; }
  const published = calendar.posts.filter((p) => p.status === "published").sort((a, b) => (b.published_at || "").localeCompare(a.published_at || "")).slice(0, 4);
  const items = published.length === 0 ? `        <li class="fi-empty">Nothing has gone out yet. The first posts land here the day they publish.</li>` : published.map((p) => {
    const spec = readJson(join(IG, "posts", p.id, "spec.json"));
    const when = new Date(p.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" });
    const hook = hookOf(spec);
    return `        <li class="fi-item">
          <a class="fi-item__link" href="${utm(spec.link.url, p.id)}">
            <span class="fi-item__page">${spec.link.page}</span>
            <span class="fi-item__hook">${hook}</span>
          </a>
          <span class="fi-item__when">Posted ${when}</span>
        </li>`;
  }).join("\n");
  const html = readFileSync(LANDING, "utf8");
  const next = html.replace(/(<!-- from-instagram:start -->)[\s\S]*?(<!-- from-instagram:end -->)/, `$1\n${items}\n        $2`);
  if (next !== html) writeFileSync(LANDING, next);
}
function recordLedger(p, media) {
  const ledger = readJson(LEDGER);
  const s = opener(p.spec);
  ledger.used.push({
    topic: s.lead || s.claim || s.text || p.id,
    source: (p.spec.sources || (p.spec.slides?.find((s) => s.type === "sources") || {}).sources || [])[0] || p.spec.source || "",
    channel: "instagram",
    date: NOW.toISOString().slice(0, 10),
    series: p.spec.series,
    post: p.id,
    permalink: media.permalink,
  });
  writeJson(LEDGER, ledger);
}

// ---------- main ----------
// A token refreshed by --maintain-token outranks the repository secret.
const stored = await useStoredToken();
if (flag("--maintain-token")) { await maintainToken(); process.exit(0); }
if (flag("--refresh-token")) { await refreshToken(); process.exit(0); }
if (flag("--check-token")) { log(stored ? "using the stored token" : "using IG_ACCESS_TOKEN"); await checkToken(); process.exit(0); }

const calendar = readJson(CALENDAR);
// --rewrite-landing: rebuild the bio-link list from calendar.json without publishing
// (after a manual post, or when the page markup changes).
if (flag("--rewrite-landing")) { rewriteLanding(calendar); log("landing page rewritten from calendar.json"); process.exit(0); }
const due = calendar.posts.filter((p) => p.status === "approved" && (FORCE_NOW || new Date(p.scheduled_at) <= NOW) && (!ONLY || p.id === ONLY));
if (!due.length) { log(`nothing due at ${NOW.toISOString()}${ONLY ? ` for ${ONLY}` : ""}`); process.exit(0); }

log(`${DRY ? "dry run" : "publishing"}: ${due.length} post(s) due at ${NOW.toISOString()}`);
if (!DRY) await checkToken();

// One post that cannot go out (a failed check, render or upload) is skipped and
// reported at the end, so it never holds back the posts queued behind it. It
// stays "approved" and is tried again on the next run.
let published = 0;
const failed = [];
for (const entry of due) {
  let p, media;
  try {
    p = loadPost(entry.id);
    log(`\n${p.id}  (${p.spec.series}, scheduled ${entry.scheduled_at})`);
    const isReel = p.spec.kind === "reel";
    const files = renderPost(p);
    log(`  ${isReel ? "reel + cover" : `${files.length} slides`} rendered; caption ${p.caption.length} chars; destination ${utm(p.spec.link.url, p.id)}`);
    if (DRY) {
      log(isReel
        ? `  would upload reel.mp4 and cover.jpg to social/instagram/${p.id}/, create a REELS container, wait for processing, publish, then record.`
        : `  would upload to social/instagram/${p.id}/, create ${files.length} item containers + 1 carousel, publish, then record.`);
      continue;
    }
    if (isReel) {
      const videoUrl = await upload(p, files[0], "reel.mp4");
      const coverUrl = await upload(p, files[1], "cover.jpg");
      log("  uploaded reel and cover");
      media = await publishReel(p, videoUrl, coverUrl);
    } else {
      const urls = [];
      for (let i = 0; i < files.length; i++) urls.push(await upload(p, files[i], `slide-${String(i + 1).padStart(2, "0")}.jpg`));
      log(`  uploaded ${urls.length} slides`);
      media = await publishCarousel(p, urls);
    }
  } catch (err) {
    failed.push(entry.id);
    console.error(`publish: ${entry.id} did not go out: ${err.message}`);
    continue;
  }
  // The post is live. Mark it published on disk before anything else can fail,
  // so the commit step records it and the next run cannot post it again.
  entry.status = "published";
  entry.published_at = new Date().toISOString();
  entry.media_id = media.id;
  entry.permalink = media.permalink;
  writeJson(CALENDAR, calendar);
  published++;
  log(`  published: ${media.permalink}`);
  try {
    recordLedger(p, media);
    rewriteLanding(calendar);
  } catch (err) {
    failed.push(`${entry.id} (published; ledger or landing page not updated)`);
    console.error(`publish: ${entry.id} is live, but its records failed: ${err.message}`);
  }
}
log(`\n${DRY ? "dry run complete" : `${published} post(s) published`}`);
if (failed.length) die(`${failed.length} post(s) need attention: ${failed.join(", ")}`);
