#!/usr/bin/env node
// Generates a distinct, on-brand 1200x630 social/OG card per article and wires
// og:image / twitter:image to it. Cards are rendered with headless Chrome (no
// npm deps); the committed PNGs are what ship, so other machines/CI need nothing.
//
//   node scripts/build-og-cards.mjs
//
// Design intent (PRODUCT.md): calm, editorial, warm — a masthead, not a SaaS
// gradient. Cream ground, brand wordmark, teal kicker, big Bricolage title,
// coral hairline, author line.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "assets", "img", "og");
const AUTHOR = "Matthew McArthur · Child Development Specialist";

const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error("No Chrome/Chromium found. Set CHROME_BIN to a Chrome binary.");
  process.exit(1);
}

const ENTITIES = {
  "&quot;": '"', "&#34;": '"', "&apos;": "'", "&#39;": "'", "&amp;": "&",
  "&mdash;": "—", "&ndash;": "–", "&rsquo;": "’", "&lsquo;": "‘",
  "&ldquo;": "“", "&rdquo;": "”", "&hellip;": "…", "&nbsp;": " ",
};
const decode = (s) => (s || "").replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? m).trim();
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pick = (html, re) => (html.match(re) || [])[1] || null;

function cardHtml({ title, kicker }) {
  // Size the title down as it gets longer so long headlines still fit 3–4 lines.
  const len = title.length;
  const titleSize = len > 78 ? 62 : len > 56 ? 72 : len > 38 ? 84 : 96;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Source+Serif+4:opsz,wght@8..60,500..600&display=swap">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1200px; height:630px; }
  body {
    background:
      radial-gradient(1200px 700px at 88% -12%, #E4EFEA 0%, rgba(228,239,234,0) 55%),
      #F0F5F3;
    color:#15393C;
    font-family:"Bricolage Grotesque","Avenir Next",sans-serif;
    padding:72px 76px;
    display:flex; flex-direction:column; justify-content:space-between;
    position:relative; overflow:hidden;
  }
  .edge { position:absolute; left:0; top:0; bottom:0; width:12px; background:#DE7356; }
  .top { display:flex; align-items:center; gap:16px; }
  .mark { width:44px; height:44px; border-radius:10px; }
  .word { font-weight:700; font-size:26px; letter-spacing:.02em; color:#15393C; }
  .kicker {
    margin-top:44px; font-size:22px; font-weight:700; letter-spacing:.16em;
    text-transform:uppercase; color:#1E5F62;
  }
  .title {
    margin-top:20px; font-weight:600; font-size:${titleSize}px; line-height:1.04;
    letter-spacing:-0.01em; color:#15393C; max-width:20ch;
    display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden;
  }
  .foot { display:flex; align-items:center; gap:20px; }
  .rule { height:3px; width:64px; background:#DE7356; border-radius:2px; }
  .author { font-family:"Source Serif 4",Georgia,serif; font-size:24px; color:#3D5A5A; }
</style></head>
<body>
  <div class="edge"></div>
  <div>
    <div class="top">
      <img class="mark" src="file://${join(ROOT, "assets/img/original-logo-mark-no-words-512.png")}" alt="">
      <div class="word">Growing Minds Science</div>
    </div>
    <div class="kicker">${esc(kicker)}</div>
    <div class="title">${esc(title)}</div>
  </div>
  <div class="foot"><div class="rule"></div><div class="author">${esc(AUTHOR)}</div></div>
</body></html>`;
}

function render(html, outPng) {
  const tmp = join(tmpdir(), `og-${Math.abs(hash(outPng))}.html`);
  writeFileSync(tmp, html);
  execFileSync(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1200,630",
      "--virtual-time-budget=2500", // let Google Fonts load before capture
      `--screenshot=${outPng}`,
      `file://${tmp}`,
    ],
    { stdio: "ignore" },
  );
}
// tiny deterministic hash so temp filenames don't need Math.random
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function wireMeta(html, cardUrl, alt) {
  let out = html;
  const abs = `https://growingmindsscience.com${cardUrl}`;
  // Drop any dimension/alt tags we previously added so re-runs stay clean.
  out = out.replace(/\s*<meta\s+property="og:image:(?:width|height|alt)"[^>]*>/gi, "");
  const dims =
    `\n  <meta property="og:image:width" content="1200" />` +
    `\n  <meta property="og:image:height" content="630" />` +
    `\n  <meta property="og:image:alt" content="${alt.replace(/"/g, "&quot;")}" />`;
  if (/property="og:image"/.test(out)) {
    out = out.replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")\s*\/?>/i, `$1${abs}$2 />${dims}`);
  } else {
    out = out.replace(/<\/head>/i, `  <meta property="og:image" content="${abs}" />${dims}\n</head>`);
  }
  if (/name="twitter:image"/.test(out)) {
    out = out.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i, `$1${abs}$2`);
  } else if (/name="twitter:card"/.test(out)) {
    out = out.replace(
      /(<meta\s+name="twitter:card"[^>]*>)/i,
      `$1\n  <meta name="twitter:image" content="${abs}" />`,
    );
  }
  return out;
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const dir = join(ROOT, "articles");
const files = readdirSync(dir).filter((f) => f.endsWith(".html") && f !== "index.html");
let made = 0;
for (const file of files) {
  const path = join(dir, file);
  const html = readFileSync(path, "utf8");
  const rawTitle = decode(pick(html, /<title>([^<]*)<\/title>/i) || "");
  const title = rawTitle.replace(/\s*[-–—]\s*Growing Minds Science\s*$/i, "").trim();
  const kicker = decode(pick(html, /<p class="article-kicker"[^>]*>([^<]*)<\/p>/i) || "Growing Minds Science");
  const slug = file.replace(/\.html$/, "");
  const outPng = join(OUT_DIR, `${slug}.png`);

  render(cardHtml({ title, kicker }), outPng);
  const cardUrl = `/assets/img/og/${slug}.png`;
  const next = wireMeta(html, cardUrl, `Growing Minds Science — ${title}`);
  if (next !== html) writeFileSync(path, next);
  made++;
  console.log(`  ✓ ${slug}.png — [${kicker}] ${title}`);
}
console.log(`\nOG cards: ${made} rendered → assets/img/og/, meta wired.`);
