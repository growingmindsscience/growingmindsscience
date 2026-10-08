#!/usr/bin/env node
// Cache-busts the site's CSS and JS by stamping every reference with a short
// content hash:   /assets/css/chrome.css  ->  /assets/css/chrome.css?v=1a2b3c4d5e
// vercel.json serves /assets/css/* and /assets/js/* as immutable for a year.
// That is only safe because every URL pointing at them changes when the file does.
//   node scripts/stamp-assets.mjs          # rewrite references in place
//   node scripts/stamp-assets.mjs --check  # exit 1 if any reference is missing or stale
//
// What gets stamped:
//   - every .html page (recursive; skips nsc/, course/, answers/, node_modules, ...)
//   - the page templates in scripts/build-claims.mjs and scripts/build-library.mjs,
//     so generated pages come out stamped and build-claims --check stays byte-identical
//   - quoted absolute URLs inside assets/js and assets/css ("/assets/js/x.js"): how
//     decor.js lazy-loads the arcade. Those files are hashed AFTER their own
//     references are stamped, so editing a lazy-loaded game changes decor.js's
//     hash too, and every page that loads decor.js picks up the new chain.
// Deterministic: same files -> same hashes -> byte-identical output.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const HASH_LEN = 10;
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".claude", ".vercel", "nsc", "course", "answers"]);
const TEMPLATES = ["scripts/build-claims.mjs", "scripts/build-library.mjs"];

// A file name ending in .css/.js that doesn't run on into a longer name (x.css.map).
const NAME = String.raw`([\w.-]+?\.(?:css|js))(?![\w-]|\.\w)`;
const STAMP = String.raw`(?:\?v=[\w-]*)?`;
// Pages and templates: URLs in an attribute, quoted string or url(), whatever the
// prefix (/assets, ../assets, assets). Prose mentions in comments are left alone.
const PAGE_URL = String.raw`(["'=(]\s*(?:\.{1,2}/)*/?)assets/(css|js)/`;
const PAGE_REF = new RegExp(String.raw`${PAGE_URL}${NAME}${STAMP}(?=["')\s>])`, "g");
// Inside assets: only quoted absolute URLs, so prose comments don't create cycles.
const ASSET_REF = new RegExp(String.raw`(["'])/assets/(css|js)/${NAME}${STAMP}(?=\1)`, "g");
// URLs the patterns above can't take whole, so can't stamp: built at runtime
// ("/assets/js/" + key), a directory, or a query other than ?v=.
const PAGE_LOOSE = new RegExp(String.raw`${PAGE_URL}(?!${NAME}${STAMP}["')\s>])`, "g");
const ASSET_LOOSE = new RegExp(String.raw`(["'])/assets/(css|js)/(?!${NAME}${STAMP}\1)`, "g");

const rel = (p) => relative(ROOT, p);
const lineOf = (src, index) => src.slice(0, index).split("\n").length;
const problems = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

function flagLoose(file, src, re, label) {
  for (const m of src.matchAll(re)) {
    problems.push(`${rel(file)}:${lineOf(src, m.index)}  ${label}`);
  }
}

// ---- assets: read, then hash in dependency order -------------------------
const assets = new Map(); // "css/chrome.css" -> { path, src, out, hash }
for (const dir of ["css", "js"]) {
  for (const name of readdirSync(join(ROOT, "assets", dir)).sort()) {
    if (!name.endsWith(`.${dir}`)) continue;
    const path = join(ROOT, "assets", dir, name);
    assets.set(`${dir}/${name}`, { path, src: readFileSync(path, "utf8") });
  }
}

function hashOf(key, from, chain = []) {
  const a = assets.get(key);
  if (!a) {
    problems.push(`${from}  references missing asset assets/${key}`);
    return null; // leave the reference as written
  }
  if (a.hash) return a.hash;
  if (chain.includes(key)) {
    throw new Error(`asset reference cycle: ${[...chain, key].join(" -> ")} (hashes can't settle)`);
  }
  a.out = a.src.replace(ASSET_REF, (m, q, dir, name, at) => {
    const h = hashOf(`${dir}/${name}`, `${rel(a.path)}:${lineOf(a.src, at)}`, [...chain, key]);
    return h ? `${q}/assets/${dir}/${name}?v=${h}` : m;
  });
  a.hash = createHash("sha256").update(a.out).digest("hex").slice(0, HASH_LEN);
  return a.hash;
}

for (const [key, a] of assets) {
  try {
    hashOf(key, rel(a.path));
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
  flagLoose(a.path, a.src, ASSET_LOOSE, "asset URL the stamper can't read whole; write it as one literal (no runtime concatenation, no query but ?v=)");
}

// ---- pages and page templates ---------------------------------------------
const targets = [...assets.values()].map((a) => ({ path: a.path, src: a.src, out: a.out }));
for (const path of [...walk(ROOT), ...TEMPLATES.map((t) => join(ROOT, t))]) {
  const src = readFileSync(path, "utf8");
  const out = src.replace(PAGE_REF, (m, pre, dir, name, at) => {
    const h = hashOf(`${dir}/${name}`, `${rel(path)}:${lineOf(src, at)}`);
    return h ? `${pre}assets/${dir}/${name}?v=${h}` : m;
  });
  flagLoose(path, src, PAGE_LOOSE, "asset URL the stamper can't read whole; reference one concrete .css/.js file (no query but ?v=)");
  targets.push({ path, src, out });
}

let stale = 0;
for (const t of targets) {
  if (t.out === t.src) continue;
  stale++;
  if (CHECK) console.error(`✗ unstamped: ${rel(t.path)}`);
  else {
    writeFileSync(t.path, t.out);
    console.log(`  ✓ ${rel(t.path)}`);
  }
}
for (const p of problems) console.error(`✗ ${p}`);

if (CHECK) {
  if (stale || problems.length) {
    const fix = [stale && "run: node scripts/stamp-assets.mjs", problems.length && "fix the unresolvable lines above by hand"].filter(Boolean).join("; ");
    console.error(`FAILED (${stale} stale, ${problems.length} unresolvable): ${fix}`);
    process.exit(1);
  }
  console.log(`✓ every CSS/JS reference is stamped (${assets.size} assets, ${targets.length} files)`);
  process.exit(0);
}
console.log(`\nStamped ${stale} file(s); ${assets.size} assets hashed.`);
process.exit(problems.length ? 1 : 0);
