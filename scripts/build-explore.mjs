#!/usr/bin/env node
// Builds the Explore hub from assets/data/explore.json. Age is the first
// gate: /explore/ picks a period, and each period's page gathers the pages
// written for that age, by moment and by topic.
//   explore/index.html          the gate; its head and chrome are the
//                               template (stamp-assets maintains them), and
//                               this script rewrites what sits between
//                               <!-- explore:start --> and <!-- explore:end -->
//   explore/<stage slug>.html   one page per period, generated whole from
//                               that template
// Graded claims take their wording from the claims artifact, so a claim is
// never paraphrased here. Deterministic, so CI can verify with --check.
//   node scripts/build-explore.mjs          # write the pages
//   node scripts/build-explore.mjs --check  # exit 1 if a page drifts from the data

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SITE_ORIGIN, esc, txt } from "./site.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const ORIGIN = SITE_ORIGIN;

const d = JSON.parse(readFileSync(join(ROOT, "assets", "data", "explore.json"), "utf8"));
const claimsArtifact = JSON.parse(readFileSync(join(ROOT, "keel", "artifacts", "claims", "claims.v1.json"), "utf8"));
const claims = claimsArtifact.claims;

// esc() escapes; txt() escapes and sets typographic quotes for visible text (site.mjs, shared
// with build-claims.mjs). The claim's words are unchanged; only the glyphs are.
const claimOf = (it) => {
  const c = claims.find((x) => `/claims/${x.slug}` === it.href);
  if (!c) throw new Error(`no claim for ${it.href}`);
  return c;
};
const title = (it) => (it.type !== "claim" ? txt(it.title) : `“${txt(claimOf(it).claim_text.replace(/\.$/, ""))}”`);
// The strength label's tone, as on /claims/: clay for contradicted, ink for evidence that holds,
// muted for thin evidence. Ink, not forest: forest is the action color.
const gradeClass = (s) => (s === "contradicted" ? "ex-grade--contra" : s === "strong" || s === "moderate" ? "ex-grade--solid" : "ex-grade--thin");
const ORDER = ["lens", "tool", "guide", "article", "claim", "class"];
const sorted = (items) => [...items].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
// A noindex page is not launched (today the Milestone Navigator, held for attorney review,
// keel/DECISIONS.md D3), so Explore leaves it off; it returns by itself when its noindex is removed.
function launched(href) {
  if (!href.startsWith("/") || href.includes("#")) return true;
  const p = href.replace(/^\//, "").replace(/\/$/, "/index");
  const file = join(ROOT, p.endsWith(".html") ? p : `${p}.html`);
  if (!existsSync(file)) return true;
  return !/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(readFileSync(file, "utf8"));
}
const forAge = (id) => d.items.filter((it) => it.ages.includes(id) && it.type !== "class" && launched(it.href));
const allAges = d.items.filter((it) => d.stages.every((s) => it.ages.includes(s.id)) && it.type !== "class" && launched(it.href));
const I = (n) => " ".repeat(n);
const href = (s) => `/explore/${s.slug}`;
const RIGHT_NOW = "/tools/right-now";

// A graded claim carries its grade and verdict under the claim, both verbatim from the claims
// artifact, so the row teaches before it is opened.
function verdict(it) {
  if (it.type !== "claim") return "";
  const c = claimOf(it);
  return `<p class="ex-verdict"><span class="ex-grade ${gradeClass(c.grade_strength)}">${txt(claimsArtifact.strength_labels[c.grade_strength])}</span> <span aria-hidden="true">&middot;</span> ${txt(c.verdict_label)}</p>`;
}
function list(items, pad) {
  return `${I(pad)}<ul class="ex-list">\n` + sorted(items).map((it) =>
    `${I(pad + 2)}<li><a href="${esc(it.href)}">${title(it)}</a><span class="ex-type">${txt(d.types[it.type])}</span>${verdict(it)}</li>`
  ).join("\n") + `\n${I(pad)}</ul>`;
}

// The age line: on the gate it is the door (each period with its summary) over a 0 to 5 year
// scale; on a period's page it is the way between periods, the current one marked.
function ageLine(current) {
  const stages = d.stages.map((s) => {
    const cur = s.id === current;
    return `          <a class="ex-line__stage${cur ? " is-current" : ""}" href="${href(s)}"${cur ? ' aria-current="page"' : ""}>
            <span class="ex-line__years">${txt(s.years)}</span>
            <strong>${txt(s.name)}</strong>${current ? "" : `\n            <span class="ex-line__sum">${txt(s.summary)}</span>`}
          </a>`;
  }).join("\n");
  // Each period is 12 months wide, so the scale's marks fall on the rules between the periods.
  const ticks = ["birth", ...d.stages.slice(1).map((s) => String(s.from / 12)), `${d.stages[d.stages.length - 1].to / 12} years`];
  return `      <div class="ex-line${current ? " ex-line--nav" : ""}">
        <div class="hb-container">
          <nav class="ex-line__stages" aria-label="Ages">
${stages}
          </nav>${current ? "" : `\n          <div class="ex-line__track" aria-hidden="true">${ticks.map((t) => `<span>${t}</span>`).join("")}</div>`}
        </div>
      </div>`;
}

// The ink close band (hubs.css .hub-close): one statement, one line, the actions together.
function close(heading, line, actions) {
  return `    <section class="hub-sec hub-close" aria-labelledby="close-heading">
      <div class="hb-container">
        <div data-rise>
          <h2 class="hb-display" id="close-heading">${heading}</h2>
          <p>${line}</p>
        </div>
        <div class="hub-close__act">${actions}</div>
      </div>
    </section>`;
}

// ---------- the gate: /explore/ ----------
function gate() {
  return `    <section class="ex-title ex-title--gate">
      <div class="hb-container">
        <div class="ex-title__head" data-rise>
          <h1 class="hb-display">How old is your child?</h1>
          <p class="hb-lead">A lot of what helps depends on age. Pick a period, and you will find the moments and topics that matter in it.</p>
        </div>
      </div>
${ageLine(null)}
    </section>
    <section class="hub-sec ex-sec" id="any-age" aria-labelledby="any-heading">
      <div class="hb-container ex-row">
        <div class="ex-row__head" data-rise>
          <h2 class="hb-display" id="any-heading">For any age</h2>
          <p>Pages written for every period, from birth to five.</p>
        </div>
${list(allAges, 8)}
      </div>
    </section>
${close("Go deeper, one age at a time.",
  "The classes explain the why. Three classes are open, one for each window of the first five years, $49 each with lifetime access.",
  `<a class="hb-btn hb-btn--paper" href="/classes/">Browse the classes</a><a class="hb-btn hb-btn--quiet" href="${RIGHT_NOW}">It&rsquo;s hard right now</a>`)}`;
}

// ---------- a period's page ----------
// Start here: the period's curated Read / Try / Learn (explore.json stages[].home), in the Lens
// page's notation: a clay Inter label beside a Newsreader name, under quiet rules.
const START = [["read", "Read"], ["try", "Try"], ["learn", "Learn"]];
function startHere(s) {
  if (!s.home) return "";
  const rows = START.filter(([k]) => s.home[k]).map(([k, label]) =>
    `            <li><span class="ex-start__k">${label}</span><a class="ex-start__link" href="${esc(s.home[k].href)}">${txt(s.home[k].label)}</a></li>`).join("\n");
  return `        <div class="ex-start" data-rise style="--i:1">
          <h2 class="ex-start__title" id="start-heading">Start here</h2>
          <ul class="ex-start__list" aria-labelledby="start-heading">
${rows}
          </ul>
        </div>`;
}

// The Lens as a door, on the ages it is written for. Its words, photograph and alt text are the
// Lens page's own (lens/leaving-the-playground.html): the meta line, the lead, the four steps and
// their questions, and one of its Observe labels on the plate. Keep them in step with that page.
const LENS = {
  meta: "A Developmental Lens &middot; 18 months to 4 years",
  lead: "An ordinary moment every parent of a toddler knows, read through the Developmental Lens: what we see, what may be developing, what that changes, and what to notice next time.",
  steps: [
    ["Observe", "What are we actually seeing?"],
    ["Understand", "What might be developing beneath the surface?"],
    ["Respond", "What can this understanding change?"],
    ["Reflect", "What might you notice next time?"],
  ],
  img: `<picture><source type="image/webp" srcset="/assets/img/site/lens-3-run-back-640.webp 640w, /assets/img/site/lens-3-run-back-1122.webp 1122w" sizes="(min-width: 861px) 34vw, 92vw" /><img src="/assets/img/site/lens-3-run-back-640.jpg" srcset="/assets/img/site/lens-3-run-back-640.jpg 640w, /assets/img/site/lens-3-run-back.jpg 1122w" sizes="(min-width: 861px) 34vw, 92vw" width="1122" height="1402" alt="A toddler at the bottom of a slide, one hand on it, turned back toward it; an adult crouches behind with a hand held out low." loading="lazy" decoding="async" /></picture>`,
  label: "<b>A hand on the slide</b>the run back",
};
function lensDoor(lens) {
  const steps = LENS.steps.map(([name, q], i) =>
    `              <li><span class="ex-lens__n">0${i + 1}</span><span class="ex-lens__step">${name}</span><span class="ex-lens__q">${q}</span></li>`).join("\n");
  return `    <section class="ex-lens-sec" aria-labelledby="lens-heading">
      <div class="hb-container">
        <div class="ex-lens" data-rise>
          <figure class="ex-lens__plate">
            ${LENS.img}
            <figcaption class="ex-lens__label">${LENS.label}</figcaption>
          </figure>
          <div class="ex-lens__body">
            <h2 class="hb-display ex-lens__title" id="lens-heading">${txt(lens.title)}</h2>
            <p class="ex-lens__meta">${LENS.meta}</p>
            <p class="ex-lens__lead">${LENS.lead}</p>
            <ol class="ex-lens__steps">
${steps}
            </ol>
            <div class="hb-actions"><a class="hb-btn" href="${esc(lens.href)}">Open the Lens</a></div>
          </div>
        </div>
      </div>
    </section>`;
}

function stagePage(s) {
  const items = forAge(s.id);
  const lens = items.find((it) => it.type === "lens");
  // Each page is listed once. "It's hard right now" covers every hard moment and is named in the
  // moments' lede; the Lens has its own door. Topics then list only what the moments have not.
  const seen = new Set([RIGHT_NOW, ...(lens ? [lens.href] : [])]);
  const take = (its) => { const out = its.filter((it) => !seen.has(it.href)); out.forEach((it) => seen.add(it.href)); return out; };
  const row = (id, name, hint, its) => `        <article class="ex-row" id="${id}">
          <div class="ex-row__head">
            <h3>${txt(name)}</h3>${hint ? `\n            <p>${txt(hint)}</p>` : ""}
          </div>
${list(its, 10)}
        </article>`;
  const momentRows = d.moments
    .map((m) => ({ m, its: take(items.filter((it) => it.moments.includes(m.id))) }))
    .filter((x) => x.its.length)
    .map(({ m, its }) => row(`m-${m.id}`, m.label, m.hint, its)).join("\n");
  const topicRows = d.topics
    .map((t) => ({ t, its: take(items.filter((it) => it.topics.includes(t.id))) }))
    .filter((x) => x.its.length)
    .map(({ t, its }) => row(`t-${t.id}`, t.name, "", its));
  const rest = take(items);
  if (rest.length) topicRows.push(row("also", "Also for this age", "", rest));
  const cls = d.items.find((it) => it.type === "class" && it.href === s.class);
  if (!cls) throw new Error(`explore.json: no class item for ${s.class}`);
  return `    <section class="ex-title ex-title--stage">
${ageLine(s.id)}
      <div class="hb-container ex-stage-head">
        <div data-rise>
          <h1 class="hb-display">${txt(s.name)}</h1>
          <p class="ex-stage-head__years">${txt(s.years)}</p>
          <p class="hb-lead">${txt(s.summary)}</p>
        </div>
${startHere(s)}
      </div>
    </section>
${lens ? lensDoor(lens) + "\n" : ""}    <section class="hub-sec hub-sec--white ex-sec" id="moments" aria-labelledby="moments-heading">
      <div class="hb-container">
        <div class="ex-sec__head" data-rise>
          <h2 class="hb-display ex-sec__title" id="moments-heading">Moments at this age</h2>
          <p class="ex-sec__lede">Situations you would recognize, and the pages that start from them. In the middle of one now? <a href="${RIGHT_NOW}">It&rsquo;s hard right now</a> gives a calm next step in two minutes.</p>
        </div>
${momentRows}
      </div>
    </section>${topicRows.length ? `
    <section class="hub-sec ex-sec" id="topics" aria-labelledby="topics-heading">
      <div class="hb-container">
        <div class="ex-sec__head" data-rise>
          <h2 class="hb-display ex-sec__title" id="topics-heading">More by topic</h2>
          <p class="ex-sec__lede">One thread at a time, for this period, without the pages above.</p>
        </div>
${topicRows.join("\n")}
      </div>
    </section>` : ""}
${close("Go deeper into this age.",
  `The class for this period, ${txt(cls.title.replace(/,.*$/, ""))}, explains the why in short, self-paced lessons built from the research. $49 one time, with lifetime access.`,
  `<a class="hb-btn hb-btn--paper" href="${esc(s.class)}">See the class</a><a class="hb-btn hb-btn--quiet" href="${RIGHT_NOW}">It&rsquo;s hard right now</a>`)}`;
}

// ---------- write ----------
const indexPath = join(ROOT, "explore", "index.html");
const template = readFileSync(indexPath, "utf8");
const MARK = /(<!-- explore:start -->\n)[\s\S]*?<!-- explore:end -->/;
if (!MARK.test(template)) throw new Error("explore/index.html: no explore markers");
const fill = (html, main) => html.replace(MARK, (_, a) => a + main + "\n<!-- explore:end -->");

const outputs = [["explore/index.html", fill(template, gate())]];
for (const s of d.stages) {
  const name = `${s.name}, ${s.years.toLowerCase()}`;
  const desc = `${s.summary} The guides, tools, articles and graded claims for this period, by moment and by topic.`;
  let html = fill(template, stagePage(s))
    .replace(/<title>.*?<\/title>/, `<title>${esc(name)} | Explore | From Little Onward</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, (_, a) => `${a}${esc(desc)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, (_, a) => `${a}${esc(name)} | From Little Onward"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, (_, a) => `${a}${esc(desc)}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, (_, a) => `${a}${ORIGIN}${href(s)}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, (_, a) => `${a}${ORIGIN}${href(s)}"`)
    // The period is the current page; the Explore entry in the header's Tools menu marks the section it sits in.
    .replace(/(<a class="nav__submenu-link" href="\/explore\/") aria-current="page"/, '$1 aria-current="true"');
  outputs.push([`explore/${s.slug}.html`, html]);
}

// ---------- the homepage's class rows list their windows from the same file ----------
// Each class row on the homepage names the windows it covers, over one range bar for the class.
// The names are text, not links: the whole row opens the class, so a tap in it never lands on Explore. Every stage must sit under exactly one class.
const ent = (t) => esc(t).replace(/\u2018/g, "&lsquo;").replace(/\u2019/g, "&rsquo;").replace(/\u201c/g, "&ldquo;").replace(/\u201d/g, "&rdquo;");
const CLASSES = [
  { id: "infant", stages: ["birth-to-1"] },
  { id: "toddler", stages: ["1-to-2", "2-to-3"] },
  { id: "preschool", stages: ["3-to-4", "4-to-5"] },
];
const homePath = join(ROOT, "index.html");
// Another hand may be editing index.html, so its class rows are rewritten from the file as it is at
// write time, and the file is written only if those rows changed.
const homeRows = (home) => {
  let placed = 0;
  for (const c of CLASSES) {
    const stages = c.stages.map((slug) => {
      const s = d.stages.find((x) => x.slug === slug);
      if (!s) throw new Error(`explore.json: no stage ${slug} for the ${c.id} class`);
      return s;
    });
    placed += stages.length;
    const items = stages.map((s) => `<li><span class="yrs">${ent(s.years)}</span><span class="win">${ent(s.name)}</span></li>`).join("");
    const from = (stages[0].from / 60) * 100, to = (stages[stages.length - 1].to / 60) * 100;
    const block = `            <ul class="menu__windows" aria-label="Ages in this class">${items}</ul>\n            <div class="range" aria-hidden="true"><div class="range__track" style="--from:${from}%;--to:${to}%"><i></i></div><small><span>birth</span><span>5 years</span></small></div>`;
    const re = new RegExp(`(<!-- explore:class:${c.id}:start -->)[\\s\\S]*?(<!-- explore:class:${c.id}:end -->)`);
    if (!re.test(home)) throw new Error(`index.html: no explore:class:${c.id} markers`);
    home = home.replace(re, (_, a, b) => `${a}\n${block}\n${b}`);
  }
  if (placed !== d.stages.length) throw new Error(`explore.json: ${d.stages.length - placed} stage(s) sit under no class`);
  return home;
};
homeRows(readFileSync(homePath, "utf8")); // fail early on a missing marker
outputs.push(["index.html", homeRows]);

let drift = 0;
// An output is the page's html, or a function from the file as it stands to what it should be.
// A file is written only when its content changes.
for (const [rel, out] of outputs) {
  const path = join(ROOT, rel);
  const cur = existsSync(path) ? readFileSync(path, "utf8") : "";
  const html = typeof out === "function" ? out(cur) : out;
  if (CHECK) {
    if (cur !== html) { console.error(`✗ drift: ${rel}`); drift++; }
  } else if (cur !== html) {
    writeFileSync(path, html);
    console.log(`  ✓ ${rel} (written)`);
  } else {
    console.log(`  · ${rel} (unchanged)`);
  }
}
if (CHECK) {
  console.log(drift ? `FAILED (${drift} drifted)` : `✓ explore pages match the data (${outputs.length} files)`);
  process.exit(drift ? 1 : 0);
}
