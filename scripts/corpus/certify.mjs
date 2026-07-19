#!/usr/bin/env node
// Corpus certifier — the integrity layer that makes "one knowledge corpus" real.
//
//   node scripts/corpus/certify.mjs
//
// Knowledge currently derives from several inputs (milestones, curated cards,
// uploaded course material) and is consumed by several surfaces (the parent AI's
// retrieval, the developmental library, article citations, the Navigator). This
// certifier treats the compiled knowledge base as the canonical corpus and
// cross-checks every surface against it and against the citation registry, then
// stamps a hash-certified manifest — the same discipline as the nsc cert reports.
//
// HARD GATES (exit non-zero):
//   1. No duplicate card ids.
//   2. Every library entry's `evidence` id resolves to a real card.
//   3. Every EXTERNAL source.url a card cites is registered + verified in
//      corpus/citations.json (unregistered or unverified => fail).
//   4. Every registered external source URL is well-formed.
// METRICS (reported, not gating): source coverage, provenance mix.
//
// No API key. Deterministic: the manifest carries a content hash, not a wall
// clock, so a clean re-run produces an identical file (idempotent commits).

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { KNOWLEDGE } from "../../api/_knowledge-data.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORPUS_DIR = join(ROOT, "corpus");
const ENTRIES_DIR = join(ROOT, "library", "entries");

const citations = JSON.parse(readFileSync(join(CORPUS_DIR, "citations.json"), "utf8"));
const registeredUrls = new Set(citations.sources.map((s) => s.url));
const verifiedUrls = new Set(citations.sources.filter((s) => s.verified).map((s) => s.url));

const failures = [];
const warnings = [];
const fail = (code, detail) => failures.push({ code, detail });
const warn = (code, detail) => warnings.push({ code, detail });

// ── 1. duplicate ids ─────────────────────────────────────────────────────────
const seen = new Set();
for (const c of KNOWLEDGE) {
  if (seen.has(c.id)) fail("duplicate-id", c.id);
  seen.add(c.id);
}
const cardIds = seen;

// ── 2. library evidence integrity (cross-surface) ────────────────────────────
let libEntries = [];
if (existsSync(ENTRIES_DIR)) {
  libEntries = readdirSync(ENTRIES_DIR).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(ENTRIES_DIR, f), "utf8")));
  for (const e of libEntries) {
    for (const id of e.evidence || []) {
      if (!cardIds.has(id)) fail("library-evidence-unresolved", `${e.slug} → ${id}`);
    }
  }
}

// ── 3 & 4. source registration / verification / URL shape ────────────────────
let withSource = 0;
const provenance = { milestone: 0, "uploaded-source": 0, curated: 0 };
for (const c of KNOWLEDGE) {
  const kind = c.id.startsWith("milestone-") ? "milestone"
    : c.id.startsWith("source-") ? "uploaded-source" : "curated";
  provenance[kind]++;
  const url = c.source?.url;
  if (!url) continue;
  withSource++;
  if (!/^https?:\/\/\S+$/.test(url)) fail("malformed-source-url", `${c.id}: ${url}`);
  if (!registeredUrls.has(url)) fail("unregistered-source", `${c.id}: ${url}`);
  else if (!verifiedUrls.has(url)) fail("unverified-source", `${c.id}: ${url}`);
}
// uploaded-source chunks legitimately have no external URL (source = Matthew's
// curriculum). Report coverage as a metric, not a failure.
const externalCoverage = (withSource / KNOWLEDGE.length);

// ── content hash (deterministic projection) ──────────────────────────────────
const projection = KNOWLEDGE
  .map((c) => `${c.id}\t${c.title}\t${c.source?.url || ""}`)
  .sort()
  .join("\n");
const contentHash = createHash("sha256").update(projection).digest("hex");

const status = failures.length === 0 ? "green" : "red";
const manifest = {
  corpusVersion: citations.version,
  status,
  contentHash,
  counts: {
    cards: KNOWLEDGE.length,
    withExternalSource: withSource,
    externalSourceCoverage: Number(externalCoverage.toFixed(3)),
    provenance,
    registeredSources: citations.sources.length,
    contestedClaims: citations.claims.filter((c) => c.status !== "supported").length,
    libraryEntries: libEntries.length,
  },
  consumers: [
    "api/growing-minds-ai.js (retrieval grounding)",
    "library/entries → answers/ (developmental library)",
    "articles/*.html (citations)",
    "nsc navigator (part_c + citations)",
    "marketing/carousels (research posts)",
  ],
  checks: {
    hardFailures: failures,
    warnings,
  },
};

if (!existsSync(CORPUS_DIR)) mkdirSync(CORPUS_DIR, { recursive: true });
writeFileSync(join(CORPUS_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

// ── report ───────────────────────────────────────────────────────────────────
console.log(`Corpus certification — ${KNOWLEDGE.length} cards, ${libEntries.length} library entries\n`);
console.log(`  provenance: ${provenance.milestone} milestone · ${provenance["uploaded-source"]} uploaded-source · ${provenance.curated} curated`);
console.log(`  external-source coverage: ${(externalCoverage * 100).toFixed(1)}%  (${withSource}/${KNOWLEDGE.length})`);
console.log(`  registered sources: ${citations.sources.length}  |  contested claims tracked: ${manifest.counts.contestedClaims}`);
console.log(`  content hash: ${contentHash.slice(0, 16)}…\n`);
if (warnings.length) { console.log("Warnings:"); for (const w of warnings) console.log(`  · ${w.code}: ${w.detail}`); console.log(""); }
if (failures.length) {
  console.log(`✗ ${failures.length} HARD failure(s):`);
  for (const f of failures.slice(0, 40)) console.log(`  ✗ ${f.code}: ${f.detail}`);
  console.log(`\nManifest: corpus/manifest.json (status: red)`);
  process.exit(1);
}
console.log(`✓ Corpus is GREEN. Manifest: corpus/manifest.json  (hash ${contentHash.slice(0, 12)})`);
