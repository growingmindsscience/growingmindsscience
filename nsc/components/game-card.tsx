"use client";

import { useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { AudioButton } from "@/components/audio-button";
import { EvidenceChips } from "@/components/evidence-chip";
import { interpolate } from "@/lib/assessment";
import type { Game } from "@/lib/content-types";
import { logPlay } from "@/app/app/child/[id]/plan/actions";

type Reaction = "loved" | "fine" | "flopped";

export function GameCard({
  game,
  childId,
  childName,
  playedReaction,
  locked = false,
  audioIds = [],
}: {
  game: Game;
  childId: string;
  childName: string;
  playedReaction?: string | null;
  locked?: boolean;
  audioIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [reaction, setReaction] = useState<string | null>(playedReaction ?? null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const audioSet = useMemo(() => new Set(audioIds), [audioIds]);
  // Game copy carries {name} placeholders; interpolate for display but hand
  // AudioButton the raw line — clip ids key off the uninterpolated template.
  const vars = { name: childName, objects: "" };

  function react(r: Reaction) {
    const previous = reaction;
    setReaction(r);
    setSaveFailed(false);
    startTransition(async () => {
      const res = await logPlay(childId, game.id, r).catch(() => null);
      if (!res?.ok) {
        setReaction(previous);
        setSaveFailed(true);
      }
    });
  }

  const panelId = `how-${game.id}`;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink-deep">{game.title}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {game.duration_min} min · {game.frequency_rx}
          </p>
        </div>
        {reaction && (
          <span className="rounded-sm bg-rung-glow px-3 py-1 text-xs font-medium text-ink-deep">
            {reaction === "loved" ? "Loved it" : reaction === "fine" ? "Played" : "Not today"}
          </span>
        )}
      </div>

      <p className="mt-2 text-ink">{game.goal}</p>

      {locked ? (
        <p className="mt-4 rounded-xl bg-sea-glass/30 px-4 py-3 text-sm text-ink-muted">
          Unlock the full plan to play this one.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-teal underline"
          >
            {open ? "Hide how to play" : "How to play"}
          </button>

          {open && (
            <div id={panelId} className="mt-2 flex flex-col gap-4">
              {game.materials.length > 0 && (
                <p className="text-sm text-ink">
                  <span className="font-semibold">You need:</span>{" "}
                  {game.materials.join(", ")}
                </p>
              )}
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-ink">
                {game.script.map((line, i) => (
                  <li key={i}>
                    <span className="inline-flex items-center gap-1">
                      <span>{interpolate(line, vars)}</span>
                      <AudioButton key={line} line={line} available={audioSet} />
                    </span>
                  </li>
                ))}
              </ol>
              <div className="grid gap-2 text-sm text-ink sm:grid-cols-2">
                <p className="rounded-xl bg-sea-glass/30 px-3 py-2">
                  <span className="font-semibold">Too easy?</span>{" "}
                  {interpolate(game.level_up, vars)}
                </p>
                <p className="rounded-xl bg-sea-glass/30 px-3 py-2">
                  <span className="font-semibold">Too hard?</span>{" "}
                  {interpolate(game.level_down, vars)}
                </p>
              </div>
              <p className="text-sm text-ink-muted">{game.bilingual_note}</p>
              <EvidenceChips
                strength={game.evidence.strength}
                consensus={game.evidence.consensus}
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="How did it go?">
            <span className="text-sm text-ink-muted">We played it:</span>
            {(["loved", "fine", "flopped"] as const).map((r) => (
              <button
                type="button"
                key={r}
                disabled={pending}
                aria-pressed={reaction === r}
                onClick={() => react(r)}
                className={[
                  "inline-flex min-h-11 items-center rounded-control border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50",
                  reaction === r
                    ? "border-teal bg-rung-glow font-semibold text-ink-deep"
                    : "border-line text-ink hover:bg-sea-glass/30",
                ].join(" ")}
              >
                {r === "loved" ? "Loved" : r === "fine" ? "Fine" : "Flopped"}
              </button>
            ))}
          </div>
          {saveFailed ? (
            <p role="status" className="mt-2 text-xs text-ink-muted">
              That didn&rsquo;t save. Please tap it again in a moment.
            </p>
          ) : reaction ? (
            <p role="status" className="mt-2 text-xs text-ink-muted">
              {reaction === "loved"
                ? "Great. It stays in the rotation so you can keep playing it."
                : reaction === "flopped"
                  ? "No worries. From next week it rests for a while."
                  : "Got it. Something new rotates in next week."}
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}
