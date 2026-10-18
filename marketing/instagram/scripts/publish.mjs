#!/usr/bin/env node
// Publishes approved, due Instagram posts through the Instagram Graph API.
//
//   node marketing/instagram/scripts/publish.mjs                 # publish what is due
//   node marketing/instagram/scripts/publish.mjs --dry-run       # plan only, no uploads, no API calls
//   node marketing/instagram/scripts/publish.mjs --as-of 2026-10-30T12:00:00-04:00   # pretend it is that moment
//   node marketing/instagram/scripts/publish.mjs --only <post-id>
//   node marketing/instagram/scripts/publish.mjs --check-token   # verify the token works and report its age
//   node marketing/instagram/scripts/publish.mjs --refresh-token # exchange the token for a fresh 60-day one (run locally)
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
//              SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional SITE_ORIGIN.
// With nothing due it exits 0 without needing any of them. With something due and
// a variable missing it fails loudly: an approved post that cannot go out is an error.
//
// Token life: a long-lived Instagram Login token lasts 60 days and can be refreshed
// once it is a day old. The script tracks the last refresh in token.json and warns
// from day 45, fails from day 56. Refreshing prints the new token to the terminal,
// so --refresh-token is a local, manual step: paste the result into the repository
// secret IG_ACCESS_TOKEN. Nothing here ever writes a token to disk.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const IG = resolve(HERE, "..");
const ROOT = resolve(IG, "..", "..");
const CALENDAR = process.env.PUBLISH_CALENDAR || join(IG, "calendar.json"); // override for tests
const LEDGER = join(IG, "ledger.json");
const TOKEN_FILE = join(IG, "token.json");
const LANDING = join(ROOT, "from-instagram.html");
const GRAPH = "https://graph.instagram.com/v22.0";
const SITE = process.env.SITE_ORIGIN || "https://growingmindsscience.com";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const DRY = flag("--dry-run");
const NOW = opt("--as-of") ? new Date(opt("--as-of")) : new Date();
const ONLY = opt("--only");
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
  if (!existsSync(join(folder, "spec.json"))) die(`${id}: no spec.json`);
  const spec = readJson(join(folder, "spec.json"));
  const md = readFileSync(join(folder, "caption.md"), "utf8");
  const [body, tags = ""] = md.split(/\n## Hashtags\s*\n/);
  const caption = `${body.replace(/^#.*\n+/, "").trim()}\n\n${tags.trim()}`.trim();
  if (caption.length > 2200) die(`${id}: caption is ${caption.length} characters (Instagram allows 2,200)`);
  return { id, folder, spec, caption };
}
function renderPost(p) {
  const out = join(p.folder, "out");
  if (p.spec.kind === "reel") {
    execFileSync(process.execPath, [join(HERE, "render-reel.mjs"), p.folder], { stdio: "inherit" });
    const check = readJson(join(out, "check.json"));
    if (check.problems?.length) die(`${p.id}: reel checks fail:\n  ${check.problems.join("\n  ")}`);
    return [join(out, "reel.mp4"), join(out, "cover.jpg")];
  }
  execFileSync(process.execPath, [join(HERE, "render-carousel.mjs"), p.folder], { stdio: "inherit" });
  const slides = readdirSync(out).filter((f) => /^slide-\d+\.jpg$/.test(f)).sort();
  if (slides.length < 2 || slides.length > 10) die(`${p.id}: ${slides.length} slides; a carousel takes 2 to 10`);
  const check = readJson(join(out, "check.json"));
  if (check.problems?.length) die(`${p.id}: slide rules fail:\n  ${check.problems.join("\n  ")}`);
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
  if (!res.ok) die(`${p.id}: upload of ${path} failed: ${res.status} ${await res.text()}`);
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
function rewriteLanding(calendar) {
  if (!existsSync(LANDING)) { console.warn("publish: from-instagram.html missing; skipped the landing page"); return; }
  const published = calendar.posts.filter((p) => p.status === "published").sort((a, b) => (b.published_at || "").localeCompare(a.published_at || "")).slice(0, 4);
  const items = published.length === 0 ? `        <li class="fi-empty">Nothing has gone out yet. The first posts land here the day they publish.</li>` : published.map((p) => {
    const spec = readJson(join(IG, "posts", p.id, "spec.json"));
    const when = new Date(p.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" });
    const hook = spec.slides[0].lead || spec.slides[0].claim || "";
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
  const s = p.spec.slides[0];
  ledger.used.push({
    topic: s.lead || s.claim || p.id,
    source: (p.spec.sources || [])[0] || "",
    channel: "instagram",
    date: NOW.toISOString().slice(0, 10),
    series: p.spec.series,
    post: p.id,
    permalink: media.permalink,
  });
  writeJson(LEDGER, ledger);
}

// ---------- main ----------
if (flag("--refresh-token")) { await refreshToken(); process.exit(0); }
if (flag("--check-token")) { await checkToken(); process.exit(0); }

const calendar = readJson(CALENDAR);
// --rewrite-landing: rebuild the bio-link list from calendar.json without publishing
// (after a manual post, or when the page markup changes).
if (flag("--rewrite-landing")) { rewriteLanding(calendar); log("landing page rewritten from calendar.json"); process.exit(0); }
const due = calendar.posts.filter((p) => p.status === "approved" && new Date(p.scheduled_at) <= NOW && (!ONLY || p.id === ONLY));
if (!due.length) { log(`nothing due at ${NOW.toISOString()}${ONLY ? ` for ${ONLY}` : ""}`); process.exit(0); }

log(`${DRY ? "dry run" : "publishing"}: ${due.length} post(s) due at ${NOW.toISOString()}`);
if (!DRY) await checkToken();

let published = 0;
for (const entry of due) {
  const p = loadPost(entry.id);
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
  let media;
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
  entry.status = "published";
  entry.published_at = new Date().toISOString();
  entry.media_id = media.id;
  entry.permalink = media.permalink;
  writeJson(CALENDAR, calendar);
  recordLedger(p, media);
  rewriteLanding(calendar);
  published++;
  log(`  published: ${media.permalink}`);
}
log(`\n${DRY ? "dry run complete" : `${published} post(s) published`}`);
