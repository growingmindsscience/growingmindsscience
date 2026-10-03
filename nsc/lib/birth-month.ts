/**
 * Birth month input. The form uses two selects (month + year) because
 * `<input type="month">` is a bare text box on desktop Safari and Firefox,
 * where "March 2024" was rejected with no hint. A legacy `YYYY-MM` value is
 * still accepted.
 */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Years offered in the picker: this year back through `span - 1` years ago. */
export function birthYearOptions(todayISO: string, span = 8): number[] {
  const year = Number(todayISO.slice(0, 4));
  return Array.from({ length: span }, (_, i) => year - i);
}

export type BirthMonthResult =
  | { ok: true; value: string } // YYYY-MM
  | { ok: false; reason: "missing" | "future" };

/**
 * Parse the form fields into `YYYY-MM`. `todayISO` is the parent's local
 * date (YYYY-MM-DD), so "this month" means their month.
 */
export function parseBirthMonth(
  fields: { month?: unknown; year?: unknown; combined?: unknown },
  todayISO: string,
): BirthMonthResult {
  const combined = typeof fields.combined === "string" ? fields.combined.trim() : "";
  const m = /^(\d{4})-(\d{2})$/.exec(combined);
  const year = m ? Number(m[1]) : Number(fields.year);
  const month = m ? Number(m[2]) : Number(fields.month);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    year < 1900 ||
    year > 9999
  ) {
    return { ok: false, reason: "missing" };
  }
  const value = `${year}-${String(month).padStart(2, "0")}`;
  if (value > todayISO.slice(0, 7)) return { ok: false, reason: "future" };
  return { ok: true, value };
}

/** Read the birth-month fields from a submitted form. */
export function birthMonthFromForm(formData: FormData, todayISO: string): BirthMonthResult {
  return parseBirthMonth(
    {
      month: formData.get("birth_month_m"),
      year: formData.get("birth_month_y"),
      combined: formData.get("birth_month"),
    },
    todayISO,
  );
}
