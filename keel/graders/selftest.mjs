#!/usr/bin/env node
/* Planted-violation gate for the safety keel. Usage: node keel/graders/selftest.mjs
   Certification (floors.contract.ts): the approved artifacts must pass, and
   all ten planted-violation fixtures must fail. Runs keyless in CI. */

import { loadArtifacts, gradeAll } from "./floors.mjs";
import { FIXTURES } from "./fixtures/planted-violations.mjs";

let fails = 0;
const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) fails++; };

const artifacts = loadArtifacts();

const real = gradeAll(artifacts);
ok(real.pass, `approved artifacts pass the floors grader (${real.cases_evaluated.toLocaleString()} cases)`);
if (!real.pass) {
  real.violations.slice(0, 12).forEach((v) =>
    console.log(`   ! ${v.floor_id}: produced ${JSON.stringify(v.produced)}, required ${JSON.stringify(v.required)} @ ${JSON.stringify(v.case_or_path).slice(0, 160)}`));
  if (real.violations.length > 12) console.log(`   ! ... and ${real.violations.length - 12} more`);
}

for (const f of FIXTURES) {
  let result;
  try {
    result = gradeAll(f.apply(artifacts));
  } catch (e) {
    ok(false, `planted violation detected: ${f.name} (grader threw: ${e.message})`);
    continue;
  }
  ok(!result.pass, `planted violation detected: ${f.name} (${f.description})`);
}

console.log(fails ? `\nFAILED (${fails})` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
