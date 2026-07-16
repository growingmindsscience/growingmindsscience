import { describe, expect, it } from "vitest";
import { gradeActivity, gradeBatch } from "../tools/activities/grader";
import type { ActivityDraft } from "../lib/activity-types";
import batch001 from "../tools/activities/batches/batch-001.json";

/** A fully valid draft; each planted violation mutates exactly one thing. */
function validDraft(over: Partial<ActivityDraft> = {}): ActivityDraft {
  return {
    slug: "towel-peekaboo",
    title: "Towel Peekaboo",
    months_min: 6,
    months_max: 12,
    themes: ["household"],
    domains: ["cognitive"],
    intention:
      "Practice knowing that a hidden toy still exists, the root of object permanence.",
    mechanism_tags: ["object_permanence"],
    materials: [{ item: "a small towel", household_common: true }],
    steps: [
      "Show a favorite toy, then cover half of it with the towel.",
      "Ask where it went and wait for a reach.",
      "Celebrate the find, then hide a little more of it next round.",
    ],
    adapt_down: "Hide less of the toy, or lift the towel slowly yourself.",
    adapt_up: "Cover the toy fully, then move the hiding spot.",
    evidence_note:
      "Finding hidden objects is a classic marker of early memory for absent things.",
    duration_min: 5,
    mess_level: 1,
    setting: ["indoor"],
    safety_notes: "Use a toy bigger than your baby's mouth.",
    ...over,
  };
}

function failedCheck(draft: ActivityDraft, context: ActivityDraft[] = []) {
  const report = gradeActivity(draft, context);
  return {
    pass: report.pass,
    failed: report.checks.filter((c) => c.status === "fail").map((c) => c.name),
  };
}

describe("planted-violation certification (plan 2.1 eval gate: 12/12 rejected)", () => {
  const cases: [name: string, draft: ActivityDraft, expectCheck: string][] = [
    [
      "missing intention",
      validDraft({ intention: "" }),
      "required-fields",
    ],
    [
      "too few steps",
      validDraft({ steps: ["Do the thing.", "Do it again."] }),
      "required-fields",
    ],
    [
      "inverted month range",
      validDraft({ months_min: 18, months_max: 12 }),
      "required-fields",
    ],
    [
      "balloon for a one-year-old (absolute hazard)",
      validDraft({
        slug: "balloon-bop",
        title: "Balloon Bop",
        steps: [
          "Blow up a balloon and bat it gently toward your child.",
          "Let them bat it back to you.",
          "Count the bops out loud together.",
        ],
      }),
      "safety-lexicon",
    ],
    [
      "whole grapes without mitigation",
      validDraft({
        slug: "snack-count",
        months_min: 18,
        months_max: 24,
        steps: [
          "Put a few grapes on the tray.",
          "Name each one as your child picks it up.",
          "Ask for one more bite together.",
        ],
      }),
      "safety-lexicon",
    ],
    [
      "mechanism tag outside the vocabulary",
      validDraft({ mechanism_tags: ["brain_boosting"] }),
      "mechanism-vocabulary",
    ],
    [
      "no mechanism tags at all",
      validDraft({ mechanism_tags: [] }),
      "mechanism-vocabulary",
    ],
    [
      "reading level above grade 8",
      validDraft({
        intention:
          "Facilitate consolidation of representational object permanence through systematically attenuated perceptual occlusion methodology.",
        steps: [
          "Systematically administer graduated occlusion experiences utilizing incrementally comprehensive concealment methodologies.",
          "Subsequently elicit anticipatory retrieval behaviors through interrogative prompting procedures.",
          "Reinforce successful retrieval demonstrations with enthusiastic verbal acknowledgment vocalizations.",
        ],
      }),
      "readability",
    ],
    [
      "banned deficit language",
      validDraft({
        adapt_down: "If your child is delayed here, keep practicing daily.",
      }),
      "banned-language",
    ],
    [
      "specialty material without a note",
      validDraft({
        materials: [{ item: "a Montessori object permanence box", household_common: false }],
      }),
      "materials-household",
    ],
    [
      "invalid enums",
      validDraft({
        domains: ["math" as never],
        mess_level: 5,
      }),
      "enums",
    ],
    [
      "near-duplicate of an existing activity",
      validDraft({
        slug: "towel-peekaboo-two",
        title: "Towel Peekaboo Again",
      }),
      "duplicate-similarity",
    ],
  ];

  it("rejects all 12, each on the intended check", () => {
    let rejected = 0;
    for (const [name, draft, expectCheck] of cases) {
      const context =
        expectCheck === "duplicate-similarity" ? [validDraft()] : [];
      const r = failedCheck(draft, context);
      expect(r.pass, `"${name}" should fail overall`).toBe(false);
      expect(r.failed, `"${name}" should fail ${expectCheck}`).toContain(
        expectCheck,
      );
      rejected++;
    }
    expect(rejected).toBe(12);
  });

  it("the valid base draft passes every check", () => {
    const report = gradeActivity(validDraft());
    expect(report.checks.filter((c) => c.status === "fail")).toEqual([]);
    expect(report.pass).toBe(true);
  });
});

describe("batch 001 is grader-clean before it can enter the queue", () => {
  const drafts = batch001.activities as unknown as ActivityDraft[];

  it("has 18 drafts, 3 per band, one free per band", () => {
    expect(drafts).toHaveLength(18);
    const bands: [number, number][] = [
      [0, 6],
      [6, 12],
      [12, 18],
      [18, 24],
      [24, 30],
      [30, 36],
    ];
    for (const [min, max] of bands) {
      const inBand = drafts.filter(
        (d) => d.months_min === min && d.months_max === max,
      );
      expect(inBand, `band ${min}-${max}m`).toHaveLength(3);
      expect(
        inBand.filter((d) => d.is_free).length,
        `free in ${min}-${max}m`,
      ).toBe(1);
    }
  });

  it("every draft passes the grader (batch as duplicate context)", () => {
    const reports = gradeBatch(drafts);
    const failures = reports
      .filter((r) => !r.pass)
      .map((r) => ({
        slug: r.slug,
        failed: r.checks.filter((c) => c.status === "fail"),
      }));
    expect(failures).toEqual([]);
  });

  it("slugs are unique", () => {
    expect(new Set(drafts.map((d) => d.slug)).size).toBe(drafts.length);
  });
});
