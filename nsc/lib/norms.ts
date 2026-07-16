import type { Confidence, Placement } from "@/lib/titration";
import { RUNG_LABEL } from "@/lib/labels";

/**
 * Age-referenced typical ranges for knower-levels — the "where does this sit
 * for their age" metric.
 *
 * Sources: the Give-N literature the evidence page already cites
 * (ev.given.wynn1990, ev.knower.lecorre2007, ev.knower.sarnecka2008), plus
 * two band-boundary anchors not yet in the certified citations artifact —
 * Sarnecka & Lee (2009, J. Exp. Child Psych., knower-level ages) and
 * Geary & vanMarle (2018, Dev. Psych., longitudinal CP-acquisition ages,
 * N=197). If bands are ever surfaced on /evidence, those two need the
 * compile + cert pass first. Per-band anchors are documented on the table
 * below. The bands are deliberately WIDE — they describe roughly the
 * middle span of published samples, not cutoffs — and every consuming
 * surface must keep the framing calm: a range is a map, never a race, and
 * "earlier side" is common and workable, not a deficit.
 *
 * Pure module: no I/O, importable from client components.
 */

export type Standing = "earlier" | "typical" | "ahead";

export interface TypicalRange {
  low: Placement;
  high: Placement;
}

/** Ladder height shared with the progress/readout surfaces. */
const RANK: Record<Placement, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  CP: 5,
};

/**
 * months < each row's `upTo` → that row (rows are contiguous from 24).
 * Lows and highs are both monotone non-decreasing so a child who simply
 * gets older never "loses ground" against the range by table artifact.
 *
 * Empirical anchors per band (all English-language Give-N samples):
 * - 24–29m: most toddlers are pre-knowers; one-knowers emerge — "one" is
 *   learned around 2½ on average (Wynn 1990/92; Silver et al. 2021).
 * - 30–35m: "one" lands ~2½ on average, so pre-knowers are still common
 *   here (hence the L0 floor); "two" follows ~4–5 months after "one"
 *   (Wynn 1992; Sarnecka & Lee 2009).
 * - 36–41m: subset knowers (1–3) dominate the early threes; "three" takes
 *   several months more than "two" (Sarnecka & Lee 2009).
 * - 42–47m: CP arrives here for many in high-SES lab samples (Le Corre &
 *   Carey 2007, CP mean ≈ 3;7) but 1-knowers through CP-knowers are ALL
 *   still present at 46 months in that same study — the reason this band,
 *   and every band, stays wide.
 * - 48–53m: in a broader longitudinal sample only 28% were CP at 3;11 and
 *   ~48% by 4;3 (Geary & vanMarle 2018, N=197), so mid subset-knowers
 *   remain within typical through four.
 * - 54m+: 77% CP by 4;9 and 91% by 5;1 in the same sample — below L4 at
 *   this age is genuinely the earlier side.
 * Broad-population samples run later than university-lab samples, so the
 * bands lean toward the wider (later) estimates on purpose.
 */
const NORMS: { upTo: number; low: Placement; high: Placement }[] = [
  { upTo: 30, low: "L0", high: "L1" }, // 24–29m
  { upTo: 36, low: "L0", high: "L2" }, // 30–35m
  { upTo: 42, low: "L1", high: "L3" }, // 36–41m
  { upTo: 48, low: "L2", high: "CP" }, // 42–47m
  { upTo: 54, low: "L3", high: "CP" }, // 48–53m
  { upTo: Infinity, low: "L4", high: "CP" }, // 54m+
];

export const MIN_NORMS_MONTHS = 24;

/** The typical knower-level range at an age. Ages below 24m clamp to the first band. */
export function typicalRangeForMonths(months: number): TypicalRange {
  for (const row of NORMS) {
    if (months < row.upTo) return { low: row.low, high: row.high };
  }
  // unreachable — last row catches everything
  return { low: "L4", high: "CP" };
}

/** Where a placement sits against the typical range for an age. */
export function standingForAge(months: number, placement: Placement): Standing {
  const range = typicalRangeForMonths(months);
  const r = RANK[placement];
  if (r < RANK[range.low]) return "earlier";
  if (r > RANK[range.high]) return "ahead";
  return "typical";
}

/** "one-knower to counts any set" — human label for a range. */
export function rangeLabel(range: TypicalRange): string {
  if (range.low === range.high) return RUNG_LABEL(range.low, false);
  return `${RUNG_LABEL(range.low, false)} to ${RUNG_LABEL(range.high, false)}`;
}

/**
 * "2½", "3", "4" — a friendly half-year age label for norm copy. Floors to
 * the half year (never rounds up): overstating age makes the typical range
 * read more demanding than it is, and the gentle error is the other way.
 */
export function friendlyAgeLabel(months: number): string {
  const halfYears = Math.floor(months / 6);
  const whole = Math.floor(halfYears / 2);
  return halfYears % 2 === 0 ? `${whole}` : `${whole}½`;
}

/** "2 yr 4 mo" — compact age chip for dashboards. */
export function formatAge(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

export interface StandingSummary {
  standing: Standing;
  range: TypicalRange;
  /** e.g. "one-knower to three-knower" */
  rangeLabel: string;
  /** One-sentence answer, leading with the child. */
  headline: string;
  /** The supporting sentence — what the range is and what to do with it. */
  detail: string;
  /** Present only for low-confidence reads — hold the comparison loosely. */
  caveat: string | null;
}

/**
 * The full "for their age" readout. Copy rules (brand): never "behind",
 * never "delay", never a percentile with false precision. Earlier-side copy
 * always pairs the observation with the plan already in the parent's hands.
 */
export function standingSummary(args: {
  months: number;
  placement: Placement;
  name: string;
  confidence?: Confidence | string | null;
}): StandingSummary {
  const { months, placement, name } = args;
  const range = typicalRangeForMonths(months);
  const standing = standingForAge(months, placement);
  const ageLabel = friendlyAgeLabel(months);
  const label = rangeLabel(range);

  let headline: string;
  let detail: string;
  if (standing === "ahead") {
    headline = `${name} is out ahead of the typical range for age ${ageLabel}.`;
    detail = `Most children around ${ageLabel} sit between ${label}. Keep it playful — the games will keep pace as the next rung comes into view.`;
  } else if (standing === "typical") {
    headline = `${name} is right in the typical range for age ${ageLabel}.`;
    detail = `Most children around ${ageLabel} sit between ${label}, and children step onto rungs months apart while landing in the same place.`;
  } else {
    headline = `${name} is on the earlier side of the typical range for age ${ageLabel}.`;
    detail = `Most children around ${ageLabel} sit between ${label} — a wide range, and the earlier side of it is common. The weekly games work exactly this edge, a few playful minutes at a time.`;
  }

  const caveat =
    args.confidence === "low"
      ? "Today’s read was a playful estimate, so hold this loosely — the next check-in will sharpen it."
      : null;

  return { standing, range, rangeLabel: label, headline, detail, caveat };
}

/** Standing footnote for surfaces that show the comparison. */
export const NORMS_NOTE =
  "Typical ranges come from published counting studies and they are wide. A home check-in is an estimate, never a diagnosis — the range is a map, not a race.";
