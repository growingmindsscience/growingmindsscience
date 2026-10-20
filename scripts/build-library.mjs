#!/usr/bin/env node
// Compiler for the programmatic developmental library. Turns graded source
// entries (library/entries/*.json) into on-brand static pages under answers/,
// with a hard CERT GATE: an entry that fails the grader is never emitted.
//
//   node scripts/build-library.mjs            # grade only, report, write nothing
//   node scripts/build-library.mjs --preview  # render ALL entries as noindex drafts
//   node scripts/build-library.mjs --publish  # render only status:"approved" as live
//
// Publish is the human sign-off: entries stay status:"draft" (noindex, not in
// sitemap, DRAFT badge) until someone flips them to "approved". Mirrors the
// Navigator / Activity Library "draft is invisible in production" pattern.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { KNOWLEDGE } from "../api/_knowledge-data.js";
import { gradeEntry, AGE_BANDS } from "../tools/library/grader.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRIES_DIR = join(ROOT, "library", "entries");
const OUT_DIR = join(ROOT, "answers");
const ORIGIN = "https://growingmindsscience.com";

const args = process.argv.slice(2);
const MODE = args.includes("--publish") ? "publish" : args.includes("--preview") ? "preview" : "report";

// ── knowledge + related lookups ─────────────────────────────────────────────
const CARD = new Map(KNOWLEDGE.map((c) => [c.id, c]));
const KID_SET = new Set(KNOWLEDGE.map((c) => c.id));
const CLASS_META = {
  "birth-to-12-months": { href: "/classes/birth-to-12-months", title: "Birth to 12 Months", tag: "Available now" },
  toddlerhood: { href: "/classes/toddlerhood", title: "Toddler Years", tag: "Available now" },
  preschool: { href: "/classes/preschool", title: "Preschool Years", tag: "Available now" },
  "family-systems": { href: "/classes/family-systems", title: "Family Systems & Stress", tag: "Waitlist" },
};
const ARTICLE_TITLE = {
  "serve-and-return": "What “serve and return” actually means",
  "parents-nervous-system": "When your own nervous system is the variable",
  "milestone-worry": "What to do with milestone worry",
  "toddler-no": "The toddler “no” is not the war you think it is",
  "self-regulation": "Self-regulation, briefly",
  "counting-ladder": "The counting ladder",
  "cliff-at-three": "The cliff at three",
  "screen-time": "A short, honest take on screen time",
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const escAttr = esc;

function gitDate(rel, first) {
  try {
    const out = execSync(`git log ${first ? "--reverse " : ""}--format=%aI -- "${rel}"`, { cwd: ROOT }).toString().trim();
    return (first ? out.split("\n")[0] : out.split("\n").pop()) || null;
  } catch { return null; }
}

// ── page render ─────────────────────────────────────────────────────────────
function sourcesFor(entry) {
  const seen = new Map();
  for (const id of entry.evidence || []) {
    const c = CARD.get(id);
    if (c?.source?.url && !seen.has(c.source.url)) seen.set(c.source.url, c.source);
  }
  return [...seen.values()];
}

function jsonLd(entry, url, published, modified) {
  const article = {
    "@context": "https://schema.org", "@type": "Article",
    headline: entry.question, description: entry.shortAnswer,
    inLanguage: "en", isAccessibleForFree: true,
    author: { "@type": "Person", name: "Matthew McArthur", jobTitle: "Child Development Specialist", url: `${ORIGIN}/about` },
    publisher: { "@type": "Organization", name: "Growing Minds Science", url: ORIGIN, logo: { "@type": "ImageObject", url: `${ORIGIN}/assets/img/brand/icon-512.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url }, url,
    ...(published ? { datePublished: published } : {}), ...(modified ? { dateModified: modified } : {}),
  };
  const faq = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: [{ "@type": "Question", name: entry.question, acceptedAnswer: { "@type": "Answer", text: entry.shortAnswer } }],
  };
  const crumbs = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Answers", item: `${ORIGIN}/answers/` },
      { "@type": "ListItem", position: 3, name: entry.question, item: url },
    ],
  };
  return JSON.stringify([article, faq, crumbs], null, 2);
}

// ── site chrome ─────────────────────────────────────────────────────────────
// The skip link, header and footer are copied from the articles hub when a page
// is rendered, so an answers page always carries the site's current chrome.
// aria-current is dropped: no nav item names these pages.
function siteChrome() {
  const hub = readFileSync(join(ROOT, "articles", "index.html"), "utf8");
  const cut = (from, to, keepTo) => {
    const a = hub.indexOf(from);
    const b = a < 0 ? -1 : hub.indexOf(to, a);
    if (b < 0) throw new Error(`articles/index.html has no ${from} ... ${to}; cannot copy the site chrome`);
    return hub.slice(a, keepTo ? b + to.length : b).replace(/ aria-current="page"/g, "").trim();
  };
  return { header: cut("<!-- header:start -->", "<main", false), footer: cut("<!-- footer:start -->", "<!-- footer:end -->", true) };
}

function shell({ title, description, canonical, draft, body, extraHead = "" }) {
  const { header, footer } = siteChrome();
  const robots = draft ? `\n  <meta name="robots" content="noindex, nofollow" />` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script>/* Enable motion only when it is welcome; otherwise content stays visible (no-JS & reduced-motion safe). */try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('anim');}catch(e){}
  /* Apply saved/system theme before paint (same key as chrome.js so the choice follows the visitor). */try{var t=localStorage.getItem('gms-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.setAttribute('data-theme','dark');}catch(e){}</script>
  <title>${esc(title)} | Growing Minds Science</title>
  <meta name="description" content="${escAttr(description)}" />
  <meta name="theme-color" content="#F7F4EC" />
  <meta name="color-scheme" content="light dark" />${robots}
  <link rel="icon" href="/assets/img/brand/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/assets/img/brand/favicon-32.png" type="image/png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/assets/img/brand/apple-touch-icon-180.png" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escAttr(title)} | Growing Minds Science" />
  <meta property="og:description" content="${escAttr(description)}" />
  <meta property="og:image" content="${ORIGIN}/assets/img/og/site-home.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
${extraHead}
  <link rel="preload" href="/assets/fonts/newsreader-v26-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/assets/fonts/inter-v20-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/assets/css/fonts.css?v=a9295d8c01" />
  <link rel="stylesheet" href="/assets/css/tokens-field-guide.css?v=303d86446c" />
  <link rel="stylesheet" href="/assets/css/field-guide.css?v=ececc69b57" />
  <link rel="stylesheet" href="/assets/css/fg-base.css?v=9ee704dd6a" />
  <link rel="stylesheet" href="/assets/css/hubs.css?v=ed7b49bfbe" />
  <link rel="stylesheet" href="/assets/css/article.css?v=01dcd82f94" />
  <link rel="stylesheet" href="/assets/css/chrome.css?v=a618e65a75" />
</head>
<body class="fg fg--page hub art">
  ${header}

  <main id="main" tabindex="-1">
${body}
  </main>

  ${footer}

  <script src="/assets/js/chrome.js?v=288fec8e54"></script>
  <script src="/assets/js/main.js?v=3f7e70ab67" defer></script>
  <script src="/assets/js/home.js?v=0ba31b04c2" defer></script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}

const anchor = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const DOT = ` <span aria-hidden="true">&middot;</span> `;
const NOTE = "Educational content only. Not medical or psychological advice. Milestones are windows, not deadlines.";

function renderPage(entry, { draft }) {
  const rel = `library/entries/${entry.slug}.json`;
  const published = gitDate(rel, true);
  const modified = gitDate(rel, false);
  const url = `${ORIGIN}/answers/${entry.slug}.html`;
  const sources = sourcesFor(entry);
  const related = entry.related || {};
  const cls = related.class && CLASS_META[related.class];

  // The reading column, in order; each part gets an anchor and a line in the contents.
  const parts = [
    ...(entry.sections || []).map((s) => ({ h: s.h, html: `<p>${esc(s.body)}</p>` })),
    ...((entry.tryTonight || []).length
      ? [{ h: "Try this", html: `<ul>\n          ${entry.tryTonight.map((t) => `<li>${esc(t)}</li>`).join("\n          ")}\n        </ul>` }] : []),
    { h: "When to reach out", html: `<p>${esc(entry.whenToReachOut)}</p>` },
  ].map((p) => ({ ...p, id: anchor(p.h) }));

  const explore = [
    ...(related.articles || []).map((s) => `<li><a href="/articles/${s}">${esc(ARTICLE_TITLE[s] || s)}</a></li>`),
    ...(cls ? [`<li><a href="${cls.href}">The ${esc(cls.title)} class</a>${cls.tag === "Waitlist" ? " (waitlist open)" : ""}</li>`] : []),
    `<li><a href="/tools/growing-minds-ai?q=${encodeURIComponent(entry.question)}">Ask Growing Minds AI about this</a></li>`,
  ];

  const draftBanner = draft
    ? `\n        <div class="art-callout"><p><strong>Draft, pending review.</strong> Not indexed. Set <code>status</code> to <code>approved</code> in the source entry to publish.</p></div>\n` : "";
  const sourceList = sources.length ? `
        <div class="art-sources">
          <h2>Sources</h2>
          <ul>
            ${sources.map((s) => `<li><a href="${escAttr(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></li>`).join("\n            ")}
          </ul>
        </div>` : "";

  const body = `    <section class="art-title">
      <div class="hb-container art-title__grid">
        <div data-rise>
          <h1 class="hb-display">${esc(entry.question)}</h1>
          <p class="art-meta"><a href="/answers/">Answers</a>${DOT}${esc(entry.ageBand)}${DOT}${esc(entry.domain)}</p>
        </div>
        <aside class="art-short" aria-label="The short answer" data-rise style="--i:1">
          <h2>The short answer</h2>
          <p>${esc(entry.shortAnswer)}</p>
        </aside>
      </div>
    </section>

    <div class="hb-container art-body">
      <nav class="art-toc" aria-label="Answer navigation">
        <h2>In this answer</h2>
        <ol>
          ${parts.map((p) => `<li><a href="#${p.id}">${esc(p.h)}</a></li>`).join("\n          ")}
        </ol>
      </nav>
      <article class="art-text">${draftBanner}
        ${parts.map((p) => `<h2 id="${p.id}">${esc(p.h)}</h2>\n        ${p.html}`).join("\n\n        ")}

        <h2 id="keep-exploring">Keep exploring</h2>
        <ul>
          ${explore.join("\n          ")}
        </ul>
${sourceList}
        <p class="hub-title__fine">${NOTE}</p>
      </article>
    </div>`;

  return shell({
    title: entry.question,
    description: entry.shortAnswer,
    canonical: url,
    draft,
    body,
    extraHead: `  <script type="application/ld+json">\n${jsonLd(entry, url, published, modified)}\n  </script>`,
  });
}

function renderHub(entries, { draft }) {
  const byBand = {};
  for (const e of entries) (byBand[e.entry.ageBand] = byBand[e.entry.ageBand] || []).push(e);
  const bands = AGE_BANDS.filter((b) => byBand[b]).map((band, i) => {
    const rows = byBand[band].map(({ entry, draft: d }) => `          <article class="row" data-rise>
            <div><p class="row__meta" style="margin-top:0">${esc(entry.domain)}${d ? `${DOT}Draft` : ""}</p></div>
            <div><h3 class="row__name"><a href="/answers/${entry.slug}.html">${esc(entry.question)}</a></h3><p class="row__desc" style="margin-top:8px">${esc(entry.shortAnswer)}</p></div>
          </article>`).join("\n");
    return `      <div class="hub-split"${i ? ` style="margin-top:clamp(48px, 6vw, 88px)"` : ""}>
        <div class="hub-split__head" data-rise>
          <h2 class="hb-display">${esc(band)}</h2>
        </div>
        <div class="rows">
${rows}
        </div>
      </div>`;
  }).join("\n");

  const body = `    <section class="hb-container hub-title hub-title--solo" aria-labelledby="page-heading">
      <div class="hub-title__grid">
        <div data-rise>
          <h1 class="hb-display" id="page-heading">Plain answers to common worries</h1>
          <p class="hb-lead">Calm, research-grounded answers to the questions parents of children 0–5 actually search, grounded in the same developmental science behind our classes and tools.</p>
          <p class="hub-title__fine">${NOTE}</p>
        </div>
      </div>
    </section>

    <section class="hub-sec hub-sec--white" aria-label="Answers by age">
      <div class="hb-container">
${bands || `        <p>No published answers yet.</p>`}
      </div>
    </section>`;

  return shell({
    title: "Plain answers to common worries",
    description: "Calm, research-grounded answers to the questions parents of 0–5s actually search: talking, walking, tantrums, pointing, potty, screens, and more.",
    canonical: `${ORIGIN}/answers/`,
    draft,
    body,
  });
}

// ── main ─────────────────────────────────────────────────────────────────────
const files = readdirSync(ENTRIES_DIR).filter((f) => f.endsWith(".json"));
const graded = files.map((f) => {
  const entry = JSON.parse(readFileSync(join(ENTRIES_DIR, f), "utf8"));
  const grade = gradeEntry(entry, KID_SET);
  return { entry, grade, draft: entry.status !== "approved" };
});

console.log(`Library compile — ${graded.length} entries, mode: ${MODE}\n`);
let failed = 0;
for (const g of graded) {
  const tag = g.grade.ok ? "✓ green" : "✗ FAILED";
  if (!g.grade.ok) failed++;
  const status = g.draft ? "draft" : "approved";
  console.log(`  ${tag}  ${g.entry.slug.padEnd(42)} [${status}] FK=${g.grade.fk.toFixed(1)} ${g.grade.ok ? "" : JSON.stringify(g.grade.violations.map((v) => v.code))}`);
}

// CERT GATE: never emit an entry that isn't grader-green.
const publishable = graded.filter((g) => g.grade.ok);
if (failed) console.log(`\n⚠ ${failed} entr${failed === 1 ? "y" : "ies"} failed the grader and will NOT be emitted.`);

if (MODE === "report") {
  const approved = publishable.filter((g) => !g.draft).length;
  const drafts = publishable.filter((g) => g.draft).length;
  console.log(`\nWould publish: ${approved} approved, ${drafts} draft (green). Nothing written.`);
  console.log("Run with --preview to render drafts (noindex) or --publish to emit approved pages.");
  process.exit(failed ? 1 : 0);
}

const toRender = MODE === "publish" ? publishable.filter((g) => !g.draft) : publishable;
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
for (const g of toRender) {
  const draft = MODE === "preview" ? g.draft : false; // publish only ever renders approved
  writeFileSync(join(OUT_DIR, `${g.entry.slug}.html`), renderPage(g.entry, { draft }));
}
const hubDraft = MODE === "preview" && toRender.some((g) => g.draft);
writeFileSync(join(OUT_DIR, "index.html"), renderHub(toRender.map((g) => ({ entry: g.entry, draft: MODE === "preview" ? g.draft : false })), { draft: hubDraft }));

console.log(`\n✓ Wrote ${toRender.length} page(s) + hub → answers/  (${MODE === "preview" ? "drafts are noindex" : "approved, indexed"}).`);
if (MODE === "publish") {
  console.log("Reminder: add approved URLs to sitemap.xml and (optionally) a /answers/:slug* clean-URL rewrite in vercel.json.");
}
process.exit(failed ? 1 : 0);
