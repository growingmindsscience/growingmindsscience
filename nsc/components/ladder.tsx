import { type Placement } from "@/lib/titration";

/**
 * The Counting Ladder — the product's one signature visual (spec §9).
 * Deep-teal rails, a warm coral glow on the current rung. Everything else
 * in the app stays quiet so this reads as the memorable element.
 */
const RUNGS: { code: Placement | "CPX"; label: string }[] = [
  { code: "L0", label: "Just starting" },
  { code: "L1", label: "One-knower" },
  { code: "L2", label: "Two-knower" },
  { code: "L3", label: "Three-knower" },
  { code: "L4", label: "Four-knower" },
  { code: "CP", label: "Counts any set" },
  { code: "CPX", label: "One more, one fewer" },
];

export function Ladder({
  current,
  nearCP = false,
  animate = false,
  className,
}: {
  current?: Placement | "CPX";
  nearCP?: boolean;
  animate?: boolean;
  className?: string;
}) {
  // Bottom rung at the bottom: render high-to-low.
  const ordered = [...RUNGS].reverse();
  return (
    <div
      className={className}
      role="img"
      aria-label={
        current
          ? `Counting ladder, current rung: ${RUNGS.find((r) => r.code === current)?.label}`
          : "Counting ladder"
      }
    >
      <div className="relative mx-auto flex w-full max-w-xs flex-col gap-2">
        {/* rails */}
        <div className="pointer-events-none absolute inset-y-2 left-6 w-1 rounded bg-teal" />
        <div className="pointer-events-none absolute inset-y-2 right-6 w-1 rounded bg-teal" />
        {ordered.map((rung) => {
          const isCurrent = current === rung.code;
          const isNear = nearCP && rung.code === "CP" && current === "L4";
          const done =
            current &&
            RUNGS.findIndex((r) => r.code === rung.code) <
              RUNGS.findIndex((r) => r.code === current);
          return (
            <div
              key={rung.code}
              className={[
                "relative z-10 flex items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-medium transition-all",
                isCurrent
                  ? "bg-rung-glow text-ink-deep shadow-md ring-2 ring-teal"
                  : isNear
                    ? "bg-rung-glow/50 text-ink-deep ring-1 ring-teal/50"
                    : done
                      ? "bg-sea-glass/50 text-ink"
                      : "bg-surface text-teal-soft",
                isCurrent && animate ? "motion-safe:animate-pulse" : "",
              ].join(" ")}
            >
              {rung.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
