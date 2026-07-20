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
  "birth-to-12-months": { href: "/classes/birth-to-12-months.html", title: "Birth to 12 Months", tag: "Waitlist" },
  toddlerhood: { href: "/classes/toddlerhood.html", title: "Toddler Years", tag: "Available now" },
  preschool: { href: "/classes/preschool.html", title: "Preschool Years", tag: "Waitlist" },
  "family-systems": { href: "/classes/family-systems.html", title: "Family Systems & Stress", tag: "Waitlist" },
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
    publisher: { "@type": "Organization", name: "Growing Minds Science", url: ORIGIN, logo: { "@type": "ImageObject", url: `${ORIGIN}/assets/img/original-logo-mark-no-words-512.png` } },
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

function renderPage(entry, { draft }) {
  const rel = `library/entries/${entry.slug}.json`;
  const published = gitDate(rel, true);
  const modified = gitDate(rel, false);
  const url = `${ORIGIN}/answers/${entry.slug}.html`;
  const sources = sourcesFor(entry);
  const related = entry.related || {};
  const relArticles = (related.articles || [])
    .map((s) => `<a href="/articles/${s}">${esc(ARTICLE_TITLE[s] || s)}</a>`).join("");
  const cls = related.class && CLASS_META[related.class];

  const sections = (entry.sections || [])
    .map((s) => `<h2>${esc(s.h)}</h2><p>${esc(s.body)}</p>`).join("\n        ");
  const tryList = (entry.tryTonight || []).length
    ? `<div class="article-callout"><h2>Try this</h2><ul>${entry.tryTonight.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>` : "";
  const sourceList = sources.length
    ? `<div class="sources-panel"><h2>Sources</h2><ul>${sources.map((s) => `<li><a href="${escAttr(s.url)}" target="_blank" rel="noreferrer">${esc(s.label)}</a></li>`).join("")}</ul></div>` : "";
  const relatedBlock = (relArticles || cls) ? `
      <div class="article-cardlet">
        <h2>Keep exploring</h2>
        ${relArticles ? `<p>${relArticles}</p>` : ""}
        ${cls ? `<p><a href="${cls.href}">${esc(cls.title)}</a> — ${esc(cls.tag)}</p>` : ""}
        <p><a href="/tools/growing-minds-ai?q=${encodeURIComponent(entry.question)}">Ask Growing Minds AI about this →</a></p>
      </div>` : "";

  const robots = draft ? `\n  <meta name="robots" content="noindex, nofollow" />` : "";
  const draftBanner = draft ? `<div class="article-callout" style="border-color:var(--gold)"><p><strong>Draft — pending review.</strong> Not indexed. Flip <code>status</code> to <code>approved</code> in the source entry to publish.</p></div>` : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(entry.question)} - Growing Minds Science</title>
  <meta name="description" content="${escAttr(entry.shortAnswer)}" />
  <meta name="theme-color" content="#6F8F7B" />
  <meta name="color-scheme" content="light dark" />${robots}
  <link rel="icon" type="image/png" href="../assets/img/original-logo-mark-no-words-512.png" />
  <link rel="canonical" href="${ORIGIN}/answers/${entry.slug}.html" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escAttr(entry.question)}" />
  <meta property="og:description" content="${escAttr(entry.shortAnswer)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..600;1,8..60,400..600&display=swap" />
  <link rel="stylesheet" href="../assets/css/styles.css" />
  <link rel="stylesheet" href="../assets/css/refresh.css" />
  <script type="application/ld+json">
${jsonLd(entry, url, published, modified)}
  </script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header" role="banner">
    <div class="container site-header__inner">
      <a class="brand" href="/" aria-label="Growing Minds Science — home">
        <img class="brand__mark" src="../assets/img/original-logo-mark-no-words-512.png" alt="" width="36" height="36" decoding="async" />
        <span class="brand__name">Growing Minds Science</span>
      </a>
      <nav class="nav" aria-label="Primary">
        <ul class="nav__list">
          <li><a class="nav__link" href="/answers/">Answers</a></li>
          <li><a class="nav__link" href="/articles/">Articles</a></li>
          <li><a class="nav__link" href="/milestones">Milestones</a></li>
          <li><a class="nav__link" href="/tools/growing-minds-ai.html">Growing Minds AI</a></li>
        </ul>
      </nav>
    </div>
  </header>
  <main id="main">
    <section class="article-hero">
      <div class="container">
        <p class="article-kicker">${esc(entry.ageBand)} · ${esc(entry.domain)}</p>
        <h1 class="article-title">${esc(entry.question)}</h1>
        <p class="article-dek">${esc(entry.shortAnswer)}</p>
      </div>
    </section>
    <section class="article-body">
      <div class="container article-layout">
        <article>
        ${draftBanner}
        ${sections}
        ${tryList}
        <h2>When to reach out</h2>
        <p>${esc(entry.whenToReachOut)}</p>
        ${sourceList}
        </article>
        <aside>${relatedBlock}
          <p class="article-cardlet" style="margin-top:16px"><em>Educational content only. Not medical or psychological advice. Milestones are windows, not deadlines.</em></p>
        </aside>
      </div>
    </section>
  </main>
  <footer class="site-footer"><div class="container"><p>© 2026 Growing Minds Science · <a href="/answers/">All answers</a> · <a href="/about/">About</a></p></div></footer>
</body></html>
`;
}

function renderHub(entries, { draft }) {
  const byBand = {};
  for (const e of entries) (byBand[e.entry.ageBand] = byBand[e.entry.ageBand] || []).push(e);
  const groups = AGE_BANDS.filter((b) => byBand[b]).map((band) => {
    const items = byBand[band].map(({ entry, draft: d }) =>
      `<li><a href="/answers/${entry.slug}.html">${esc(entry.question)}</a>${d ? ' <span style="color:var(--gold);font-size:.72rem;font-weight:700">DRAFT</span>' : ""} <span style="color:var(--ink-muted);font-size:.82rem">· ${esc(entry.domain)}</span></li>`
    ).join("\n          ");
    return `<h2>${esc(band)}</h2>\n        <ul class="answers-list">\n          ${items}\n        </ul>`;
  }).join("\n        ");
  const robots = draft ? `\n  <meta name="robots" content="noindex, nofollow" />` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Answers — plain guidance for common worries - Growing Minds Science</title>
  <meta name="description" content="Calm, research-grounded answers to the questions parents of 0–5s actually search: talking, walking, tantrums, pointing, potty, screens, and more." />
  <meta name="theme-color" content="#6F8F7B" />
  <meta name="color-scheme" content="light dark" />${robots}
  <link rel="icon" type="image/png" href="../assets/img/original-logo-mark-no-words-512.png" />
  <link rel="canonical" href="${ORIGIN}/answers/" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..600;1,8..60,400..600&display=swap" />
  <link rel="stylesheet" href="../assets/css/styles.css" />
  <link rel="stylesheet" href="../assets/css/refresh.css" />
  <style>.answers-list{list-style:none;padding:0;margin:0 0 var(--space-8);display:grid;gap:var(--space-3)}.answers-list a{color:var(--primary);font-weight:600;text-decoration:none}.answers-list a:hover{text-decoration:underline}</style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header" role="banner">
    <div class="container site-header__inner">
      <a class="brand" href="/" aria-label="Growing Minds Science — home">
        <img class="brand__mark" src="../assets/img/original-logo-mark-no-words-512.png" alt="" width="36" height="36" decoding="async" />
        <span class="brand__name">Growing Minds Science</span>
      </a>
    </div>
  </header>
  <main id="main">
    <section class="article-hero"><div class="container">
      <p class="article-kicker">Answers</p>
      <h1 class="article-title">Plain answers to common worries</h1>
      <p class="article-dek">Calm, research-grounded answers to the questions parents of children 0–5 actually search — grounded in the same developmental science behind our classes and tools.</p>
    </div></section>
    <section class="article-body"><div class="container">
        ${groups || "<p>No published answers yet.</p>"}
    </div></section>
  </main>
  <footer class="site-footer"><div class="container"><p>© 2026 Growing Minds Science · <a href="/articles/">Articles</a> · <a href="/milestones">Milestones</a></p></div></footer>
</body></html>
`;
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
