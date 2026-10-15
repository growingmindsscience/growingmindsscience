#!/usr/bin/env node
// Builds the Explore hub's content from assets/data/explore.json: the three
// doors (by age, by moment, by topic) are views of one list of pages.
// The page files keep their own head and chrome (stamp-assets maintains
// them); this script rewrites only what sits between
//   <!-- explore:start variant=a -->  and  <!-- explore:end -->
// Graded claims take their wording from the claims artifact, so a claim is
// never paraphrased here.
//   node scripts/build-explore.mjs          # rewrite the pages
//   node scripts/build-explore.mjs --check  # exit 1 if a page drifts from the data

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const PAGES = ["explore/index.html", "explore/b.html"].filter((p) => existsSync(join(ROOT, p)));

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
const byOrder = (a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type);
const of = (key, id) => d.items.filter((it) => it[key].includes(id)).sort(byOrder);
const count = (n) => `${n} ${n === 1 ? "page" : "pages"}`;
const I = (n) => " ".repeat(n);

function list(items, pad) {
  return `${I(pad)}<ul class="ex-list">\n` + items.map((it) =>
    `${I(pad + 2)}<li><a href="${esc(it.href)}">${esc(title(it))}</a><span class="ex-type">${esc(d.types[it.type])}</span></li>`
  ).join("\n") + `\n${I(pad)}</ul>`;
}

// ---------- first screens ----------
function firstA() {
  const door = (id, name, line, rows) => `          <div class="ex-door" data-rise>
            <h2><a href="#${id}">${name}</a></h2>
            <p>${line}</p>
            <ul>
${rows.join("\n")}
            </ul>
          </div>`;
  const ageRows = d.stages.map((s) => `              <li><a href="#${s.id}">${esc(s.name)}<span>${esc(s.years)}</span></a></li>`);
  const momentRows = d.moments.map((m) => `              <li><a href="#m-${m.id}">${esc(m.label)}</a></li>`);
  const topicRows = d.topics.map((t) => `              <li><a href="#t-${t.id}">${esc(t.name)}<span>${count(of("topics", t.id).length)}</span></a></li>`);
  return `    <section class="ex-title ex-title--a">
      <div class="hb-container">
        <div class="ex-title__head" data-rise>
          <h1 class="hb-display">Start from where you are.</h1>
          <p class="hb-lead">Three ways into the field guide: your child&rsquo;s age, the moment you are in, or the thing you are curious about.</p>
        </div>
        <div class="ex-doors">
${door("age", "By age", "Five periods, birth to five.", ageRows)}
${door("moment", "By moment", "A situation you would recognise.", momentRows)}
${door("topic", "By topic", "One thread across the years.", topicRows)}
        </div>
      </div>
    </section>`;
}

function firstB() {
  const stages = d.stages.map((s, i) => `          <a class="ex-line__stage" href="#${s.id}" style="--from:${(s.from / 60) * 100}%;--to:${(s.to / 60) * 100}%">
            <span class="ex-line__years">${esc(s.years)}</span>
            <strong>${esc(s.name)}</strong>
          </a>`).join("\n");
  const moments = d.moments.map((m) => `<a href="#m-${m.id}">${esc(m.label)}</a>`).join("");
  const topics = d.topics.map((t) => `<a href="#t-${t.id}">${esc(t.name)}</a>`).join("");
  return `    <section class="ex-title ex-title--b">
      <div class="hb-container">
        <div class="ex-title__head" data-rise>
          <h1 class="hb-display">Start from where you are.</h1>
          <p class="hb-lead">Pick your child&rsquo;s age on the line, or come in by the moment you are in or the thing you are curious about.</p>
        </div>
      </div>
      <div class="ex-line" data-rise style="--i:1">
        <div class="hb-container">
          <div class="ex-line__track" aria-hidden="true"><span>birth</span><span>5 years</span></div>
          <nav class="ex-line__stages" aria-label="By age">
${stages}
          </nav>
        </div>
      </div>
      <div class="hb-container ex-side">
        <div class="ex-side__row" data-rise style="--i:2"><h2>By moment</h2><div class="ex-side__links">${moments}</div></div>
        <div class="ex-side__row" data-rise style="--i:3"><h2>By topic</h2><div class="ex-side__links">${topics}</div></div>
      </div>
    </section>`;
}

// ---------- the three doors, in full ----------
function ageSection() {
  const stage = (s) => {
    const items = of("ages", s.id).filter((it) => it.type !== "class");
    return `        <article class="ex-stage" id="${s.id}">
          <div class="ex-stage__head">
            <h3>${esc(s.name)}</h3>
            <p class="ex-stage__years">${esc(s.years)}</p>
            <p>${esc(s.summary)}</p>
            <p class="ex-stage__class"><a href="${esc(s.class)}">The class for this period</a></p>
          </div>
${list(items, 10)}
        </article>`;
  };
  return `    <section class="hub-sec ex-sec" id="age" aria-labelledby="age-heading">
      <div class="hb-container">
        <h2 class="hb-display ex-sec__title" id="age-heading">By age</h2>
        <p class="ex-sec__lede">Typical ranges, not deadlines. Each period lists what was written for it.</p>
${d.stages.map(stage).join("\n")}
      </div>
    </section>`;
}

function momentSection() {
  const m = (x) => `        <article class="ex-row" id="m-${x.id}">
          <div class="ex-row__head">
            <h3>${esc(x.label)}</h3>
            <p>${esc(x.hint)}</p>
          </div>
${list(of("moments", x.id), 10)}
        </article>`;
  return `    <section class="hub-sec hub-sec--white ex-sec" id="moment" aria-labelledby="moment-heading">
      <div class="hb-container">
        <h2 class="hb-display ex-sec__title" id="moment-heading">By moment</h2>
        <p class="ex-sec__lede">A situation you would recognise, and the pages that start from it.</p>
${d.moments.map(m).join("\n")}
      </div>
    </section>`;
}

function topicSection() {
  const t = (x) => `        <article class="ex-row" id="t-${x.id}">
          <div class="ex-row__head">
            <h3>${esc(x.name)}</h3>
            <p>${count(of("topics", x.id).length)}</p>
          </div>
${list(of("topics", x.id), 10)}
        </article>`;
  return `    <section class="hub-sec ex-sec" id="topic" aria-labelledby="topic-heading">
      <div class="hb-container">
        <h2 class="hb-display ex-sec__title" id="topic-heading">By topic</h2>
        <p class="ex-sec__lede">One thread followed across the years.</p>
${d.topics.map(t).join("\n")}
      </div>
    </section>`;
}

const body = (variant) => [variant === "b" ? firstB() : firstA(), ageSection(), momentSection(), topicSection()].join("\n\n");

let drift = 0;
for (const rel of PAGES) {
  const path = join(ROOT, rel);
  const src = readFileSync(path, "utf8");
  const m = src.match(/(<!-- explore:start variant=([ab]) -->\n)[\s\S]*?<!-- explore:end -->/);
  if (!m) throw new Error(`${rel}: no explore markers`);
  const out = src.replace(m[0], m[1] + body(m[2]) + "\n<!-- explore:end -->");
  if (CHECK) {
    if (out !== src) { console.error(`✗ drift: ${rel}`); drift++; }
  } else {
    writeFileSync(path, out);
    console.log(`  ✓ ${rel} (variant ${m[2]})`);
  }
}
if (CHECK) {
  console.log(drift ? `FAILED (${drift} drifted)` : `✓ explore pages match the data (${PAGES.length} files)`);
  process.exit(drift ? 1 : 0);
}
