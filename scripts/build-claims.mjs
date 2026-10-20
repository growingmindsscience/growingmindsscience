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

// Related pages by their own titles; anything unlisted falls back to its slug.
const TOOL_NAME = {
  "/milestones": "Milestone tracker",
  "/tools/whats-typical-by-stage": "What\u2019s typical, by stage",
  "/tools/routines-transitions-night-waking": "Routines, transitions, and night-waking",
  "/tools/communication-snapshot": "Communication Snapshot",
  "/tools/milestone-navigator": "Milestone Navigator",
  "/tools/screens-language-attention": "Screens, language, and attention",
  "/tools/beyond-less-is-better": "Beyond \u201cless is better\u201d",
  "/tools/right-now": "It\u2019s hard right now",
  "/tools/reading-prompt-cards": "Reading Prompt Cards",
  "/articles/serve-and-return": "What \u201cserve and return\u201d actually means",
};

// The strength label's colour: forest for evidence that holds, clay for a
// claim the evidence contradicts, muted for thin evidence.
const strengthClass = (s) => (s === "contradicted" ? "cl-grade--contra" : s === "strong" || s === "moderate" ? "cl-grade--solid" : "cl-grade--thin");

function shell({ title, description, canonicalPath, body, extraHead = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script>/* Enable motion only when it is welcome; otherwise content stays visible (no-JS & reduced-motion safe). */try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('anim');}catch(e){}
  /* Apply saved/system theme before paint (same key as chrome.js so the choice follows the visitor). */try{var t=localStorage.getItem('gms-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.setAttribute('data-theme','dark');}catch(e){}</script>
  <title>${esc(title)} | Growing Minds Science</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#F7F4EC" />
  <meta name="color-scheme" content="light dark" />

  <link rel="icon" href="/assets/img/brand/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/assets/img/brand/favicon-32.png" type="image/png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/assets/img/brand/apple-touch-icon-180.png" />
  <link rel="canonical" href="${ORIGIN}${canonicalPath}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(title)} | Growing Minds Science" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${ORIGIN}/assets/img/og/claims-library.png" />
  <meta name="twitter:card" content="summary_large_image" />
${extraHead}
  <link rel="preload" href="/assets/fonts/newsreader-v26-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/assets/fonts/inter-v20-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/assets/css/fonts.css?v=a9295d8c01" />
  <link rel="stylesheet" href="/assets/css/tokens-field-guide.css?v=303d86446c" />
  <link rel="stylesheet" href="/assets/css/field-guide.css?v=ececc69b57" />
  <link rel="stylesheet" href="/assets/css/fg-base.css?v=9ee704dd6a" />
  <link rel="stylesheet" href="/assets/css/hubs.css?v=ed7b49bfbe" />
  <link rel="stylesheet" href="/assets/css/claims.css?v=0c4b4ab099" />
  <link rel="stylesheet" href="/assets/css/chrome.css?v=a618e65a75" />
</head>
<body class="fg fg--page hub claims">
  <!-- header:start -->
<a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header" role="banner">
    <div class="container site-header__inner">
      <a class="brand" href="/" aria-label="Growing Minds Science, home">
        <svg class="brand__mark" viewBox="8 -6 96 96" width="32" height="32" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="11.0" stroke-linecap="round" stroke-linejoin="round"><path d="M16.00,88.00 L16.00,82.00 A44.00,44.00 0 0 1 50.85,38.96"/><path d="M39.00,91.00 L39.00,88.00 A27.00,27.00 0 0 1 66.00,61.00 L78.00,61.00"/></g><path class="brand__leaf" d="M49.35,39.96 C43.58,16.28 74.29,-4.99 95.31,1.39 C94.25,18.80 69.07,42.93 49.35,39.96 Z"/></svg>
        <span class="brand__name">growing minds</span><span class="brand__desc">Science</span>
      </a>

      <nav class="nav" aria-label="Primary">
        <button class="nav-toggle" type="button" aria-controls="primary-nav-list" aria-expanded="false" aria-label="Open menu">
          <span class="nav-toggle__bars"><span></span></span>
        </button>

        <ul class="nav__list" id="primary-nav-list">
          <li class="nav__now"><a class="nav__link" href="/tools/right-now">It&rsquo;s hard right now</a></li>
          <li><a class="nav__link" href="/explore/">Explore</a></li>
          <li><a class="nav__link" href="/classes/">Classes</a></li>
          <li class="nav__item">
            <details class="nav__details">
              <summary class="nav__link nav__summary">Tools <svg class="nav__chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg></summary>
              <div class="nav__menu">
                <ul class="nav__submenu">
                  <li><a class="nav__submenu-link" href="/tools/right-now"><span class="nav__submenu-title">It&rsquo;s hard right now</span><span class="nav__submenu-desc">A calm next step in two minutes.</span></a></li>
                  <li><a class="nav__submenu-link" href="/tools/growing-minds-ai"><span class="nav__submenu-title">Growing Minds AI</span><span class="nav__submenu-desc">Ask a parenting question. Every answer shows its sources.</span></a></li>
                  <li><a class="nav__submenu-link" href="/milestones"><span class="nav__submenu-title">Milestone tracker</span><span class="nav__submenu-desc">What&rsquo;s typical at each age, birth to three.</span></a></li>
                  <li><a class="nav__submenu-link" href="/tools/communication-snapshot"><span class="nav__submenu-title">Communication Snapshot</span><span class="nav__submenu-desc">Turn what you notice about talking into notes for a checkup.</span></a></li>
                  <li><a class="nav__submenu-link" href="/nsc"><span class="nav__submenu-title">Number Path</span><span class="nav__submenu-desc">A free ten-minute counting check-in.</span></a></li>
                </ul>
                <a class="nav__menu-all" href="/tools/">All free tools and guides <span aria-hidden="true">&rarr;</span></a>
              </div>
            </details>
          </li>
          <li><a class="nav__link" href="/articles/">Articles</a></li>
          <li><a class="nav__link" href="/about/">About</a></li>
          <li class="nav__item nav__auth"><a class="nav__link" href="/nsc/class-login">My classes</a></li>
          <li class="nav__cta"><a class="btn btn--primary" href="/classes/">Enroll, from $49</a></li>
        </ul>

        <button class="theme-toggle" type="button" aria-label="Toggle color theme" title="Toggle theme">
          <svg class="theme-toggle__moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg class="theme-toggle__sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>
        </button>
      </nav>
    </div>
  </header>

  <main id="main" tabindex="-1">
${body}
  </main>

  <!-- footer:start -->
  <footer class="site-footer" role="contentinfo">
    <div class="container site-footer__inner">
      <div class="site-footer__brand">
        <a class="brand" href="/" aria-label="Growing Minds Science, home">
          <svg class="brand__mark" viewBox="8 -6 96 96" width="32" height="32" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="11.0" stroke-linecap="round" stroke-linejoin="round"><path d="M16.00,88.00 L16.00,82.00 A44.00,44.00 0 0 1 50.85,38.96"/><path d="M39.00,91.00 L39.00,88.00 A27.00,27.00 0 0 1 66.00,61.00 L78.00,61.00"/></g><path class="brand__leaf" d="M49.35,39.96 C43.58,16.28 74.29,-4.99 95.31,1.39 C94.25,18.80 69.07,42.93 49.35,39.96 Z"/></svg>
          <span class="brand__name">growing minds</span><span class="brand__desc">Science</span>
        </a>
        <p class="site-footer__tag">A living field guide to the growing mind, for parents of children 0 to 5.</p>
      </div>
      <nav class="site-footer__nav" aria-label="Footer">
        <div>
          <h2 class="site-footer__heading">Classes</h2>
          <ul class="footer-list">
            <li><a href="/classes/birth-to-12-months">Birth to 12 months</a></li>
            <li><a href="/classes/toddlerhood">Toddler years</a></li>
            <li><a href="/classes/preschool">Preschool years</a></li>
            <li><a href="/classes/family-systems">Family systems</a></li>
            <li><a href="/pricing">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h2 class="site-footer__heading">Tools</h2>
          <ul class="footer-list">
            <li><a href="/tools/right-now">It&rsquo;s hard right now</a></li>
            <li><a href="/tools/growing-minds-ai">Growing Minds AI</a></li>
            <li><a href="/milestones">Milestone tracker</a></li>
            <li><a href="/tools/communication-snapshot">Communication Snapshot</a></li>
            <li><a href="/tools/">All tools and guides</a></li>
          </ul>
        </div>
        <div>
          <h2 class="site-footer__heading">About</h2>
          <ul class="footer-list">
            <li><a href="/about/">Our approach</a></li>
            <li><a href="/articles/">Articles</a></li>
            <li><a href="/faq/">FAQ</a></li>
            <li><a href="/programs/">For programs</a></li>
            <li><a href="/contact/">Contact</a></li>
          </ul>
        </div>
        <div>
          <h2 class="site-footer__heading">Elsewhere</h2>
          <ul class="footer-list">
            <li><a href="https://www.instagram.com/growingmindsscience/" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            <li><a href="/arcade/">Arcade</a></li>
          </ul>
        </div>
      </nav>
    </div>
    <div class="container site-footer__close">
      <p class="site-footer__wordmark" aria-hidden="true">growing minds <span class="site-footer__wordmark-desc">science</span></p>
      <div class="footer-bottom">
        <p>&copy; <span data-year>2026</span> Growing Minds Science</p>
        <p><a href="/privacy/">Privacy</a> &middot; <a href="/terms/">Terms of use</a> &middot; <a href="/terms-of-sale/">Terms of sale</a></p>
        <p>Educational content only. Not medical or psychological advice.</p>
      </div>
    </div>
  </footer>
<!-- footer:end -->

  <script src="/assets/js/chrome.js?v=288fec8e54"></script>

  <script src="/assets/js/main.js?v=3f7e70ab67" defer></script>
  <script src="/assets/js/home.js?v=c7f5c746df" defer></script>
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
    .map((t) => `<a class="hb-btn hb-btn--quiet" href="${esc(t)}">${esc(TOOL_NAME[t] || t.split("/").pop().replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()))}</a>`)
    .join("\n          ");
  const body = `    <section class="cl-title">
      <div class="hb-container cl-title__grid">
        <div data-rise>
          <h1 class="hb-display">&ldquo;${esc(c.claim_text)}&rdquo;</h1>
          <p class="cl-meta"><a href="/claims/">Claims</a> <span aria-hidden="true">&middot;</span> Evidence-graded claim <span aria-hidden="true">&middot;</span> ${esc(DOMAIN_LABEL[c.domain] || c.domain)} <span aria-hidden="true">&middot;</span> Reviewed ${esc(c.last_reviewed)}</p>
        </div>
        <aside class="cl-grade" data-rise style="--i:1">
          <p class="cl-grade__labels"><span class="${strengthClass(c.grade_strength)}">${esc(a.strength_labels[c.grade_strength])}</span> <span aria-hidden="true">&middot;</span> ${esc(a.consensus_labels[c.grade_consensus])}</p>
          <p class="cl-verdict">${esc(c.verdict_label)}</p>
        </aside>
      </div>
    </section>
    <section class="cl-body">
      <div class="hb-container cl-narrow">
        <p class="cl-summary">${esc(c.summary_public)}</p>
        <div class="cl-sources">
          <h2>Sources</h2>
          <ul>
${c.sources.map((s) => `            <li>${esc(s.citation)} <em>(${esc(s.role)})</em></li>`).join("\n")}
          </ul>
        </div>
        <div class="cl-related">
          <a class="hb-btn" href="/claims/">All graded claims</a>
          ${related}
        </div>
${METHOD_HTML}
        <p class="cl-note">This page summarizes published research for educational purposes. It is not medical advice, and it is not a recommendation for or against any practice for your specific child; those calls belong with you and your child's clinician.</p>
      </div>
    </section>`;
  return shell({
    title: `${c.claim_text.replace(/\.$/, "")} (graded)`,
    description: `${a.strength_labels[c.grade_strength]}, ${a.consensus_labels[c.grade_consensus].toLowerCase()}: ${c.verdict_label}`,
    canonicalPath: `/claims/${c.slug}`,
    extraHead: `  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n`,
    body,
  });
}

function hubPage() {
  const rows = a.claims.map((c) => `          <article class="cl-row">
            <div>
              <h3 class="cl-row__claim">&ldquo;${esc(c.claim_text)}&rdquo;</h3>
              <p class="cl-row__meta"><span class="${strengthClass(c.grade_strength)}">${esc(a.strength_labels[c.grade_strength])}</span> <span aria-hidden="true">&middot;</span> ${esc(DOMAIN_LABEL[c.domain] || c.domain)}</p>
            </div>
            <p class="cl-row__verdict">${esc(c.verdict_label)}</p>
            <p class="cl-row__go"><a href="/claims/${esc(c.slug)}">Read the grade</a></p>
          </article>`).join("\n");
  const body = `    <section class="hub-title hub-title--solo">
      <div class="hb-container hub-title__grid">
        <div data-rise>
          <h1 class="hb-display">Parenting claims, graded</h1>
          <p class="hb-lead">The internet states every parenting claim with the same confidence. The research does not. Each claim here is stated the way a parent would say it, then graded on two axes: how strong the evidence actually is, and how united the field actually is.</p>
          <p class="hub-title__fine">Free &middot; Evidence-graded &middot; ${a.claims.length} claims and growing</p>
        </div>
      </div>
    </section>
    <section class="cl-body cl-body--hub">
      <div class="hb-container">
        <h2 class="u-visually-hidden">All claims</h2>
        <div class="cl-rows">
${rows}
        </div>
        <div class="cl-narrow">
${METHOD_HTML}
          <p class="cl-note">Educational summaries of published research, not medical advice. Grades reflect the cited literature at the review date shown on each page.</p>
        </div>
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
