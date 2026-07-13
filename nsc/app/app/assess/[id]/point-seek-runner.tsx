"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, EnrichmentFooter } from "@/components/ui";
import { AudioButton } from "@/components/audio-button";
import { brand } from "@/lib/config/brand";
import { interpolate } from "@/lib/assessment";
import type { AssessmentCopy } from "@/lib/content-types";
import {
  psIsDone,
  psNextTrial,
  psReadoutKey,
  psResult,
  psTrialKey,
  type PSPick,
  type PSState,
  type Side,
} from "@/lib/pointandseek";
import { recordPointPick } from "../actions";

/** A card of N dots — big, friendly, deterministic layout. */
function DotCard({
  count,
  side,
  disabled,
  onPick,
}: {
  count: number;
  side: Side;
  disabled: boolean;
  onPick: (side: Side) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(side)}
      aria-label={`${side} card`}
      className="flex min-h-40 flex-1 flex-wrap content-center items-center justify-center gap-3 rounded-2xl border-2 border-sea-glass bg-white p-6 shadow-sm transition active:scale-95 disabled:opacity-50"
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="h-6 w-6 rounded-full bg-teal"
        />
      ))}
    </button>
  );
}

export function PointSeekRunner({
  assessmentId,
  childId,
  initialState,
  copy,
  childName,
  otherNumberLanguage = false,
  audioIds = [],
}: {
  assessmentId: string;
  childId: string;
  initialState: PSState;
  copy: AssessmentCopy;
  childName: string;
  otherNumberLanguage?: boolean;
  audioIds?: string[];
}) {
  const audioSet = useMemo(() => new Set(audioIds), [audioIds]);
  const [state, setState] = useState<PSState>(initialState);
  const [phase, setPhase] = useState<"setup" | "running">(
    initialState.records.length > 0 ? "running" : "setup",
  );
  const [pending, setPending] = useState(false);

  const vars = { name: childName, objects: "" };
  const lines = (k: string, fallback: string[]) =>
    (copy.states[k]?.lines ?? fallback).map((l) => interpolate(l, vars));

  async function record(pick: PSPick) {
    setPending(true);
    try {
      const { state: next } = await recordPointPick(assessmentId, pick);
      setState(next);
    } finally {
      setPending(false);
    }
  }

  if (phase === "setup") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-teal">
            Point and Seek
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-deep">
            A two-minute watching game
          </h1>
        </div>
        <Card>
          <ul className="flex flex-col gap-2 text-ink">
            {lines("ps:intro", [
              "Two cards appear. Ask the question exactly, then tap the side they point to.",
            ]).map((l, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-teal">
                  •
                </span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Button onClick={() => setPhase("running")}>We&rsquo;re ready</Button>
      </main>
    );
  }

  if (psIsDone(state)) {
    const result = psResult(state)!;
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <Card>
          <div className="flex flex-col gap-3">
            {lines(psReadoutKey(result.signal), [
              "All done — thank you for playing.",
            ]).map((l, i) => (
              <p
                key={i}
                className={i === 0 ? "text-lg font-semibold text-ink-deep" : "text-ink"}
              >
                {l}
              </p>
            ))}
          </div>
        </Card>
        <Link
          href={`/app/child/${childId}/plan`}
          className="inline-flex items-center justify-center rounded-full bg-teal px-6 py-3 text-base font-semibold text-white hover:bg-teal-soft"
        >
          See this week&rsquo;s plan
        </Link>
        <EnrichmentFooter text={brand.enrichmentFooter} />
      </main>
    );
  }

  const spec = psNextTrial(state)!;
  const leftCount = spec.correctSide === "left" ? spec.target : spec.foil;
  const rightCount = spec.correctSide === "right" ? spec.target : spec.foil;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-between gap-6 px-6 py-10">
      <div className="flex flex-1 flex-col justify-center gap-6">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-teal">
          Point and Seek · {state.index + 1} of 8
        </p>
        <Card className="text-center">
          <div className="flex flex-col gap-2">
            {lines(psTrialKey(state.index), [
              `Which card has ${spec.target}?`,
            ]).map((l, i) => (
              <div key={i} className="flex items-center justify-center gap-2">
                <p className="text-lg text-ink">{l}</p>
                <AudioButton line={l} available={audioSet} />
              </div>
            ))}
          </div>
        </Card>

        <p className="text-center text-xs text-teal-soft">
          Tap the card {childName} points to
        </p>
        <div className="flex gap-4">
          <DotCard count={leftCount} side="left" disabled={pending} onPick={record} />
          <DotCard count={rightCount} side="right" disabled={pending} onPick={record} />
        </div>

        <button
          disabled={pending}
          onClick={() => record("skip")}
          className="text-center text-sm text-teal-soft underline disabled:opacity-50"
        >
          No point this time — skip
        </button>
      </div>

      <p className="rounded-xl bg-sea-glass/40 px-4 py-2 text-center text-xs text-ink">
        Read it exactly. No hints, no pointing for them. Every answer earns a
        &ldquo;thank you.&rdquo;
        {otherNumberLanguage &&
          ` Say the number words in ${childName}'s counting language.`}
      </p>
    </main>
  );
}
