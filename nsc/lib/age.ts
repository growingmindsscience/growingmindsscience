import type { AgeBand } from "@/lib/content-types";

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
