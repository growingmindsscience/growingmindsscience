"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { EvidenceChips } from "@/components/evidence-chip";
import type { Game } from "@/lib/content-types";
import { logPlay } from "@/app/app/child/[id]/plan/actions";

export function GameCard({
  game,
  childId,
  playedReaction,
  locked = false,
}: {
  game: Game;
  childId: string;
  playedReaction?: string | null;
  locked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reaction, setReaction] = useState<string | null>(playedReaction ?? null);
  const [pending, startTransition] = useTransition();

  function react(r: "loved" | "fine" | "flopped") {
    setReaction(r);
    startTransition(() => logPlay(childId, game.id, r));
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink-deep">{game.title}</h3>
          <p className="mt-1 text-sm text-teal-soft">
            {game.duration_min} min · {game.frequency_rx}
          </p>
        </div>
        {reaction && (
          <span className="rounded-full bg-rung-glow px-3 py-1 text-xs font-medium text-ink-deep">
            {reaction === "loved" ? "Loved it" : reaction === "fine" ? "Played" : "Not today"}
          </span>
        )}
      </div>

      <p className="mt-2 text-ink">{game.goal}</p>

      {locked ? (
        <p className="mt-4 rounded-xl bg-sea-glass/30 px-4 py-3 text-sm text-teal-soft">
          Unlock the full plan to play this one.
        </p>
      ) : (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-4 text-sm font-semibold text-teal underline"
          >
            {open ? "Hide how to play" : "How to play"}
          </button>

          {open && (
            <div className="mt-4 flex flex-col gap-4">
              {game.materials.length > 0 && (
                <p className="text-sm text-ink">
                  <span className="font-semibold">You need:</span>{" "}
                  {game.materials.join(", ")}
                </p>
              )}
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-ink">
                {game.script.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
              <div className="grid gap-2 text-sm text-ink sm:grid-cols-2">
                <p className="rounded-xl bg-sea-glass/30 px-3 py-2">
                  <span className="font-semibold">Too easy?</span> {game.level_up}
                </p>
                <p className="rounded-xl bg-sea-glass/30 px-3 py-2">
                  <span className="font-semibold">Too hard?</span> {game.level_down}
                </p>
              </div>
              <p className="text-sm text-teal-soft">{game.bilingual_note}</p>
              <EvidenceChips
                strength={game.evidence.strength}
                consensus={game.evidence.consensus}
              />
            </div>
          )}

          <div className="mt-5 flex items-center gap-2">
            <span className="text-sm text-teal-soft">We played it:</span>
            {(["loved", "fine", "flopped"] as const).map((r) => (
              <button
                key={r}
                disabled={pending}
                onClick={() => react(r)}
                className={[
                  "rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50",
                  reaction === r
                    ? "border-teal bg-rung-glow font-semibold text-ink-deep"
                    : "border-sea-glass text-ink hover:bg-sea-glass/30",
                ].join(" ")}
              >
                {r === "loved" ? "Loved" : r === "fine" ? "Fine" : "Flopped"}
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
