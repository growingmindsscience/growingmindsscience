"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, EnrichmentFooter } from "@/components/ui";
import { Ladder } from "@/components/ladder";
import { brand } from "@/lib/config/brand";
import { stepView } from "@/lib/assessment";
import type { AssessmentCopy } from "@/lib/content-types";
import { interpolate } from "@/lib/assessment";
import type { Outcome, TitrationState } from "@/lib/titration";
import { pauseAssessment, recordOutcome, startPointAndSeek } from "../actions";

const NUMWORDS = ["zero", "one", "two", "three", "four", "five", "six"];

export function TrialRunner({
  assessmentId,
  childId,
  initialState,
  copy,
  childName,
  objects,
  resumed,
}: {
  assessmentId: string;
  childId: string;
  initialState: TitrationState;
  copy: AssessmentCopy;
  childName: string;
  objects: string;
  resumed: boolean;
}) {
  const [state, setState] = useState<TitrationState>(initialState);
  const [phase, setPhase] = useState<"setup" | "running">(
    resumed ? "running" : "setup",
  );
  const [showCheck, setShowCheck] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [showResumeNote, setShowResumeNote] = useState(resumed);

  const vars = { name: childName, objects };
  const view = stepView(state, copy, vars, showCheck);

  async function record(outcome: Outcome) {
    setPending(true);
    try {
      const { state: next } = await recordOutcome(assessmentId, outcome);
      setState(next);
      setShowCheck(false);
      setShowResumeNote(false);
    } finally {
      setPending(false);
    }
  }

  const rules = copy.states["setup:rules"]?.lines ?? [];
  const checklist = copy.states["setup:checklist"]?.lines ?? [];

  if (phase === "setup") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink-deep">Before you start</h1>
        </div>
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-teal">
            You will need
          </h2>
          <ul className="flex flex-col gap-2 text-ink">
            {checklist.map((l, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-teal">
                  •
                </span>
                <span>{interpolate(l, vars)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="bg-sea-glass/30">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-teal">
            The three rules
          </h2>
          <ul className="flex flex-col gap-2 text-ink">
            {rules.map((l, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-teal">
                  •
                </span>
                <span>{interpolate(l, vars)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Button onClick={() => setPhase("running")}>I&rsquo;m ready</Button>
      </main>
    );
  }

  if (view.kind === "done") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <Ladder current={view.placement} nearCP={view.nearCP} animate />
        <Card>
          <div className="flex flex-col gap-3">
            {view.lines.map((l, i) => (
              <p key={i} className={i === 0 ? "text-lg font-semibold text-ink-deep" : "text-ink"}>
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
        {state.stopReason === "skips" && (
          <form action={startPointAndSeek.bind(null, childId)}>
            <button
              type="submit"
              className="w-full text-center text-sm text-teal-soft underline"
            >
              The bear got mobbed? Try Point and Seek — a two-minute watching
              game, no setup
            </button>
          </form>
        )}
        <EnrichmentFooter text={brand.enrichmentFooter} />
      </main>
    );
  }

  const bigN = view.n != null ? NUMWORDS[view.n] : "";
  const pauseLines = copy.states["pause"]?.lines ?? [];
  const resumeLine = copy.states["resume"]?.lines?.[0];

  if (confirmPause) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <Card className="text-center">
          <div className="flex flex-col gap-3">
            {pauseLines.map((l, i) => (
              <p key={i} className={i === 0 ? "text-lg font-semibold text-ink-deep" : "text-ink"}>
                {interpolate(l, vars)}
              </p>
            ))}
          </div>
        </Card>
        <form action={pauseAssessment.bind(null, assessmentId)}>
          <Button type="submit" className="w-full">
            Pause &mdash; the bear naps
          </Button>
        </form>
        <Button variant="ghost" onClick={() => setConfirmPause(false)}>
          Keep playing
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-between gap-6 px-6 py-10">
      <div className="flex flex-1 flex-col justify-center gap-6">
        {showResumeNote && (
          <Card className="bg-sea-glass/30">
            <p className="font-medium text-ink-deep">
              {resumeLine
                ? interpolate(resumeLine, vars)
                : "Ready to keep playing?"}{" "}
              <span className="font-normal text-ink">
                You&rsquo;re picking up right where you left off.
              </span>
            </p>
            {rules.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 text-sm text-ink">
                {rules.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="text-teal">
                      •
                    </span>
                    <span>{interpolate(l, vars)}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setShowResumeNote(false)}
              className="mt-3 text-sm font-semibold text-teal underline"
            >
              Got it
            </button>
          </Card>
        )}
        <p className="text-center text-sm font-medium uppercase tracking-widest text-teal">
          {view.kind === "bonus" ? "One last one" : "Feed the bear"}
        </p>
        <Card className="text-center">
          <p aria-hidden className="mb-2 text-6xl font-bold text-teal">
            {bigN}
          </p>
          <div className="flex flex-col gap-2">
            {view.lines.map((l, i) => (
              <p key={i} className="text-lg text-ink">
                {l}
              </p>
            ))}
          </div>
        </Card>

        {view.kind === "trial" && (
          <Button disabled={pending} onClick={() => setShowCheck(true)}>
            They&rsquo;re done &mdash; let&rsquo;s check
          </Button>
        )}

        {view.kind === "check" && (
          <div className="flex flex-col gap-3">
            <Button disabled={pending} onClick={() => record("correct")}>
              Yes, that&rsquo;s {bigN}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => record("incorrect")}>
              Not quite
            </Button>
            <button
              disabled={pending}
              onClick={() => record("skip")}
              className="text-sm text-teal-soft underline disabled:opacity-50"
            >
              Skip this one
            </button>
          </div>
        )}

        {view.kind === "bonus" && (
          <Button disabled={pending} onClick={() => record("correct")}>
            They did it!
          </Button>
        )}
      </div>

      {/* sticky rules reminder + pause */}
      <div className="flex flex-col gap-3">
        <p className="rounded-xl bg-sea-glass/40 px-4 py-2 text-center text-xs text-ink">
          Read it exactly. Don&rsquo;t count for {childName}. Every answer earns a
          &ldquo;thank you.&rdquo;
        </p>
        <button
          onClick={() => setConfirmPause(true)}
          className="w-full text-center text-sm text-teal-soft underline"
        >
          Pause and come back later
        </button>
      </div>
    </main>
  );
}
