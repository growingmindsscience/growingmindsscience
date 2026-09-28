import type { Placement } from "@/lib/titration";

/** Human rung labels for placements — the ladder's warm, non-clinical names. */
const LABELS: Record<Placement, string> = {
  L0: "just starting out",
  L1: "one-knower",
  L2: "two-knower",
  L3: "three-knower",
  L4: "four-knower",
  CP: "counts any set",
};

export function RUNG_LABEL(placement: string, nearCP: boolean): string {
  const base = LABELS[placement as Placement] ?? placement;
  if (placement === "L4" && nearCP) return "four-knower, nearly there";
  return base;
}

/** The instruments a completed check-in can come from. */
export const POINT_AND_SEEK = "point_and_seek";

/**
 * Rung label for a completed check-in, or null when it must not be named.
 * Point and Seek is a soft signal that only routes content (amendment A5):
 * its placement column holds a routing band, never a measured rung, so it
 * never appears as a knower level, a climb, or a comparison.
 */
export function rungLabelFor(a: {
  placement: string | null;
  near_cp?: boolean | null;
  instrument?: string | null;
}): string | null {
  if (!a.placement || a.instrument === POINT_AND_SEEK) return null;
  return RUNG_LABEL(a.placement, a.near_cp ?? false);
}

/** True for check-ins whose placement is a measured Give-N rung. */
export function isRungReading(a: { placement: string | null; instrument?: string | null }): boolean {
  return Boolean(a.placement) && a.instrument !== POINT_AND_SEEK && a.placement !== "CPX";
}
