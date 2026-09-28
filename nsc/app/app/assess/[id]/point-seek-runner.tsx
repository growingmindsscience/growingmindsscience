"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Card, EnrichmentFooter } from "@/components/ui";
import { AudioButton } from "@/components/audio-button";
import { brand } from "@/lib/config/brand";
import { interpolate } from "@/lib/assessment";
import type { AssessmentCopy } from "@/lib/content-types";
import {
  PS_PLAN,
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
import { STEP_LOCK_MS, TAP_NOTICE, type TapNotice } from "./step-guard";

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
      aria-label={`${side === "left" ? "Left" : "Right"} card, ${count} ${count === 1 ? "dot" : "dots"}`}
      className="flex min-h-40 flex-1 flex-wrap content-center items-center justify-center gap-3 rounded-2xl border-2 border-sea-glass bg-white p-6 shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ground disabled:opacity-50"
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
  const [notice, setNotice] = useState<TapNotice | null>(null);

  const vars = { name: childName, objects: "" };
  const lines = (k: string, fallback: string[]) =>
    (copy.states[k]?.lines ?? fallback).map((l) => interpolate(l, vars));

  // Same step guard as the bear game: the next pair of cards appears exactly
  // where the last tap landed, so taps are ignored for a moment after each
  // change, and focus moves to the step heading.
  const stepKey = phase === "setup" ? "setup" : `${state.index}:${psIsDone(state) ? "done" : "trial"}`;
  const readyAt = useRef(0);
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);
  useLayoutEffect(() => {
    readyAt.current = Date.now() + STEP_LOCK_MS;
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [stepKey]);

  async function record(pick: PSPick) {
    if (inFlight.current || Date.now() < readyAt.current) return;
    inFlight.current = true;
    setPending(true);
    setNotice(null);
    try {
      const res = await recordPointPick(assessmentId, pick, state.index);
      if (!res) return; // the action redirected (e.g. signed out)
      setState(res.state);
      if (res.status === "stale") setNotice("stale");
    } catch {
      setNotice("error");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const noticeLine = notice ? (
    <p role="status" className="rounded-xl bg-rung-glow px-4 py-3 text-center text-sm text-ink-deep">
      {TAP_NOTICE[notice]}
    </p>
  ) : null;

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
    const [headline, ...rest] = lines(psReadoutKey(result.signal), [
      "All done. Thank you for playing.",
    ]);
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <Card>
          <div className="flex flex-col gap-3">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold text-ink-deep focus:outline-none"
            >
              {headline}
            </h1>
            {rest.map((l, i) => (
              <p key={i} className="text-ink">
                {l}
              </p>
            ))}
          </div>
        </Card>
        {noticeLine}
        <Link
          href={`/app/child/${childId}/plan`}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal px-6 py-3 text-base font-semibold text-white hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
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
  const prompt = lines(psTrialKey(state.index), [`Which card has ${spec.target}?`]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-between gap-6 px-6 py-10">
      <div className="flex flex-1 flex-col justify-center gap-6">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-center text-sm font-medium uppercase tracking-widest text-teal focus:outline-none"
        >
          Point and Seek · {state.index + 1} of {PS_PLAN.length}
        </h1>
        <Card className="text-center">
          <div className="flex flex-col gap-2">
            {prompt.map((l, i) => (
              <div key={`${i}:${l}`} className="flex items-center justify-center gap-2">
                <p className="text-lg text-ink">{l}</p>
                <AudioButton key={l} line={l} available={audioSet} />
              </div>
            ))}
          </div>
        </Card>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {`Card pair ${state.index + 1} of ${PS_PLAN.length}. ${prompt.join(" ")}`}
        </p>

        {noticeLine}

        <p className="text-center text-xs text-teal-soft">
          Tap the card {childName} points to
        </p>
        <div className="flex gap-4">
          <DotCard count={leftCount} side="left" disabled={pending} onPick={record} />
          <DotCard count={rightCount} side="right" disabled={pending} onPick={record} />
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => record("skip")}
          className="inline-flex min-h-11 items-center justify-center px-3 py-2 text-center text-sm text-teal-soft underline disabled:opacity-50"
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
