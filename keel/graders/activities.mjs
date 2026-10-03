/* Activity sampler grader, implementing the plan's mechanical checks:
   required fields, age-scoped safety lexicon, mechanism-vocabulary intention
   lines, household-material flags, water supervision, reading level, and the
   Today's 3 determinism property. Deterministic, dependency-free, CI-run. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { todaysThree, activitiesForAge, fkGrade } from "../lib/activities.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export function loadActivities() {
  return JSON.parse(readFileSync(join(HERE, "..", "artifacts", "activities", "sampler.v1.json"), "utf8"));
}

/* Choking/strangulation/burn lexicon for under-36-month content. Tokens are
   matched anywhere in materials, steps, or adaptations. */
const SAFETY_DENYLIST = [
  /\bballoons?\b/i, /\bmarbles?\b/i, /\bcoins?\b/i, /\bbutton batter(y|ies)\b/i,
  /\bmagnets?\b/i, /\bpopcorn\b/i, /\bhard cand(y|ies)\b/i, /\bwhole grapes?\b/i,
  /\bwhole nuts?\b/i, /\bpeanuts?\b/i, /\bplastic bags?\b/i, /\bbeads?\b/i,
  /\bstyrofoam\b/i, /\bglitter\b/i, /\bhot glue\b/i, /\bcandles?\b/i,
];

const REQUIRED = [
  "slug", "title", "months_min", "months_max", "themes", "domains", "intention",
  "mechanism_tags", "materials", "steps", "adapt_down", "adapt_up",
  "evidence_note", "duration_min", "mess_level", "setting", "safety_notes",
];

export function gradeActivities(artifact) {
  const a = artifact || loadActivities();
  const rep = { pass: true, violations: [], coverage: { cases_evaluated: 0, floors_exercised: [] } };
  const fail = (id, where, produced, required) => {
    rep.pass = false;
    rep.violations.push({ floor_id: id, case_or_path: where, produced, required });
  };

  const vocab = new Set(a.mechanism_vocabulary);
  const domains = new Set(a.domains);
  const themes = new Set(a.themes);
  const slugs = new Set();

  for (const act of a.activities) {
    rep.coverage.cases_evaluated++;
    const where = `activity:${act.slug || "?"}`;

    for (const f of REQUIRED) {
      const v = act[f];
      const empty = v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);
      if (empty) fail("required_fields", where, `missing ${f}`, "all required fields present");
    }
    if (slugs.has(act.slug)) fail("unique_slug", where, "duplicate slug", "unique slugs");
    slugs.add(act.slug);

    if (!(act.months_min >= 0 && act.months_max > act.months_min && act.months_max <= 60)) {
      fail("age_window", where, `${act.months_min}-${act.months_max}`, "0 <= min < max <= 60");
    }
    (act.domains || []).forEach((d) => { if (!domains.has(d)) fail("domain_vocabulary", where, d, "declared domain"); });
    (act.themes || []).forEach((t) => { if (!themes.has(t)) fail("theme_vocabulary", where, t, "declared theme"); });
    (act.mechanism_tags || []).forEach((m) => { if (!vocab.has(m)) fail("mechanism_vocabulary", where, m, "controlled-vocabulary tag"); });

    /* The intention line must name at least one of its own mechanism tags. */
    if (!(act.mechanism_tags || []).some((m) => (act.intention || "").includes(m))) {
      fail("intention_mechanism", where, act.intention, "intention names a mechanism from mechanism_tags");
    }

    /* Safety lexicon for the under-36m range. */
    const body = [
      JSON.stringify(act.materials), ...(act.steps || []),
      act.adapt_down || "", act.adapt_up || "", act.title || "",
    ].join(" \n ");
    if (act.months_min < 36) {
      for (const re of SAFETY_DENYLIST) {
        if (re.test(body)) fail("safety_lexicon", where, re.source, "no denylist material under 36m");
      }
    }

    /* Any water play requires an explicit arms-reach/never-alone supervision note. */
    if (/\bwater|puddle|tub\b/i.test(body) && !/arm's reach|never leave|never alone/i.test(act.safety_notes || "")) {
      fail("water_supervision", where, act.safety_notes, "explicit arms-reach supervision in safety_notes");
    }

    /* 'small' anything in reach of under-36m mouths requires a choking note. */
    if (act.months_min < 36 && /\bsmall (pieces|parts|objects|items|mixed)/i.test(body) &&
        !/chok|fist/i.test(act.safety_notes || "")) {
      fail("small_parts_note", where, act.safety_notes, "choking/fist-size note in safety_notes");
    }

    if (!(act.mess_level >= 1 && act.mess_level <= 3)) fail("mess_level", where, String(act.mess_level), "1-3");

    /* Reading level: steps must stay at or under grade 8 (approximate FK). */
    const grade = fkGrade((act.steps || []).join(" "));
    if (grade > 8) fail("reading_level", where, grade.toFixed(1), "<= grade 8");
  }

  /* Coverage: every band 0-36 and every domain has at least two activities. */
  for (const band of [[0, 6], [6, 12], [12, 18], [18, 24], [24, 36]]) {
    const mid = Math.floor((band[0] + band[1]) / 2);
    const n = activitiesForAge(a, mid).length;
    rep.coverage.cases_evaluated++;
    if (n < 3) fail("band_coverage", `${band[0]}-${band[1]}m`, `${n} activities`, ">= 3 at band midpoint");
  }
  for (const d of a.domains) {
    const n = a.activities.filter((act) => act.domains.includes(d)).length;
    rep.coverage.cases_evaluated++;
    if (n < 2) fail("domain_coverage", d, `${n} activities`, ">= 2 per domain");
  }

  /* Today's 3 determinism property + domain rotation. */
  const picksA = todaysThree(a, 20, [], "child-x", "2026-07-19").map((x) => x.slug);
  const picksB = todaysThree(a, 20, [], "child-x", "2026-07-19").map((x) => x.slug);
  rep.coverage.cases_evaluated += 2;
  if (JSON.stringify(picksA) !== JSON.stringify(picksB) || picksA.length !== 3) {
    fail("todays_three_determinism", "child-x @ 2026-07-19", JSON.stringify(picksB), JSON.stringify(picksA));
  }
  const seen = new Set();
  let done = [];
  for (let day = 1; day <= 14; day++) {
    const iso = `2026-07-${String(day).padStart(2, "0")}`;
    const picks = todaysThree(a, 20, done, "child-y", iso);
    picks.forEach((p) => { p.domains.forEach((d) => seen.add(d)); done.push({ slug: p.slug, date: iso, domains: p.domains }); });
    rep.coverage.cases_evaluated++;
  }
  const reachable = new Set(activitiesForAge(a, 20).flatMap((x) => x.domains));
  for (const d of reachable) {
    if (!seen.has(d)) fail("todays_three_rotation", d, "domain never surfaced in 14 days", "all reachable domains within 14 days");
  }

  return rep;
}

export const ACTIVITY_FIXTURES = [
  {
    name: "activities_balloon_material",
    description: "a balloon appears in an under-36m activity's materials",
    apply(a) {
      const c = structuredClone(a);
      c.activities[4].materials.push({ item: "a balloon to bat around", household_common: true });
      return c;
    },
  },
  {
    name: "activities_intention_without_mechanism",
    description: "an intention line names no mechanism from the vocabulary",
    apply(a) {
      const c = structuredClone(a);
      c.activities[0].intention = "Have fun together and make some memories.";
      return c;
    },
  },
  {
    name: "activities_water_without_supervision",
    description: "a water activity loses its arms-reach supervision note",
    apply(a) {
      const c = structuredClone(a);
      const act = c.activities.find((x) => x.slug === "wash-the-dishes");
      act.safety_notes = "Have a towel ready.";
      return c;
    },
  },
  {
    name: "activities_missing_adaptation",
    description: "an activity ships without its adapt_up",
    apply(a) {
      const c = structuredClone(a);
      c.activities[7].adapt_up = "";
      return c;
    },
  },
  {
    name: "activities_unknown_mechanism_tag",
    description: "a mechanism tag outside the controlled vocabulary",
    apply(a) {
      const c = structuredClone(a);
      c.activities[2].mechanism_tags.push("brain_boosting");
      return c;
    },
  },
];
