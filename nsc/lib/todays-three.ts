import { ACTIVITY_DOMAINS, type ActivityRow } from "@/lib/activity-types";

/**
 * Today's 3 (plan 2.1 PR3) — the daily-habit surface. Fully deterministic:
 * same (child, date, catalog, completion history) always yields the same
 * three picks, so the page is stable all day and testable.
 *
 * Selection: age-appropriate pool → drop activities done in the last 14
 * days (oldest-first backfill if that starves the pool) → rank by
 * least-covered domain over the trailing 28 days → tie-break first by a
 * date-rotated domain priority (this provably cycles every domain through
 * the top slot, so a child with no logged completions still sees all six
 * domains inside any 14-day window), then by a seeded hash. Picks update a
 * simulated coverage count so the three picks themselves spread across
 * domains.
 */

const EXCLUDE_RECENT_DAYS = 14;
const COVERAGE_WINDOW_DAYS = 28;
const PICKS = 3;

export interface CompletionLite {
  activity_id: string;
  completed_on: string; // YYYY-MM-DD
  domains: string[];
}

function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function daysSinceEpoch(isoDate: string): number {
  return Math.floor(Date.parse(isoDate + "T00:00:00Z") / 86_400_000);
}

function daysBetween(isoA: string, isoB: string): number {
  return daysSinceEpoch(isoA) - daysSinceEpoch(isoB);
}

export function todaysThree(args: {
  activities: ActivityRow[];
  ageMonths: number;
  completions: CompletionLite[];
  childId: string;
  isoDate: string; // YYYY-MM-DD, the parent's day
}): ActivityRow[] {
  const { activities, ageMonths, completions, childId, isoDate } = args;

  const pool = activities.filter(
    (a) => a.months_min <= ageMonths && ageMonths < a.months_max,
  );
  if (pool.length === 0) return [];

  const lastDone = new Map<string, string>();
  for (const c of completions) {
    const prev = lastDone.get(c.activity_id);
    if (!prev || c.completed_on > prev) lastDone.set(c.activity_id, c.completed_on);
  }
  const isRecent = (id: string) => {
    const d = lastDone.get(id);
    return d !== undefined && daysBetween(isoDate, d) < EXCLUDE_RECENT_DAYS;
  };

  let candidates = pool.filter((a) => !isRecent(a.id));
  const backfilled = new Set<string>();
  if (candidates.length < PICKS) {
    // Starving pool: re-admit recently played. These rank below every fresh
    // candidate and among themselves by staleness (oldest completion first)
    // — a forced repeat should be the least-recent one, not the best-scored.
    const backfill = pool.filter((a) => isRecent(a.id));
    for (const a of backfill) backfilled.add(a.id);
    candidates = [...candidates, ...backfill];
  }

  const coverage: Record<string, number> = {};
  for (const d of ACTIVITY_DOMAINS) coverage[d] = 0;
  for (const c of completions) {
    if (daysBetween(isoDate, c.completed_on) < COVERAGE_WINDOW_DAYS) {
      for (const d of c.domains) {
        if (d in coverage) coverage[d] += 1;
      }
    }
  }

  // Date-rotated domain priority: over any 6 consecutive days, every domain
  // holds the top slot once.
  const rot = daysSinceEpoch(isoDate) % ACTIVITY_DOMAINS.length;
  const priorityIndex: Record<string, number> = {};
  ACTIVITY_DOMAINS.forEach((d, i) => {
    priorityIndex[d] = (i - rot + ACTIVITY_DOMAINS.length) % ACTIVITY_DOMAINS.length;
  });

  const picks: ActivityRow[] = [];
  const remaining = [...candidates];
  while (picks.length < PICKS && remaining.length > 0) {
    remaining.sort((a, b) => {
      const backA = backfilled.has(a.id) ? 1 : 0;
      const backB = backfilled.has(b.id) ? 1 : 0;
      if (backA !== backB) return backA - backB; // fresh before repeats
      if (backA === 1) {
        // Both are forced repeats: least-recently-played first.
        const dA = lastDone.get(a.id) ?? "";
        const dB = lastDone.get(b.id) ?? "";
        if (dA !== dB) return dA < dB ? -1 : 1;
      }
      const scoreA = Math.min(...a.domains.map((d) => coverage[d] ?? 0));
      const scoreB = Math.min(...b.domains.map((d) => coverage[d] ?? 0));
      if (scoreA !== scoreB) return scoreA - scoreB;
      const prioA = Math.min(...a.domains.map((d) => priorityIndex[d] ?? 99));
      const prioB = Math.min(...b.domains.map((d) => priorityIndex[d] ?? 99));
      if (prioA !== prioB) return prioA - prioB;
      return (
        fnv(`${childId}|${isoDate}|${a.slug}`) -
        fnv(`${childId}|${isoDate}|${b.slug}`)
      );
    });
    const chosen = remaining.shift()!;
    picks.push(chosen);
    for (const d of chosen.domains) coverage[d] = (coverage[d] ?? 0) + 1;
  }
  return picks;
}
