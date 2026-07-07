/**
 * Certification harness — spec §7. Mechanical grader; an artifact ships only
 * on a green report. Pattern mirror of the Spontæ eval harness and the
 * Child Evidence frozen-judge certification.
 *
 * Modes:
 * - "gold": hand-authored exemplar artifacts (PR3). Coverage-matrix and
 *   citation-verified checks are recorded as SKIPPED/WARN — the gold set is
 *   a style+lint anchor, not a complete catalog, and G1 has not run yet.
 * - "full": compiled artifacts (PR4+). Everything enforced, zero tolerance.
 */
import { createHash } from "node:crypto";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { lintBanned, walkStrings } from "./banned";
import { fleschKincaidGrade } from "./readability";

import gameSchema from "./schemas/game.schema.json";
import gamesCatalogSchema from "./schemas/games-catalog.schema.json";
import assessmentCopySchema from "./schemas/assessment-copy.schema.json";
import citationsSchema from "./schemas/citations.schema.json";
import promptsDeckSchema from "./schemas/prompts-deck.schema.json";

const AGE_BANDS = ["24-30m", "30-36m", "36-42m", "42-48m", "48-60m"] as const;
const PROMPTS_PER_BAND = 90;

export type CertMode = "gold" | "full";

export interface CheckResult {
  name: string;
  status: "pass" | "fail" | "skip" | "warn";
  details: string;
}

export interface CertReport {
  artifact: string;
  sha256: string;
  mode: CertMode;
  pass: boolean;
  checks: CheckResult[];
}

const MAX_FK_GRADE = 8;

/**
 * PROPOSED applicability map for the §4.2 coverage matrix (the spec does not
 * enumerate level×band cells — derived from the §1.1 emergence ranges;
 * Matthew to ratify before the full compile).
 */
export const APPLICABLE_BANDS: Record<string, string[]> = {
  L0: ["24-30m", "30-36m", "36-42m"],
  L1: ["24-30m", "30-36m", "36-42m"],
  L2: ["30-36m", "36-42m", "42-48m"],
  L3: ["36-42m", "42-48m"],
  L4: ["36-42m", "42-48m", "48-60m"],
  CP: ["42-48m", "48-60m"],
  CPX: ["48-60m"],
};
const MIN_GAMES_PER_CELL = 4;

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function ajvInstance() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(gameSchema);
  return ajv;
}

interface Citation {
  tag_id: string;
  verified: boolean;
}

function schemaCheck(
  ajv: Ajv,
  schema: object,
  data: unknown,
): CheckResult {
  const validate = ajv.compile(schema);
  const ok = validate(data);
  return {
    name: "json-schema",
    status: ok ? "pass" : "fail",
    details: ok
      ? "valid"
      : (validate.errors ?? [])
          .slice(0, 5)
          .map((e) => `${e.instancePath} ${e.message}`)
          .join("; "),
  };
}

function bannedCheck(data: unknown): CheckResult {
  const hits = lintBanned(data);
  return {
    name: "banned-language",
    status: hits.length === 0 ? "pass" : "fail",
    details:
      hits.length === 0
        ? "no banned language"
        : hits
            .slice(0, 10)
            .map((h) => `[${h.pattern}] at ${h.path}: "…${h.excerpt}…"`)
            .join("; "),
  };
}

function readabilityCheck(data: unknown): CheckResult {
  const texts = [...walkStrings(data)].map(([, t]) => t);
  const r = fleschKincaidGrade(texts);
  return {
    name: "readability",
    status: r.grade <= MAX_FK_GRADE ? "pass" : "fail",
    details: `FK grade ${r.grade} over ${r.pooledStrings} pooled strings (${r.words} words) — limit ${MAX_FK_GRADE}`,
  };
}

function coverageCheck(
  games: { levels: string[]; age_bands: string[] }[],
  mode: CertMode,
): CheckResult {
  if (mode === "gold") {
    return {
      name: "coverage-matrix",
      status: "skip",
      details: "gold mode — exemplar set, coverage enforced at full compile",
    };
  }
  const gaps: string[] = [];
  for (const [level, bands] of Object.entries(APPLICABLE_BANDS)) {
    for (const band of bands) {
      const count = games.filter(
        (g) => g.levels.includes(level) && g.age_bands.includes(band),
      ).length;
      if (count < MIN_GAMES_PER_CELL) {
        gaps.push(`${level}×${band}=${count}`);
      }
    }
  }
  return {
    name: "coverage-matrix",
    status: gaps.length === 0 ? "pass" : "fail",
    details:
      gaps.length === 0
        ? `all cells ≥ ${MIN_GAMES_PER_CELL}`
        : `cells below ${MIN_GAMES_PER_CELL}: ${gaps.join(", ")}`,
  };
}

function evidenceCheck(
  games: { id: string; evidence: { tag_ids: string[] } }[],
  citations: Citation[],
  mode: CertMode,
): CheckResult {
  const table = new Map(citations.map((c) => [c.tag_id, c]));
  const problems: string[] = [];
  for (const g of games) {
    if (g.evidence.tag_ids.length === 0) {
      problems.push(`${g.id}: no evidence tags`);
      continue;
    }
    for (const tag of g.evidence.tag_ids) {
      const row = table.get(tag);
      if (!row) {
        problems.push(`${g.id}: dangling tag ${tag}`);
      } else if (!row.verified && mode === "full") {
        problems.push(`${g.id}: tag ${tag} not G1-verified`);
      }
    }
  }
  const unverifiedInGold =
    mode === "gold" &&
    problems.length === 0 &&
    games.some((g) => g.evidence.tag_ids.some((t) => !table.get(t)?.verified));
  return {
    name: "evidence-tags",
    status:
      problems.length > 0 ? "fail" : unverifiedInGold ? "warn" : "pass",
    details:
      problems.length > 0
        ? problems.slice(0, 10).join("; ")
        : unverifiedInGold
          ? "tags resolve; G1 verification still pending (gold mode allows)"
          : "all tags resolve and are verified",
  };
}

export function certifyGamesCatalog(
  raw: string,
  citationsRaw: string,
  mode: CertMode,
): CertReport {
  const ajv = ajvInstance();
  const data = JSON.parse(raw);
  const citations = JSON.parse(citationsRaw);
  const checks: CheckResult[] = [
    schemaCheck(ajv, gamesCatalogSchema, data),
    bannedCheck(data),
    readabilityCheck(data),
    coverageCheck(data.games ?? [], mode),
    evidenceCheck(data.games ?? [], citations.citations ?? [], mode),
  ];
  return report("games.catalog", raw, mode, checks);
}

/** Normalize a prompt for cross-band duplicate detection (§7.1.6). */
function normalizePrompt(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("{name}", "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Count sentence-terminators as a proxy for the ≤2-sentence rule. */
function sentenceCount(text: string): number {
  return (text.match(/[.!?]+(?:\s|$)/g) ?? []).length || 1;
}

function promptDeckCounts(
  bands: Record<string, string[]>,
): CheckResult {
  const problems: string[] = [];
  for (const band of AGE_BANDS) {
    const list = bands[band] ?? [];
    if (list.length !== PROMPTS_PER_BAND) {
      problems.push(`${band}: ${list.length} prompts (need ${PROMPTS_PER_BAND})`);
    }
    const overLong = list.filter((p) => sentenceCount(p) > 2).length;
    if (overLong > 0) problems.push(`${band}: ${overLong} prompts over 2 sentences`);
    const dupsInBand =
      list.length - new Set(list.map(normalizePrompt)).size;
    if (dupsInBand > 0) problems.push(`${band}: ${dupsInBand} in-band duplicates`);
  }
  return {
    name: "prompt-deck-counts",
    status: problems.length === 0 ? "pass" : "fail",
    details:
      problems.length === 0
        ? `${PROMPTS_PER_BAND} unique ≤2-sentence prompts per band`
        : problems.join("; "),
  };
}

function promptDeckAdjacency(
  bands: Record<string, string[]>,
): CheckResult {
  const overlaps: string[] = [];
  for (let i = 0; i < AGE_BANDS.length - 1; i++) {
    const a = new Set((bands[AGE_BANDS[i]] ?? []).map(normalizePrompt));
    const b = (bands[AGE_BANDS[i + 1]] ?? []).map(normalizePrompt);
    const shared = b.filter((p) => a.has(p));
    if (shared.length > 0) {
      overlaps.push(`${AGE_BANDS[i]}↔${AGE_BANDS[i + 1]}: ${shared.length}`);
    }
  }
  return {
    name: "prompt-deck-adjacency",
    status: overlaps.length === 0 ? "pass" : "fail",
    details:
      overlaps.length === 0
        ? "no duplicate prompts across adjacent bands"
        : `duplicate normalized text across adjacent bands: ${overlaps.join(", ")}`,
  };
}

export function certifyPromptsDeck(raw: string): CertReport {
  const ajv = ajvInstance();
  const data = JSON.parse(raw);
  const bands = data.bands ?? {};
  const checks: CheckResult[] = [
    schemaCheck(ajv, promptsDeckSchema, data),
    bannedCheck(data),
    readabilityCheck(data),
    promptDeckCounts(bands),
    promptDeckAdjacency(bands),
  ];
  return report("prompts.deck", raw, "full", checks);
}

export function certifyAssessmentCopy(raw: string, mode: CertMode): CertReport {
  const ajv = ajvInstance();
  const data = JSON.parse(raw);
  const checks: CheckResult[] = [
    schemaCheck(ajv, assessmentCopySchema, data),
    bannedCheck(data),
    readabilityCheck(data),
  ];
  return report("assessment.copy", raw, mode, checks);
}

export function certifyCitations(raw: string, mode: CertMode): CertReport {
  const ajv = ajvInstance();
  const data = JSON.parse(raw);
  const checks: CheckResult[] = [
    schemaCheck(ajv, citationsSchema, data),
    bannedCheck(data),
  ];
  if (mode === "full") {
    const unverified = (data.citations ?? []).filter(
      (c: Citation) => !c.verified,
    );
    checks.push({
      name: "g1-verified",
      status: unverified.length === 0 ? "pass" : "fail",
      details:
        unverified.length === 0
          ? "all citations human-verified"
          : `unverified: ${unverified.map((c: Citation) => c.tag_id).join(", ")}`,
    });
  } else {
    checks.push({
      name: "g1-verified",
      status: "skip",
      details: "gold mode — G1 human pass has not run",
    });
  }
  return report("citations", raw, mode, checks);
}

function report(
  artifact: string,
  raw: string,
  mode: CertMode,
  checks: CheckResult[],
): CertReport {
  return {
    artifact,
    sha256: sha256Hex(raw),
    mode,
    pass: checks.every((c) => c.status !== "fail"),
    checks,
  };
}
