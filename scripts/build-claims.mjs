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
import { SITE_ORIGIN, INSTAGRAM_URL, esc, txt } from "./site.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = SITE_ORIGIN;
const OUT = join(ROOT, "claims");
const CHECK = process.argv.includes("--check");

const a = JSON.parse(readFileSync(join(ROOT, "keel", "artifacts", "claims", "claims.v1.json"), "utf8"));
// Explore's map of the site: which ages and topics each claim belongs to, the five periods, and
// the class for each period. Read-only here; it gives each claim page its next steps.
const explore = JSON.parse(readFileSync(join(ROOT, "assets", "data", "explore.json"), "utf8"));

// esc() and txt() (escape, then typographic quotes for visible text) come from site.mjs, shared
// with build-explore.mjs.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : iso;
};

// The summary as paragraphs, losslessly: split at sentence ends, open with the first sentence as
// the lead, group the rest into paragraphs of about 75 words, start a new paragraph at the pivots
// the summaries share ("What the evidence does not support...", "The practical read..."), and fold
// a short tail into the paragraph before it. If re-joining the sentences does not give back the
// original byte for byte, the summary renders as one paragraph, as before.
const PIVOT = /^(What the|The practical|The pragmatic|The evidence-based rule)/;
function paragraphs(summary) {
  const sentences = summary.split(/(?<=[.!?])\s+(?=[A-Z'‘“(])/);
  if (sentences.join(" ") !== summary || sentences.length < 3) return [summary];
  const words = (s) => s.split(/\s+/).length;
  const [lead, ...rest] = sentences;
  const out = [];
  let cur = [];
  for (const s of rest) {
    const n = cur.reduce((t, x) => t + words(x), 0);
    if (cur.length && (n + words(s) > 75 || (PIVOT.test(s) && n >= 25))) { out.push(cur); cur = []; }
    cur.push(s);
  }
  if (cur.length) out.push(cur);
  // A short paragraph that is not a pivot joins the one before it, unless that makes a long one.
  const len = (p) => p.reduce((t, x) => t + words(x), 0);
  for (let i = out.length - 1; i > 0; i--) {
    if (len(out[i]) < 30 && !PIVOT.test(out[i][0]) && len(out[i - 1]) + len(out[i]) <= 95) out[i - 1].push(...out.splice(i, 1)[0]);
  }
  const paras = [lead, ...out.map((p) => p.join(" "))];
  if (paras.join(" ") !== summary) return [summary];
  return paras;
}

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

// One line for each related page, reused from the tools hub, the articles hub and the header menu
// (no new copy). A page without a line still renders, with its name and type.
const TOOL_LINE = {
  "/milestones": "What’s typical at each age, birth to three.",
  "/tools/communication-snapshot": "A few careful questions about words, gestures and understanding, and printable notes if a pediatrician conversation is worth having.",
  "/tools/screens-language-attention": "How different kinds of screen use interact with language and attention in the early years.",
  "/tools/beyond-less-is-better": "Context, content, and the difference between background TV and shared viewing.",
  "/tools/reading-prompt-cards": "Turn any children’s book into a back-and-forth with dialogic reading, an evidence-backed method. Printable as a deck.",
  "/tools/right-now": "A calm next step in two minutes.",
  "/tools/whats-typical-by-stage": "Sleep across the first year: what’s typical, what varies, and what the research can and can’t tell us.",
  "/tools/routines-transitions-night-waking": "Why toddler sleep changes, what routines help, and how to read night-waking without panic.",
  "/articles/serve-and-return": "A child reaches out and an adult answers what they reached for. Powerful, and not a demand to narrate every minute of the day.",
};

// Related pages the certified artifact lists but this generator leaves off, at render time only
// (claims.v1.json is untouched; the owner revises related_tools in the next artifact version):
// - any page that is noindex, i.e. not launched (today the Milestone Navigator, which waits on
//   attorney review, keel/DECISIONS.md D3); it returns by itself when its noindex is removed;
// - "It's hard right now" on the fever and feeding claims: its situations are meltdowns, limits,
//   sleep, patience and repair, so it is not a next step for either.
const OFF_TOPIC = { "teething-fever": ["/tools/right-now"], "baby-led-weaning": ["/tools/right-now"] };
function pageFile(href) {
  const p = href.replace(/^\//, "").replace(/\/$/, "/index");
  return join(ROOT, p.endsWith(".html") ? p : `${p}.html`);
}
function launched(href) {
  const file = pageFile(href);
  if (!existsSync(file)) return false;
  return !/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(readFileSync(file, "utf8"));
}
const relatedTools = (c) => (c.related_tools || []).filter((t) => !(OFF_TOPIC[c.slug] || []).includes(t) && launched(t));

// Explore's records, by href.
const EXPLORE_ITEM = Object.fromEntries(explore.items.map((i) => [i.href, i]));
const STAGE = Object.fromEntries(explore.stages.map((s) => [s.id, s]));
const claimItem = (c) => EXPLORE_ITEM[`/claims/${c.slug}`] || { ages: [], topics: [] };

// The ink close band on a claim page offers the class for the claim's first age. Statements and
// lines are the site's own, from the close bands of the guides that point at the same class.
const CLASS_CLOSE = {
  "/classes/birth-to-12-months": {
    h: "The whole first year, explained.",
    p: "Birth to 12 months covers what changes across the first year and why, with a full lesson on sleep across the year.",
    btn: "See the Birth to 12 months class",
  },
  "/classes/toddlerhood": {
    h: "Want the bigger picture of early development?",
    p: "The toddler class covers language, attention, big feelings, and what actually shapes the first three years.",
    btn: "See the toddler class",
  },
  "/classes/preschool": {
    h: "Want the bigger picture of the preschool years?",
    p: "The preschool class covers self-regulation, play, friendship, and what kindergarten readiness actually means.",
    btn: "See the preschool class",
  },
};

// Graded claims that belong with this one: a shared Explore topic first, then the same domain,
// then a shared age; ties keep the artifact's order.
function relatedClaims(c, n) {
  const me = claimItem(c);
  const score = (o) => {
    const it = claimItem(o);
    const topics = it.topics.filter((t) => me.topics.includes(t)).length;
    const ages = it.ages.filter((x) => me.ages.includes(x)).length;
    return topics * 100 + (o.domain === c.domain ? 10 : 0) + (ages ? 1 : 0);
  };
  return a.claims
    .filter((o) => o.slug !== c.slug)
    .map((o, i) => ({ o, s: score(o), i }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .slice(0, n)
    .map((x) => x.o);
}

// The grade as a figure: two scales in the age-line / range-bar vocabulary (8px track, 4px
// corners, the claim's step filled in ink like the current period on the age line). Strength
// reads from evidence against, set apart by a gap, to strong evidence; consensus from a fringe
// position to scientific consensus. Every word is the artifact's own label.
const STRENGTH_SCALE = ["contradicted", "insufficient", "limited", "moderate", "strong"];
const CONSENSUS_SCALE = ["fringe", "divided", "majority", "consensus"];
function scale(axis, steps, labels, current) {
  const at = steps.indexOf(current);
  const first = labels[steps[0]], last = labels[steps[steps.length - 1]];
  const segs = steps.map((s) => `<span class="cl-scale__seg${s === current ? " is-on" : ""}"></span>`).join("");
  return `            <div class="cl-scale cl-scale--${steps.length}">
              <p class="cl-scale__head"><span class="cl-scale__axis">${axis}</span> <b class="cl-scale__val">${esc(labels[current])}</b></p>
              <div class="cl-scale__bar" role="img" aria-label="Step ${at + 1} of ${steps.length}, on a scale from ${esc(first)} to ${esc(last)}">${segs}</div>
              <p class="cl-scale__ends" aria-hidden="true"><span>${esc(first)}</span><span>${esc(last)}</span></p>
            </div>`;
}

// The hub's key to both scales: every step named, none filled.
function key(axis, steps, labels) {
  return `            <div class="cl-key__axis cl-key__axis--${steps.length}">
              <p class="cl-key__name">${axis}</p>
              <ol class="cl-key__steps">
${steps.map((s) => `                <li><span class="cl-key__seg" aria-hidden="true"></span><span class="cl-key__label">${esc(labels[s])}</span></li>`).join("\n")}
              </ol>
            </div>`;
}

const typeLabel = (href) => explore.types[(EXPLORE_ITEM[href] || {}).type] || (href.startsWith("/articles/") ? "Article" : "Tool");
const nextRow = (href, name, line, meta) => `          <li class="hb-next__row">
            <a class="hb-next__name" href="${esc(href)}">${name}</a>
${line ? `            <p class="hb-next__line">${line}</p>\n` : ""}            <p class="hb-next__meta">${meta}</p>
          </li>`;

function shell({ title, description, canonicalPath, body, extraHead = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script>/* Enable motion only when it is welcome; otherwise content stays visible (no-JS & reduced-motion safe). */try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('anim');}catch(e){}
  /* Apply saved/system theme before paint (same key as chrome.js so the choice follows the visitor). */try{var t=localStorage.getItem('gms-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.setAttribute('data-theme','dark');}catch(e){}</script>
  <title>${esc(title)} | From Little Onward</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#F8F9FB" />
  <meta name="color-scheme" content="light dark" />

  <link rel="icon" href="/assets/img/brand/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/assets/img/brand/favicon-32.png" type="image/png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/assets/img/brand/apple-touch-icon-180.png" />
  <link rel="canonical" href="${ORIGIN}${canonicalPath}" />

  <meta property="og:type" content="article" />
  <meta property="og:url" content="${ORIGIN}${canonicalPath}" />
  <meta property="og:title" content="${esc(title)} | From Little Onward" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${ORIGIN}/assets/img/og/claims-library.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${ORIGIN}/assets/img/og/claims-library.png" />
${extraHead}
  <link rel="preload" href="/assets/fonts/newsreader-v26-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/assets/fonts/inter-v20-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/assets/css/fonts.css?v=a9295d8c01" />
  <link rel="stylesheet" href="/assets/css/tokens-field-guide.css?v=a516f3fb0d" />
  <link rel="stylesheet" href="/assets/css/field-guide.css?v=27d30a5c46" />
  <link rel="stylesheet" href="/assets/css/fg-base.css?v=78accdba72" />
  <link rel="stylesheet" href="/assets/css/hubs.css?v=36987dd3b5" />
  <link rel="stylesheet" href="/assets/css/claims.css?v=bd1b0cb640" />
  <link rel="stylesheet" href="/assets/css/chrome.css?v=eacaf2a72e" />
</head>
<body class="fg fg--page hub claims">
  <!-- header:start -->
<a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header" role="banner">
    <div class="container site-header__inner">
      <a class="brand" href="/" aria-label="From Little Onward, home">
        <svg class="brand__mark" viewBox="8 -6 96 96" width="32" height="32" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="11.0" stroke-linecap="round" stroke-linejoin="round"><path d="M16.00,88.00 L16.00,82.00 A44.00,44.00 0 0 1 50.85,38.96"/><path d="M39.00,91.00 L39.00,88.00 A27.00,27.00 0 0 1 66.00,61.00 L78.00,61.00"/></g><path class="brand__leaf" d="M49.35,39.96 C43.58,16.28 74.29,-4.99 95.31,1.39 C94.25,18.80 69.07,42.93 49.35,39.96 Z"/></svg>
        <span class="brand__name">from little</span><span class="brand__desc">Onward</span>
      </a>

      <nav class="nav" aria-label="Primary">
        <button class="nav-toggle" type="button" aria-controls="primary-nav-list" aria-expanded="false" aria-label="Open menu">
          <span class="nav-toggle__bars"><span></span></span>
        </button>

        <ul class="nav__list" id="primary-nav-list">
          <li class="nav__now"><a class="nav__link" href="/tools/right-now">It&rsquo;s hard right now</a></li>
          <li><a class="nav__link" href="/classes/">Classes</a></li>
          <li class="nav__item">
            <details class="nav__details">
              <summary class="nav__link nav__summary">Tools <svg class="nav__chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg></summary>
              <div class="nav__menu">
                <ul class="nav__submenu">
                  <li><a class="nav__submenu-link" href="/tools/ask-the-research"><span class="nav__submenu-title">Ask the research</span><span class="nav__submenu-desc">A calm, research-grounded answer to a parenting question.</span></a></li>
                  <li><a class="nav__submenu-link" href="/milestones"><span class="nav__submenu-title">Milestone tracker</span><span class="nav__submenu-desc">What&rsquo;s typical at each age, birth to three.</span></a></li>
                  <li><a class="nav__submenu-link" href="/tools/communication-snapshot"><span class="nav__submenu-title">Communication Snapshot</span><span class="nav__submenu-desc">Turn what you notice about talking into notes for a checkup.</span></a></li>
                  <li><a class="nav__submenu-link" href="/nsc"><span class="nav__submenu-title">Tallykin</span><span class="nav__submenu-desc">A free ten-minute counting check-in.</span></a></li>
                  <li><a class="nav__submenu-link" href="/explore/"><span class="nav__submenu-title">Explore by age</span><span class="nav__submenu-desc">Guides, tools and articles for each age, birth to five.</span></a></li>
                  <li><a class="nav__submenu-link" href="/articles/"><span class="nav__submenu-title">Articles</span><span class="nav__submenu-desc">Developmental science in plain language.</span></a></li>
                </ul>
                <a class="nav__menu-all" href="/tools/">All free tools and guides <span aria-hidden="true">&rarr;</span></a>
              </div>
            </details>
          </li>
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
        <a class="brand" href="/" aria-label="From Little Onward, home">
          <svg class="brand__mark" viewBox="8 -6 96 96" width="32" height="32" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="11.0" stroke-linecap="round" stroke-linejoin="round"><path d="M16.00,88.00 L16.00,82.00 A44.00,44.00 0 0 1 50.85,38.96"/><path d="M39.00,91.00 L39.00,88.00 A27.00,27.00 0 0 1 66.00,61.00 L78.00,61.00"/></g><path class="brand__leaf" d="M49.35,39.96 C43.58,16.28 74.29,-4.99 95.31,1.39 C94.25,18.80 69.07,42.93 49.35,39.96 Z"/></svg>
          <span class="brand__name">from little</span><span class="brand__desc">Onward</span>
        </a>
        <p class="site-footer__line">Every grown-up starts little.</p>
        <p class="site-footer__tag">Science-backed parent education, open to any parent who seeks it.</p>
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
            <li><a href="/tools/ask-the-research">Ask the research</a></li>
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
            <li><a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            <li><a href="/arcade/">Arcade</a></li>
          </ul>
        </div>
      </nav>
    </div>
    <div class="container site-footer__close">
      <p class="site-footer__wordmark" aria-hidden="true">from little <span class="site-footer__wordmark-desc">onward</span></p>
      <div class="footer-bottom">
        <p>&copy; <span data-year>2026</span> From Little Onward</p><!-- TODO legal: confirm entity name and structure with attorney -->
        <p><a href="/privacy/">Privacy</a> &middot; <a href="/terms/">Terms of use</a> &middot; <a href="/terms-of-sale/">Terms of sale</a></p>
        <p>Educational content only. Not medical or psychological advice.</p>
      </div>
    </div>
  </footer>
<!-- footer:end -->

  <script src="/assets/js/chrome.js?v=072b6d90d4"></script>

  <script src="/assets/js/main.js?v=b5c8e48c2d" defer></script>
  <script src="/assets/js/home.js?v=53f9d7b185" defer></script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}

// The method, said once. The hub sets it open beside the key to both scales; a claim page folds
// it into a closed question, since the scales in its grade panel already carry the legend.
const METHOD_P = [
  `Every claim is graded on two independent axes. <strong>Evidence strength</strong> asks: how good is the research behind the claim as parents actually state it? Randomized trials and meta-analyses outrank single observational studies, which outrank expert opinion. <strong>Consensus</strong> asks a different question: where does the field actually sit? A claim can rest on limited evidence while researchers still broadly agree, and both facts belong on the label.`,
  `Every empirical statement in a summary is tied to the sources listed on its page, and an automated check enforces the honesty rules: claims below strong evidence cannot use proof-language, and claims with limited or insufficient evidence must say so in plain words. The check runs on every update to this site; a summary that overclaims cannot ship.`,
  `The grades are educational summaries of published research, not medical advice, and they can change; each page shows when it was last reviewed.`,
];
const METHOD_TITLE = "How claims get graded";

function claimPage(c) {
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.claim_text,
    description: c.verdict_label,
    inLanguage: "en",
    isAccessibleForFree: true,
    author: { "@type": "Person", name: "Matthew McArthur", jobTitle: "Child Development Specialist", url: `${ORIGIN}/about` },
    publisher: { "@type": "Organization", name: "From Little Onward", url: ORIGIN },
    mainEntityOfPage: `${ORIGIN}/claims/${c.slug}`,
  };
  const item = claimItem(c);
  const firstAge = STAGE[item.ages[0]];

  // Keep going: the practice tools the artifact names (launched and on topic), then graded claims
  // that belong with this one, then the claim's first period on Explore. Four rows at most.
  const tools = relatedTools(c).slice(0, 2);
  const claims = relatedClaims(c, Math.max(1, 3 - tools.length));
  const rows = [
    ...tools.map((t) => nextRow(t, txt(TOOL_NAME[t] || t.split("/").pop().replace(/-/g, " ")), TOOL_LINE[t] ? txt(TOOL_LINE[t]) : "", esc(typeLabel(t)))),
    ...claims.map((o) => nextRow(`/claims/${o.slug}`, `&ldquo;${txt(o.claim_text)}&rdquo;`, txt(o.verdict_label), `Graded claim &middot; ${esc(a.strength_labels[o.grade_strength])}`)),
    ...(firstAge ? [nextRow(`/explore/${firstAge.slug}`, `${esc(firstAge.years)}: ${txt(firstAge.name)}`, txt(firstAge.summary), "Explore by age")] : []),
  ];

  const close = CLASS_CLOSE[firstAge && firstAge.class];
  const paras = paragraphs(c.summary_public);
  const ask = `/tools/ask-the-research?q=${encodeURIComponent(c.claim_text)}`;
  const n = c.sources.length;

  const body = `    <section class="cl-title">
      <div class="hb-container cl-title__grid">
        <div data-rise>
          <h1 class="hb-display">&ldquo;${txt(c.claim_text)}&rdquo;</h1>
          <p class="cl-meta"><a href="/claims/">Claims</a> <span aria-hidden="true">&middot;</span> Evidence-graded claim <span aria-hidden="true">&middot;</span> ${esc(DOMAIN_LABEL[c.domain] || c.domain)} <span aria-hidden="true">&middot;</span> Reviewed <time datetime="${esc(c.last_reviewed)}">${esc(longDate(c.last_reviewed))}</time></p>
        </div>
        <aside class="cl-grade" aria-label="The grade" data-rise style="--i:1">
          <p class="cl-verdict">${txt(c.verdict_label)}</p>
          <div class="cl-scales">
${scale("Evidence strength", STRENGTH_SCALE, a.strength_labels, c.grade_strength)}
${scale("Consensus", CONSENSUS_SCALE, a.consensus_labels, c.grade_consensus)}
          </div>
          <p class="cl-grade__src"><a href="#sources">${n} source${n === 1 ? "" : "s"}</a></p>
        </aside>
      </div>
    </section>
    <section class="cl-body">
      <div class="hb-container cl-narrow">
        <div class="cl-text">
${paras.map((p, i) => `          <p class="cl-summary${i === 0 && paras.length > 1 ? " cl-summary--lead" : ""}">${txt(p)}</p>`).join("\n")}
        </div>
        <div class="hb-actions cl-ask">
          <a class="hb-btn" href="${esc(ask)}">Ask about this</a>
          <a class="hb-btn hb-btn--quiet" href="/claims/">All graded claims</a>
        </div>
        <section class="cl-sources" id="sources" aria-labelledby="sources-h">
          <h2 id="sources-h">Sources</h2>
          <ol>
${c.sources.map((s) => `            <li><p class="cl-src__role">${txt(s.role)}</p><p class="cl-src__cite">${txt(s.citation)}</p></li>`).join("\n")}
          </ol>
        </section>
        <div class="qa cl-method-q">
          <details id="how-claims-get-graded">
            <summary>${METHOD_TITLE}</summary>
${METHOD_P.map((p) => `            <p>${p}</p>`).join("\n")}
          </details>
        </div>
        <p class="cl-note">This page summarizes published research for educational purposes. It is not medical advice, and it is not a recommendation for or against any practice for your specific child; those calls belong with you and your child&rsquo;s clinician.</p>
      </div>
    </section>
    <section class="hb-section--tight cl-next" aria-labelledby="next-h">
      <div class="hb-container">
        <div class="hb-next hb-next--split" data-rise>
          <h2 class="hb-next__title" id="next-h">Keep going</h2>
          <ul class="hb-next__list">
${rows.join("\n")}
          </ul>
        </div>
      </div>
    </section>${close ? `
    <section class="hub-sec hub-close" aria-labelledby="close-heading">
      <div class="hb-container">
        <div data-rise>
          <h2 class="hb-display" id="close-heading">${close.h}</h2>
          <p>${close.p}</p>
        </div>
        <div class="hub-close__act" data-rise style="--i:1">
          <a class="hb-btn hb-btn--paper" href="${esc(firstAge.class)}">${close.btn}</a>
        </div>
      </div>
    </section>` : ""}`;
  return shell({
    title: `${c.claim_text.replace(/\.$/, "")} (graded)`,
    description: `${a.strength_labels[c.grade_strength]}, ${a.consensus_labels[c.grade_consensus].toLowerCase()}: ${c.verdict_label}`,
    canonicalPath: `/claims/${c.slug}`,
    extraHead: `  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n`,
    body,
  });
}

function hubPage() {
  // The claims sorted for the reader: what holds up first, what the evidence contradicts last.
  const order = [...STRENGTH_SCALE].reverse().filter((s) => a.claims.some((c) => c.grade_strength === s));
  const count = (s) => a.claims.filter((c) => c.grade_strength === s).length;
  const plural = (k) => `${k} claim${k === 1 ? "" : "s"}`;
  const groups = order.map((s) => {
    const rows = a.claims.filter((c) => c.grade_strength === s).map((c) => `            <div class="row row--link">
              <div>
                <h3 class="row__name"><a href="/claims/${esc(c.slug)}">&ldquo;${txt(c.claim_text)}&rdquo;</a></h3>
                <p class="row__meta">${esc(a.consensus_labels[c.grade_consensus])} <span aria-hidden="true">&middot;</span> ${esc(DOMAIN_LABEL[c.domain] || c.domain)}</p>
              </div>
              <p class="row__desc">${txt(c.verdict_label)}</p>
            </div>`).join("\n");
    return `        <section class="cl-group" id="${s}" aria-labelledby="${s}-h">
          <div class="cl-group__head" data-rise>
            <h2 id="${s}-h">${esc(a.strength_labels[s])}</h2>
            <p class="cl-group__meta">${plural(count(s))}</p>
          </div>
          <div class="rows" data-rise style="--i:1">
${rows}
          </div>
        </section>`;
  }).join("\n");
  const glance = order.map((s) => `            <li><a href="#${s}"><span class="cl-glance__name">${esc(a.strength_labels[s])}</span> <span class="cl-glance__n">${count(s)}</span></a></li>`).join("\n");

  const body = `    <section class="hub-title">
      <div class="hb-container hub-title__grid">
        <div data-rise>
          <h1 class="hb-display">Parenting claims, graded</h1>
          <p class="hb-lead"><b>Clear about what&rsquo;s known. Honest about what&rsquo;s not.</b> The internet states every parenting claim with the same confidence. The research does not. Each claim here is stated the way a parent would say it, then graded on two axes: how strong the evidence actually is, and how united the field actually is.</p>
          <p class="hub-title__fine">Free &middot; Evidence-graded &middot; ${a.claims.length} claims and growing</p>
        </div>
        <nav class="cl-glance" aria-labelledby="glance-h" data-rise style="--i:1">
          <h2 class="cl-glance__title" id="glance-h">By evidence strength</h2>
          <ol class="cl-glance__list">
${glance}
          </ol>
          <p class="cl-glance__more"><a href="#${METHOD_TITLE.toLowerCase().replace(/\s+/g, "-")}">${METHOD_TITLE}</a></p>
        </nav>
      </div>
    </section>
    <div class="cl-body cl-body--hub">
      <div class="hb-container">
${groups}
      </div>
    </div>
    <section class="hub-sec hub-sec--mist cl-method-sec" id="${METHOD_TITLE.toLowerCase().replace(/\s+/g, "-")}" aria-labelledby="method-h">
      <div class="hb-container hub-split">
        <div class="hub-split__head" data-rise>
          <h2 id="method-h">${METHOD_TITLE}</h2>
          <p>Two questions, asked of every claim, and the same honesty rules for all of them.</p>
        </div>
        <div class="cl-method" data-rise style="--i:1">
          <p>${METHOD_P[0]}</p>
          <figure class="cl-key" aria-labelledby="key-cap">
${key("Evidence strength", STRENGTH_SCALE, a.strength_labels)}
${key("Consensus", CONSENSUS_SCALE, a.consensus_labels)}
            <figcaption id="key-cap">The two scales, from evidence against to strong evidence and from a fringe position to scientific consensus. Each claim page fills in its own step on both.</figcaption>
          </figure>
${METHOD_P.slice(1).map((p) => `          <p>${p}</p>`).join("\n")}
          <p class="cl-note">Educational summaries of published research, not medical advice. Grades reflect the cited literature at the review date shown on each page.</p>
        </div>
      </div>
    </section>
    <section class="hub-sec hub-close" aria-labelledby="close-heading">
      <div class="hb-container">
        <div data-rise>
          <h2 class="hb-display" id="close-heading">Heard a claim that isn&rsquo;t here yet?</h2>
          <p>Ask the research answers parenting questions with developmental science, not judgment and not generic advice.</p>
        </div>
        <div class="hub-close__act" data-rise style="--i:1">
          <a class="hb-btn hb-btn--paper" href="/tools/ask-the-research">Ask the research</a>
          <a class="hb-btn hb-btn--quiet" href="/classes/">Browse the classes</a>
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
