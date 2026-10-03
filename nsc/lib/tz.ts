/**
 * The parent's calendar day. "Today's prompt", "done today", and the week
 * boundary all follow the parent's local date, not UTC (a US evening is
 * already tomorrow in UTC). The browser reports its IANA zone in a cookie
 * (components/timezone-sync.tsx); lib/tz.server.ts reads it; these helpers
 * stay pure so they can be tested and used anywhere.
 */

export const TZ_COOKIE = "nsc_tz";
export const DEFAULT_TZ = "UTC";

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date (YYYY-MM-DD) at `instant` in time zone `tz`. */
export function localDateISO(instant: Date, tz: string = DEFAULT_TZ): string {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TZ;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** A YYYY-MM-DD calendar day as a UTC-midnight Date (tz-free day math). */
export function calendarDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = calendarDay(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Monday that starts the ISO week containing `isoDate`. */
export function mondayOfISO(isoDate: string): string {
  const dow = calendarDay(isoDate).getUTCDay() || 7; // Mon=1..Sun=7
  return addDaysISO(isoDate, -(dow - 1));
}
