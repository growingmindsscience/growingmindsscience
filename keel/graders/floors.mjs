/* Floors grader. Deterministic, zero model calls, zero dependencies; runs in CI
   via keel/graders/selftest.mjs (see .github/workflows/gates.yml).

   Implements the contract in floors.contract.ts:
   - LMC: a generated case grid (every integer age in the instrument range x
     every vocab bucket value x every combination of floor-referenced behavior
     values) is compiled through the SAME engine the page uses
     (keel/lib/lmc.mjs). Any floor-matching case that compiles below the
     floor's min_severity is a violation.
   - Navigator: exhaustive path enumeration per domain (every integer age 0-40
     x every answer combination of the questions asked at that age) through
     keel/lib/navigator.mjs. Any floor-matching path that terminates below
     min_class is a violation.
   - Cross-file: shared floor ids must carry identical thresholds; every
     source id must resolve; every referenced behavior/metric/binding must
     exist; every non-policy floor must be exercisable (its observable is
     actually asked inside its age window).
   - Policy floors: typical_range/none templates must carry the standing
     parent-gut invitation; no interpretation rule may key on languages; a
     lexicon scan rejects bilingual softening frames. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compile, evalCondition, SEVERITY_ORDER, severityAtLeast } from "../lib/lmc.mjs";
import { classify, askedQuestions, classAtLeast } from "../lib/navigator.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, "..", "artifacts");

export function loadArtifacts() {
  const read = (p) => JSON.parse(readFileSync(join(ART, p), "utf8"));
  return {
    sources: read("shared/floor_sources.v1.json"),
    lmcFloors: read("lmc/floors.v1.json"),
    instrument: read("lmc/instrument.v1.json"),
    interpretation: read("lmc/interpretation.v1.json"),
    navFloors: read("navigator/floors.v1.json"),
    trees: read("navigator/trees.v1.json"),
  };
}

function report() {
  return { pass: true, violations: [], coverage: { cases_evaluated: 0, floors_exercised: [] } };
}
function violate(rep, floor_id, case_or_path, produced, required) {
  rep.pass = false;
  rep.violations.push({ floor_id, case_or_path, produced, required });
}
function exercised(rep, id) {
  if (!rep.coverage.floors_exercised.includes(id)) rep.coverage.floors_exercised.push(id);
}

/* ---------------- condition schema (structural policy guard) -------------- */
/* Conditions may reference only the declared field vocabulary. This is what
   makes "no severity logic keyed on languages" machine-checkable: a rule that
   mentions any other field fails structurally before any lexicon scan. */
const COND_KEYS = new Set(["all", "any", "behavior", "metric", "op", "value", "meta"]);
function validateCondition(cond, where, rep) {
  if (cond == null || typeof cond !== "object") {
    violate(rep, "condition_schema", where, String(cond), "object condition");
    return;
  }
  for (const k of Object.keys(cond)) {
    if (!COND_KEYS.has(k)) {
      violate(rep, "condition_schema", where, `unknown key '${k}'`, [...COND_KEYS].join("|"));
    }
  }
  (cond.all || []).forEach((c, i) => validateCondition(c, `${where}.all[${i}]`, rep));
  (cond.any || []).forEach((c, i) => validateCondition(c, `${where}.any[${i}]`, rep));
}

/* -------------------- referential integrity checks ------------------------ */
export function checkIntegrity(a) {
  const rep = report();
  const sourceIds = new Set(Object.keys(a.sources.sources));
  const behaviorIds = new Set(a.instrument.behaviors.map((b) => b.id));
  const metricIds = new Set(["vocab_says", "vocab_understands"]);

  const checkSources = (list, where) => {
    (list || []).forEach((s) => {
      if (!sourceIds.has(s)) violate(rep, "source_integrity", where, s, "resolvable source id");
    });
  };

  const condFields = (cond, out = { behaviors: [], metrics: [] }) => {
    if (!cond) return out;
    if (cond.behavior) out.behaviors.push(cond.behavior);
    if (cond.metric) out.metrics.push(cond.metric);
    (cond.all || []).forEach((c) => condFields(c, out));
    (cond.any || []).forEach((c) => condFields(c, out));
    return out;
  };

  for (const f of a.lmcFloors.floors) {
    checkSources(f.sources, `lmc_floor:${f.id}`);
    if (f.condition && f.condition.meta === "policy") continue;
    validateCondition(f.condition, `lmc_floor:${f.id}`, rep);
    const used = condFields(f.condition);
    used.behaviors.forEach((b) => {
      if (!behaviorIds.has(b)) violate(rep, "instrument_integrity", `lmc_floor:${f.id}`, b, "declared behavior id");
    });
    used.metrics.forEach((m) => {
      if (!metricIds.has(m)) violate(rep, "instrument_integrity", `lmc_floor:${f.id}`, m, "declared metric id");
    });
  }

  for (const r of a.interpretation.rules) {
    checkSources(r.sources, `lmc_rule:${r.id}`);
    validateCondition(r.condition, `lmc_rule:${r.id}`, rep);
    const used = condFields(r.condition);
    used.behaviors.forEach((b) => {
      if (!behaviorIds.has(b)) violate(rep, "instrument_integrity", `lmc_rule:${r.id}`, b, "declared behavior id");
    });
    used.metrics.forEach((m) => {
      if (!metricIds.has(m)) violate(rep, "instrument_integrity", `lmc_rule:${r.id}`, m, "declared metric id");
    });
  }

  const navAllFloors = [...a.navFloors.global_floors];
  for (const dom of Object.keys(a.navFloors.domains)) navAllFloors.push(...a.navFloors.domains[dom]);
  navAllFloors.forEach((f) => checkSources(f.sources, `nav_floor:${f.id}`));

  /* Shared floor ids may never disagree across files. */
  const seen = new Map();
  const record = (id, gte, level, where) => {
    const key = `${gte}|${level}`;
    if (seen.has(id) && seen.get(id).key !== key) {
      violate(rep, "shared_floor_consistency", `${seen.get(id).where} vs ${where}`, key, seen.get(id).key);
    } else if (!seen.has(id)) seen.set(id, { key, where });
  };
  a.lmcFloors.floors.forEach((f) => {
    if (f.min_severity !== "policy") record(f.id, f.applies_age_months_gte, f.min_severity, "lmc");
  });
  a.navFloors.global_floors.forEach((f) => {
    if (f.min_class !== "policy") record(f.id, f.applies_age_months_gte, f.min_class, "nav_global");
  });
  for (const dom of Object.keys(a.navFloors.domains)) {
    a.navFloors.domains[dom].forEach((f) => {
      if (f.min_class !== "policy") record(f.id, f.applies_age_months_gte, f.min_class, `nav:${dom}`);
    });
  }
  return rep;
}

/* --------------------------- LMC case grid ------------------------------- */
export function checkLmcFloors(a) {
  const rep = report();
  const floors = a.lmcFloors.floors.filter((f) => f.min_severity !== "policy");

  /* Coverage precondition: each floor-referenced observable must actually be
     collected at the floor's boundary age, or the floor could never fire. */
  const items = Object.fromEntries(a.instrument.behaviors.map((b) => [b.id, b]));
  const minAge = a.instrument.age_range_months.min;
  const condFields = (cond, out = []) => {
    if (!cond) return out;
    if (cond.behavior) out.push(cond.behavior);
    (cond.all || []).forEach((c) => condFields(c, out));
    (cond.any || []).forEach((c) => condFields(c, out));
    return out;
  };
  for (const f of floors) {
    const at = Math.max(f.applies_age_months_gte, minAge);
    for (const b of condFields(f.condition)) {
      const item = items[b];
      if (!item) continue; // integrity check already flagged
      const askedAt = item.asked_from_months <= at && (item.asked_until_months == null || at < item.asked_until_months);
      if (!askedAt) violate(rep, f.id, `instrument window for '${b}'`, `not asked at ${at}m`, "asked at floor boundary");
    }
  }

  /* Grid: floor-referenced behaviors take every value; the rest stay 'yes'
     (extra absences can only raise severity, so 'yes' is the hardest test of
     the floor). Vocab takes every UI bucket value. */
  const floorBehaviors = [...new Set(floors.flatMap((f) => condFields(f.condition)))];
  const valuesFor = (id) => items[id] ? items[id].values : ["yes", "not_yet"];
  const saysValues = a.instrument.vocab.vocab_says.buckets.map((b) => b.value);
  const maxAge = a.instrument.age_range_months.max;

  const combos = [[]];
  for (const b of floorBehaviors) {
    const next = [];
    for (const c of combos) for (const v of valuesFor(b)) next.push([...c, [b, v]]);
    combos.length = 0;
    combos.push(...next);
  }

  const baseBehaviors = {};
  for (const b of a.instrument.behaviors) baseBehaviors[b.id] = b.id === "lost_skills" ? "no" : "yes";

  for (let age = minAge; age <= maxAge; age++) {
    for (const combo of combos) {
      const behaviors = { ...baseBehaviors };
      for (const [id, v] of combo) behaviors[id] = v;
      for (const says of saysValues) {
        const snapshot = { age_months: age, weeks_early: 0, vocab_says: says, vocab_understands: 100, behaviors };
        rep.coverage.cases_evaluated++;
        let result = null;
        for (const f of floors) {
          if (age < f.applies_age_months_gte) continue;
          if (f.applies_age_months_lt != null && age >= f.applies_age_months_lt) continue;
          if (!evalCondition(f.condition, snapshot)) continue;
          exercised(rep, f.id);
          if (result === null) result = compile(snapshot, a.interpretation);
          if (!severityAtLeast(result.severity, f.min_severity)) {
            violate(rep, f.id, { age, says, combo: Object.fromEntries(combo) }, result.severity, f.min_severity);
          }
        }
      }
    }
  }

  /* Corrected age must be honored: chronological 18m born 8 weeks early is
     ~16.2m corrected, so zero words must still reach the no_words_16m floor,
     while 12 weeks early (~15.2m corrected) must NOT fire that rule. */
  const behaviorsOk = { ...baseBehaviors };
  const early = compile({ age_months: 18, weeks_early: 8, vocab_says: 0, vocab_understands: 100, behaviors: behaviorsOk }, a.interpretation);
  rep.coverage.cases_evaluated++;
  if (!severityAtLeast(early.severity, "discuss")) {
    violate(rep, "no_words_16m", "corrected-age case 18m/8w early", early.severity, "discuss");
  }
  const earlier = compile({ age_months: 18, weeks_early: 12, vocab_says: 0, vocab_understands: 100, behaviors: behaviorsOk }, a.interpretation);
  rep.coverage.cases_evaluated++;
  const firedNoWords = earlier.flags.some((f) => f.id === "no_words_16m");
  if (firedNoWords) {
    violate(rep, "no_words_16m", "corrected-age case 18m/12w early (corrected ~15.2m)", "fired at corrected age below 16m", "not fired");
  }

  for (const f of floors) {
    if (!rep.coverage.floors_exercised.includes(f.id)) {
      violate(rep, f.id, "coverage", "never exercised by the case grid", "at least one matching case");
    }
  }
  return rep;
}

/* ------------------------ Navigator path enumeration ---------------------- */
export function checkNavigatorFloors(a) {
  const rep = report();
  const trees = a.trees;
  const globalFloors = a.navFloors.global_floors.filter((f) => !(f.predicate && f.predicate.meta === "policy"));

  for (const domKey of Object.keys(a.navFloors.domains)) {
    const domain = trees.domains[domKey];
    if (!domain) {
      violate(rep, "tree_missing", domKey, "no tree", "a tree per floors domain");
      continue;
    }
    const domFloors = a.navFloors.domains[domKey].filter((f) => !(f.predicate && f.predicate.meta === "policy"));
    const applicable = [...globalFloors, ...domFloors];
    const nodeById = Object.fromEntries(domain.questions.map((q) => [q.id, q]));

    /* (1) every floor binding is declared and points at a real question. */
    for (const f of applicable) {
      const b = f.predicate.binding;
      const bound = domain.bindings[b];
      if (!bound) {
        violate(rep, f.id, `${domKey}.bindings`, `missing binding '${b}'`, "declared binding");
        continue;
      }
      if (!nodeById[bound.node_id]) {
        violate(rep, f.id, `${domKey}.bindings.${b}`, `unknown node '${bound.node_id}'`, "existing question id");
      }
      if (bound.answer_value !== f.predicate.value) {
        violate(rep, f.id, `${domKey}.bindings.${b}`, bound.answer_value, String(f.predicate.value));
      }
    }

    /* (3) the skill-loss node is always asked. */
    const sl = domain.bindings.skill_loss && nodeById[domain.bindings.skill_loss.node_id];
    if (!sl || !sl.always_asked) {
      violate(rep, "skill_loss_any_domain", domKey, "skill-loss node missing or not always_asked", "always_asked node");
    }

    /* (2) exhaustive path enumeration, integer ages 0..40. */
    for (let age = 0; age <= 40; age++) {
      const asked = askedQuestions(domain, age);
      const optionSets = asked.map((q) => trees.answer_sets[q.answers].map((o) => o.value));
      let paths = [{}];
      asked.forEach((q, qi) => {
        const next = [];
        for (const p of paths) for (const v of optionSets[qi]) next.push({ ...p, [q.id]: v });
        paths = next;
      });

      for (const answers of paths) {
        rep.coverage.cases_evaluated++;
        const outcome = classify(domain, age, answers);
        for (const f of applicable) {
          if (age < f.applies_age_months_gte) continue;
          if (f.applies_age_months_lt != null && age >= f.applies_age_months_lt) continue;
          const bound = domain.bindings[f.predicate.binding];
          if (!bound) continue; // already reported above
          if (answers[bound.node_id] !== bound.answer_value) continue;
          exercised(rep, `${domKey}:${f.id}`);
          if (!classAtLeast(outcome.class, f.min_class)) {
            violate(rep, f.id, { domain: domKey, age, answers }, outcome.class, f.min_class);
          }
        }
      }
    }

    /* coverage: every applicable floor must have matched at least one path. */
    for (const f of applicable) {
      if (!rep.coverage.floors_exercised.includes(`${domKey}:${f.id}`)) {
        violate(rep, f.id, `${domKey} coverage`, "never exercised by path enumeration", "at least one matching path");
      }
    }
  }
  return rep;
}

/* ---------------------------- policy floors ------------------------------- */
export function checkPolicyFloors(a) {
  const rep = report();
  const invitation = (a.interpretation.required_copy || {}).parent_gut_invitation;
  const treeInvitation = (a.trees.required_copy || {}).parent_gut_invitation;

  if (!invitation || invitation.length < 40) {
    violate(rep, "parent_gut_concern_never_dismissed", "lmc required_copy", "missing/short", "standing invitation sentence");
  }
  if (!treeInvitation || treeInvitation.length < 40) {
    violate(rep, "parent_gut_concern_never_dismissed", "navigator required_copy", "missing/short", "standing invitation sentence");
  }

  for (const sev of ["none", "watch"]) {
    const t = a.interpretation.severity_templates[sev];
    rep.coverage.cases_evaluated++;
    if (!t || t.includes_invitation !== true) {
      violate(rep, "parent_gut_concern_never_dismissed", `lmc severity_templates.${sev}`, "invitation not included", "includes_invitation: true");
    }
  }
  for (const domKey of Object.keys(a.trees.domains)) {
    const t = a.trees.domains[domKey].terminals.typical_range;
    rep.coverage.cases_evaluated++;
    if (!t || t.includes_invitation !== true) {
      violate(rep, "parent_gut_concern_never_dismissed", `${domKey}.terminals.typical_range`, "invitation not included", "includes_invitation: true");
    }
  }

  /* Engine-level: a clean snapshot and a clean path must actually surface the
     invitation text, not just declare the flag. */
  const cleanBehaviors = {};
  for (const b of a.instrument.behaviors) cleanBehaviors[b.id] = b.id === "lost_skills" ? "no" : "yes";
  const clean = compile({ age_months: 20, weeks_early: 0, vocab_says: 300, vocab_understands: 300, behaviors: cleanBehaviors }, a.interpretation);
  rep.coverage.cases_evaluated++;
  if (clean.severity !== "none" || clean.invitation !== invitation) {
    violate(rep, "parent_gut_concern_never_dismissed", "engine none-case", String(clean.invitation), "invitation surfaced");
  }

  /* bilingual_no_discount lexicon scan: no sentence anywhere in either
     artifact may frame multilingualism as a reason to wait or discount. */
  const softening = [
    /(?:because|since)[^.!?]*\b(?:bilingual|multilingual|two languages|second language)\b[^.!?]*\b(?:wait|late[rn]?|delay|slower|discount|don't worry|no need)\b/i,
    /\b(?:bilingual|multilingual|two languages)\b[^.!?]*\b(?:so|therefore|which means)[^.!?]*\b(?:wait|no need|don't worry|expected to be late)\b/i,
    /\bnormal (?:for|that) bilingual\b[^.!?]*\blate/i,
  ];
  const scan = (obj, where) => {
    if (typeof obj === "string") {
      for (const re of softening) {
        if (re.test(obj)) violate(rep, "bilingual_no_discount", where, obj.slice(0, 120), "no bilingual softening frame");
      }
    } else if (Array.isArray(obj)) obj.forEach((v, i) => scan(v, `${where}[${i}]`));
    else if (obj && typeof obj === "object") Object.keys(obj).forEach((k) => scan(obj[k], `${where}.${k}`));
  };
  scan(a.interpretation, "interpretation");
  scan(a.trees, "trees");

  /* Structural: no rule window or condition may depend on languages. The
     condition schema check (checkIntegrity) rejects unknown fields; here we
     also reject any rule carrying a languages-ish key at the top level. */
  for (const r of a.interpretation.rules) {
    for (const k of Object.keys(r)) {
      if (/language/i.test(k)) {
        violate(rep, "bilingual_no_discount", `lmc_rule:${r.id}`, k, "no language-keyed rule fields");
      }
    }
  }
  return rep;
}

/* ------------------------------ run all ----------------------------------- */
export function gradeAll(artifacts) {
  const a = artifacts || loadArtifacts();
  const reports = {
    integrity: checkIntegrity(a),
    lmc: checkLmcFloors(a),
    navigator: checkNavigatorFloors(a),
    policy: checkPolicyFloors(a),
  };
  const pass = Object.values(reports).every((r) => r.pass);
  const violations = Object.values(reports).flatMap((r) => r.violations);
  const cases = Object.values(reports).reduce((n, r) => n + r.coverage.cases_evaluated, 0);
  return { pass, violations, reports, cases_evaluated: cases };
}
