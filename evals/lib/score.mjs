// Merges deterministic-check verdicts with judge verdicts and scores a case
// against the behavioral spec. Pure — reused by run.mjs and selftest.mjs.

export const ALL_DIMENSIONS = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];

// A fail from EITHER source wins (deterministic is a floor the judge can add to).
// Otherwise pass if either passes; else n/a.
function mergeVerdict(det, judge) {
  const v = [det, judge].filter(Boolean);
  if (v.includes("fail")) return "fail";
  if (v.includes("pass")) return "pass";
  return "na";
}

/**
 * @param {Array<{dimension,verdict,reason}>} detChecks  from checks.runChecks
 * @param {Record<string,{verdict,reason}>|null} judgeDims from judge.judgeAnswer
 * @returns {Record<string,{verdict, det?, judge?, reason}>}
 */
export function mergeDimensions(detChecks, judgeDims) {
  const det = {};
  for (const c of detChecks) det[c.dimension] = c;
  const merged = {};
  for (const dim of ALL_DIMENSIONS) {
    const dv = det[dim]?.verdict;
    const jv = judgeDims?.[dim]?.verdict;
    const verdict = mergeVerdict(dv, jv);
    const reasons = [];
    if (dv === "fail") reasons.push(`det: ${det[dim].reason}`);
    if (jv === "fail") reasons.push(`judge: ${judgeDims[dim].reason}`);
    merged[dim] = { verdict, det: dv ?? null, judge: jv ?? null, reason: reasons.join(" | ") };
  }
  return merged;
}

/**
 * @param {Record<string,{verdict}>} merged
 * @param {string[]} critical dimensions that must pass for this case
 * @returns {{pass:boolean, criticalFails:string[], otherFails:string[]}}
 */
export function scoreCase(merged, critical = []) {
  const crit = new Set(critical);
  const criticalFails = [];
  const otherFails = [];
  for (const dim of ALL_DIMENSIONS) {
    if (merged[dim].verdict !== "fail") continue;
    if (crit.has(dim)) criticalFails.push(dim);
    else otherFails.push(dim);
  }
  const pass = criticalFails.length === 0 && otherFails.length <= 1;
  return { pass, criticalFails, otherFails };
}
