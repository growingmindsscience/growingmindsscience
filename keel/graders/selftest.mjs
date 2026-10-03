#!/usr/bin/env node
/* Planted-violation gate for every keel-certified artifact family.
   Usage: node keel/graders/selftest.mjs
   Contract (floors.contract.ts, generalized): each grader must pass its
   approved artifacts AND catch every planted violation in its fixture set.
   Runs keyless in CI (.github/workflows/gates.yml). */

import { loadArtifacts, gradeAll } from "./floors.mjs";
import { FIXTURES } from "./fixtures/planted-violations.mjs";
import { gradeActivities, loadActivities, ACTIVITY_FIXTURES } from "./activities.mjs";
import { gradeClaims, loadClaims, CLAIM_FIXTURES } from "./claims.mjs";
import { gradeDrc, loadCards, DRC_FIXTURES } from "./drc.mjs";

let fails = 0;
const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) fails++; };

function detail(result) {
  result.violations.slice(0, 12).forEach((v) =>
    console.log(`   ! ${v.floor_id}: produced ${JSON.stringify(v.produced)}, required ${JSON.stringify(v.required)} @ ${JSON.stringify(v.case_or_path).slice(0, 160)}`));
  if (result.violations.length > 12) console.log(`   ! ... and ${result.violations.length - 12} more`);
}

/* ---- floors (Communication Snapshot + Milestone Navigator) ---- */
const artifacts = loadArtifacts();
const real = gradeAll(artifacts);
ok(real.pass, `floors: approved artifacts pass (${real.cases_evaluated.toLocaleString()} cases)`);
if (!real.pass) detail(real);
for (const f of FIXTURES) {
  let result;
  try { result = gradeAll(f.apply(artifacts)); }
  catch (e) { ok(false, `floors planted violation: ${f.name} (grader threw: ${e.message})`); continue; }
  ok(!result.pass, `floors planted violation detected: ${f.name}`);
}

/* ---- generalized runner for the other artifact families ---- */
const FAMILIES = [
  { name: "activities", grade: gradeActivities, load: loadActivities, fixtures: ACTIVITY_FIXTURES },
  { name: "claims", grade: gradeClaims, load: loadClaims, fixtures: CLAIM_FIXTURES },
  { name: "drc", grade: gradeDrc, load: loadCards, fixtures: DRC_FIXTURES },
];
for (const fam of FAMILIES) {
  const r = fam.grade();
  ok(r.pass, `${fam.name}: approved artifacts pass (${r.coverage.cases_evaluated.toLocaleString()} cases)`);
  if (!r.pass) detail(r);
  for (const f of fam.fixtures) {
    let result;
    try { result = fam.grade(f.apply(fam.load())); }
    catch (e) { ok(false, `${fam.name} planted violation: ${f.name} (grader threw: ${e.message})`); continue; }
    ok(!result.pass, `${fam.name} planted violation detected: ${f.name}`);
  }
}

console.log(fails ? `\nFAILED (${fails})` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
