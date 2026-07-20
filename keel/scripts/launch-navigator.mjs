#!/usr/bin/env node
/* The Navigator launch switch, as one command:
     node keel/scripts/launch-navigator.mjs
   Only run once attorney review has cleared (DECISIONS.md D3). Flips the three
   NAVIGATOR-LAUNCH spots in place:
     1. tools/milestone-navigator.html — remove the robots noindex meta
     2. tools/index.html — uncomment the Development-section tool card
     3. sitemap.xml — add the /tools/milestone-navigator entry
   plus the tools-count copy on the hub. Prints a diff summary and the
   follow-up checks. Refuses to run twice. */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const today = new Date().toISOString().slice(0, 10);
const changed = [];
let blocked = false;

function edit(rel, fn) {
  const path = join(ROOT, rel);
  const before = readFileSync(path, "utf8");
  const after = fn(before);
  if (after == null) { blocked = true; return; }
  if (after !== before) { writeFileSync(path, after); changed.push(rel); }
}

/* 1. Page: drop noindex, retire the launch-switch comment. */
edit("tools/milestone-navigator.html", (html) => {
  if (!/name="robots"\s+content="noindex"/.test(html)) {
    console.error("✗ page: no noindex meta found — already launched?");
    return null;
  }
  return html
    .replace(/\s*<meta name="robots" content="noindex" \/>/, "")
    .replace(
      /  <!-- LAUNCH SWITCH \(DECISIONS\.md D3\)[\s\S]*?-->\n/,
      `  <!-- Launched ${today} after attorney review (DECISIONS.md D3). -->\n`,
    );
});

/* 2. Tools hub: uncomment the card, bump the count. */
edit("tools/index.html", (html) => {
  const re = /<!-- NAVIGATOR-LAUNCH:[\s\S]*?(<article[\s\S]*?<\/article>)\s*\n\s*-->/;
  const m = html.match(re);
  if (!m) {
    console.error("✗ tools/index.html: NAVIGATOR-LAUNCH comment block not found — already launched?");
    return null;
  }
  let out = html.replace(re, m[1]);
  out = out.replace(/<strong>(\d+) free parent tools<\/strong>/, (_, n) => `<strong>${Number(n) + 1} free parent tools</strong>`);
  return out;
});

/* 3. Sitemap: swap the placeholder comment for the real entry. */
edit("sitemap.xml", (xml) => {
  const marker = /  <!-- NAVIGATOR-LAUNCH:[\s\S]*?-->/;
  if (!marker.test(xml)) {
    console.error("✗ sitemap.xml: NAVIGATOR-LAUNCH marker not found — already launched?");
    return null;
  }
  return xml.replace(marker, `  <url>
    <loc>https://growingmindsscience.com/tools/milestone-navigator</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
});

if (blocked) {
  console.error("\nNothing written. Resolve the above (the switch only flips once).");
  process.exit(1);
}

console.log("Launched. Files changed:");
changed.forEach((f) => console.log(`  ✓ ${f}`));
console.log(`\nBefore committing:
  node keel/graders/selftest.mjs
  node scripts/check-canonicals.mjs
Then commit with a message noting attorney review cleared (D3).`);
