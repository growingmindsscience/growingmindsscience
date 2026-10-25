#!/usr/bin/env node
// Guards that every page points search engines and social cards at the one
// production origin (SITE_ORIGIN in scripts/site.mjs).
//
//   node scripts/check-canonicals.mjs         # verify (exit 1 on any problem)
//   node scripts/check-canonicals.mjs --fix   # rewrite relative canonicals and
//                                             # old origins to SITE_ORIGIN, and
//                                             # add missing social tags
//
// Why this matters: the site is reachable from mirrors we do not fully control —
// two live *.netlify.app copies (one serving stale content) and Vercel preview
// domains. A RELATIVE canonical resolves against whatever host served the page,
// so each mirror self-canonicalises and competes with fromlittleonward.com
// for the same content. An absolute canonical makes every mirror point home,
// consolidating ranking signals no matter who is serving.
//
// It also fails on:
//   - a page with a canonical but no og:url (equal to the canonical), og:image
//     or twitter:image (--fix adds og:url from the canonical, og:image from
//     DEFAULT_OG_IMAGE, and twitter:image from og:image)
//   - a canonical, og:url, og:image or twitter:image on another host
//   - any previous origin (PREVIOUS_ORIGINS) left in a deployed file
//   - sitemap.xml or robots.txt not on SITE_ORIGIN
//   - nsc/lib/site.ts DEFAULT_SITE_ORIGIN disagreeing with SITE_ORIGIN
//   - vercel.json not redirecting each previous origin to SITE_ORIGIN first
//   - a link to a previous Instagram handle, or a homepage JSON-LD sameAs
//     without INSTAGRAM_URL

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { SITE_ORIGIN, PREVIOUS_ORIGINS, INSTAGRAM_URL, PREVIOUS_INSTAGRAM_HANDLES, DEFAULT_OG_IMAGE } from "./site.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = SITE_ORIGIN;
const FIX = process.argv.includes("--fix");
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "nsc", "answers", ".claude", ".vercel"]);
// Not deployed (.vercelignore), so old origins there are history, not live links.
const UNDEPLOYED_DIRS = new Set(["docs", "marketing", "knowledge", "course", "evals", "corpus", "scripts", "tests", "library", "keel", ".github", ".impeccable", ".serena", ".agents"]);
// vercel.json names the old hosts on purpose: it redirects them (checked below).
const ORIGIN_SCAN_EXEMPT = new Set(["vercel.json"]);
const SCANNED_EXT = /\.(html|xml|txt|js|mjs|json|css|webmanifest)$/;

const CANONICAL_RE = /(<link\s+rel="canonical"\s+href=")([^"]*)(")/i;
const SOCIAL_RE = /<meta\s+(?:property|name)="(og:url|og:image|twitter:image)"\s+content="([^"]*)"/gi;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Old hosts with or without a scheme (share text like "oldhost.com/arcade" counts).
const OLD_HOSTS = [...new Set(PREVIOUS_ORIGINS.map((o) => new URL(o).host.replace(/^www\./, "")))];
// Email addresses on the old domain are skipped: mail is a separate decision.
const OLD_RE = new RegExp(`(?<![@\\w.-])(?:https?://)?(?:www\\.)?(?:${OLD_HOSTS.map(escapeRe).join("|")})\\b`, "gi");
const OLD_IG_RE = new RegExp(`https?://(?:www\\.)?instagram\\.com/(?:${PREVIOUS_INSTAGRAM_HANDLES.map(escapeRe).join("|")})(?![\\w.])/?`, "gi");

const metaContent = (html, prop) =>
  html.match(new RegExp(`<meta\\s+(?:property|name)="${escapeRe(prop)}"\\s+content="([^"]*)"`, "i"))?.[1] ?? null;
const LINE = (prop) => new RegExp(`^([ \\t]*)<meta\\s+(?:property|name)="${escapeRe(prop)}"[^\\n]*$`, "m");
const CANONICAL_LINE = /^([ \t]*)<link\s+rel="canonical"[^\n]*$/m;
// Put `tag` on its own line after the first anchor line found, same indent.
function insertAfter(html, anchors, tag) {
  for (const re of anchors) {
    const m = html.match(re);
    if (m) return html.slice(0, m.index + m[0].length) + `\n${m[1]}${tag}` + html.slice(m.index + m[0].length);
  }
  return html;
}

function walk(dir, out = [], top = true) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    if (top && UNDEPLOYED_DIRS.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out, false);
    else if (SCANNED_EXT.test(name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const pages = files.filter((f) => f.endsWith(".html"));
const problems = [];
let fixed = 0;

for (const file of files) {
  const rel = relative(ROOT, file);
  let text = readFileSync(file, "utf8");
  const before = text;

  if (file.endsWith(".html")) {
    const m = text.match(CANONICAL_RE);
    if (m && !/^https?:\/\//i.test(m[2])) {
      const abs = ORIGIN + (m[2].startsWith("/") ? m[2] : `/${m[2]}`);
      if (FIX) text = text.replace(CANONICAL_RE, `$1${abs}$3`);
      else problems.push(`${rel}: relative canonical ${m[2]}`);
    }
  }

  if (!ORIGIN_SCAN_EXEMPT.has(rel) && OLD_RE.test(text)) {
    if (FIX) text = text.replace(OLD_RE, (hit) => (/^https?:\/\//i.test(hit) ? ORIGIN : new URL(ORIGIN).host.replace(/^www\./, "")));
    else for (const hit of new Set(text.match(OLD_RE))) problems.push(`${rel}: old origin ${hit}`);
  }
  OLD_RE.lastIndex = 0;

  if (OLD_IG_RE.test(text)) {
    if (FIX) text = text.replace(OLD_IG_RE, INSTAGRAM_URL);
    else for (const hit of new Set(text.match(OLD_IG_RE))) problems.push(`${rel}: old Instagram link ${hit}`);
  }
  OLD_IG_RE.lastIndex = 0;

  // Every page with a canonical carries og:url (the canonical), og:image and
  // twitter:image (the og:image), so shared links never fall back to guesses.
  const canon = file.endsWith(".html") ? text.match(CANONICAL_RE)?.[2] : null;
  if (canon && /^https?:\/\//i.test(canon)) {
    const ogUrl = metaContent(text, "og:url");
    if (ogUrl === null) {
      if (FIX) text = insertAfter(text, [LINE("og:type"), CANONICAL_LINE], `<meta property="og:url" content="${canon}" />`);
      else problems.push(`${rel}: no og:url`);
    } else if (ogUrl !== canon) {
      problems.push(`${rel}: og:url ${ogUrl} is not the canonical ${canon}`);
    }
    let ogImage = metaContent(text, "og:image");
    if (ogImage === null) {
      if (FIX) {
        text = insertAfter(text, [LINE("og:url"), LINE("og:type"), CANONICAL_LINE], `<meta property="og:image" content="${DEFAULT_OG_IMAGE}" />`);
        ogImage = DEFAULT_OG_IMAGE;
      } else problems.push(`${rel}: no og:image`);
    }
    if (metaContent(text, "twitter:image") === null) {
      if (FIX && ogImage) text = insertAfter(text, [LINE("twitter:card"), LINE("og:image")], `<meta name="twitter:image" content="${ogImage}" />`);
      else problems.push(`${rel}: no twitter:image`);
    }
  }

  if (text !== before) {
    writeFileSync(file, text);
    fixed++;
    console.log(`  fixed  ${rel}`);
  }

  if (file.endsWith(".html")) {
    const m = text.match(CANONICAL_RE);
    if (m && /^https?:\/\//i.test(m[2]) && !m[2].startsWith(`${ORIGIN}/`) && m[2] !== ORIGIN) {
      problems.push(`${rel}: canonical on another host ${m[2]}`);
    }
    for (const [, prop, url] of text.matchAll(SOCIAL_RE)) {
      if (/^https?:\/\//i.test(url) && !url.startsWith(`${ORIGIN}/`) && url !== ORIGIN) {
        problems.push(`${rel}: ${prop} on another host ${url}`);
      }
    }
  }
}

const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
for (const [, loc] of sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)) {
  if (!loc.startsWith(`${ORIGIN}/`)) problems.push(`sitemap.xml: <loc> not on ${ORIGIN}: ${loc}`);
}
const robots = readFileSync(join(ROOT, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) problems.push(`robots.txt: Sitemap line is not ${ORIGIN}/sitemap.xml`);

const nscSite = join(ROOT, "nsc", "lib", "site.ts");
if (existsSync(nscSite)) {
  const m = readFileSync(nscSite, "utf8").match(/DEFAULT_SITE_ORIGIN\s*=\s*"([^"]*)"/);
  if (!m || m[1] !== ORIGIN) problems.push(`nsc/lib/site.ts: DEFAULT_SITE_ORIGIN is ${m ? m[1] : "missing"}, expected ${ORIGIN}`);
}

const home = readFileSync(join(ROOT, "index.html"), "utf8");
const sameAs = [...home.matchAll(/"sameAs"\s*:\s*\[([^\]]*)\]/g)].map((m) => m[1]).join(" ");
if (!sameAs.includes(`"${INSTAGRAM_URL}"`)) problems.push(`index.html: JSON-LD sameAs does not list ${INSTAGRAM_URL}`);

// Old hosts must redirect, path and query intact, before any other rule runs
// (redirects run before rewrites, so /nsc and /api are covered too).
const redirects = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")).redirects || [];
PREVIOUS_ORIGINS.forEach((old, i) => {
  const host = new URL(old).host;
  const r = redirects[i];
  const ok = r && r.source === "/:path*" && r.permanent === true && r.destination === `${ORIGIN}/:path*` &&
    (r.has || []).some((h) => h.type === "host" && h.value === host);
  if (!ok) problems.push(`vercel.json: redirects[${i}] should send host ${host} to ${ORIGIN}/:path* (permanent)`);
});

if (FIX) console.log(`\n${fixed} file(s) rewritten.`);

if (problems.length) {
  console.log(`✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`    ${p}`);
  console.log(`\nRelative or off-host canonicals let mirrors (netlify.app, *.vercel.app previews)`);
  console.log(`self-canonicalise and compete with ${ORIGIN}.`);
  console.log(`Run: node scripts/check-canonicals.mjs --fix`);
  process.exit(1);
}
console.log(`✓ ${pages.length} page(s) checked: canonicals and social URLs are on ${ORIGIN}, and no old origin is left in ${files.length} deployed file(s).`);
