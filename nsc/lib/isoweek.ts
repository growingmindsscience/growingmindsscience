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

export function weekSeed(childId: string, date: Date): string {
  const { year, week } = isoWeek(date);
  return `${childId}:${year}-W${String(week).padStart(2, "0")}`;
}

/** 0=Mon .. 6=Sun — index into the 7 daily prompts. */
export function dayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}
