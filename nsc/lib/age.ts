import type { AgeBand } from "@/lib/content-types";

/**
 * Below this, no assessment at all — before ~2 the best number input is
 * plain talk, and neither instrument reads meaningfully at that age.
 */
export const MIN_ASSESSMENT_MONTHS = 24;

/** Paused/in-flight sessions resume within this window, then start fresh. */
export const RESUME_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Whole months between a birth month (day=1) and a reference date. */
export function ageInMonths(birthMonthISO: string, asOf: Date): number {
  const b = new Date(birthMonthISO + "T00:00:00Z");
  let months =
    (asOf.getUTCFullYear() - b.getUTCFullYear()) * 12 +
    (asOf.getUTCMonth() - b.getUTCMonth());
  if (asOf.getUTCDate() < b.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

/** Map an age in months onto the nearest applicable content band (§1.2). */
export function ageBandForMonths(months: number): AgeBand {
  if (months < 30) return "24-30m";
  if (months < 36) return "30-36m";
  if (months < 42) return "36-42m";
  if (months < 48) return "42-48m";
  return "48-60m";
}

export function ageBand(birthMonthISO: string, asOf: Date): AgeBand {
  return ageBandForMonths(ageInMonths(birthMonthISO, asOf));
}
