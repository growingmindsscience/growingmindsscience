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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const ORIGIN = "https://growingmindsscience.com";

const d = JSON.parse(readFileSync(join(ROOT, "assets", "data", "explore.json"), "utf8"));
const claims = JSON.parse(readFileSync(join(ROOT, "keel", "artifacts", "claims", "claims.v1.json"), "utf8")).claims;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const title = (it) => {
  if (it.type !== "claim") return it.title;
  const c = claims.find((x) => `/claims/${x.slug}` === it.href);
  if (!c) throw new Error(`no claim for ${it.href}`);
  return `“${c.claim_text.replace(/\.$/, "")}”`;
};
const ORDER = ["lens", "tool", "guide", "article", "claim", "class"];
const sorted = (items) => [...items].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
const forAge = (id) => d.items.filter((it) => it.ages.includes(id) && it.type !== "class");
const allAges = d.items.filter((it) => d.stages.every((s) => it.ages.includes(s.id)) && it.type !== "class");
const I = (n) => " ".repeat(n);
const href = (s) => `/explore/${s.slug}`;
const RIGHT_NOW = "/tools/right-now";

function list(items, pad) {
  return `${I(pad)}<ul class="ex-list">\n` + sorted(items).map((it) =>
    `${I(pad + 2)}<li><a href="${esc(it.href)}">${esc(title(it))}</a><span class="ex-type">${esc(d.types[it.type])}</span></li>`
  ).join("\n") + `\n${I(pad)}</ul>`;
}

// The age line: on the gate it is the door (each period with its summary);
// on a period's page it is the way between periods, the current one marked.
function ageLine(current) {
  const stages = d.stages.map((s) => {
    const cur = s.id === current;
    return `          <a class="ex-line__stage${cur ? " is-current" : ""}" href="${href(s)}"${cur ? ' aria-current="page"' : ""}>
            <span class="ex-line__years">${esc(s.years)}</span>
            <strong>${esc(s.name)}</strong>${current ? "" : `\n            <span class="ex-line__sum">${esc(s.summary)}</span>`}
          </a>`;
  }).join("\n");
  return `      <div class="ex-line${current ? " ex-line--nav" : ""}">
        <div class="hb-container">
          <nav class="ex-line__stages" aria-label="Ages">
${stages}
          </nav>
          <div class="ex-line__track" aria-hidden="true"><span>birth</span><span>5 years</span></div>
        </div>
      </div>`;
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
        <div class="ex-row__head">
          <h2 class="hb-display" id="any-heading">For any age</h2>
          <p>Pages written for every period, from birth to five.</p>
        </div>
${list(allAges, 8)}
      </div>
    </section>`;
}

// ---------- a period's page ----------
function stagePage(s) {
  const items = forAge(s.id);
  const momentRows = d.moments
    // "It's hard right now" covers every hard moment; it is named once in the lede instead of in each row.
    .map((m) => ({ m, its: items.filter((it) => it.moments.includes(m.id) && it.href !== RIGHT_NOW) }))
    .filter((x) => x.its.length)
    .map(({ m, its }) => `        <article class="ex-row" id="m-${m.id}">
          <div class="ex-row__head">
            <h3>${esc(m.label)}</h3>
            <p>${esc(m.hint)}</p>
          </div>
${list(its, 10)}
        </article>`).join("\n");
  const topicRows = d.topics
    .map((t) => ({ t, its: items.filter((it) => it.topics.includes(t.id)) }))
    .filter((x) => x.its.length)
    .map(({ t, its }) => `        <article class="ex-row" id="t-${t.id}">
          <div class="ex-row__head">
            <h3>${esc(t.name)}</h3>
          </div>
${list(its, 10)}
        </article>`).join("\n");
  const rest = items.filter((it) => !it.moments.length && !it.topics.length);
  const cls = d.items.find((it) => it.type === "class" && it.href === s.class);
  return `    <section class="ex-title ex-title--stage">
${ageLine(s.id)}
      <div class="hb-container ex-stage-head">
        <div data-rise>
          <h1 class="hb-display">${esc(s.name)}</h1>
          <p class="ex-stage-head__years">${esc(s.years)}</p>
          <p class="hb-lead">${esc(s.summary)}</p>
        </div>
        <div class="ex-stage-head__class" data-rise style="--i:1">
          <p>The class for this period</p>
          <a class="hb-btn hb-btn--quiet" href="${esc(s.class)}">${esc(cls ? cls.title : "See the class")}</a>
        </div>
      </div>
    </section>
    <section class="hub-sec hub-sec--white ex-sec" id="moments" aria-labelledby="moments-heading">
      <div class="hb-container">
        <h2 class="hb-display ex-sec__title" id="moments-heading">Moments at this age</h2>
        <p class="ex-sec__lede">Situations you would recognize, and the pages that start from them. In the middle of one now? <a href="/tools/right-now">It&rsquo;s hard right now</a> gives a calm next step in two minutes.</p>
${momentRows}
      </div>
    </section>
    <section class="hub-sec ex-sec" id="topics" aria-labelledby="topics-heading">
      <div class="hb-container">
        <h2 class="hb-display ex-sec__title" id="topics-heading">Topics at this age</h2>
        <p class="ex-sec__lede">One thread at a time, for this period.</p>
${topicRows}${rest.length ? `
        <article class="ex-row" id="also">
          <div class="ex-row__head">
            <h3>Also for this age</h3>
          </div>
${list(rest, 10)}
        </article>` : ""}
      </div>
    </section>`;
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
    .replace(/(<meta property="og:url" content=")[^"]*"/, (_, a) => `${a}${ORIGIN}${href(s)}"`);
  outputs.push([`explore/${s.slug}.html`, html]);
}

// ---------- the homepage's age explorer reads the same file ----------
// Same markup as before; each period's name now opens its Explore page.
const ent = (t) => esc(t).replace(/\u2018/g, "&lsquo;").replace(/\u2019/g, "&rsquo;").replace(/\u201c/g, "&ldquo;").replace(/\u201d/g, "&rdquo;");
const homeCols = d.stages.map((s, i) => {
  const h = s.home;
  const link = (k, v) => `${k}: <a href="${esc(v.href)}">${ent(v.label)}</a>`;
  return `          <div class="age__col"><h3><a href="${href(s)}">${ent(s.name)}</a><span class="u-visually-hidden">, </span><span class="yrs">${ent(s.years)}</span></h3><p>${ent(s.summary)}</p><p class="age__links">${link("Read", h.read)} &middot; ${link("Try", h.try)} &middot; ${link("Learn", h.learn)}</p><div class="range"><div class="range__track" style="--from:${(s.from / 60) * 100}%;--to:${(s.to / 60) * 100}%"><i></i></div><small${i ? ' class="axis-repeat"' : ""}><span>birth</span><span>5 years</span></small></div></div>`;
}).join("\n");
const homePath = join(ROOT, "index.html");
const home = readFileSync(homePath, "utf8");
const HOME = /(<!-- explore:home:start -->\n)[\s\S]*?(\n<!-- explore:home:end -->)/;
if (!HOME.test(home)) throw new Error("index.html: no explore:home markers");
outputs.push(["index.html", home.replace(HOME, (_, a, b) => a + homeCols + b)]);

let drift = 0;
for (const [rel, html] of outputs) {
  const path = join(ROOT, rel);
  if (CHECK) {
    const cur = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (cur !== html) { console.error(`✗ drift: ${rel}`); drift++; }
  } else {
    writeFileSync(path, html);
    console.log(`  ✓ ${rel}`);
  }
}
if (CHECK) {
  console.log(drift ? `FAILED (${drift} drifted)` : `✓ explore pages match the data (${outputs.length} files)`);
  process.exit(drift ? 1 : 0);
}
