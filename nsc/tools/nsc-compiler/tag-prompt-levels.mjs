/**
 * One-shot generator: tags every prompt in prompts.deck.v1.json with the
 * lowest knower level that can PERFORM it, written to a parallel `levels`
 * sidecar (index-aligned with `bands`). Re-runnable and deterministic.
 *
 * Safety principle (the whole reason this can be automated): mis-tagging a
 * prompt's level too HIGH only costs a capable child one skipped prompt
 * (mild boredom). Too LOW serves a subset-knower a prompt they cannot do —
 * the exact "my child failed" harm the product forbids. So every ambiguous
 * or transform-shaped prompt is forced UP. The low buckets are audited to
 * contain only genuine count-along / comparison / one-one content.
 *
 *   node tools/nsc-compiler/tag-prompt-levels.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const file = join(root, "content/prompts.deck.v1.json");
const deck = JSON.parse(readFileSync(file, "utf8"));

const LEVELS = ["L0", "L1", "L2", "L3", "L4", "CP"];
const NUMWORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
function maxNum(t) {
  const nums = [...t.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
  for (const [w, v] of Object.entries(NUMWORDS)) {
    if (new RegExp(`\\b${w}\\b`, "i").test(t)) nums.push(v);
  }
  return nums.length ? Math.max(...nums) : 0;
}

// Any hypothetical / transform / accumulation / successor / ordinal is CP —
// the operation, not the number, sets the demand.
const TRANSFORM =
  /one more|one fewer|how many.*(left|now|remain|would|more do|more .* need)|would have|if one|rolled away|popped off|with one extra|flew away|hops? away|eat one|ate one|take one|takes? away|give one away|\badd\b|adds|jumps? in|comes? after|what comes after|what number comes|count backward|count back|count down|share .*(among|between)|split|divide|first.*second|second.*third|total so far|running total|keep a tally/i;
const PRODUCTION =
  /\b(give|bring|hand|put|make|fetch|grab|set out|serve|need|deal|scoop|pour|drop in|place)\b/i;
const COMPARISON =
  /\bmore\b|\bfewer\b|\bless\b|which .* has|who has|whose .* has|bigger pile|more .* or more|\bmost\b|taller|match/i;
const SUBITIZE = /peek|glance|at a glance|without counting|guess/i;

function classify(text) {
  const t = text.toLowerCase();
  const n = maxNum(text);
  if (TRANSFORM.test(t)) return "CP";
  if (PRODUCTION.test(t) && n >= 1) return LEVELS[Math.min(n, 5)];
  if (t.includes("how many")) return n >= 1 ? LEVELS[Math.min(n, 5)] : "CP";
  if (COMPARISON.test(t)) return n <= 3 ? "L1" : LEVELS[Math.min(n, 5)];
  if (SUBITIZE.test(t) && n <= 3) return "L1";
  if (n >= 5) return "L4";
  if (n >= 4) return "L3";
  if (n >= 3) return "L2";
  return "L0";
}

deck.levels = {};
for (const [band, prompts] of Object.entries(deck.bands)) {
  deck.levels[band] = prompts.map(classify);
}

writeFileSync(file, JSON.stringify(deck, null, 2) + "\n");

// Report
for (const [band, levels] of Object.entries(deck.levels)) {
  const dist = Object.fromEntries(LEVELS.map((L) => [L, levels.filter((x) => x === L).length]));
  const low = dist.L0 + dist.L1;
  console.log(`${band}: ${JSON.stringify(dist)}  L0+L1=${low}`);
}
