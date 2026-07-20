#!/usr/bin/env node
// Guards that every page declares an ABSOLUTE canonical URL.
//
//   node scripts/check-canonicals.mjs         # verify (exit 1 on any relative)
//   node scripts/check-canonicals.mjs --fix   # rewrite relative -> absolute
//
// Why this matters: the site is reachable from mirrors we do not fully control —
// two live *.netlify.app copies (one serving stale content) and Vercel preview
// domains. A RELATIVE canonical resolves against whatever host served the page,
// so each mirror self-canonicalises and competes with growingmindsscience.com
// for the same content. An absolute canonical makes every mirror point home,
// consolidating ranking signals no matter who is serving.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://growingmindsscience.com";
const FIX = process.argv.includes("--fix");
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "nsc", "answers", ".claude", ".vercel"]);

const CANONICAL_RE = /(<link\s+rel="canonical"\s+href=")([^"]*)(")/i;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const offenders = [];
let fixed = 0;

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const m = html.match(CANONICAL_RE);
  if (!m) continue; // no canonical declared; not this check's job
  const href = m[2];
  if (/^https?:\/\//i.test(href)) continue; // already absolute

  const abs = ORIGIN + (href.startsWith("/") ? href : `/${href}`);
  if (FIX) {
    writeFileSync(file, html.replace(CANONICAL_RE, `$1${abs}$3`));
    fixed++;
    console.log(`  fixed  ${relative(ROOT, file)}  ${href} -> ${abs}`);
  } else {
    offenders.push({ file: relative(ROOT, file), href });
  }
}

if (FIX) {
  console.log(`\n${fixed} canonical(s) made absolute.`);
  process.exit(0);
}

if (offenders.length) {
  console.log(`✗ ${offenders.length} page(s) with a RELATIVE canonical:`);
  for (const o of offenders) console.log(`    ${o.file}  ->  ${o.href}`);
  console.log(`\nRelative canonicals let mirrors (netlify.app, *.vercel.app previews)`);
  console.log(`self-canonicalise and compete with ${ORIGIN}.`);
  console.log(`Run: node scripts/check-canonicals.mjs --fix`);
  process.exit(1);
}
console.log(`✓ All ${files.length} page(s) with a canonical declare it absolutely.`);
