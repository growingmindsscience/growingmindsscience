/**
 * Re-check-in cadence. The product promise is "re-run the ladder about every
 * six weeks" — long enough for a rung to plausibly move (knower levels change
 * on the scale of weeks-to-months), short enough that parents see the climb.
 * Medium/low-confidence readouts already invite an earlier retry in copy;
 * this module only computes the standing six-week rhythm.
 */

export const CHECKIN_INTERVAL_DAYS = 42;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CheckinStatus {
  /** When the next check-in is due. */
  due: Date;
  /** True once the due date has passed. */
  ready: boolean;
  /** Whole days until due (0 when ready). */
  daysAway: number;
}

export function nextCheckin(
  lastCompletedAt: string | Date,
  now: Date = new Date(),
): CheckinStatus {
  const last = new Date(lastCompletedAt).getTime();
  const due = new Date(last + CHECKIN_INTERVAL_DAYS * DAY_MS);
  const ready = now.getTime() >= due.getTime();
  const daysAway = ready
    ? 0
    : Math.ceil((due.getTime() - now.getTime()) / DAY_MS);
  return { due, ready, daysAway };
}

/** "Aug 21" style label, stable across server/client (UTC). */
export function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
