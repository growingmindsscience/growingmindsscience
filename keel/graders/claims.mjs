/* Claims Library grader (portfolio plan 3.4 mechanical checks): every claim
   fully fielded and sourced, grades valid, hedging present wherever strength
   is limited/insufficient, no overclaim vocabulary above the grade, no
   second-person diagnostic framing, reading-level bounds. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fkGrade } from "../lib/activities.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export function loadClaims() {
  return JSON.parse(readFileSync(join(HERE, "..", "artifacts", "claims", "claims.v1.json"), "utf8"));
}

const DOMAINS = new Set(["sleep", "feeding", "screens", "discipline", "language", "milestones", "pregnancy_postpartum", "products_gear"]);
const REQUIRED = ["slug", "domain", "claim_text", "grade_strength", "grade_consensus", "verdict_label", "summary_public", "sources", "last_reviewed"];

const OVERCLAIM = /\b(proves?|proven|definitively|beyond (any )?doubt|settled science|guarantee[sd]?)\b/i;
const HEDGE = /\b(limited|mixed|weak|few|small|not enough|do not have|unclear|may|might|remains|uncertain)\b/i;
const SECOND_PERSON_DIAGNOSIS = /your (child|baby|toddler) (has|is) (a |an )?(delay|disorder|autis)/i;

export function gradeClaims(artifact) {
  const a = artifact || loadClaims();
  const rep = { pass: true, violations: [], coverage: { cases_evaluated: 0, floors_exercised: [] } };
  const fail = (id, where, produced, required) => {
    rep.pass = false;
    rep.violations.push({ floor_id: id, case_or_path: where, produced, required });
  };

  const strengths = new Set(a.grades.strength);
  const consensuses = new Set(a.grades.consensus);
  const slugs = new Set();

  for (const c of a.claims) {
    rep.coverage.cases_evaluated++;
    const where = `claim:${c.slug || "?"}`;

    for (const f of REQUIRED) {
      const v = c[f];
      const empty = v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);
      if (empty) fail("required_fields", where, `missing ${f}`, "all required fields present");
    }
    if (slugs.has(c.slug)) fail("unique_slug", where, "duplicate slug", "unique slugs");
    slugs.add(c.slug);

    if (!strengths.has(c.grade_strength)) fail("grade_enum", where, c.grade_strength, [...strengths].join("|"));
    if (!consensuses.has(c.grade_consensus)) fail("grade_enum", where, c.grade_consensus, [...consensuses].join("|"));
    if (!DOMAINS.has(c.domain)) fail("domain_enum", where, c.domain, [...DOMAINS].join("|"));

    if ((c.sources || []).length < 2) fail("source_count", where, String((c.sources || []).length), ">= 2 sources");
    for (const s of c.sources || []) {
      if (!s.citation || s.citation.length < 30) fail("source_citation", where, s.citation || "", "full citation");
    }

    const summary = c.summary_public || "";
    const words = (summary.match(/\S+/g) || []).length;
    if (words < 120) fail("summary_length", where, `${words} words`, ">= 120 words");

    if (c.grade_strength !== "strong" && (OVERCLAIM.test(summary) || OVERCLAIM.test(c.verdict_label || ""))) {
      fail("overclaim_lexicon", where, "certainty vocabulary above grade", "no proof-language unless strength is strong");
    }
    if ((c.grade_strength === "limited" || c.grade_strength === "insufficient") && !HEDGE.test(summary)) {
      fail("hedging_required", where, "no hedging marker in summary", "limited/insufficient claims hedge explicitly");
    }
    if (SECOND_PERSON_DIAGNOSIS.test(summary) || SECOND_PERSON_DIAGNOSIS.test(c.verdict_label || "")) {
      fail("diagnostic_framing", where, "second-person diagnostic phrasing", "claims discuss research, never diagnose the reader's child");
    }

    if (fkGrade(c.verdict_label || "") > 12) fail("verdict_reading_level", where, fkGrade(c.verdict_label).toFixed(1), "<= grade 12");
    if (fkGrade(summary) > 14) fail("summary_reading_level", where, fkGrade(summary).toFixed(1), "<= grade 14");
  }
  return rep;
}

export const CLAIM_FIXTURES = [
  {
    name: "claims_single_source",
    description: "a claim ships with only one source",
    apply(a) {
      const c = structuredClone(a);
      c.claims[0].sources = c.claims[0].sources.slice(0, 1);
      return c;
    },
  },
  {
    name: "claims_overclaim_on_limited",
    description: "proof-language on a limited-evidence claim",
    apply(a) {
      const c = structuredClone(a);
      const claim = c.claims.find((x) => x.grade_strength === "limited");
      claim.summary_public += " This proves the approach is superior.";
      return c;
    },
  },
  {
    name: "claims_invalid_grade",
    description: "a grade outside the enum",
    apply(a) {
      const c = structuredClone(a);
      c.claims[2].grade_strength = "very strong";
      return c;
    },
  },
  {
    name: "claims_confident_insufficient",
    description: "an insufficient-evidence claim stated without hedging",
    apply(a) {
      const c = structuredClone(a);
      const claim = c.claims.find((x) => x.grade_strength === "insufficient");
      claim.summary_public =
        "Pacifiers are completely fine for speech and there is nothing to think about here. Use them as long as you like at any age and expect no consequences of any kind for talking, hearing, or teeth. Every child develops speech at exactly the same pace regardless of what is in their mouth all day, and the research fully supports total confidence on this question, so parents should stop considering it. The entire topic can be closed and no further attention is warranted from anyone, including clinicians, because the answer is final and universal for every family in every situation, always, without exception, forever, and this paragraph must reach one hundred twenty words to exercise only the hedging rule rather than the length rule, which it now does by a comfortable margin of several words.";
      return c;
    },
  },
];
