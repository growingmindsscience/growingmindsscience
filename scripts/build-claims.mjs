#!/usr/bin/env node
// Generates the Evidence-Graded Claims Library's static pages from the
// certified artifact (keel/artifacts/claims/claims.v1.json):
//   claims/index.html         the hub
//   claims/<slug>.html        one page per claim
// Deterministic: same artifact -> byte-identical pages, so CI can verify the
// committed pages match the artifact with --check.
//   node scripts/build-claims.mjs          # write pages
//   node scripts/build-claims.mjs --check  # exit 1 if committed pages drift

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://growingmindsscience.com";
const OUT = join(ROOT, "claims");
const CHECK = process.argv.includes("--check");

const a = JSON.parse(readFileSync(join(ROOT, "keel", "artifacts", "claims", "claims.v1.json"), "utf8"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const DOMAIN_LABEL = {
  sleep: "Sleep", feeding: "Feeding", screens: "Screens", discipline: "Discipline",
  language: "Language", milestones: "Milestones", pregnancy_postpartum: "Pregnancy & postpartum",
  products_gear: "Products & gear",
};

const strengthClass = (s) => (s === "contradicted" ? "badge--contra" : s === "strong" || s === "moderate" ? "badge--solid" : "badge--soft");

const SHARED_CSS = `
    .claim-hero { padding: clamp(3rem, 6vw, 4.5rem) 0 2rem; }
    .cl-badges { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0 0 var(--space-4); }
    .cl-badge { display: inline-flex; align-items: center; padding: .35rem .8rem; border-radius: 999px; font-family: var(--font-display); font-weight: 600; font-size: var(--text-xs); border: 1px solid var(--border); background: var(--surface); color: var(--ink-soft); }
    .cl-badge.badge--solid { background: var(--surface-2); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, transparent); }
    .cl-badge.badge--contra { background: #F8E7E0; color: #9C4429; border-color: color-mix(in srgb, #9C4429 30%, transparent); }
    [data-theme="dark"] .cl-badge.badge--contra { background: color-mix(in srgb, #DE7356 18%, transparent); color: #E78D6F; border-color: color-mix(in srgb, #E78D6F 35%, transparent); }
    .cl-verdict { background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); padding: var(--space-6); margin: var(--space-6) 0; }
    .cl-verdict p { margin: 0; font-size: var(--text-lg); font-weight: 500; }
    .cl-summary { max-width: 46rem; color: var(--ink-soft); font-size: var(--text-md); line-height: 1.78; }
    .cl-sources { background: var(--bg-alt); border: 1px solid var(--border-soft); border-radius: var(--radius); padding: var(--space-5); margin: var(--space-7) 0; }
    .cl-sources h2 { font-size: var(--text-md); margin: 0 0 var(--space-3); }
    .cl-sources ul { margin: 0; padding-left: 1.15rem; display: grid; gap: .6rem; font-size: var(--text-sm); color: var(--ink-soft); }
    .cl-related { display: flex; flex-wrap: wrap; gap: var(--space-3); margin: var(--space-5) 0; }
    .cl-note { font-size: var(--text-xs); color: var(--ink-muted); max-width: 52rem; margin: var(--space-7) 0 0; }
    .cl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr)); gap: var(--space-5); margin-top: var(--space-6); }
    .cl-card { background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius); box-shadow: var(--shadow-sm); padding: var(--space-5); display: flex; flex-direction: column; gap: .6rem; }
    .cl-card h3 { margin: 0; font-size: var(--text-md); line-height: 1.35; }
    .cl-card .cl-verdict-line { color: var(--ink-soft); font-size: var(--text-sm); margin: 0; line-height: 1.6; }
    .cl-card .cl-open { margin-top: auto; padding-top: .5rem; }
    .cl-method { background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); padding: var(--space-6); margin-top: var(--space-7); }
    .cl-method h2 { font-size: var(--text-lg); margin: 0 0 var(--space-3); }
    .cl-method p { color: var(--ink-soft); font-size: var(--text-sm); margin: 0 0 var(--space-3); max-width: 52rem; }
`;

function shell({ title, description, canonicalPath, body, extraHead = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} - Growing Minds Science</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#6F8F7B" />
  <meta name="color-scheme" content="light dark" />

  <link rel="icon" type="image/png" href="/assets/img/original-logo-mark-no-words-512.png" />
  <link rel="apple-touch-icon" href="/assets/img/original-logo-mark-no-words-512.png" />
  <link rel="canonical" href="${ORIGIN}${canonicalPath}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(title)} — Growing Minds Science" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${ORIGIN}/assets/img/og/claims-library.png" />
  <meta name="twitter:card" content="summary_large_image" />
${extraHead}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..600;1,8..60,400..600&display=swap" />
  <link rel="stylesheet" href="/assets/css/styles.css" />
  <link rel="stylesheet" href="/assets/css/refresh.css" />
  <link rel="stylesheet" href="/assets/css/tools.css" />
  <script>try{var t=localStorage.getItem('gms-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.setAttribute('data-theme','dark');}catch(e){}</script>
  <style>${SHARED_CSS}</style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header" role="banner">
    <div class="container site-header__inner">
      <a class="brand" href="/" aria-label="Growing Minds Science — home">
        <img class="brand__mark" src="/assets/img/original-logo-mark-no-words-512.png" alt="" width="36" height="36" decoding="async" />
        <span class="brand__name">Growing Minds Science</span>
      </a>
      <nav class="nav" aria-label="Primary">
        <button class="nav-toggle" type="button" aria-controls="primary-nav-list" aria-expanded="false" aria-label="Toggle navigation menu">
          <span class="nav-toggle__bars"><span></span></span>
        </button>
        <ul class="nav__list" id="primary-nav-list">
          <li><a class="nav__link" href="/classes/">Classes</a></li>
          <li><a class="nav__link" href="/nsc">Number Path</a></li>
          <li><a class="nav__link" href="/tools/">Tools</a></li>
          <li><a class="nav__link" href="/tools/growing-minds-ai.html">Growing Minds AI</a></li>
          <li><a class="nav__link" href="/articles/">Articles</a></li>
          <li><a class="nav__link" href="/about/">About</a></li>
          <li class="nav__cta"><a class="btn btn--primary" href="/classes/toddlerhood.html">Enroll now</a></li>
        </ul>
        <button class="theme-toggle" type="button" aria-label="Toggle color theme" title="Toggle theme">
          <svg class="theme-toggle__moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg class="theme-toggle__sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>
        </button>
      </nav>
    </div>
  </header>

  <main id="main">
${body}
  </main>

  <footer class="site-footer" role="contentinfo">
    <div class="container site-footer__inner">
      <div>
        <a class="brand" href="/" aria-label="Growing Minds Science — home">
          <img class="brand__mark" src="/assets/img/original-logo-mark-no-words-512.png" alt="" width="36" height="36" loading="lazy" decoding="async" />
          <span class="brand__name">Growing Minds Science</span>
        </a>
        <p style="margin-top: var(--space-4);">Developmental science, translated for parents.</p>
      </div>
      <div>
        <h4>Site</h4>
        <ul class="footer-list">
          <li><a href="/classes/">Classes</a></li>
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="/nsc">Number Path</a></li>
          <li><a href="/tools/">Free tools</a></li>
          <li><a href="/articles/">Articles</a></li>
          <li><a href="/about/">About</a></li>
          <li><a href="/faq/">FAQ</a></li>
          <li><a href="/milestones">Milestone tracker</a></li>
          <li><a href="/contact/">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4>Stay in the loop</h4>
        <p style="font-size: var(--text-sm);"><a href="/#signup">Join the waitlist</a></p>
        <p class="footer-elsewhere" style="margin-top: var(--space-5);">
          Also on
          <a href="https://www.instagram.com/growingmindsscience?igsh=NTc4MTIwNjQ2YQ%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer">Instagram</a>
        </p>
      </div>
    </div>
    <div class="container">
      <div class="footer-bottom">
        <span>&copy; <span data-year>2026</span> Growing Minds Science. All rights reserved.</span>
        <span>Educational content only. Not medical or psychological advice.</span>
      </div>
    </div>
  </footer>

  <script src="/assets/js/main.js" defer></script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}

const METHOD_HTML = `
        <div class="cl-method">
          <h2>How claims get graded</h2>
          <p>Every claim is graded on two independent axes. <strong>Evidence strength</strong> asks: how good is the research behind the claim as parents actually state it? Randomized trials and meta-analyses outrank single observational studies, which outrank expert opinion. <strong>Consensus</strong> asks a different question: where does the field actually sit? A claim can rest on limited evidence while researchers still broadly agree, and both facts belong on the label.</p>
          <p>Every empirical statement in a summary is tied to the sources listed on its page, and an automated check enforces the honesty rules: claims below strong evidence cannot use proof-language, and claims with limited or insufficient evidence must say so in plain words. The check runs on every update to this site; a summary that overclaims cannot ship.</p>
          <p>The grades are educational summaries of published research, not medical advice, and they can change; each page shows when it was last reviewed.</p>
        </div>`;

function claimPage(c) {
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.claim_text,
    description: c.verdict_label,
    inLanguage: "en",
    isAccessibleForFree: true,
    author: { "@type": "Person", name: "Matthew McArthur", jobTitle: "Child Development Specialist", url: `${ORIGIN}/about` },
    publisher: { "@type": "Organization", name: "Growing Minds Science", url: ORIGIN },
    mainEntityOfPage: `${ORIGIN}/claims/${c.slug}`,
  };
  const related = (c.related_tools || [])
    .map((t) => `<a class="btn btn--ghost" href="${esc(t)}">${esc(t.includes("milestones") ? "Milestone tracker" : t.split("/").pop().replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()))}</a>`)
    .join("\n            ");
  const body = `    <section class="claim-hero">
      <div class="container container--narrow">
        <p class="eyebrow">Evidence-graded claim · ${esc(DOMAIN_LABEL[c.domain] || c.domain)}</p>
        <h1 class="page-hero__title" style="max-width: 22ch;">&ldquo;${esc(c.claim_text)}&rdquo;</h1>
        <div class="cl-badges" style="margin-top: var(--space-5);">
          <span class="cl-badge ${strengthClass(c.grade_strength)}">${esc(a.strength_labels[c.grade_strength])}</span>
          <span class="cl-badge">${esc(a.consensus_labels[c.grade_consensus])}</span>
          <span class="cl-badge">Reviewed ${esc(c.last_reviewed)}</span>
        </div>
        <div class="cl-verdict"><p>${esc(c.verdict_label)}</p></div>
        <p class="cl-summary">${esc(c.summary_public)}</p>
        <div class="cl-sources">
          <h2>Sources</h2>
          <ul>
${c.sources.map((s) => `            <li>${esc(s.citation)} <em>(${esc(s.role)})</em></li>`).join("\n")}
          </ul>
        </div>
        <div class="cl-related">
          <a class="btn btn--primary" href="/claims/">All graded claims</a>
            ${related}
        </div>
${METHOD_HTML}
        <p class="cl-note">This page summarizes published research for educational purposes. It is not medical advice, and it is not a recommendation for or against any practice for your specific child; those calls belong with you and your child's clinician.</p>
      </div>
    </section>`;
  return shell({
    title: `${c.claim_text.replace(/\.$/, "")} — graded`,
    description: `${a.strength_labels[c.grade_strength]}, ${a.consensus_labels[c.grade_consensus].toLowerCase()}: ${c.verdict_label}`,
    canonicalPath: `/claims/${c.slug}`,
    extraHead: `  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n`,
    body,
  });
}

function hubPage() {
  const cards = a.claims.map((c) => `          <article class="cl-card">
            <div class="cl-badges" style="margin:0;">
              <span class="cl-badge ${strengthClass(c.grade_strength)}">${esc(a.strength_labels[c.grade_strength])}</span>
              <span class="cl-badge">${esc(DOMAIN_LABEL[c.domain] || c.domain)}</span>
            </div>
            <h3>&ldquo;${esc(c.claim_text)}&rdquo;</h3>
            <p class="cl-verdict-line">${esc(c.verdict_label)}</p>
            <p class="cl-open"><a class="btn btn--primary" href="/claims/${esc(c.slug)}">Read the grade</a></p>
          </article>`).join("\n");
  const body = `    <section class="claim-hero">
      <div class="container">
        <p class="eyebrow">Free · Evidence-graded · ${a.claims.length} claims and growing</p>
        <h1 class="page-hero__title">Parenting claims, graded</h1>
        <p class="tool-lede" style="font-size: var(--text-md); color: var(--ink-soft); max-width: 46rem; margin: var(--space-4) 0 0;">The internet states every parenting claim with the same confidence. The research does not. Each claim here is stated the way a parent would say it, then graded on two axes: how strong the evidence actually is, and how united the field actually is.</p>
        <div class="cl-grid">
${cards}
        </div>
${METHOD_HTML}
        <p class="cl-note">Educational summaries of published research, not medical advice. Grades reflect the cited literature at the review date shown on each page.</p>
      </div>
    </section>`;
  return shell({
    title: "Evidence-Graded Claims Library",
    description: "Parenting claims stated the way parents say them, graded on evidence strength and scientific consensus, with sources on every page.",
    canonicalPath: "/claims/",
    body,
  });
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const files = [["index.html", hubPage()], ...a.claims.map((c) => [`${c.slug}.html`, claimPage(c)])];
let drift = 0;
for (const [name, html] of files) {
  const path = join(OUT, name);
  if (CHECK) {
    const current = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (current !== html) { console.error(`✗ drift: claims/${name}`); drift++; }
  } else {
    writeFileSync(path, html);
    console.log(`  ✓ claims/${name}`);
  }
}
if (CHECK) {
  console.log(drift ? `FAILED (${drift} drifted)` : `✓ claims pages match the artifact (${files.length} files)`);
  process.exit(drift ? 1 : 0);
}
console.log(`\nClaims pages: ${files.length} written from artifact v${a.version}.`);
