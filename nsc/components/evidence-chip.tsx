import type { Consensus, Strength } from "@/lib/content-types";

/**
 * Two-axis evidence chips (strength × consensus) — spec §6.1, rendered in the
 * same visual language as Child Evidence for cross-property consistency.
 */
const STRENGTH_LABEL: Record<Strength, string> = {
  "correlational-strong": "Strong correlation",
  rct: "Randomized trial",
  "rct-replicated": "Replicated trial",
  "theory-derived": "Theory-based",
};

const CONSENSUS_LABEL: Record<Consensus, string> = {
  high: "High consensus",
  moderate: "Moderate consensus",
  emerging: "Emerging",
};

export function EvidenceChips({
  strength,
  consensus,
}: {
  strength: Strength;
  consensus: Consensus;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-sea-glass/60 px-3 py-1 text-xs font-medium text-ink">
        {STRENGTH_LABEL[strength]}
      </span>
      <span className="rounded-full border border-sea-glass px-3 py-1 text-xs font-medium text-teal">
        {CONSENSUS_LABEL[consensus]}
      </span>
    </div>
  );
}
