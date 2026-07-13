/**
 * Re-check-in cadence. The standing rhythm is ~six weeks, but the honest
 * framing matters more than the number: knower rungs move on the scale of
 * months (Wynn 1992; Rousselle 2021), so most six-week windows show the SAME
 * rung — copy on every surface treats "held steady" as the normal outcome,
 * never as stalling. Low-confidence reads invite a much earlier retry (the
 * readout says "a week or two"), so the timer agrees with the copy.
 */

export const CHECKIN_INTERVAL_DAYS = 42;

/** Matches the low-confidence readouts' "try again in a week or two." */
export const CHECKIN_INTERVAL_DAYS_LOW_CONFIDENCE = 14;

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
  confidence?: string | null,
): CheckinStatus {
  const intervalDays =
    confidence === "low"
      ? CHECKIN_INTERVAL_DAYS_LOW_CONFIDENCE
      : CHECKIN_INTERVAL_DAYS;
  const last = new Date(lastCompletedAt).getTime();
  const due = new Date(last + intervalDays * DAY_MS);
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
