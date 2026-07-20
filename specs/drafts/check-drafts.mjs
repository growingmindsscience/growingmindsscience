#!/usr/bin/env node
// Mechanical checks on the spec drafts. Run: node specs/drafts/check-drafts.mjs
// Enforces the constraints the drafting job was given, so compliance is proven
// rather than asserted.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));

const REQUIRED_SECTIONS = [
  '## 0.', '## 1.', '## 2.', '## 3.', '## 4.', '## 5.', '## 6.',
  '## 7.', '## 8.', '## 9.', '## 10.', '## 11.', '## 12.', '## 13.', '## 14.',
];

// DDL that would make a file paste-able into a SQL editor.
const DDL = /\b(create|alter|drop)\s+(table|type|index|policy|schema|extension)\b/i;

// Stale brand tokens the drafts must not carry.
const STALE_BRAND = /\b(amber|warm cream|lora|instrument sans)\b/i;

const checks = [];
const files = readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();

for (const file of files) {
  const raw = readFileSync(join(DIR, file), 'utf8');
  const lines = raw.split('\n');
  const isSpec = /^0[1-6]-/.test(file);
  const fail = (rule, detail) => checks.push({ file, rule, detail });

  // 1. No em dashes, anywhere, in any file.
  lines.forEach((line, i) => {
    if (line.includes('—')) fail('em-dash', `line ${i + 1}: ${line.trim().slice(0, 80)}`);
  });

  // 2. No DDL. Only real statements count: a DDL keyword inside a fenced code
  //    block, or one followed by an identifier and an opening paren. Prose that
  //    merely names the rule ("never write `create table`") is not a violation.
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (!DDL.test(line)) return;
    const isStatement = inFence || /\b(create|alter|drop)\s+table\s+[\w."]+\s*\(/i.test(line);
    if (isStatement) fail('ddl', `line ${i + 1}: ${line.trim().slice(0, 80)}`);
  });

  // 3. No stale brand tokens. README documents the discrepancy on purpose.
  if (file !== 'README.md' && file !== '00-CONVENTIONS.md') {
    lines.forEach((line, i) => {
      if (STALE_BRAND.test(line)) fail('stale-brand', `line ${i + 1}: ${line.trim().slice(0, 80)}`);
    });
  }

  if (!isSpec) continue;

  // 4. Every spec carries the full 14-section skeleton.
  for (const s of REQUIRED_SECTIONS) {
    if (!raw.includes(`\n${s}`)) fail('missing-section', `no heading starting "${s}"`);
  }

  // 5. Every spec opens with an explicit draft status banner.
  if (!/status/i.test(lines.slice(0, 20).join('\n')) || !/draft/i.test(lines.slice(0, 20).join('\n'))) {
    fail('no-status-banner', 'first 20 lines lack a draft status banner');
  }

  // 6. Every spec marks its citation verification state.
  if (!raw.includes('verified: false') && !raw.includes('verified:false')) {
    fail('no-g1-gate', 'no `verified: false` seed citations; G1 gate may be missing');
  }

  // 7. Every spec names at least one tradeoff explicitly.
  if (!/Named tradeoff/i.test(raw)) fail('no-named-tradeoff', 'no "Named tradeoff" block');

  // 8. Depth floor. The template is ~410 lines; specs should be comparable.
  if (lines.length < 350) fail('too-short', `${lines.length} lines, expected 350+`);
}

const bad = checks.length;
const byRule = checks.reduce((a, c) => ((a[c.rule] = (a[c.rule] || 0) + 1), a), {});

console.log(`Checked ${files.length} files in specs/drafts/\n`);
if (bad === 0) {
  console.log('PASS: all checks green.');
} else {
  console.log(`FAIL: ${bad} findings\n`);
  for (const c of checks) console.log(`  [${c.rule}] ${c.file}: ${c.detail}`);
  console.log('\nBy rule:', byRule);
}

for (const file of files.filter((f) => /^0[1-6]-/.test(f))) {
  const n = readFileSync(join(DIR, file), 'utf8').split('\n').length;
  console.log(`  ${file}: ${n} lines`);
}

process.exit(bad === 0 ? 0 : 1);
