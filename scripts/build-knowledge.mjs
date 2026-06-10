#!/usr/bin/env node
//
// build-knowledge.mjs
// -------------------
// Compiles the Growing Minds AI knowledge base from three inputs:
//
//   1. The 42 developmental milestones already in milestones.html
//   2. Curated developmental-science cards in knowledge/curated.mjs
//   3. Your own uploaded material (slide decks, scripts) in knowledge/sources/
//
// Output: api/_knowledge-data.js — a single bundled module the edge function
// imports at request time. Run this whenever you change curated cards or add
// files to knowledge/sources/:
//
//   node scripts/build-knowledge.mjs
//
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const cards = [];

// ---------------------------------------------------------------------------
// 1. Milestones from milestones.html (the <script id="tracker-data"> JSON)
// ---------------------------------------------------------------------------
function loadMilestones() {
  const htmlPath = join(ROOT, "milestones.html");
  if (!existsSync(htmlPath)) return 0;
  const html = readFileSync(htmlPath, "utf8");
  const m = html.match(/id="tracker-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return 0;

  let data;
  try {
    data = JSON.parse(m[1]);
  } catch {
    console.warn("  ! Could not parse tracker-data JSON — skipping milestones.");
    return 0;
  }

  const sourceMap = data.sources || {};
  let count = 0;
  for (const ms of data.milestones || []) {
    const sourceLabels = (ms.sources || [])
      .map((key) => sourceMap[key]?.label)
      .filter(Boolean);
    const sourceUrl = (ms.sources || [])
      .map((key) => sourceMap[key]?.url)
      .filter(Boolean)[0];

    const parts = [ms.explanation];
    if (ms.watchFor?.length) parts.push("Signs you may notice: " + ms.watchFor.join("; ") + ".");
    if (ms.tryThis?.length) parts.push("Things to try: " + ms.tryThis.join("; ") + ".");

    cards.push({
      id: "milestone-" + ms.id,
      title: `${ms.domain} (${ms.age}): ${ms.title}`,
      tags: [
        ms.domain.toLowerCase(),
        "milestone",
        "development",
        ms.age,
        ...ms.title.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 3),
      ],
      ageBands: [ms.age],
      source: {
        label: sourceLabels.length ? sourceLabels.join(", ") : "Growing Minds milestone tracker",
        ...(sourceUrl ? { url: sourceUrl } : {}),
      },
      text: parts.join(" "),
    });
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// 2. Curated developmental-science cards
// ---------------------------------------------------------------------------
async function loadCurated() {
  const curatedPath = join(ROOT, "knowledge", "curated.mjs");
  if (!existsSync(curatedPath)) return 0;
  const mod = await import("file://" + curatedPath);
  const list = mod.CURATED || [];
  for (const c of list) cards.push(c);
  return list.length;
}

// ---------------------------------------------------------------------------
// 3. User-uploaded sources (slide decks, scripts) in knowledge/sources/
//    Long files are chunked: on Markdown headings if present, else by size.
// ---------------------------------------------------------------------------
const TEXT_EXT = new Set([".md", ".markdown", ".txt"]);
const MAX_CHUNK_CHARS = 1400;

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function chunkText(raw) {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  // Prefer splitting on Markdown headings so each section is its own chunk.
  const headingSplit = text.split(/\n(?=#{1,6}\s)/);
  const sections = headingSplit.length > 1 ? headingSplit : [text];

  const chunks = [];
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    if (trimmed.length <= MAX_CHUNK_CHARS) {
      chunks.push(trimmed);
      continue;
    }
    // Section still too long: split on paragraphs, packing up to the limit.
    let buf = "";
    for (const para of trimmed.split(/\n\s*\n/)) {
      if ((buf + "\n\n" + para).length > MAX_CHUNK_CHARS && buf) {
        chunks.push(buf.trim());
        buf = para;
      } else {
        buf = buf ? buf + "\n\n" + para : para;
      }
    }
    if (buf.trim()) chunks.push(buf.trim());
  }
  return chunks;
}

function firstHeadingOrLine(chunk) {
  const headingMatch = chunk.match(/^#{1,6}\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  const firstLine = chunk.split("\n").find((l) => l.trim());
  return (firstLine || "").replace(/^#+\s*/, "").trim().slice(0, 90);
}

function loadSources() {
  const dir = join(ROOT, "knowledge", "sources");
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const file of readdirSync(dir)) {
    const ext = extname(file).toLowerCase();
    if (!TEXT_EXT.has(ext)) continue;
    if (file.toLowerCase() === "readme.md") continue;

    const raw = readFileSync(join(dir, file), "utf8");
    const baseName = basename(file, ext);
    const niceName = baseName.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const chunks = chunkText(raw);

    chunks.forEach((chunk, i) => {
      // Strip a leading Markdown heading from the body (kept in the title).
      const body = chunk.replace(/^#{1,6}\s+.+\n?/, "").trim() || chunk;
      const heading = firstHeadingOrLine(chunk);
      cards.push({
        id: `source-${slugify(baseName)}-${i + 1}`,
        title: heading ? `${niceName}: ${heading}` : niceName,
        tags: [
          "growing minds material",
          ...niceName.toLowerCase().split(/\s+/),
          ...heading.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 3),
        ],
        ageBands: [],
        source: { label: `Growing Minds class material — ${niceName}` },
        text: body,
      });
      count++;
    });
  }
  return count;
}

// ---------------------------------------------------------------------------
// Write the bundle
// ---------------------------------------------------------------------------
const nMilestones = loadMilestones();
const nCurated = await loadCurated();
const nSources = loadSources();

const header = `// AUTO-GENERATED by scripts/build-knowledge.mjs — do not edit by hand.
// Sources: ${nMilestones} milestones, ${nCurated} curated cards, ${nSources} chunks from knowledge/sources/.
// Rebuild after changing curated cards or adding files to knowledge/sources/:
//   node scripts/build-knowledge.mjs
//
// Generated: ${new Date().toISOString()}

export const KNOWLEDGE = ${JSON.stringify(cards, null, 2)};
`;

const outPath = join(ROOT, "api", "_knowledge-data.js");
writeFileSync(outPath, header, "utf8");

console.log("Knowledge base built:");
console.log(`  • ${nMilestones} milestone cards`);
console.log(`  • ${nCurated} curated science cards`);
console.log(`  • ${nSources} chunks from your uploaded sources`);
console.log(`  → ${cards.length} cards total written to api/_knowledge-data.js`);
