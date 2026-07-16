/**
 * Activity mechanical grader (plan 2.1 compilation pipeline step 3). Runs at
 * enqueue time — a draft enters the review queue only with its report
 * attached, and hard-fails never reach Matthew's queue at all.
 *
 * Reuses the Number Path cert primitives: banned-language floor
 * (never-diagnostic register) and Flesch-Kincaid readability.
 */
import { lintBanned } from "../nsc-compiler/banned";
import { fleschKincaidGrade } from "../nsc-compiler/readability";
import { lintSafety } from "./safety";
import { MECHANISM_TAG_SET } from "./mechanisms";
import {
  ACTIVITY_DOMAINS,
  ACTIVITY_SETTINGS,
  type ActivityDraft,
} from "../../lib/activity-types";

export interface GradeCheck {
  name: string;
  status: "pass" | "fail";
  details: string;
}

export interface GradeReport {
  slug: string;
  pass: boolean;
  checks: GradeCheck[];
}

const MAX_FK_GRADE = 8;
/** Token-set Jaccard fail line. v1 stand-in for the plan's pgvector
 * embedding-cosine check; replace when an embeddings provider is wired. */
const DUPLICATE_JACCARD = 0.6;

function check(name: string, ok: boolean, details: string): GradeCheck {
  return { name, status: ok ? "pass" : "fail", details };
}

function requiredFields(d: ActivityDraft): GradeCheck {
  const problems: string[] = [];
  if (!d.slug?.match(/^[a-z0-9]+(-[a-z0-9]+)*$/)) problems.push("slug (kebab-case) missing/invalid");
  if (!d.title?.trim()) problems.push("title empty");
  if (!(Number.isInteger(d.months_min) && Number.isInteger(d.months_max)))
    problems.push("months not integers");
  else if (!(d.months_min >= 0 && d.months_max > d.months_min && d.months_max <= 60))
    problems.push(`months range invalid (${d.months_min}–${d.months_max})`);
  if (!d.intention?.trim()) problems.push("intention empty");
  else if (d.intention.trim().split(/\s+/).length < 8)
    problems.push("intention too thin to name a mechanism (<8 words)");
  if (!Array.isArray(d.steps) || d.steps.length < 3 || d.steps.length > 8)
    problems.push(`steps must be 3–8 (got ${d.steps?.length ?? 0})`);
  if (!d.adapt_down?.trim()) problems.push("adapt_down empty");
  if (!d.adapt_up?.trim()) problems.push("adapt_up empty");
  if (!d.evidence_note?.trim()) problems.push("evidence_note empty");
  if (!Array.isArray(d.materials)) problems.push("materials missing");
  return check(
    "required-fields",
    problems.length === 0,
    problems.length ? problems.join("; ") : "all present",
  );
}

function enums(d: ActivityDraft): GradeCheck {
  const problems: string[] = [];
  if (!d.domains?.length || d.domains.some((x) => !ACTIVITY_DOMAINS.includes(x)))
    problems.push(`domains invalid: ${JSON.stringify(d.domains)}`);
  if (!d.setting?.length || d.setting.some((x) => !ACTIVITY_SETTINGS.includes(x)))
    problems.push(`setting invalid: ${JSON.stringify(d.setting)}`);
  if (!(d.mess_level >= 1 && d.mess_level <= 3)) problems.push(`mess_level ${d.mess_level}`);
  if (!(d.duration_min >= 1 && d.duration_min <= 60)) problems.push(`duration_min ${d.duration_min}`);
  if (d.themes?.some((t) => !/^[a-z0-9_]+$/.test(t))) problems.push("theme slugs must be lower_snake");
  return check("enums", problems.length === 0, problems.length ? problems.join("; ") : "valid");
}

function mechanisms(d: ActivityDraft): GradeCheck {
  if (!d.mechanism_tags?.length)
    return check("mechanism-vocabulary", false, "no mechanism tags");
  const unknown = d.mechanism_tags.filter((t) => !MECHANISM_TAG_SET.has(t));
  return check(
    "mechanism-vocabulary",
    unknown.length === 0,
    unknown.length ? `unknown tags: ${unknown.join(", ")}` : `${d.mechanism_tags.length} tags resolve`,
  );
}

function safety(d: ActivityDraft): GradeCheck {
  // The lexicon governs content aimed under 36 months (plan 2.1).
  if (d.months_min >= 36) return check("safety-lexicon", true, "36m+ activity — lexicon not applied");
  const hits = lintSafety(d, d.safety_notes ?? "");
  return check(
    "safety-lexicon",
    hits.length === 0,
    hits.length
      ? hits.slice(0, 5).map((h) => `[${h.tier}:${h.pattern}] at ${h.path}: "…${h.excerpt}…"`).join("; ")
      : "no hazard-lexicon hits",
  );
}

function readability(d: ActivityDraft): GradeCheck {
  const texts = [
    d.title,
    d.intention,
    ...d.steps,
    d.adapt_down,
    d.adapt_up,
    d.evidence_note,
    d.safety_notes ?? "",
  ].filter(Boolean);
  const r = fleschKincaidGrade(texts);
  return check(
    "readability",
    r.grade <= MAX_FK_GRADE,
    `FK grade ${r.grade} (${r.words} words) — limit ${MAX_FK_GRADE}`,
  );
}

function bannedLanguage(d: ActivityDraft): GradeCheck {
  const hits = lintBanned(d);
  return check(
    "banned-language",
    hits.length === 0,
    hits.length
      ? hits.slice(0, 5).map((h) => `[${h.pattern}] at ${h.path}`).join("; ")
      : "no banned language",
  );
}

function materialsHousehold(d: ActivityDraft): GradeCheck {
  const bad = (d.materials ?? []).filter(
    (m) => m.household_common === false && !m.note?.trim(),
  );
  return check(
    "materials-household",
    bad.length === 0,
    bad.length
      ? `non-household without a note: ${bad.map((m) => m.item).join(", ")}`
      : "all household-common or explicitly noted",
  );
}

function tokens(d: ActivityDraft): Set<string> {
  const text = [d.title, d.intention, ...(d.steps ?? [])].join(" ");
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function duplicates(
  d: ActivityDraft,
  others: ActivityDraft[],
): GradeCheck {
  const mine = tokens(d);
  const worst = others
    .filter((o) => o.slug !== d.slug)
    .map((o) => ({ slug: o.slug, sim: jaccard(mine, tokens(o)) }))
    .sort((a, b) => b.sim - a.sim)[0];
  const ok = !worst || worst.sim < DUPLICATE_JACCARD;
  return check(
    "duplicate-similarity",
    ok,
    worst
      ? `nearest: ${worst.slug} at ${worst.sim.toFixed(2)} (fail line ${DUPLICATE_JACCARD})`
      : "no comparison set",
  );
}

/** Grade one draft against the rubric and its batch/published context. */
export function gradeActivity(
  draft: ActivityDraft,
  context: ActivityDraft[] = [],
): GradeReport {
  const checks = [
    requiredFields(draft),
    enums(draft),
    mechanisms(draft),
    safety(draft),
    readability(draft),
    bannedLanguage(draft),
    materialsHousehold(draft),
    duplicates(draft, context),
  ];
  return {
    slug: draft.slug ?? "(no slug)",
    pass: checks.every((c) => c.status === "pass"),
    checks,
  };
}

/** Grade a whole batch (each draft sees the rest as duplicate context). */
export function gradeBatch(
  drafts: ActivityDraft[],
  published: ActivityDraft[] = [],
): GradeReport[] {
  const context = [...drafts, ...published];
  return drafts.map((d) => gradeActivity(d, context));
}
