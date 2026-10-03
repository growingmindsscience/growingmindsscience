/* Activity sampler engine. Pure, deterministic, dependency-free; shared by the
   browser page and the CI grader. Implements the plan's Today's 3 contract:
   same child + same date + same completion history → same three picks. */

export function activitiesForAge(artifact, months) {
  return artifact.activities.filter(
    (a) => months >= a.months_min && months <= a.months_max
  );
}

/* Deterministic 32-bit string hash (FNV-1a). */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/* Seeded shuffle (mulberry32 over FNV seed); stable across platforms. */
function seededOrder(items, seed) {
  let t = hash32(seed) >>> 0;
  const rand = () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* Today's 3.
   completions: [{ slug, date: 'YYYY-MM-DD', domains: [...] }]
   Algorithm per the plan: filter to age; exclude activities completed in the
   last 14 days; rank by least-covered domain over the trailing 28 days;
   tie-break with a shuffle seeded by hash(childKey + isoDate). */
export function todaysThree(artifact, months, completions, childKey, isoDate) {
  const eligible = activitiesForAge(artifact, months);
  const dayMs = 86400000;
  const today = Date.parse(isoDate + "T00:00:00Z");
  const recent = new Set(
    (completions || [])
      .filter((c) => today - Date.parse(c.date + "T00:00:00Z") < 14 * dayMs)
      .map((c) => c.slug)
  );
  const pool = eligible.filter((a) => !recent.has(a.slug));

  const coverage = {};
  for (const d of artifact.domains) coverage[d] = 0;
  for (const c of completions || []) {
    if (today - Date.parse(c.date + "T00:00:00Z") < 28 * dayMs) {
      (c.domains || []).forEach((d) => { if (d in coverage) coverage[d] += 1; });
    }
  }

  const score = (a) => Math.min(...a.domains.map((d) => coverage[d] ?? 0));
  const shuffled = seededOrder(pool, `${childKey}|${isoDate}`);
  shuffled.sort((a, b) => score(a) - score(b)); // stable sort keeps seeded order within ties
  return shuffled.slice(0, 3);
}

/* Approximate Flesch-Kincaid grade level, used by the grader's reading check. */
export function fkGrade(text) {
  const words = (text.match(/[A-Za-z']+/g) || []);
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  if (!words.length) return 0;
  const syllables = words.reduce((n, w) => {
    const s = w.toLowerCase().replace(/e\b/, "").match(/[aeiouy]+/g);
    return n + Math.max(1, s ? s.length : 1);
  }, 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}
