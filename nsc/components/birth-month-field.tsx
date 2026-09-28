import { birthYearOptions, MONTH_NAMES } from "@/lib/birth-month";

const SELECT =
  "min-h-11 rounded-xl border border-sea-glass bg-surface px-3 py-2 text-base text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";

/**
 * Month + year pickers for a child's birth month. Works the same in every
 * browser (unlike `<input type="month">`) and never asks for a day.
 */
export function BirthMonthField({
  idPrefix,
  todayISO,
}: {
  idPrefix: string;
  /** The parent's local date, YYYY-MM-DD (sets the year range). */
  todayISO: string;
}) {
  const hintId = `${idPrefix}-hint`;
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={hintId}>
      <legend className="mb-1.5 text-sm font-medium text-ink">Birth month</legend>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink" htmlFor={`${idPrefix}-m`}>
          Month
          <select
            id={`${idPrefix}-m`}
            name="birth_month_m"
            required
            defaultValue=""
            className={SELECT}
          >
            <option value="" disabled>
              Choose a month
            </option>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={String(i + 1)}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink" htmlFor={`${idPrefix}-y`}>
          Year
          <select
            id={`${idPrefix}-y`}
            name="birth_month_y"
            required
            defaultValue=""
            className={SELECT}
          >
            <option value="" disabled>
              Choose a year
            </option>
            {birthYearOptions(todayISO).map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p id={hintId} className="text-xs text-teal-soft">
        Month and year only. We never ask for the exact day.
      </p>
    </fieldset>
  );
}
