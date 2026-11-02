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
 * Geary, vanMarle, Chu, Hoard & Nugent (2018 online / 2019 print,
 * J. Educational Psychology 111(2), 256-267, doi 10.1037/edu0000277;
 * longitudinal CP-acquisition ages, N=197). Geary et al. is listed on
 * /evidence from NORMS_SOURCES below (not the certified citations
 * artifact; adding it there needs the G1 pass). Per-band anchors are
 * documented on the table below. The bands are deliberately WIDE: they
 * describe roughly the middle span of published samples, not cutoffs.
 *
 * Two honesty rules (2026-11 audit, NSC-01/02):
 * - A reading well before the range (2+ rungs under its floor) is said
 *   plainly and paired with a calm "mention it at the next checkup" line.
 *   It is never described as "inside the range" or "common".
 * - The data stop at about 5 (Geary et al. follow children to ~5;1), so
 *   no comparison is made at NORMS_MAX_MONTHS or older.
 *
 * Pure module: no I/O, importable from client components.
 */

export type Standing = "well-before" | "earlier" | "typical" | "ahead";

/**
 * The comparison stops here. The longitudinal sample behind the top band
 * ends at about 5;1 (61 months); extending the table further would state a
 * norm the data never measured.
 */
export const NORMS_MAX_MONTHS = 62;

/** True when the published ranges cover this age (24 months to about 5). */
export function hasNormsForAge(months: number): boolean {
  return months < NORMS_MAX_MONTHS;
}

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
 * - 54–61m: 77% CP by 4;9 and 91% by 5;1 in the same sample (figures
 *   from the paper's code comments, not re-read against the full text in
 *   the 2026-11 audit). Below L4 here is the earlier side; two or more
 *   rungs below is "well before" and gets the checkup line.
 * Past 61m there is no row: callers check hasNormsForAge first.
 * Broad-population samples run later than university-lab samples, so the
 * bands lean toward the wider (later) estimates on purpose.
 */
const NORMS: { upTo: number; low: Placement; high: Placement }[] = [
  { upTo: 30, low: "L0", high: "L1" }, // 24–29m
  { upTo: 36, low: "L0", high: "L2" }, // 30–35m
  { upTo: 42, low: "L1", high: "L3" }, // 36–41m
  { upTo: 48, low: "L2", high: "CP" }, // 42–47m
  { upTo: 54, low: "L3", high: "CP" }, // 48–53m
  { upTo: NORMS_MAX_MONTHS, low: "L4", high: "CP" }, // 54–61m
];

/**
 * The typical knower-level range at an age. Ages below 24m clamp to the
 * first band; ages past the data clamp to the last band, so callers that
 * show a comparison must check hasNormsForAge (ageReadout does).
 */
export function typicalRangeForMonths(months: number): TypicalRange {
  for (const row of NORMS) {
    if (months < row.upTo) return { low: row.low, high: row.high };
  }
  const last = NORMS[NORMS.length - 1];
  return { low: last.low, high: last.high };
}

/** Where a placement sits against the typical range for an age. */
export function standingForAge(months: number, placement: Placement): Standing {
  const range = typicalRangeForMonths(months);
  const r = RANK[placement];
  if (r <= RANK[range.low] - 2) return "well-before";
  if (r < RANK[range.low]) return "earlier";
  if (r > RANK[range.high]) return "ahead";
  return "typical";
}

/** "one-knower to counts any set" — human label for a range. */
export function rangeLabel(range: TypicalRange): string {
  if (range.low === range.high) return RUNG_LABEL(range.low, false);
  return `${RUNG_LABEL(range.low, false)} to ${RUNG_LABEL(range.high, false)}`;
}

/** "from one-knower to three-knower": the range as it reads in a sentence. */
function rangePhrase(range: TypicalRange): string {
  if (range.low === range.high) return `at ${RUNG_LABEL(range.low, false)}`;
  return `somewhere from ${RUNG_LABEL(range.low, false)} to ${RUNG_LABEL(range.high, false)}`;
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
  /**
   * Present only when the read is well before the range: the calm "mention
   * it at the next checkup" line. Never hidden behind the paywall.
   */
  followUp: string | null;
}

/**
 * The full "for their age" comparison. Copy rules (brand): never "behind",
 * never "delay", never a percentile with false precision, and never call a
 * reading outside the range "inside" it. A read well before the range says
 * so plainly and points to the pediatrician, calmly.
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
  const span = rangePhrase(range);

  let headline: string;
  let detail: string;
  let followUp: string | null = null;
  if (standing === "ahead") {
    headline = `${name} is out ahead of the typical range for age ${ageLabel}.`;
    detail = `Most children around ${ageLabel} sit ${span}. Keep it playful. The games will keep pace as the next rung comes into view.`;
  } else if (standing === "typical") {
    headline = `${name} is right in the typical range for age ${ageLabel}.`;
    detail = `Most children around ${ageLabel} sit ${span}, and children step onto rungs months apart while landing in the same place.`;
  } else if (standing === "earlier") {
    headline = `${name} read a little before the typical range for age ${ageLabel}.`;
    detail = `Most children around ${ageLabel} sit ${span}, and children step onto each rung months apart. The weekly games work exactly this edge, a few playful minutes at a time.`;
  } else {
    headline = `${name} read well before the typical range for age ${ageLabel} today.`;
    detail = `Most children around ${ageLabel} sit ${span}. One home game can read low on a tired or distracted day, so play the check-in again in a week or two. This week’s games start right where ${name} is.`;
    followUp = `If it reads the same way again, mention it at ${name}’s next checkup. Asking early is always welcome, and the pediatrician can look at the whole picture: talking, hearing, play and learning.`;
  }

  const caveat =
    args.confidence === "low"
      ? "Today’s read was a playful estimate, so hold this loosely. The next check-in will sharpen it."
      : null;

  return { standing, range, rangeLabel: label, headline, detail, caveat, followUp };
}

/** What the readout and progress page show for "for their age". */
export type AgeReadout =
  | ({ kind: "compare" } & StandingSummary)
  | { kind: "older" | "unclear"; headline: string; detail: string; followUp: string | null };

/**
 * The age card, or the honest reason there is no comparison:
 * - "unclear": a low-confidence read (an abandoned, skip-heavy or noisy
 *   session) is never compared with age.
 * - "older": past the ages the published ranges cover. A low rung at
 *   this age still gets the calm checkup line.
 */
export function ageReadout(args: {
  months: number;
  placement: Placement;
  name: string;
  confidence?: Confidence | string | null;
}): AgeReadout {
  const { months, placement, name } = args;
  if (args.confidence === "low") {
    return {
      kind: "unclear",
      headline: "Not enough clear play today to compare with age.",
      detail:
        "A fresh day and a fresh bear will tell you more. Play the check-in again in a week or two.",
      followUp: null,
    };
  }
  if (!hasNormsForAge(months)) {
    return {
      kind: "older",
      headline: `${name} is older than the ages this comparison covers.`,
      detail: `The counting studies that set the typical ranges follow children to about age 5, and by then most can count out a small pile when asked. Today’s rung is still the useful part: the games start right where ${name} is.`,
      followUp:
        RANK[placement] <= RANK.L3
          ? `If handing over two or three things on request is still hard for ${name}, mention it at the next checkup or to ${name}’s teacher. Asking early is always welcome.`
          : null,
    };
  }
  return { kind: "compare", ...standingSummary(args) };
}

/** Where the for-their-age ranges come from, for /evidence. */
export const NORMS_SOURCES: { anchor: string; scope: string; cite: string; href: string }[] = [
  {
    anchor: "Geary, vanMarle, Chu, Hoard & Nugent (2019, J. Educational Psychology)",
    scope:
      "Followed 197 children through two years of preschool to see when each one became a cardinal-principle knower. The top of the typical ranges leans on this sample.",
    cite:
      "Geary, D. C., vanMarle, K., Chu, F., Hoard, M., & Nugent, L. (2019). Predicting age of becoming a cardinal principle knower. Journal of Educational Psychology, 111(2), 256-267. Online 2018.",
    href: "https://doi.org/10.1037/edu0000277",
  },
];

/** Who to ask, and the public guidance behind the checkup line. */
export const CHECKUP_LINKS = {
  prepPath: "/tools/checkup-prep",
  cdcConcerned: "https://www.cdc.gov/act-early/families/concerned.html",
} as const;

/** Standing footnote for surfaces that show the comparison. */
export const NORMS_NOTE =
  "Typical ranges come from published counting studies and they are wide. A home check-in is an estimate, never a diagnosis. The range is a map, not a race.";
