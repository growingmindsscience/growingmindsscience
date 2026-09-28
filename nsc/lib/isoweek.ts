import { calendarDay, DEFAULT_TZ, localDateISO, mondayOfISO } from "@/lib/tz";

/** ISO-8601 year + week for a date (UTC). Used to seed the weekly plan. */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** "2026-W40" for a date (UTC). The cron's weekly-email ledger key. */
export function isoWeekKey(date: Date): string {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Weekly-plan seed for a child: the ISO week of the parent's local calendar
 * day (`tz`), so the plan turns over at local midnight on Monday.
 */
export function weekSeed(childId: string, date: Date, tz: string = DEFAULT_TZ): string {
  return `${childId}:${isoWeekKey(calendarDay(localDateISO(date, tz)))}`;
}

/** 0=Mon .. 6=Sun in the parent's time zone — index into the 7 daily prompts. */
export function dayIndex(date: Date, tz: string = DEFAULT_TZ): number {
  return (calendarDay(localDateISO(date, tz)).getUTCDay() + 6) % 7;
}

/** YYYY-MM-DD of this week's Monday in the parent's time zone. */
export function weekStartISO(date: Date, tz: string = DEFAULT_TZ): string {
  return mondayOfISO(localDateISO(date, tz));
}
