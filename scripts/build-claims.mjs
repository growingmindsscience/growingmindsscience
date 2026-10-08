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
    .cl-badge { display: inline-flex; align-items: center; padding: .3rem .7rem; border-radius: 6px; font-family: var(--font-body); font-weight: 600; font-size: var(--text-xs); border: 1px solid var(--border); background: var(--surface); color: var(--ink-soft); }
    .cl-badge.badge--solid { background: var(--surface-2); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, transparent); }
    .cl-badge.badge--contra { background: #FBEBC8; color: #7F5008; border-color: color-mix(in srgb, #7F5008 30%, transparent); }
    [data-theme="dark"] .cl-badge.badge--contra { background: color-mix(in srgb, #F2A93B 18%, transparent); color: #F3B649; border-color: color-mix(in srgb, #F3B649 35%, transparent); }
    .cl-verdict { background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); padding: var(--space-6); margin: var(--space-6) 0; }
    .cl-verdict p { margin: 0; font-size: var(--text-lg); font-weight: 500; }
    .cl-summary { max-width: 46rem; color: var(--ink-soft); font-size: var(--text-md); line-height: 1.78; }
    .cl-sources { background: var(--bg-alt); border: 1px solid var(--border-soft); border-radius: var(--radius); padding: var(--space-5); margin: var(--space-7) 0; }
    .cl-sources h2 { font-size: var(--text-md); margin: 0 0 var(--space-3); }
    .cl-sources ul { margin: 0; padding-left: 1.15rem; display: grid; gap: .6rem; font-size: var(--text-sm); color: var(--ink-soft); }
    .cl-related { display: flex; flex-wrap: wrap; gap: var(--space-3); margin: var(--space-5) 0; }
    .cl-note { font-size: var(--text-xs); color: var(--ink-muted); max-width: 52rem; margin: var(--space-7) 0 0; }
    .cl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr)); gap: var(--space-5); margin-top: var(--space-6); }
    .cl-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: none; padding: var(--space-5); display: flex; flex-direction: column; gap: .6rem; }
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
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Besley:ital,wght@0,400..900;1,400..900&family=Atkinson+Hyperlegible+Next:ital,wght@0,400..800;1,400..800&display=swap" />
  <link rel="stylesheet" href="/assets/css/styles.css" />
  <link rel="stylesheet" href="/assets/css/refresh.css" />
  <link rel="stylesheet" href="/assets/css/tools.css" />
  <script>try{var t=localStorage.getItem('gms-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.setAttribute('data-theme','dark');}catch(e){}</script>
  <style>${SHARED_CSS}</style>
  <link rel="stylesheet" href="/assets/css/chrome.css" />
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
        <button class="nav-toggle" type="button" aria-controls="primary-nav-list" aria-expanded="false" aria-label="Open menu">
          <span class="nav-toggle__bars"><span></span></span>
        </button>

        <ul class="nav__list" id="primary-nav-list">
          <li><a class="nav__link" href="/classes/">Classes</a></li>
          <li class="nav__item">
            <details class="nav__details">
              <summary class="nav__link nav__summary is-current">Free tools <svg class="nav__chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg></summary>
              <div class="nav__menu">
                <ul class="nav__submenu">
                  <li><a class="nav__submenu-link" href="/tools/growing-minds-ai.html"><span class="nav__submenu-title">Growing Minds AI</span><span class="nav__submenu-desc">Ask a parenting question. Every answer shows its sources.</span></a></li>
                  <li><a class="nav__submenu-link" href="/nsc"><span class="nav__submenu-title">Number Path</span><span class="nav__submenu-desc">A ten-minute counting check-in you run at home.</span></a></li>
                  <li><a class="nav__submenu-link" href="/milestones"><span class="nav__submenu-title">Milestone tracker</span><span class="nav__submenu-desc">What&rsquo;s typical at each age, birth to three.</span></a></li>
                  <li><a class="nav__submenu-link" href="/tools/communication-snapshot.html"><span class="nav__submenu-title">Communication Snapshot</span><span class="nav__submenu-desc">Turn what you notice about talking into notes for a checkup.</span></a></li>
                  <li><a class="nav__submenu-link" href="/arcade/"><span class="nav__submenu-title">Arcade</span><span class="nav__submenu-desc">Silly games for a five-minute break between lessons.</span></a></li>
                </ul>
                <a class="nav__menu-all" href="/tools/">All free tools and guides <span aria-hidden="true">&rarr;</span></a>
              </div>
            </details>
          </li>
          <li><a class="nav__link" href="/articles/">Articles</a></li>
          <li><a class="nav__link" href="/about/">About</a></li>
          <li class="nav__auth" data-auth-nav><a class="nav__link" href="/nsc/login">Log in</a></li>
          <li class="nav__cta"><a class="btn btn--primary" href="/classes/">Browse the classes</a></li>
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
      <div class="site-footer__brand">
        <a class="brand" href="/" aria-label="Growing Minds Science — home">
          <img class="brand__mark" src="/assets/img/original-logo-mark-no-words-512.png" alt="" width="36" height="36" loading="lazy" decoding="async" />
          <span class="brand__name">Growing Minds Science</span>
        </a>
        <p class="site-footer__tag">A developmental-science education for parents of children 0 to 5.</p>
        <a class="footer-ig" href="https://www.instagram.com/growingmindsscience/" target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>
          Instagram
        </a>
      </div>
      <nav class="site-footer__nav" aria-label="Footer">
        <div>
          <h2 class="site-footer__heading">Classes</h2>
          <ul class="footer-list">
            <li><a href="/classes/toddlerhood.html">Toddler years</a></li>
            <li><a href="/classes/birth-to-12-months.html">Birth to 12 months</a></li>
            <li><a href="/classes/preschool.html">Preschool years</a></li>
            <li><a href="/classes/family-systems.html">Family systems</a></li>
            <li><a href="/pricing">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h2 class="site-footer__heading">Free tools</h2>
          <ul class="footer-list">
            <li><a href="/tools/growing-minds-ai.html">Growing Minds AI</a></li>
            <li><a href="/nsc">Number Path</a></li>
            <li><a href="/milestones">Milestone tracker</a></li>
            <li><a href="/tools/communication-snapshot.html">Communication Snapshot</a></li>
            <li><a href="/tools/">All tools and guides</a></li>
          </ul>
        </div>
        <div>
          <h2 class="site-footer__heading">About</h2>
          <ul class="footer-list">
            <li><a href="/about/">Our approach</a></li>
            <li><a href="/articles/">Articles</a></li>
            <li><a href="/faq/">FAQ</a></li>
            <li><a href="/contact/">Contact</a></li>
          </ul>
        </div>
      </nav>
    </div>
    <div class="container">
      <div class="footer-bottom">
        <p>&copy; <span data-year>2026</span> Growing Minds Science &middot; <a href="/arcade/">Arcade</a></p>
        <p>Educational content only. Not medical or psychological advice.</p>
      </div>
    </div>
  </footer>

  <script src="/assets/js/chrome.js"></script>

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
        <h2 class="u-visually-hidden">All claims</h2>
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
