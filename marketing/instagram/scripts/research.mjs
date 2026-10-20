#!/usr/bin/env node
// The research the drafter is allowed to use, and which of it is still fresh.
//
//   node marketing/instagram/scripts/research.mjs            # counts, and the top fresh candidates
//   import { loadResearch, freshCandidates } from "./research.mjs";
//
// Everything here was collected and checked for the site and the classes; the
// drafter writes from nothing else (README, "Citation and claims gate").
//   lesson findings  knowledge/sources/*.md, "Research behind this lesson": one card per
//                    Finding / Sources / Confidence triple. Callback-only findings, LOW
//                    confidence and anything marked pending verification are left out.
//   lesson myths     the same files, "Common myths": correction-series material.
//   claims           keel/artifacts/claims/claims.v1.json, each with its /claims/<slug> page.
//   curated          knowledge/curated.mjs, the 18 framework cards.
// Destinations come from assets/data/explore.json plus the claim pages and the free
// preview lesson. Classes are never a destination (README, "Bringing parents to the site").
//
// Freshness: a card is stale when its id is already on a post, or when its lead study
// (first author and year) was on a post within cooldown_days.research. calendar.json
// (anything not rejected), ledger.json and the legacy carousel log are all counted.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { IG, ROOT, POSTS, CALENDAR, LEDGER, INSIGHTS, AUTOMATION, readJson } from "./_lib.mjs";

const SOURCES_DIR = join(ROOT, "knowledge", "sources");
export const BANDS = { infant: "0 to 12 months", toddler: "1 to 3 years", preschool: "3 to 5 years" };
const CLASS_PAGE = { infant: "/classes/birth-to-12-months", toddler: "/classes/toddlerhood", preschool: "/classes/preschool" };

// The README's topic matrix rows, matched loosely from a lesson's tags and title.
export const ROWS = {
  "language and communication": /\b(talk|word|language|speech|babbl|read|book|literacy|conversation|gesture|point|bilingual|chatter|voice)/i,
  "big feelings and meltdowns": /\b(tantrum|meltdown|feeling|anger|angry|cry|calm|alarm|brakes|storm|repair|conflict|fear|stress|regulat)/i,
  "sleep, routines, transitions": /\b(sleep|nap|night|bedtime|routine|transition|separation|leaving|morning)/i,
  "play and attention": /\b(play|pretend|toy|attention|hidden|explore|move|walk|crawl|curious|risky|rough)/i,
  screens: /\b(screen|tv|tablet|phone|video|media|app)/i,
  "is this normal": /\b(normal|late talker|milestone|range|check|worr|typical|delay|when to)/i,
  "the parent's own state": /\b(parent|your calm|borrowed|co-regulat|nervous system|guilt|many hands|caregiver)/i,
};
// "18 months" -> 1 to 3 years; "Birth to 3 years" and "8 to 14 months" -> 0 to 12 months.
export function bandOfAge(age) {
  const a = String(age || "");
  if (/^\s*(birth|newborn)/i.test(a)) return BANDS.infant;
  const n = Number(a.match(/\d+/)?.[0] ?? NaN);
  if (Number.isNaN(n)) return BANDS.toddler;
  const months = /month/i.test(a) && !/year/i.test(a.split(/\d+/)[1] || "") ? n : n * 12;
  return months < 12 ? BANDS.infant : months < 36 ? BANDS.toddler : BANDS.preschool;
}
export function rowOf(text) {
  for (const [row, re] of Object.entries(ROWS)) if (re.test(text)) return row;
  return "play and attention";
}

// Lead study of a citation string: first surname and first year, as "romeo-2018".
export function studyKeys(text) {
  const keys = new Set();
  const parts = String(text || "").split(/(?<=\.)\s+(?=[A-Z][\w'’-]+(?:,| et al| &| and)[^.]{0,160}?\(?(?:19|20)\d{2})|;\s+(?=[A-Z])/);
  for (const part of parts) {
    const name = part.match(/^[^A-Za-z]*([A-Z][\w'’-]{2,})/);
    const year = part.match(/\b((?:19|20)\d{2})[a-z]?\b/);
    if (name && year && !/^(The|Infant|Toddler|Preschool|Lesson|Class|Growing|Callback|Center|Sources)$/.test(name[1])) keys.add(`${name[1].toLowerCase()}-${year[1]}`);
  }
  return [...keys];
}

function parseLesson(file) {
  const text = readFileSync(join(SOURCES_DIR, file), "utf8");
  const header = text.match(/^<!--([\s\S]*?)-->/)?.[1] || "";
  const label = header.match(/source-label:\s*(.+)/)?.[1]?.trim() || basename(file, ".md");
  const tags = header.match(/tags:\s*(.+)/)?.[1]?.trim() || "";
  const cls = file.split("-")[0] in BANDS ? file.split("-")[0] : "infant";
  const title = label.split(":").slice(-1)[0].replace(/^\s*Lesson [\d.]+,\s*/, "").trim();
  const lesson = { file, label, title, tags, cls, band: BANDS[cls], row: rowOf(`${title} ${tags}`), page: CLASS_PAGE[cls], text };
  const findings = [], myths = [];
  const research = text.split(/\n## Research behind this lesson.*\n/).slice(1).join("\n");
  let n = 0;
  for (const block of research.split(/\n\s*\n/)) {
    const f = block.match(/^Finding:\s*([\s\S]*?)\nSources:\s*([\s\S]*?)\nConfidence:\s*([\s\S]*?)(?:\nStatus:\s*([\s\S]*))?$/m);
    if (!f) continue;
    n++;
    const confidence = f[3].trim();
    if (/^Callback/i.test(confidence) || /^LOW/i.test(confidence) || /pending/i.test(f[4] || "")) continue;
    findings.push({
      id: `${basename(file, ".md")}#f${n}`, kind: "finding", lesson: file, band: lesson.band, row: lesson.row,
      text: f[1].trim(), sources: f[2].trim(), confidence: (confidence.match(/^(HIGH|MODERATE-HIGH|MODERATE)/i)?.[1] || "MODERATE").toUpperCase(), note: confidence,
      keys: studyKeys(f[2]),
    });
  }
  const mythPart = text.split(/\n## Common myths\s*\n/)[1]?.split(/\n## /)[0] || "";
  let m = 0;
  for (const block of mythPart.split(/\n\s*\n/)) {
    const x = block.match(/^Myth:\s*([\s\S]*?)\nWhat the research shows:\s*([\s\S]*)$/m);
    if (!x) continue;
    m++;
    myths.push({ id: `${basename(file, ".md")}#m${m}`, kind: "myth", lesson: file, band: lesson.band, row: lesson.row, text: x[1].trim().replace(/^"|"$/g, ""), sources: x[2].trim(), confidence: "myth", keys: studyKeys(x[2]) });
  }
  return { lesson, findings, myths };
}

export async function loadResearch() {
  const lessons = new Map();
  const cards = [];
  for (const file of readdirSync(SOURCES_DIR).filter((f) => f.endsWith(".md") && f !== "README.md")) {
    const { lesson, findings, myths } = parseLesson(file);
    lessons.set(file, lesson);
    cards.push(...findings, ...myths);
  }
  const claims = readJson(join(ROOT, "keel", "artifacts", "claims", "claims.v1.json")).claims;
  for (const c of claims) {
    const cites = c.sources.map((s) => s.citation);
    cards.push({
      id: `claim:${c.slug}`, kind: "claim", band: "birth to 5 years", row: rowOf(`${c.domain} ${c.claim_text}`),
      text: `${c.claim_text} Verdict (${c.grade_strength}, ${c.grade_consensus}): ${c.verdict_label}`, summary: c.summary_public,
      sources: c.sources.map((s) => `${s.citation} (${s.role})`).join(" "), confidence: c.grade_strength, link: `/claims/${c.slug}`,
      keys: cites.map((s) => { const n = s.match(/^([A-Z][\w'’-]+)/); const y = s.match(/\b((?:19|20)\d{2})\b/); return n && y ? `${n[1].toLowerCase()}-${y[1]}` : null; }).filter(Boolean),
    });
  }
  const { CURATED } = await import(pathToFileURL(join(ROOT, "knowledge", "curated.mjs")).href);
  for (const c of CURATED) {
    cards.push({ id: `curated:${c.id}`, kind: "curated", band: c.ageBands?.length ? c.ageBands.join(", ") : "birth to 5 years", row: rowOf(`${c.title} ${c.tags.join(" ")}`), text: `${c.title}. ${c.text}`, sources: `${c.source.label}${c.source.url ? `, ${c.source.url}` : ""}`, confidence: "framework", keys: [] });
  }
  return { lessons, cards, destinations: destinations(claims), rejected: readJson(LEDGER).rejected || [] };
}

function destinations(claims) {
  const cfg = readJson(AUTOMATION);
  const explore = readJson(join(ROOT, "assets", "data", "explore.json"));
  const stage = Object.fromEntries(explore.stages.map((s) => [s.id, s.years]));
  const out = explore.items
    .filter((i) => i.type !== "class" && !(cfg.blocked_links || []).some((b) => i.href.startsWith(b)))
    .map((i) => ({ url: i.href, page: i.title, type: i.type, ages: (i.ages || []).map((a) => stage[a] || a).join(", "), topics: (i.topics || []).join(", ") }));
  for (const c of claims) if (!out.some((d) => d.url === `/claims/${c.slug}`)) out.push({ url: `/claims/${c.slug}`, page: `Parenting claims, graded: ${c.claim_text}`, type: "claim", ages: "birth to 5", topics: c.domain });
  out.push({ url: "/nsc/classes/infant/preview", page: "Serve and Return, a full class lesson, free to watch", type: "free lesson", ages: "Birth to 1", topics: "communication, relationships" });
  return out;
}

// What has already been said: every non-rejected calendar post and the ledger.
export function usedSoFar() {
  const calendar = readJson(CALENDAR);
  const posts = [];
  for (const e of calendar.posts) {
    if (["rejected"].includes(e.status)) continue;
    const f = join(POSTS, e.id, "spec.json");
    if (!existsSync(f)) continue;
    const spec = readJson(f);
    const o = spec.slides?.[0] ?? spec.beats?.[0] ?? {};
    const sources = spec.sources || spec.slides?.find((s) => s.type === "sources")?.sources || [];
    const srcFile = join(POSTS, e.id, "sources.md");
    const srcMd = existsSync(srcFile) ? readFileSync(srcFile, "utf8") : "";
    posts.push({
      id: e.id, date: (e.scheduled_at || spec.date || "").slice(0, 10), status: e.status, series: spec.series, kind: spec.kind || "carousel",
      row: spec.row, age: spec.age, hook: o.lead || o.claim || o.text || "", research: spec.research || [], source: spec.source || null,
      keys: studyKeys(`${sources.join(" ")} ${srcMd}`), scene: spec.scene || null,
    });
  }
  const ledger = readJson(LEDGER);
  for (const u of ledger.used || []) if (!posts.some((p) => p.id === u.post)) posts.push({ id: u.post, date: u.date, status: "published", series: u.series, row: null, hook: u.topic, research: [], keys: studyKeys(u.source) });
  const log = join(ROOT, "marketing", "carousels", "daily-log.md");
  if (existsSync(log)) for (const line of readFileSync(log, "utf8").split("\n").filter((l) => /^\d{4}-\d{2}-\d{2} \|/.test(l))) {
    const [date, , topic, source] = line.split("|").map((x) => x.trim());
    posts.push({ id: `legacy-${date}`, date, status: "legacy", series: "legacy", row: null, hook: topic, research: [], keys: studyKeys(source) });
  }
  return posts.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

// Rank fresh cards for the strategist: confidence, a matrix gap (age band and row
// not posted lately), a lesson not drawn on lately, concrete numbers (they make
// hooks), and once there are enough settled posts, the rows that earn saves.
export function freshCandidates(research, used, now = new Date(), limit = 60) {
  const cfg = readJson(AUTOMATION);
  const days = (d) => (now - new Date(d)) / 86400000;
  const usedIds = new Set(used.flatMap((p) => p.research));
  const recentKeys = new Set(used.filter((p) => !p.date || days(p.date) < cfg.cooldown_days.research).flatMap((p) => p.keys));
  const lastBand = {}, lastRow = {}, lastLesson = {};
  for (const p of used) {
    lastBand[bandOfAge(p.age)] = p.date; if (p.row) lastRow[p.row] = p.date;
    for (const r of p.research) lastLesson[r.split("#")[0]] = p.date;
  }
  let rowSaves = {};
  if (existsSync(INSIGHTS)) {
    const ins = readJson(INSIGHTS);
    const settled = (ins.posts || []).filter((p) => p.post && p.metrics.reach > 0).length;
    if (settled >= 6) rowSaves = Object.fromEntries(Object.entries(ins.by_row || {}).map(([k, v]) => [k, v.save_rate || 0]));
  }
  const gap = (d) => (d ? Math.min(30, days(d)) / 30 : 1);
  const scored = [];
  for (const c of research.cards) {
    if (usedIds.has(c.id)) continue;
    if (c.keys.some((k) => recentKeys.has(k))) continue;
    let s = c.kind === "claim" ? 3 : ({ HIGH: 3, "MODERATE-HIGH": 2.6, MODERATE: 2, myth: 1.6, framework: 1.2 }[c.confidence] ?? 1.5);
    s += gap(lastBand[c.band]) * 1.2 + gap(lastRow[c.row]) * 1.2;
    if (c.lesson) s += gap(lastLesson[c.lesson.replace(/\.md$/, "")]) * 0.8;
    if (/\d/.test(c.text)) s += 0.5;
    if (rowSaves[c.row]) s += Math.min(1, rowSaves[c.row] * 20);
    scored.push({ ...c, score: +s.toFixed(2) });
  }
  scored.sort((a, b) => b.score - a.score);
  // Spread: at most three findings from any one lesson, myths and claims kept apart.
  const perLesson = {}, out = [];
  for (const c of scored) {
    const k = c.lesson || c.kind;
    if (c.lesson && (perLesson[k] = (perLesson[k] || 0) + 1) > 3) continue;
    out.push(c);
  }
  const findings = out.filter((c) => c.kind === "finding").slice(0, limit);
  const myths = out.filter((c) => c.kind === "myth").slice(0, 14);
  const claims = out.filter((c) => c.kind === "claim");
  const curated = out.filter((c) => c.kind === "curated").slice(0, 6);
  return [...findings, ...claims, ...myths, ...curated];
}

if (process.argv[1] && basename(process.argv[1]) === "research.mjs") {
  const r = await loadResearch();
  const used = usedSoFar();
  const by = (k) => r.cards.filter((c) => c.kind === k).length;
  console.log(`research: ${r.lessons.size} lessons, ${by("finding")} findings, ${by("myth")} myths, ${by("claim")} claims, ${by("curated")} curated; ${r.destinations.length} destinations`);
  console.log(`used: ${used.length} posts on record, ${new Set(used.flatMap((p) => p.keys)).size} lead studies`);
  const fresh = freshCandidates(r, used);
  console.log(`fresh shortlist: ${fresh.length}`);
  for (const c of fresh.slice(0, 15)) console.log(`  ${c.score}  ${c.id}  [${c.band} | ${c.row}]  ${c.text.slice(0, 90)}`);
}
