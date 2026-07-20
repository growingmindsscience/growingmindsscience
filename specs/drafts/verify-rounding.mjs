#!/usr/bin/env node
/*
  Evidence for `03-worried-navigator.md` §7.4.1.

  Question: does flooring the Navigator's corrected age ever change a
  classification? The spec recommends converging the two implementations on
  floored rounding, and a recommendation that touches a safety path should be
  measured rather than argued.

  Why this script exists at all: `keel/graders/selftest.mjs` cannot answer the
  question. `correctedAge` is called only inside `resolve()`, and the floors
  grader calls `classify()` and `askedQuestions()` directly, passing no
  `weeksEarly`. The grader therefore never exercises corrected age, and a green
  selftest after a corrected-age change proves nothing about that change. That
  coverage gap is the real finding; this script is what filled it in the
  meantime.

  Run:  node specs/drafts/verify-rounding.mjs
  Exit: 0 if the two conventions are behaviourally identical, 1 if not.

  This is read-only. It imports the shipped engine and never writes to it.
*/

import { readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(HERE, '..', '..');

const { classify, askedQuestions } = await import(
  pathToFileURL(resolvePath(ROOT, 'keel/lib/navigator.mjs')).href
);
const trees = JSON.parse(
  readFileSync(resolvePath(ROOT, 'keel/artifacts/navigator/trees.v1.json'), 'utf8')
);

const policy = trees.corrected_age || { weeks_early_gt: 3, applies_under_months: 24 };
const applies = (age, w) => w > policy.weeks_early_gt && age < policy.applies_under_months;

// The two conventions under test. Fractional is what keel ships today;
// floored is what nsc/lib/navigator.ts does and what the spec recommends.
const fractional = (age, w) => (applies(age, w) ? Math.max(0, age - w / 4.345) : age);
const floored = (age, w) => (applies(age, w) ? Math.max(0, Math.floor(age - w / 4.345)) : age);

const MAX_AGE = 40;
const MAX_WEEKS_EARLY = 16;

let cases = 0;
let numericDiff = 0;
let askedDiff = 0;
let classDiff = 0;
const examples = [];

for (const domKey of Object.keys(trees.domains)) {
  const domain = trees.domains[domKey];

  for (let age = 0; age <= MAX_AGE; age++) {
    for (let w = 0; w <= MAX_WEEKS_EARLY; w++) {
      const aFrac = fractional(age, w);
      const aFloor = floored(age, w);
      if (aFrac !== aFloor) numericDiff++;

      const qFrac = askedQuestions(domain, aFrac);
      const qFloor = askedQuestions(domain, aFloor);
      const sameQuestions =
        qFrac.length === qFloor.length && qFrac.every((q, i) => q.id === qFloor[i].id);

      if (!sameQuestions) {
        askedDiff++;
        if (examples.length < 5) {
          examples.push({ kind: 'asked-questions', domain: domKey, age, weeksEarly: w });
        }
        continue;
      }

      // Enumerate every answer path for this (domain, age).
      const optionSets = qFrac.map((q) => trees.answer_sets[q.answers].map((o) => o.value));
      let paths = [{}];
      for (let qi = 0; qi < qFrac.length; qi++) {
        const next = [];
        for (const p of paths) for (const v of optionSets[qi]) next.push({ ...p, [qFrac[qi].id]: v });
        paths = next;
      }

      for (const answers of paths) {
        cases++;
        const cFrac = classify(domain, aFrac, answers).class;
        const cFloor = classify(domain, aFloor, answers).class;
        if (cFrac !== cFloor) {
          classDiff++;
          if (examples.length < 5) {
            examples.push({ kind: 'class', domain: domKey, age, weeksEarly: w, cFrac, cFloor });
          }
        }
      }
    }
  }
}

// The structural reason the answer comes out the way it does: for an integer
// threshold N, floor(x) >= N exactly when x >= N. If a non-integer threshold is
// ever introduced, that guarantee is gone, so assert it here rather than trust it.
const ageKeys = [];
const walk = (o) => {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if (k.includes('age') && typeof v === 'number') ageKeys.push([k, v]);
      walk(v);
    }
  }
};
walk(trees);
walk(JSON.parse(readFileSync(resolvePath(ROOT, 'keel/artifacts/navigator/floors.v1.json'), 'utf8')));
const nonInteger = ageKeys.filter(([, v]) => !Number.isInteger(v));

console.log('Corrected-age rounding: fractional vs floored\n');
console.log(`  cases compared                      ${cases.toLocaleString()}`);
console.log(`  (age, weeksEarly) numeric differences ${numericDiff.toLocaleString()}`);
console.log(`  asked-question-set differences      ${askedDiff}`);
console.log(`  CLASSIFICATION differences          ${classDiff}`);
console.log(`  age thresholds scanned              ${ageKeys.length}`);
console.log(`  non-integer thresholds              ${nonInteger.length}`);

if (examples.length) console.log('\n  examples:', JSON.stringify(examples, null, 2));

const behaviourallyIdentical = classDiff === 0 && askedDiff === 0;

if (nonInteger.length) {
  console.log('\n  WARNING: a non-integer age threshold exists.');
  console.log('  The floor(x) >= N guarantee no longer holds. Re-derive before relying on this.');
  console.log('  ' + JSON.stringify(nonInteger));
}

console.log(
  behaviourallyIdentical
    ? '\nRESULT: flooring never changes a classification or a question set.' +
        '\nIt is safety-neutral. The two conventions still differ in the number shown' +
        '\nto the parent, so converging remains worth doing for display consistency.'
    : '\nRESULT: flooring CHANGES behaviour. Do not treat the convergence as safe.'
);

process.exit(behaviourallyIdentical && !nonInteger.length ? 0 : 1);
