#!/usr/bin/env node
// Generates a distinct, on-brand 1200x630 social/OG card per article, tool,
// class and site page, and wires og:image / twitter:image to it. Cards are
// rendered with headless Chrome (no npm deps); the committed PNGs are what
// ship, so other machines/CI need nothing.
//
//   node scripts/build-og-cards.mjs                 # every card
//   node scripts/build-og-cards.mjs cliff-at-three  # just these slugs
//
// Design intent (DESIGN.md, "The Terrain"): one survey sheet. Map-white
// ground, navy ink for every word, a stretch of slate contour, a patch of
// sage woodland and one dashed teal route with round waymarks on the right;
// Geologica 600 for the title with its label underneath (The Label Under the
// Title Rule), Literata for the author line. Square corners, no shadow, no
// gradient. A class card fills the waymark for the stretch of the route it
// teaches.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "assets", "img", "og");
const AUTHOR = "Matthew McArthur · Child Development Specialist";

// tokens-terrain.css, light sheet
const C = {
  bg: "#F3F5F0",
  surface: "#FBFCFA",
  ink: "#1B2A3A",
  inkSoft: "#3A4A5A",
  inkMuted: "#56687A",
  route: "#1E5F62",
  contour: "#8FA3B5",
  woodland: "#C9D8CC",
  water: "#BFD7E6",
};

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
  "&mdash;": "—", "&ndash;": "–", "&middot;": "·", "&rsquo;": "’", "&lsquo;": "‘",
  "&ldquo;": "“", "&rdquo;": "”", "&hellip;": "…", "&nbsp;": " ",
};
const decode = (s) => (s || "").replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? m).trim();
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pick = (html, re) => (html.match(re) || [])[1] || null;
const pageTitle = (html) =>
  decode(pick(html, /<title>([^<]*)<\/title>/i) || "").replace(/\s*[-–—|]\s*Growing Minds Science\s*$/i, "").trim();
// The label that sits under the page's h1 (tools, claims, articles) is the card's label too.
const pageLabel = (html) => decode(pick(html, /<p class="(?:[\w-]+ )?title-label">([^<]*)<\/p>/i) || "");

// A stretch of the homepage sheet, drawn in the card's right-hand field:
// contour lines, a woodland patch, the stream, the dashed route and five
// waymarks (birth to five). `active` fills one waymark, as the sheet does
// for the stage under the cursor.
function terrain(active) {
  const marks = [
    [780, 560], [880, 470], [975, 378], [1070, 285], [1150, 200],
  ];
  const way = marks
    .map(([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="11" fill="${i === active ? C.route : C.bg}" stroke="${C.route}" stroke-width="4.5"/>`)
    .join("");
  return `<svg class="sheet" viewBox="0 0 1200 630" width="1200" height="630" aria-hidden="true">
    <g fill="none" stroke="${C.contour}" stroke-width="1.6" stroke-linecap="round">
      <path d="M700 640 C 790 590, 860 620, 950 560 S 1120 470, 1240 520"/>
      <path d="M700 585 C 790 535, 860 565, 950 505 S 1120 415, 1240 465"/>
      <path stroke-width="2.4" d="M700 530 C 790 480, 860 510, 950 450 S 1120 360, 1240 410"/>
      <path d="M700 475 C 790 425, 860 455, 950 395 S 1120 305, 1240 355"/>
      <path d="M700 420 C 790 370, 860 400, 950 340 S 1120 250, 1240 300"/>
      <path stroke-width="2.4" d="M700 365 C 790 315, 860 345, 950 285 S 1120 195, 1240 245"/>
      <path d="M700 310 C 790 260, 860 290, 950 230 S 1120 140, 1240 190"/>
      <path d="M700 255 C 790 205, 860 235, 950 175 S 1120 85, 1240 135"/>
      <path d="M700 200 C 790 150, 860 180, 950 120 S 1120 30, 1240 80"/>
    </g>
    <path fill="${C.woodland}" d="M820 405 C 880 370, 960 372, 1010 400 C 1060 428, 1040 480, 990 500 C 930 524, 860 508, 826 470 C 804 446, 796 420, 820 405 Z"/>
    <path fill="none" stroke="${C.water}" stroke-width="6" stroke-linecap="round" d="M690 170 C 760 190, 790 240, 760 300 C 735 350, 760 390, 720 440"/>
    <path fill="none" stroke="${C.route}" stroke-width="6" stroke-linecap="round" stroke-dasharray="16 12"
      d="M700 630 C 740 600, 760 580, 780 560 C 830 510, 850 500, 880 470 C 920 430, 950 405, 975 378 C 1010 340, 1040 315, 1070 285 C 1100 255, 1130 225, 1150 200 C 1175 170, 1195 150, 1215 130"/>
    ${way}
  </svg>`;
}

function cardHtml({ title, label, active = -1 }) {
  // Size the title down as it gets longer so long headlines still fit in four lines.
  const len = title.length;
  const titleSize = len > 78 ? 58 : len > 56 ? 66 : len > 38 ? 76 : 88;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geologica:wght@500;600&family=Literata:opsz,wght@7..72,400&display=swap">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1200px; height:630px; }
  body {
    background:${C.bg}; color:${C.ink};
    font-family:"Geologica","Helvetica Neue",Arial,sans-serif;
    position:relative; overflow:hidden;
  }
  .sheet { position:absolute; inset:0; }
  .copy {
    position:absolute; inset:0; padding:64px 72px 60px;
    display:flex; flex-direction:column; justify-content:space-between;
  }
  .top { display:flex; align-items:center; gap:14px; }
  .mark { width:40px; height:40px; border:1.5px solid ${C.ink}; background:${C.surface}; display:grid; place-items:center; }
  .mark img { width:28px; height:28px; display:block; }
  .word { font-weight:600; font-size:24px; letter-spacing:-0.02em; color:${C.ink}; }
  .title {
    margin-top:36px; font-weight:600; font-size:${titleSize}px; line-height:0.98;
    letter-spacing:-0.03em; color:${C.ink}; max-width:${len > 56 ? 15.5 : 13}ch; text-wrap:balance;
    display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden;
  }
  .label { margin-top:18px; font-weight:500; font-size:22px; line-height:1.4; color:${C.inkMuted}; font-variant-numeric:tabular-nums; max-width:30ch; }
  .foot { display:flex; align-items:center; gap:18px; }
  .rule { width:48px; height:3px; background:${C.ink}; }
  .author { font-family:"Literata",Georgia,serif; font-size:22px; color:${C.inkSoft}; }
</style></head>
<body>
  ${terrain(active)}
  <div class="copy">
    <div>
      <div class="top">
        <div class="mark"><img src="file://${join(ROOT, "assets/img/original-logo-mark-no-words-128.png")}" alt=""></div>
        <div class="word">Growing Minds Science</div>
      </div>
      <div class="title">${esc(title)}</div>
      ${label ? `<div class="label">${esc(label)}</div>` : ""}
    </div>
    <div class="foot"><div class="rule"></div><div class="author">${esc(AUTHOR)}</div></div>
  </div>
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
      "--virtual-time-budget=3000", // let Google Fonts load before capture
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

// Optional positional slugs limit the run (e.g. `node scripts/build-og-cards.mjs
// communication-snapshot`) so adding one page doesn't re-render every committed PNG.
const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const wants = (slug) => requested.length === 0 || requested.includes(slug);
let made = 0;

function build({ rel, slug, title, label, active, renderOnly }) {
  if (!wants(slug)) return;
  const path = join(ROOT, rel);
  if (!existsSync(path)) return;
  const html = readFileSync(path, "utf8");
  const cardTitle = title || pageTitle(html);
  const cardLabel = label ?? pageLabel(html);
  const outPng = join(OUT_DIR, `${slug}.png`);
  render(cardHtml({ title: cardTitle, label: cardLabel, active }), outPng);
  if (!renderOnly) {
    const next = wireMeta(html, `/assets/img/og/${slug}.png`, `Growing Minds Science — ${cardTitle}`);
    if (next !== html) writeFileSync(path, next);
  }
  made++;
  console.log(`  ✓ ${slug}.png — [${cardLabel}] ${cardTitle}`);
}

// Articles: title from <title>, label from the line under the h1.
const dir = join(ROOT, "articles");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".html") && f !== "index.html")) {
  build({ rel: `articles/${file}`, slug: file.replace(/\.html$/, "") });
}

// Tools and the claims library: the label under the h1 already says
// "Free · age range · time". Claims pages are generated by
// scripts/build-claims.mjs, which already points at this card; render only
// (wireMeta would create drift).
for (const rel of [
  "tools/communication-snapshot.html",
  "tools/milestone-navigator.html",
  "tools/activity-library.html",
  "tools/reading-prompt-cards.html",
]) {
  build({ rel, slug: rel.split("/").pop().replace(/\.html$/, "") });
}
build({ rel: "claims/index.html", slug: "claims-library", renderOnly: true });

// Site pages: the sheet itself, the classes, each class with its waymark lit.
const SITE_PAGES = [
  { rel: "index.html", slug: "site-home", title: "The first five years, mapped.", label: "A developmental-science education for parents of children 0 to 5" },
  { rel: "pricing.html", slug: "site-pricing", title: "Start free. Add more when you want it.", label: "Free tools for everyone · classes $49 once, lifetime access" },
  { rel: "classes/index.html", slug: "site-classes", title: "Four classes, one for each developmental window.", label: "Birth to 5 · $49 once, lifetime access" },
  { rel: "classes/birth-to-12-months.html", slug: "site-birth-to-12-months", title: "Birth to 12 months: cues, attachment, and the first year.", label: "Class 1 · Birth to 12 months · $49 once", active: 0 },
  { rel: "classes/toddlerhood.html", slug: "site-toddlerhood", title: "Toddler years: language, autonomy, and big feelings.", label: "Class 2 · Ages 1 to 3 · $49 once", active: 1 },
  { rel: "classes/preschool.html", slug: "site-preschool", title: "Preschool years: self-regulation, play, and kindergarten readiness.", label: "Class 3 · Ages 3 to 5 · $49 once", active: 3 },
  { rel: "classes/family-systems.html", slug: "site-family-systems", title: "Family systems and stress: how the whole family shapes the developing child.", label: "Class 4 · Any age · In development, waitlist open" },
];
for (const page of SITE_PAGES) build(page);

console.log(`\nOG cards: ${made} rendered → assets/img/og/, meta wired.`);
