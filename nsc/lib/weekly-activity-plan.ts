import { ACTIVITY_DOMAINS, type ActivityRow } from "@/lib/activity-types";

/**
 * Weekly activity planner (plan 2.1 PR4) — the Monday-morning habit. A
 * printable 7-day grid: one anchor activity per day plus one backup, inside
 * a parent-set mess/time budget. Deterministic under the same contract as
 * Number Path's weekly plan: (child, ISO week, catalog, budget) always
 * yields the same grid, so the printout never disagrees with the screen.
 *
 * Balance: picks carry a simulated domain-coverage count across the whole
 * week, and each day's anchor slot rotates which domain gets priority, so a
 * full-coverage pool spreads all six domains across the week. No activity
 * repeats while the pool has unused ones.
 */

const DAYS = 7;

export interface PlannedDay {
  anchor: ActivityRow;
  backup: ActivityRow | null;
}

export interface WeeklyActivityPlan {
  days: PlannedDay[]; // index 0 = Monday
}

function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function weeklyActivityPlan(args: {
  activities: ActivityRow[];
  ageMonths: number;
  seed: string; // e.g. `${childId}:${isoYear}-W${isoWeek}` (lib/isoweek weekSeed)
  maxMess?: number; // 1-3
  maxDuration?: number; // minutes
}): WeeklyActivityPlan {
  const { activities, ageMonths, seed, maxMess, maxDuration } = args;

  const pool = activities.filter(
    (a) =>
      a.months_min <= ageMonths &&
      ageMonths < a.months_max &&
      (maxMess === undefined || a.mess_level <= maxMess) &&
      (maxDuration === undefined || a.duration_min <= maxDuration),
  );
  if (pool.length === 0) return { days: [] };

  const coverage: Record<string, number> = {};
  for (const d of ACTIVITY_DOMAINS) coverage[d] = 0;
  const used = new Set<string>();

  const pick = (dayIdx: number, slot: "anchor" | "backup"): ActivityRow | null => {
    // Prefer unused; when the whole pool is spent, reopen it (small pools
    // repeat rather than leaving days blank).
    let candidates = pool.filter((a) => !used.has(a.id));
    if (candidates.length === 0) candidates = [...pool];

    const rot = (fnv(seed) + dayIdx) % ACTIVITY_DOMAINS.length;
    const priorityIndex: Record<string, number> = {};
    ACTIVITY_DOMAINS.forEach((d, i) => {
      priorityIndex[d] =
        (i - rot + ACTIVITY_DOMAINS.length) % ACTIVITY_DOMAINS.length;
    });

    candidates.sort((a, b) => {
      const scoreA = Math.min(...a.domains.map((d) => coverage[d] ?? 0));
      const scoreB = Math.min(...b.domains.map((d) => coverage[d] ?? 0));
      if (scoreA !== scoreB) return scoreA - scoreB;
      const prioA = Math.min(...a.domains.map((d) => priorityIndex[d] ?? 99));
      const prioB = Math.min(...b.domains.map((d) => priorityIndex[d] ?? 99));
      if (prioA !== prioB) return prioA - prioB;
      return fnv(`${seed}|${dayIdx}|${slot}|${a.slug}`) - fnv(`${seed}|${dayIdx}|${slot}|${b.slug}`);
    });

    const chosen = candidates[0] ?? null;
    if (chosen) {
      used.add(chosen.id);
      for (const d of chosen.domains) coverage[d] = (coverage[d] ?? 0) + 1;
    }
    return chosen;
  };

  const days: PlannedDay[] = [];
  for (let d = 0; d < DAYS; d++) {
    const anchor = pick(d, "anchor");
    if (!anchor) break;
    // A backup only exists when it can differ from the anchor.
    const backup = pool.length > 1 ? pick(d, "backup") : null;
    days.push({ anchor, backup: backup && backup.id !== anchor.id ? backup : null });
  }
  return { days };
}
