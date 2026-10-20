#!/usr/bin/env node
// The automated drafter: fills empty posting slots with researched, checked posts.
//
//   node marketing/instagram/scripts/draft.mjs                  # draft if a slot inside the trigger window is empty
//   node marketing/instagram/scripts/draft.mjs --force          # draft every empty slot in the horizon now
//   node marketing/instagram/scripts/draft.mjs --check          # say "draft: due" or why not, and stop
//   node marketing/instagram/scripts/draft.mjs --plan-only      # print the plan, write nothing
//   node marketing/instagram/scripts/draft.mjs --limit 2 --summary /tmp/batch.md
//   node marketing/instagram/scripts/draft.mjs --as-of 2026-10-21T09:00:00-04:00
//
// How a post is made (settings in automation.json, standards in prompts/):
//   1. Slots. The calendar's empty posting days from lead_days to horizon_days out.
//   2. Research. Fresh cards from the collected research (research.mjs): nothing on a
//      post already, no lead study used within the cooldown, spread across the topic
//      matrix and weighted by what the account's own numbers say earns saves.
//   3. Strategist. Claude plans the batch: one idea, series, hook and free destination
//      per slot, every post a different lesson and idea.
//   4. Writer. Claude writes each post from its cards, the whole lesson behind them and
//      an approved example of the series.
//   5. Gates. validate.mjs (the README's rules) and, for carousels, a real render
//      (overflow, words per slide).
//   6. Critic. Claude checks every claim against the cards, the honesty rules and the
//      craft, and scores it. Anything short of the bar goes back to the writer with the
//      notes, up to max_revisions times; each later critique sees its own earlier notes.
//      Accuracy, rules and freshness must be clean every time; craft must reach
//      pass_scores, or floor_scores on the last round. A post that never passes is
//      not queued.
//   7. Queue. Passing posts are written to posts/<id>/ and added to calendar.json as
//      approved (auto_approve) on their slot; --summary writes the batch issue text.
//
// Claude runs through llm.mjs (the Claude Code CLI): Matthew's login locally,
// CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY in CI.

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, cpSync, rmSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IG, HERE, POSTS, CALENDAR, INSIGHTS, AUTOMATION, loadEnv, readJson, writeJson, args, slotsBetween } from "./_lib.mjs";
import { loadResearch, usedSoFar, freshCandidates, ROWS } from "./research.mjs";
import { validatePost, splitCaption, sceneNames, SERIES } from "./validate.mjs";
import { ask } from "./llm.mjs";

loadEnv();
const a = args();
const cfg = readJson(AUTOMATION);
const NOW = a.opt("--as-of") ? new Date(a.opt("--as-of")) : new Date();
const FORCE = a.flag("--force");
const PLAN_ONLY = a.flag("--plan-only");
const LIMIT = Number(a.opt("--limit") || cfg.max_posts_per_run);
const SUMMARY = a.opt("--summary");
const TODAY = NOW.toISOString().slice(0, 10);
const DAY = 86400000;
const prompt = (name) => readFileSync(join(IG, "prompts", `${name}.md`), "utf8");
const PLAYBOOK = prompt("playbook");
const say = (...x) => console.log(...x);

// ---------- 1. slots ----------
const calendar = readJson(CALENDAR);
// A post occupies the day it goes out: its scheduled day, or for one published
// early (a watched first post), the day it actually went out.
const nyDate = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const takenDays = new Set(calendar.posts.filter((p) => !["rejected", "held"].includes(p.status)).map((p) => (p.status === "published" && p.published_at ? nyDate(p.published_at) : p.scheduled_at.slice(0, 10))));
let slots = slotsBetween(cfg.slots, new Date(+NOW + cfg.lead_days * DAY), new Date(+NOW + cfg.horizon_days * DAY)).filter((s) => !takenDays.has(s.date));
if (!slots.length) { say(`draft: nothing to draft; every slot from ${cfg.lead_days} to ${cfg.horizon_days} days out is filled`); process.exit(0); }
if (!FORCE && !slots.some((s) => s.when <= new Date(+NOW + cfg.trigger_days * DAY))) {
  say(`draft: nothing to draft yet; the first empty slot is ${slots[0].at}, outside the ${cfg.trigger_days}-day trigger`);
  process.exit(0);
}
slots = slots.slice(0, LIMIT);
say(`draft: ${slots.length} empty slot(s): ${slots.map((s) => `${s.date} ${s.kind}`).join(", ")}`);
// --check: the workflow asks first, so a day with nothing to draft costs nothing.
if (a.flag("--check")) { say("draft: due"); process.exit(0); }

// ---------- 2. research ----------
const research = await loadResearch();
const used = usedSoFar();
const shortlist = freshCandidates(research, used, NOW);
const cardById = new Map(research.cards.map((c) => [c.id, c]));
const freeScenes = sceneNames().filter((s) => !used.some((p) => p.scene === s));
const insights = existsSync(INSIGHTS) ? readJson(INSIGHTS) : null;
say(`draft: ${shortlist.length} fresh cards shortlisted from ${research.cards.length}; unused scenes: ${freeScenes.join(", ") || "none"}`);

const weekday = (d) => new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "America/New_York" });
const cardLine = (c) => `[${c.id}] ${c.kind} | ${c.band} | ${c.row}${c.lesson ? ` | lesson: ${research.lessons.get(c.lesson)?.title}` : ""} | ${c.confidence}${c.link ? ` | page ${c.link}` : ""}\n  ${c.text}\n  Source: ${c.sources.slice(0, 400)}`;
const recentLines = used.slice(-24).map((p) => `- ${p.date} ${p.series}${p.kind === "reel" ? " (reel)" : ""} [${p.age || "?"} | ${p.row || "?"}] "${p.hook}" (${p.status})${p.research.length ? ` cards: ${p.research.join(", ")}` : ""}`);
function numbersBlock() {
  if (!insights) return "No numbers pulled yet.";
  const pct = (v) => (v == null ? "n/a" : `${(v * 100).toFixed(1)}%`);
  const settled = insights.posts.filter((p) => p.metrics.reach > 0 && Date.now() - new Date(p.published_at) > 2 * DAY);
  return [
    `@${insights.account.username}: ${insights.account.followers} followers. ${settled.length} settled posts (${settled.filter((p) => p.post).length} from this system).`,
    `By series: ${Object.entries(insights.by_series).map(([k, v]) => `${k} ${v.posts} posts, avg reach ${v.avg_reach}, saves ${pct(v.save_rate)}, shares ${pct(v.share_rate)}`).join("; ") || "none"}.`,
    `Strongest: ${insights.top.map((t) => `"${t.hook}" (${t.series}${t.post ? `, ${t.post}` : ""}, saves ${pct(t.rates.save)}, shares ${pct(t.rates.share)}, reach ${t.reach})`).join("; ") || "too few to rank"}.`,
    settled.length < 8 ? "Too few posts for the numbers to mean much; keep the mix even." : "",
  ].filter(Boolean).join("\n");
}

// ---------- 3. strategist ----------
const SERIES_FOR = { carousel: cfg.series.carousel.filter((s) => s !== "field-notes" || freeScenes.length), reel: cfg.series.reel.filter((s) => s !== "watch-for-this" || freeScenes.length) };
const PLAN_SCHEMA = {
  type: "object", additionalProperties: false, required: ["plan"],
  properties: {
    plan: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["slot", "series", "cards", "idea", "moment", "hook", "why_save", "why_share", "age", "row", "link_url"],
        properties: {
          slot: { type: "string", description: "the slot's exact timestamp, as listed" },
          series: { type: "string", enum: [...SERIES_FOR.carousel, ...SERIES_FOR.reel] },
          cards: { type: "array", items: { type: "string" }, description: "card ids from the shortlist" },
          idea: { type: "string" }, moment: { type: "string" }, hook: { type: "string" },
          why_save: { type: "string" }, why_share: { type: "string" },
          age: { type: "string", description: "the age range the post speaks to, e.g. '18 to 30 months'" },
          row: { type: "string", enum: Object.keys(ROWS) },
          link_url: { type: "string" },
          scene: { type: "string", description: "only for field-notes and watch-for-this" },
          remix_of: { type: "string", description: "only when a reel retells a published carousel: its post id" },
        },
      },
    },
  },
};
const strategistPrompt = `Today is ${weekday(NOW)}, ${TODAY}.

## Empty slots, in order
${slots.map((s, i) => `${i + 1}. ${s.at} (${weekday(s.at)}), ${s.kind}: series allowed ${SERIES_FOR[s.kind].join(", ")}`).join("\n")}

## Unused drawn scenes
${freeScenes.length ? freeScenes.join(", ") : "none, so field-notes and watch-for-this are not available"}

## Rejected claims (only as the claim corrected in what-we-got-wrong)
${research.rejected.map((r) => `- ${r.claim}: ${r.why}${r.scheduled ? ` (already queued as ${r.scheduled})` : ""}`).join("\n")}

## Posts already made or queued, oldest first
${recentLines.join("\n")}

## The account's numbers
${numbersBlock()}

## Free pages a post can link to
${research.destinations.map((d) => `- ${d.url}: ${d.page} (${d.type}; ages ${d.ages}; ${d.topics})`).join("\n")}

## Fresh research cards (the only research you may plan from)
${shortlist.map(cardLine).join("\n\n")}
`;

let plan = null, planProblems = [];
for (let attempt = 0; attempt < 2 && !plan; attempt++) {
  const retry = planProblems.length ? `\n\nYour last plan had problems; fix them:\n${planProblems.map((p) => `- ${p}`).join("\n")}` : "";
  const { data } = await ask({ system: `${PLAYBOOK}\n\n${prompt("strategist")}`, prompt: strategistPrompt + retry, schema: PLAN_SCHEMA, model: cfg.model, effort: cfg.effort, label: "strategist" });
  const items = data.plan || [];
  const usable = (it, s) => SERIES_FOR[s.kind].includes(it.series) && it.cards.length && it.cards.every((c) => cardById.has(c)) && research.destinations.some((d) => d.url === it.link_url);
  planProblems = [];
  const chosen = [];
  for (const [i, s] of slots.entries()) {
    const it = items.find((x) => x.slot === s.at) || items[i];
    if (!it) { planProblems.push(`no plan item for slot ${s.at}`); continue; }
    it.slot = s.at;
    if (!SERIES_FOR[s.kind].includes(it.series)) planProblems.push(`slot ${s.at}: series ${it.series} is not a ${s.kind} series`);
    const bad = it.cards.filter((c) => !cardById.has(c));
    if (bad.length || !it.cards.length) planProblems.push(`slot ${s.at}: unknown or missing cards ${bad.join(", ")}`);
    if (!research.destinations.some((d) => d.url === it.link_url)) planProblems.push(`slot ${s.at}: ${it.link_url} is not in the destination list`);
    if (usable(it, s)) chosen.push(it);
  }
  if (planProblems.length && attempt === 0) continue;
  for (const p of planProblems) console.warn(`draft: plan problem, slot skipped: ${p}`);
  plan = chosen;
}
if (!plan?.length) { console.error("draft: the strategist could not make a usable plan"); process.exit(1); }
say("\nPlan:");
for (const it of plan) say(`  ${it.slot.slice(0, 10)} ${it.series}: "${it.hook}" -> ${it.link_url}  [${it.cards.join(", ")}]`);
if (PLAN_ONLY) process.exit(0);

// ---------- 4 to 6. write, gate, critique ----------
const str = { type: "string" };
const num = { type: "number" };
const BARS = { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "value", "display"], properties: { label: str, value: num, display: str, highlight: { type: "boolean" } } } };
const STAT = { type: "object", additionalProperties: false, required: ["value", "label"], properties: { value: str, label: str } };
const WRITER_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["hook_options", "slug", "age", "link_label", "link_page", "music_brief", "sources", "citations", "caption_body", "hashtags", "claims"],
  properties: {
    hook_options: { type: "array", items: str },
    slug: { type: "string", description: "three to five words, lowercase, hyphenated, naming the idea" },
    age: str,
    link_label: { type: "string", description: "e.g. 'Free tool, link in bio'" },
    link_page: { type: "string", description: "the page's name and why it helps, as shown on the last slide" },
    music_brief: str,
    sources: { type: "array", items: str },
    citations: { type: "array", items: str },
    labels: { type: "array", items: { type: "object", additionalProperties: false, required: ["anchor", "title"], properties: { anchor: str, title: str, text: str, kind: str } } },
    slides: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["type"],
        properties: {
          type: { type: "string", enum: ["cover", "text", "figure", "try", "range", "signs", "plate", "sources"] },
          lead: str, sub: str, claim: str, now: str, head: str, body: str, note: str, caption: str,
          items: { type: "array", items: str },
          figure: STAT, bars: BARS, stat: STAT,
          range: { type: "object", additionalProperties: false, required: ["from", "to", "most"], properties: { from: num, to: num, step: num, unit: { type: "string", description: "axis unit shown on the first tick: mo (default), wk or yr" }, most: { type: "array", items: num }, mostLabel: str, mark: num, markLabel: str } },
          reveal: num, active: num,
        },
      },
    },
    beats: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["id"],
        properties: { id: str, kind: { type: "string", enum: ["hook", "close", "mark"] }, text: str, sub: str, say: str, pause: num, labels: num, dur: num, bars: BARS, stat: STAT },
      },
    },
    caption_body: { type: "string", description: "paragraphs separated by blank lines; ends with the one question" },
    hashtags: { type: "array", items: str },
    claims: { type: "array", items: { type: "object", additionalProperties: false, required: ["where", "claim", "card"], properties: { where: str, claim: str, card: str, citation: str } } },
  },
};
const CRITIC_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["claims", "violations", "stale", "scores", "edits", "verdict"],
  properties: {
    claims: { type: "array", items: { type: "object", additionalProperties: false, required: ["claim", "support"], properties: { claim: str, where: str, support: { type: "string", enum: ["yes", "partly", "no"] }, note: str } } },
    violations: { type: "array", items: str },
    stale: { type: "boolean" },
    scores: { type: "object", additionalProperties: false, required: ["hook", "slide2", "clarity", "save", "share", "voice"], properties: { hook: num, slide2: num, clarity: num, save: num, share: num, voice: num } },
    edits: { type: "array", items: str },
    better_hook: str,
    verdict: { type: "string", enum: ["pass", "revise"] },
  },
};

function exemplar(series) {
  // The newest post of the series that Matthew approved by hand and that passes
  // today's gates; failing that, any post of the series.
  const f0 = (p, n) => (existsSync(join(POSTS, p.id, n)) ? readFileSync(join(POSTS, p.id, n), "utf8") : "");
  const ofSeries = [...calendar.posts].reverse().filter((p) => existsSync(join(POSTS, p.id, "spec.json")) && readJson(join(POSTS, p.id, "spec.json")).series === series);
  const passes = (p) => validatePost(readJson(join(POSTS, p.id, "spec.json")), f0(p, "caption.md"), f0(p, "sources.md"), cfg).length === 0;
  const pick = ofSeries.find((p) => !p.drafted_by && passes(p)) || ofSeries.find((p) => !p.drafted_by) || ofSeries[0];
  if (!pick) return "(no example of this series yet; follow the playbook and the schema)";
  const f = (n) => (existsSync(join(POSTS, pick.id, n)) ? readFileSync(join(POSTS, pick.id, n), "utf8") : "");
  return `### spec.json\n${f("spec.json")}\n### caption.md\n${f("caption.md")}\n### sources.md\n${f("sources.md")}`;
}

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").split("-").slice(0, 6).join("-");

function assemble(item, slot, d) {
  const series = item.series, isReel = SERIES[series].kind === "reel";
  const id = `${slot.date}-${slugify(d.slug || item.idea)}`;
  const dest = research.destinations.find((x) => x.url === item.link_url);
  const spec = {
    id, ...(isReel ? { kind: "reel" } : {}), date: slot.date, series,
    ...(item.remix_of ? { source: item.remix_of } : {}),
    ground: SERIES[series].ground, ...(isReel ? {} : { bodyGround: SERIES[series].bodyGround }),
    age: d.age || item.age, row: item.row,
    ...(item.scene ? { scene: item.scene } : {}),
    link: { label: d.link_label, page: d.link_page || dest?.page, url: item.link_url },
    music: { brief: d.music_brief },
    sources: d.sources,
    research: item.cards,
    drafted: { by: "draft.mjs", model: cfg.model, on: TODAY },
    ...(d.labels?.length ? { labels: d.labels } : {}),
    ...(isReel ? { beats: d.beats || [] } : { slides: d.slides || [] }),
  };
  const tags = (d.hashtags || []).map((t) => `#${String(t).replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "").toLowerCase()}`).filter((t) => t.length > 1);
  const captionMd = `# Caption\n\n${String(d.caption_body).trim()}\n\n## Hashtags\n${tags.join(" ")}\n`;
  const sourcesMd = `# Sources

Drafted on ${TODAY} by the automated drafter (scripts/draft.mjs, ${cfg.model}) from the site's collected research: ${item.cards.map((c) => `\`${c}\``).join(", ")}. Each claim is traced below to the card it comes from; a separate critic pass checks the trace before a post is queued.

${(d.citations || d.sources).map((c) => `- ${c}`).join("\n")}

## Claims traced

| Where | Claim | Card and source |
| --- | --- | --- |
${(d.claims || []).map((c) => `| ${c.where} | ${String(c.claim).replace(/\|/g, "/")} | \`${c.card}\`${c.citation ? `; ${String(c.citation).replace(/\|/g, "/")}` : ""} |`).join("\n")}
`;
  return { id, spec, captionMd, sourcesMd };
}

function renderCheck(post) {
  const dir = mkdtempSync(join(tmpdir(), `ig-${post.id}-`));
  writeJson(join(dir, "spec.json"), post.spec);
  try {
    execFileSync(process.execPath, [join(HERE, "render-carousel.mjs"), dir], { stdio: "pipe" });
  } catch { /* the check file says why */ }
  const checkFile = join(dir, "out", "check.json");
  const problems = existsSync(checkFile) ? readJson(checkFile).problems : ["the carousel did not render"];
  return { dir, problems };
}

function bar(scores, need) {
  return Object.entries(need).filter(([k, v]) => (scores?.[k] ?? 0) < v).map(([k, v]) => `${k} ${scores?.[k] ?? 0} (needs ${v})`);
}

async function makePost(item) {
  const slot = slots.find((s) => s.at === item.slot);
  const cards = item.cards.map((c) => cardById.get(c));
  const lessonFiles = [...new Set(cards.map((c) => c.lesson).filter(Boolean))].slice(0, 2);
  const remix = item.remix_of && existsSync(join(POSTS, item.remix_of, "spec.json"))
    ? `## The carousel this reel retells (${item.remix_of})\n${readFileSync(join(POSTS, item.remix_of, "spec.json"), "utf8")}\n${readFileSync(join(POSTS, item.remix_of, "sources.md"), "utf8")}`
    : "";
  const base = `## The plan
${JSON.stringify(item, null, 2)}

Slot: ${slot.at} (${weekday(slot.at)}), ${slot.kind}. Series: ${item.series}.
Destination: ${item.link_url} (${research.destinations.find((d) => d.url === item.link_url)?.page}).
${item.scene ? `Scene: ${item.scene}. Label anchors must be ones drawn on it.` : ""}

## Research cards (the only facts the post may use)
${cards.map((c) => `[${c.id}] ${c.kind}, ${c.confidence}\n${c.text}${c.summary ? `\nSummary: ${c.summary}` : ""}\nSources: ${c.sources}${c.note ? `\nConfidence note: ${c.note}` : ""}`).join("\n\n")}

## Rejected claims
${research.rejected.map((r) => `- ${r.claim}: ${r.why}`).join("\n")}

${remix}

## The lesson behind the cards (Matthew's own teaching script and its full research list; use it for plain wording and context, and for facts only where a card above carries them)
${lessonFiles.map((f) => `### ${research.lessons.get(f).label}\n${research.lessons.get(f).text}`).join("\n\n")}

## An approved ${item.series} post, for structure and voice
${exemplar(item.series)}
`;
  let feedback = "", last = null, priorNotes = "";
  for (let round = 0; round <= cfg.max_revisions; round++) {
    const { data: d } = await ask({
      system: `${PLAYBOOK}\n\n${prompt("writer")}`,
      prompt: `${base}${feedback ? `\n\n## Your previous draft\n${JSON.stringify(last.draft, null, 2)}\n\n## What has to change\n${feedback}` : ""}`,
      schema: WRITER_SCHEMA, model: cfg.model, effort: cfg.effort, label: `writer ${slot.date} r${round}`,
    });
    const post = assemble(item, slot, d);
    const problems = validatePost(post.spec, post.captionMd, post.sourcesMd, cfg);
    let render = null;
    if (SERIES[item.series].kind === "carousel") { render = renderCheck(post); problems.push(...render.problems); }
    const { data: crit } = await ask({
      system: `${PLAYBOOK}\n\n${prompt("critic")}`,
      prompt: `## The draft${round ? ` (revision ${round})` : ""}\n### spec.json\n${JSON.stringify(post.spec, null, 2)}\n### caption.md\n${post.captionMd}\n### sources.md\n${post.sourcesMd}\n\n## Problems the automatic gates found\n${problems.length ? problems.map((p) => `- ${p}`).join("\n") : "none"}\n${priorNotes ? `\n## Your notes on the previous draft (check each was addressed)\n${priorNotes}\n` : ""}\n## Posts already made or queued\n${recentLines.join("\n")}\n\n${base}`,
      schema: CRITIC_SCHEMA, model: cfg.model, effort: cfg.effort, label: `critic ${slot.date} r${round}`,
    });
    const unsupported = crit.claims.filter((c) => c.support !== "yes");
    // Accuracy, the rules and freshness are never traded. Craft must reach
    // pass_scores; on the last round, floor_scores (still publishable) will do.
    const lastRound = round === cfg.max_revisions;
    const sound = !problems.length && !unsupported.length && !crit.violations.length && !crit.stale;
    const short = bar(crit.scores, cfg.pass_scores);
    const pass = sound && ((crit.verdict === "pass" && !short.length) || (lastRound && !bar(crit.scores, cfg.floor_scores).length));
    last = { draft: d, post, problems, crit, render };
    // DRAFT_LOG_DIR keeps every round's draft and critique, for tuning the prompts.
    if (process.env.DRAFT_LOG_DIR) { mkdirSync(process.env.DRAFT_LOG_DIR, { recursive: true }); writeJson(join(process.env.DRAFT_LOG_DIR, `${post.id}-r${round}.json`), { spec: post.spec, caption: post.captionMd, sources: post.sourcesMd, problems, critique: crit }); }
    say(`  ${post.id} round ${round}: ${pass ? "PASS" : "revise"} | scores ${Object.entries(crit.scores).map(([k, v]) => `${k} ${v}`).join(", ")}${problems.length ? ` | gates: ${problems.length}` : ""}${unsupported.length ? ` | claims: ${unsupported.length} not fully supported` : ""}`);
    if (pass) return { ok: true, item, slot, ...last };
    if (render?.dir && round < cfg.max_revisions) rmSync(render.dir, { recursive: true, force: true });
    feedback = [
      problems.length ? `Gate problems (each must be fixed):\n${problems.map((p) => `- ${p}`).join("\n")}` : "",
      unsupported.length ? `Claims the research does not fully support (fix or cut):\n${unsupported.map((c) => `- ${c.where || ""} "${c.claim}": ${c.support}. ${c.note || ""}`).join("\n")}` : "",
      crit.violations.length ? `Rule breaks:\n${crit.violations.map((v) => `- ${v}`).join("\n")}` : "",
      crit.stale ? "The critic found this repeats an idea a recent or queued post already made. Find a different angle from the same cards or say something new." : "",
      short.length ? `Scores below the bar: ${short.join(", ")}.` : "",
      `Critic's edits:\n${crit.edits.map((e) => `- ${e}`).join("\n")}`,
      crit.better_hook ? `A stronger hook the critic suggests: "${crit.better_hook}"` : "",
    ].filter(Boolean).join("\n\n");
    priorNotes = [...crit.violations.map((v) => `- rule: ${v}`), ...unsupported.map((c) => `- claim (${c.support}): ${c.claim}`), ...crit.edits.map((e) => `- edit: ${e}`)].join("\n");
  }
  if (last?.render?.dir) rmSync(last.render.dir, { recursive: true, force: true });
  return { ok: false, item, slot, ...last, reason: feedback };
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; try { out[i] = await fn(items[i]); } catch (e) { out[i] = { ok: false, item: items[i], slot: slots.find((s) => s.at === items[i].slot), reason: e.message }; } }
  }));
  return out;
}

say("\nWriting:");
const results = await pool(plan, Number(process.env.DRAFT_CONCURRENCY || 3), makePost);

// ---------- 7. queue ----------
const queued = [];
for (const r of results) {
  if (!r.ok) continue;
  const folder = join(POSTS, r.post.id);
  mkdirSync(folder, { recursive: true });
  writeJson(join(folder, "spec.json"), r.post.spec);
  writeFileSync(join(folder, "caption.md"), r.post.captionMd);
  writeFileSync(join(folder, "sources.md"), r.post.sourcesMd);
  if (r.render?.dir) { cpSync(join(r.render.dir, "out"), join(folder, "out"), { recursive: true }); rmSync(r.render.dir, { recursive: true, force: true }); }
  calendar.posts.push({
    id: r.post.id, ...(r.post.spec.kind === "reel" ? { kind: "reel" } : {}), series: r.post.spec.series, age: r.post.spec.age, row: r.post.spec.row,
    scheduled_at: r.slot.at, status: cfg.auto_approve ? "approved" : "draft", ...(cfg.auto_approve ? { approved_on: TODAY } : {}),
    ...(r.post.spec.source ? { source: r.post.spec.source } : {}),
    drafted_by: "draft.mjs", scores: r.crit.scores,
  });
  queued.push(r);
}
calendar.posts.sort((x, y) => new Date(x.scheduled_at) - new Date(y.scheduled_at));
if (queued.length) writeJson(CALENDAR, calendar);

// Previews for the batch issue: carousel covers uploaded beside where the post will live.
async function preview(r) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out = join(POSTS, r.post.id, "out");
  if (!base || !key || !existsSync(out)) return [];
  const urls = [];
  for (const f of readdirSync(out).filter((x) => /^slide-0[12]\.jpg$/.test(x)).sort()) {
    const path = `instagram/${r.post.id}/preview-${f}`;
    const res = await fetch(`${base}/storage/v1/object/social/${path}`, { method: "POST", headers: { authorization: `Bearer ${key}`, apikey: key, "content-type": "image/jpeg", "x-upsert": "true" }, body: readFileSync(join(out, f)) });
    if (res.ok) urls.push(`${base}/storage/v1/object/public/social/${path}`);
  }
  return urls;
}

if (SUMMARY) {
  const lines = [];
  lines.push(`${queued.length} post(s) drafted, checked against the research and queued${cfg.auto_approve ? " as approved" : " as drafts"}. Each publishes on its slot unless you hold it: tick **Hold** on any post below before its time (the publisher reads this issue on every run; untick to release it).`, "");
  for (const r of queued) {
    const s = r.post.spec, o = s.slides?.[0] ?? s.beats?.[0] ?? {};
    const imgs = await preview(r);
    lines.push(`- [ ] Hold \`${s.id}\``);
    lines.push(`  **${weekday(r.slot.at)}, ${s.kind === "reel" ? "7 pm reel" : "11 am carousel"} (${s.series})**: "${o.lead || o.claim || o.text}" ${s.age}. Links to [${s.link.page}](https://growingmindsscience.com${s.link.url}). Scores: ${Object.entries(r.crit.scores).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
    for (const u of imgs) lines.push(`  <img src="${u}" width="270">`);
    const { body } = splitCaption(r.post.captionMd);
    const script = s.kind === "reel" ? s.beats.filter((b) => b.say).map((b) => `> ${b.say}`).join("\n") : s.slides.map((x, i) => `${i + 1}. ${[x.lead, x.claim, x.head, x.sub, x.now, x.body, ...(x.items || [])].filter(Boolean).join(" / ")}`).join("\n");
    lines.push("", `  <details><summary>${s.kind === "reel" ? "Script" : "Slides"} and caption</summary>`, "", script.split("\n").map((l) => `  ${l}`).join("\n"), "", body.split("\n").map((l) => `  ${l}`).join("\n"), "", "  </details>", "");
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    lines.push("", `**Not queued** (the slot stays empty and is tried again on the next run):`);
    for (const r of failed) lines.push(`- ${r.slot?.date} ${r.item.series}: "${r.item.hook}". ${r.reason ? r.reason.split("\n").filter(Boolean).slice(0, 3).join(" ").slice(0, 400) : ""}`);
  }
  writeFileSync(SUMMARY, lines.join("\n") + "\n");
}
say(`\ndraft: ${queued.length} queued, ${results.length - queued.length} not queued`);
if (!queued.length && results.length) process.exitCode = 1;
