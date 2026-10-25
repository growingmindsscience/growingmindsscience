#!/usr/bin/env node
// Renders the site-wide social/OG card (1200x630): the From Little Onward
// lockup, as the header draws it, centered on the cream ground. Pages without
// an article card of their own point og:image / twitter:image at this file.
// Rendered with headless Chrome from the site's own fonts; the committed PNG
// is what ships.
//
//   node scripts/build-site-og-card.mjs

import { writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "img", "og", "site-brand.png");
const font = (f) => pathToFileURL(join(ROOT, "assets", "fonts", f)).href;

const chrome = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean).find((p) => existsSync(p));
if (!chrome) {
  console.error("No Chrome/Chromium found. Set CHROME_BIN to a Chrome binary.");
  process.exit(1);
}

// Same mark as the site header (docs/field-guide/brand-mark.md): forest arcs,
// sage leaf.
const MARK = `<svg class="mark" viewBox="8 -6 96 96" aria-hidden="true"><g fill="none" stroke="#193C39" stroke-width="11.0" stroke-linecap="round" stroke-linejoin="round"><path d="M16.00,88.00 L16.00,82.00 A44.00,44.00 0 0 1 50.85,38.96"/><path d="M39.00,91.00 L39.00,88.00 A27.00,27.00 0 0 1 66.00,61.00 L78.00,61.00"/></g><path d="M49.35,39.96 C43.58,16.28 74.29,-4.99 95.31,1.39 C94.25,18.80 69.07,42.93 49.35,39.96 Z" fill="#8DAE9A"/></svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Newsreader; font-weight: 400 600; src: url(${font("newsreader-v26-latin.woff2")}) format("woff2"); }
  @font-face { font-family: Inter; font-weight: 400 600; src: url(${font("inter-v20-latin.woff2")}) format("woff2"); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body { display: flex; align-items: center; justify-content: center; background: #F7F4EC; color: #193C39; }
  .lockup { display: flex; align-items: center; gap: 28px; }
  .mark { width: 128px; height: 128px; overflow: visible; }
  .name { font-family: Newsreader, Georgia, serif; font-size: 96px; font-weight: 500; letter-spacing: -0.01em; line-height: 1; white-space: nowrap; }
  .desc { position: relative; top: 0.22em; margin-left: 4px; font-family: Inter, Arial, sans-serif; font-size: 30px; font-weight: 500; letter-spacing: 0.32em; text-transform: uppercase; line-height: 1; }
</style></head><body>
  <div class="lockup">${MARK}<span class="name">from little</span><span class="desc">Onward</span></div>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), "site-og-"));
const page = join(dir, "card.html");
writeFileSync(page, html);
execFileSync(chrome, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
  "--force-device-scale-factor=1", "--window-size=1200,630",
  "--virtual-time-budget=3000", `--screenshot=${OUT}`, pathToFileURL(page).href,
], { stdio: "ignore" });
console.log(`wrote ${OUT}`);
