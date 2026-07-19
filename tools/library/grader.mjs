// Mechanical grader for developmental-library entries. An entry ships only on a
// green grade (scripts/build-library.mjs enforces this). Same behavioral floor
// as the parent AI: it reuses the no-fear / no-diagnosis lexicon from the eval
// harness, so published pages and live AI answers are held to one standard.
//
// Pure and dependency-light. Self-tested by selftest.mjs (planted violations).

import { _patterns } from "../../evals/lib/checks.mjs";

const AGE_BANDS = [
  "0-3 months", "4-6 months", "7-9 months", "10-12 months",
  "13-18 months", "19-24 months", "25-36 months", "3-5 years",
];
const DOMAINS = [
  "Cognitive", "Social-emotional", "Motor", "Language",
  "Sensory & regulation", "Adaptive skills",
];

const FK_MAX = 9.0; // parent-friendly reading grade ceiling

// ── readability (Flesch–Kincaid grade) ──────────────────────────────────────
function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}
export function fleschKincaid(text) {
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const words = (text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []);
  const wordCount = words.length || 1;
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);
  return 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
}

function prose(entry) {
  const parts = [entry.shortAnswer || ""];
  for (const s of entry.sections || []) parts.push(s.body || "");
  parts.push(entry.whenToReachOut || "");
  return parts.join(" ");
}

function anyMatch(patterns, text) {
  return patterns.some((p) => p.test(text));
}

/**
 * Grade one library entry.
 * @param {object} entry
 * @param {Set<string>} knowledgeIds  valid knowledge-card ids (for evidence check)
 * @returns {{ok:boolean, violations:Array<{code,detail}>, fk:number}}
 */
export function gradeEntry(entry, knowledgeIds) {
  const v = [];
  const text = prose(entry);

  // Structure
  if (!entry.slug || !/^[a-z0-9-]+$/.test(entry.slug)) v.push({ code: "slug", detail: "missing or non-kebab slug" });
  if (!entry.question || !/\?\s*$/.test(entry.question.trim())) v.push({ code: "question", detail: "question must be present and end with '?'" });
  if (!AGE_BANDS.includes(entry.ageBand)) v.push({ code: "age-band", detail: `ageBand must be one of ${AGE_BANDS.length} known bands` });
  if (!DOMAINS.includes(entry.domain)) v.push({ code: "domain", detail: `domain must be one of ${DOMAINS.join(", ")}` });
  if (!entry.shortAnswer || entry.shortAnswer.trim().length < 40) v.push({ code: "short-answer", detail: "shortAnswer missing or too short" });
  if (!Array.isArray(entry.sections) || entry.sections.length < 2) v.push({ code: "sections", detail: "need >= 2 body sections" });

  // Behavioral floor — SAME lexicon the AI is graded against.
  if (anyMatch(_patterns.DIAGNOSIS_PATTERNS, text)) v.push({ code: "diagnosis", detail: "diagnostic/labeling phrasing" });
  if (anyMatch(_patterns.ALARM_PATTERNS, text)) v.push({ code: "alarm", detail: "fear/deficit framing" });
  if (_patterns.DOSING_RE.test(text)) v.push({ code: "dosing", detail: "medication dosing advice" });

  // Professional-deferral must be present and calm (a page about a worry must
  // say, without alarm, when reaching out is reasonable).
  if (!entry.whenToReachOut || entry.whenToReachOut.trim().length < 30) {
    v.push({ code: "reach-out", detail: "missing calm 'when to reach out' guidance" });
  }

  // Evidence — every entry must cite at least one resolvable knowledge card.
  const ev = Array.isArray(entry.evidence) ? entry.evidence : [];
  if (ev.length === 0) v.push({ code: "evidence-missing", detail: "no evidence citations" });
  const unresolved = ev.filter((id) => !knowledgeIds.has(id));
  if (unresolved.length) v.push({ code: "evidence-unresolved", detail: `unknown card ids: ${unresolved.join(", ")}` });

  // Readability
  const fk = fleschKincaid(text);
  if (fk > FK_MAX) v.push({ code: "readability", detail: `Flesch–Kincaid ${fk.toFixed(1)} > ${FK_MAX}` });

  return { ok: v.length === 0, violations: v, fk };
}

export { AGE_BANDS, DOMAINS, FK_MAX };
