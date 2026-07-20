#!/usr/bin/env node
// Planted-violation gate for the library grader. Each bad entry carries one
// specific defect the grader must catch; the clean entry must pass. Exits
// non-zero on any miss so it can gate CI. No API key.
//
//   node tools/library/selftest.mjs

import { gradeEntry } from "./grader.mjs";

const KIDS = new Set(["milestone-19-24-language", "language-development"]);

const CLEAN = {
  slug: "clean-entry",
  status: "draft",
  question: "Is it normal that my two-year-old says only a few words?",
  ageBand: "19-24 months",
  domain: "Language",
  shortAnswer: "The range for talking at two is wide. Many children this age say only a few clear words, and that can be part of typical growth.",
  sections: [
    { h: "What is typical", body: "By two, some children join two words while others use just a few. What a child understands often runs ahead of what they can say. Gestures, sounds, and following simple requests all show that language is growing." },
    { h: "What helps", body: "Warm back-and-forth talk helps most. Name what your child sees, add a word to what they say, and give them a turn. Read the same short books again and again." },
  ],
  whenToReachOut: "If your child uses very few words or gestures, or has lost words they used to use, a calm check-in with your pediatrician is reasonable and often reassuring.",
  evidence: ["milestone-19-24-language", "language-development"],
};

const clone = (over) => ({ ...structuredClone(CLEAN), ...over });

const CASES = [
  { id: "clean", entry: CLEAN, expectOk: true },
  { id: "diagnosis", entry: clone({ shortAnswer: "This sounds like your child has autism and you should get a diagnosis right away because it is very concerning." }), expectViolation: "diagnosis" },
  { id: "alarm", entry: clone({ whenToReachOut: "Your child is behind and falling behind his peers, so you need to act now before it's too late." }), expectViolation: "alarm" },
  { id: "dosing", entry: clone({ sections: [{ h: "x", body: "Give 5 ml of melatonin before bed to help sleep and keep the room dark and quiet for a calm wind down each night." }, { h: "y", body: "Warm back-and-forth talk helps most and reading the same book again and again gives your child a turn to join in." }] }), expectViolation: "dosing" },
  { id: "no-evidence", entry: clone({ evidence: [] }), expectViolation: "evidence-missing" },
  { id: "bad-evidence", entry: clone({ evidence: ["milestone-does-not-exist"] }), expectViolation: "evidence-unresolved" },
  { id: "no-reachout", entry: clone({ whenToReachOut: "" }), expectViolation: "reach-out" },
  { id: "bad-band", entry: clone({ ageBand: "42-99 months" }), expectViolation: "age-band" },
  { id: "one-section", entry: clone({ sections: [{ h: "only one", body: "Just one section here, which is not enough structure for a full page that helps a worried parent feel oriented and supported." }] }), expectViolation: "sections" },
  {
    id: "unreadable",
    entry: clone({
      shortAnswer: "Notwithstanding the heterogeneity of developmental trajectories, the phenomenological manifestation of expressive linguistic competencies exhibits considerable interindividual variability throughout ontogenesis, complicating parental interpretation substantially.",
      sections: [
        { h: "a", body: "Consequently, the aforementioned neurodevelopmental substrates underpinning morphosyntactic acquisition necessitate sustained, reciprocal, contingent communicative interaction to facilitate optimal linguistic proficiency outcomes across the developmental continuum." },
        { h: "b", body: "Furthermore, environmental enrichment paradigms demonstrably potentiate the consolidation of receptive vocabulary antecedent to expressive articulation, thereby engendering measurable developmental advantages." },
      ],
    }),
    expectViolation: "readability",
  },
];

let miss = 0;
for (const c of CASES) {
  const r = gradeEntry(c.entry, KIDS);
  if (c.expectOk) {
    if (!r.ok) { miss++; console.log(`✗ ${c.id}: expected clean pass, got ${JSON.stringify(r.violations)}`); }
    else console.log(`✓ ${c.id} (FK ${r.fk.toFixed(1)})`);
  } else {
    const hit = r.violations.some((v) => v.code === c.expectViolation);
    if (!hit) { miss++; console.log(`✗ ${c.id}: expected violation "${c.expectViolation}", got ${JSON.stringify(r.violations.map((v) => v.code))}`); }
    else console.log(`✓ ${c.id} → caught ${c.expectViolation}`);
  }
}

console.log(`\n${CASES.length - miss}/${CASES.length} grader assertions passed.`);
if (miss) { console.log("✗ grader is not sound."); process.exit(1); }
console.log("✓ Library grader is sound.");
