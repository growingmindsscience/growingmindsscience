/**
 * Banned-language lint — spec §3.2. Mechanical, zero tolerance, enforced at
 * compile certification on EVERY string in EVERY artifact.
 *
 * The product never compares a child against a norm, never alarms, never
 * diagnoses. These regexes are the legal/brand floor, not a style guide.
 */

export interface BannedHit {
  pattern: string;
  path: string; // JSON path of the offending string
  excerpt: string;
}

// Word-boundary, case-insensitive. Kept as source strings so the cert report
// can name the exact rule that fired.
const BANNED: [name: string, re: RegExp][] = [
  ["delayed", /\bdelayed\b/i],
  ["delay", /\bdelays?\b/i],
  ["behind", /\bbehind\b/i],
  ["deficit", /\bdeficits?\b/i],
  ["disorder", /\bdisorders?\b/i],
  ["diagnos*", /\bdiagnos\w*/i],
  ["at risk", /\bat[- ]risk\b/i],
  ["red flag", /\bred[- ]flags?\b/i],
  ["abnormal", /\babnormal\w*/i],
  ["percentile", /\bpercentiles?\b/i],
  ["normal range", /\bnormal range\b/i],
  ["should be able to", /\bshould be able to\b/i],
  ["by now", /\bby now\b/i],
  ["falling", /\bfalling\b/i],
  ["struggl*", /\bstruggl\w*/i],
  ["gifted", /\bgifted\b/i],
  ["advanced for", /\badvanced for\b/i],
  ["ahead of", /\bahead of\b/i],
];

/** Recursively walk every string value in a JSON structure. */
export function* walkStrings(
  value: unknown,
  path = "$",
): Generator<[path: string, text: string]> {
  if (typeof value === "string") {
    yield [path, value];
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      yield* walkStrings(value[i], `${path}[${i}]`);
    }
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      yield* walkStrings(v, `${path}.${k}`);
    }
  }
}

export function lintBanned(artifact: unknown): BannedHit[] {
  const hits: BannedHit[] = [];
  for (const [path, text] of walkStrings(artifact)) {
    for (const [name, re] of BANNED) {
      const m = text.match(re);
      if (m) {
        const at = m.index ?? 0;
        hits.push({
          pattern: name,
          path,
          excerpt: text.slice(Math.max(0, at - 20), at + m[0].length + 20),
        });
      }
    }
  }
  return hits;
}
