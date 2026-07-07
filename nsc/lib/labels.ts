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
