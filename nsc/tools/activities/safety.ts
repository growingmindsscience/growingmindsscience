/**
 * Under-36-month safety lexicon (plan 2.1 grader rule: "safety lexicon
 * violations for the age band … a maintained denylist + allowlist-with-
 * context"). Two tiers:
 *
 * - ABSOLUTE: never acceptable in content for children under 36 months,
 *   whatever the framing. A hit is a hard fail.
 * - MITIGABLE: acceptable only when the same string (or the activity's
 *   safety_notes) carries an explicit mitigation.
 *
 * Deterministic on purpose — the reviewer sees exactly which rule fired.
 */

export interface SafetyHit {
  tier: "absolute" | "mitigable";
  pattern: string;
  path: string;
  excerpt: string;
}

const ABSOLUTE: [name: string, re: RegExp][] = [
  ["balloon", /\bballoons?\b/i],
  ["button battery", /\bbutton (cell|batter\w+)|\bcoin (cell|batter\w+)/i],
  ["magnet", /\bmagnets?\b/i],
  ["marble", /\bmarbles?\b/i],
  ["coin", /\bcoins?\b|\bpenn(y|ies)\b/i],
  ["hard candy", /\bhard cand(y|ies)\b|\blollipops?\b/i],
  ["popcorn", /\bpopcorn\b/i],
  ["whole nut", /\b(whole )?(pea)?nuts?\b(?! butter)/i],
  ["gum", /\bchewing gum\b|\bbubble gum\b/i],
  ["plastic bag", /\bplastic bags?\b/i],
];

const MITIGABLE: [name: string, re: RegExp, mitigation: RegExp][] = [
  [
    "grape",
    /\bgrapes?\b/i,
    /\b(quarter\w*|cut lengthwise|cut into (long )?strips|sliced lengthwise)\b/i,
  ],
  [
    "hot dog",
    /\bhot ?dogs?\b/i,
    /\b(cut lengthwise|sliced lengthwise|quarter\w*)\b/i,
  ],
  [
    "cherry tomato",
    /\bcherry tomato\w*|\bgrape tomato\w*/i,
    /\b(quarter\w*|cut lengthwise|halve\w* then halve\w*)\b/i,
  ],
  [
    "string/cord",
    /\b(string|cord|ribbon|yarn|twine)s?\b/i,
    /\b(shorter than|under 12 inches|under 30 cm|arm'?s reach|put (it )?away (when|after)|adult (holds|keeps))\b/i,
  ],
  [
    "small beads/buttons",
    /\b(beads?|buttons?|sequins?|pom-?poms?)\b/i,
    /\b(too large to swallow|larger than (a|your child's) (mouth|fist)|jumbo|oversized|chunky)\b/i,
  ],
  [
    "water basin",
    /\b(basin|bucket|tub|bowl) of water\b|\bwater (basin|bucket|tub)\b/i,
    /\b(within arm'?s reach|never (step|walk|turn) away|stay (with|beside)|empt(y|ied) (it )?(right )?(away|after)|shallow)\b/i,
  ],
];

function* walk(value: unknown, path = "$"): Generator<[string, string]> {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* walk(value[i], `${path}[${i}]`);
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) yield* walk(v, `${path}.${k}`);
  }
}

/** Lint one activity draft's strings. `safetyNotes` participates as the
 * mitigation context of last resort for mitigable hits. */
export function lintSafety(
  draft: unknown,
  safetyNotes: string,
): SafetyHit[] {
  const hits: SafetyHit[] = [];
  for (const [path, text] of walk(draft)) {
    for (const [name, re] of ABSOLUTE) {
      const m = text.match(re);
      if (m) {
        hits.push({
          tier: "absolute",
          pattern: name,
          path,
          excerpt: excerpt(text, m),
        });
      }
    }
    for (const [name, re, mitigation] of MITIGABLE) {
      const m = text.match(re);
      if (m && !mitigation.test(text) && !mitigation.test(safetyNotes)) {
        hits.push({
          tier: "mitigable",
          pattern: name,
          path,
          excerpt: excerpt(text, m),
        });
      }
    }
  }
  return hits;
}

function excerpt(text: string, m: RegExpMatchArray): string {
  const at = m.index ?? 0;
  return text.slice(Math.max(0, at - 20), at + m[0].length + 20);
}
