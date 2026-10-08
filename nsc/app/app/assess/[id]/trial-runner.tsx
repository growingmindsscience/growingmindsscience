"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Card, EnrichmentFooter } from "@/components/ui";
import { AudioButton } from "@/components/audio-button";
import { Ladder } from "@/components/ladder";
import { brand } from "@/lib/config/brand";
import { stepView } from "@/lib/assessment";
import type { AssessmentCopy } from "@/lib/content-types";
import { interpolate } from "@/lib/assessment";
import { getResult, type Outcome, type Placement, type TitrationState } from "@/lib/titration";
import { standingSummary } from "@/lib/norms";
import { flagOffDay, pauseAssessment, recordOutcome, startPointAndSeek } from "../actions";
import { STEP_LOCK_MS, TAP_NOTICE, type TapNotice } from "./step-guard";

const NUMWORDS = ["zero", "one", "two", "three", "four", "five", "six"];

/** Rung height, for framing a re-run against the previous placement. */
const RANK: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, CP: 5 };

/** Text-style buttons still get a 44px tap target. */
const LINK_BUTTON =
  "inline-flex min-h-11 items-center justify-center px-3 py-2 text-sm text-ink-muted underline disabled:opacity-50";

export function TrialRunner({
  assessmentId,
  childId,
  initialState,
  copy,
  childName,
  objects,
  objectsSingular,
  resumed,
  prevPlacement = null,
  ageMonths = null,
  otherNumberLanguage = false,
  audioIds = [],
}: {
  assessmentId: string;
  childId: string;
  initialState: TitrationState;
  copy: AssessmentCopy;
  childName: string;
  objects: string;
  objectsSingular?: string;
  resumed: boolean;
  prevPlacement?: Placement | null;
  ageMonths?: number | null;
  otherNumberLanguage?: boolean;
  audioIds?: string[];
}) {
  const audioSet = useMemo(() => new Set(audioIds), [audioIds]);
  const [state, setState] = useState<TitrationState>(initialState);
  const [phase, setPhase] = useState<"setup" | "running">(
    resumed ? "running" : "setup",
  );
  const [showCheck, setShowCheck] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [showResumeNote, setShowResumeNote] = useState(resumed);
  const [offDayMarked, setOffDayMarked] = useState(false);
  const [notice, setNotice] = useState<TapNotice | null>(null);

  const vars = { name: childName, objects, objectsSingular };
  const view = stepView(state, copy, vars, showCheck);

  // One key per on-screen step. Each change re-arms the tap lockout (a
  // double tap, or a toddler's tap, can't answer a prompt nobody read) and
  // moves focus to the step heading so keyboard and screen-reader users
  // aren't left on a button that no longer exists.
  const stepKey =
    phase === "setup"
      ? "setup"
      : confirmPause
        ? "pause"
        : `${state.trials.length}:${view.kind}`;
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
  const canTap = () => !inFlight.current && Date.now() >= readyAt.current;

  async function record(outcome: Outcome, selfCorrected?: boolean) {
    if (!canTap()) return;
    inFlight.current = true;
    setPending(true);
    setNotice(null);
    try {
      const res = await recordOutcome(
        assessmentId,
        outcome,
        state.trials.length,
        selfCorrected,
      );
      if (!res) return; // the action redirected (e.g. signed out)
      setState(res.state);
      setShowCheck(false);
      setShowResumeNote(false);
      if (res.status === "stale") setNotice("stale");
    } catch {
      setNotice("error");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  // Two skips in a row usually means the child is done for now, not that the
  // parent should push — surface the pause path before the session sours.
  const scored = state.trials.filter((t) => !t.isBonus);
  const twoRecentSkips =
    scored.length >= 2 &&
    scored[scored.length - 1].outcome === "skip" &&
    scored[scored.length - 2].outcome === "skip";

  const rules = copy.states["setup:rules"]?.lines ?? [];
  const checklist = copy.states["setup:checklist"]?.lines ?? [];

  const noticeLine = notice ? (
    <p role="status" className="rounded-xl bg-rung-glow px-4 py-3 text-center text-sm text-ink-deep">
      {TAP_NOTICE[notice]}
    </p>
  ) : null;

  if (phase === "setup") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink-deep">Before you start</h1>
        </div>
        <Card>
          <h2 className="mb-3 text-[0.9375rem] font-semibold text-amber-deep">
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
          <h2 className="mb-3 text-[0.9375rem] font-semibold text-amber-deep">
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
            {otherNumberLanguage && (
              <li className="flex gap-2">
                <span aria-hidden className="text-teal">
                  •
                </span>
                <span>
                  Say the number words in the language {childName} counts in
                  most. Keep the rest of each line as written.
                </span>
              </li>
            )}
          </ul>
        </Card>
        <Button onClick={() => setPhase("running")}>I&rsquo;m ready</Button>
      </main>
    );
  }

  if (view.kind === "done") {
    const result = getResult(state);
    // "For their age" — one warm sentence against the published typical
    // range. The over-time version of this lives on the progress page.
    const ageSummary =
      ageMonths != null && view.placement != null
        ? standingSummary({
            months: ageMonths,
            placement: view.placement,
            name: childName,
            confidence: result?.confidence,
          })
        : null;
    const delta =
      prevPlacement != null && view.placement != null
        ? (RANK[view.placement] ?? 0) - (RANK[prevPlacement] ?? 0)
        : null;
    const [headline, ...rest] = view.lines;
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <Ladder current={view.placement} nearCP={view.nearCP} animate />
        <Card>
          <div className="flex flex-col gap-3">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold text-ink-deep focus:outline-none"
            >
              {headline || "All done. Thank you for playing."}
            </h1>
            {rest.map((l, i) => (
              <p key={i} className="text-ink">
                {l}
              </p>
            ))}
          </div>
        </Card>
        {delta !== null && (
          <Card className="bg-sea-glass/30">
            <p className="text-sm leading-relaxed text-ink">
              {delta === 0 ? (
                <>
                  <span className="font-semibold text-ink-deep">
                    Same rung as last time — that&rsquo;s the usual six-week
                    story.
                  </span>{" "}
                  Rungs take months, and a home read can wiggle either way.
                  This week&rsquo;s games keep working the edge.
                </>
              ) : delta > 0 ? (
                <>
                  <span className="font-semibold text-ink-deep">
                    A rung higher than last time. Lovely.
                  </span>{" "}
                  One home check-in can read a touch generous, so this
                  week&rsquo;s games stay planted on the new rung and let it
                  settle.
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink-deep">
                    Reading lower than last time usually means the day, not
                    the child.
                  </span>{" "}
                  Hungry bears, split attention — nothing is lost. This
                  week&rsquo;s games sit at today&rsquo;s cozier read; play
                  the check-in again in a week or two if you&rsquo;re curious.
                </>
              )}
            </p>
          </Card>
        )}
        {ageSummary && (
          <Card className="bg-rung-glow/40">
            <p className="text-sm leading-relaxed text-ink">
              <span className="font-semibold text-ink-deep">
                {ageSummary.headline}
              </span>{" "}
              {ageSummary.detail}
            </p>
            {ageSummary.caveat && (
              <p className="mt-2 text-xs text-ink-muted">{ageSummary.caveat}</p>
            )}
            <p className="mt-2 text-xs text-ink-muted">
              Typical ranges are wide — a map, never a race.{" "}
              <Link
                href={`/app/child/${childId}/progress`}
                className="font-semibold underline"
              >
                Watch it over time →
              </Link>
            </p>
          </Card>
        )}
        {otherNumberLanguage && (
          <p className="text-center text-xs leading-relaxed text-ink-muted">
            Children learn each language&rsquo;s number words separately. If{" "}
            {childName} counts in another language, an English read can sit a
            rung low — that&rsquo;s the language, not the ladder.
          </p>
        )}
        {noticeLine}
        {result?.confidence === "high" &&
          (offDayMarked ? (
            <p role="status" className="text-center text-sm text-ink-muted">
              Marked. We&rsquo;ll treat today as a rougher estimate — the
              plan stays the same, and the next check-in will tell you more.
            </p>
          ) : (
            <button
              type="button"
              onClick={async () => {
                setOffDayMarked(true);
                setNotice(null);
                const r = await flagOffDay(assessmentId).catch(() => null);
                if (!r?.ok) {
                  setOffDayMarked(false);
                  setNotice("flag");
                }
              }}
              className="min-h-11 px-3 py-2 text-center text-sm text-ink-muted underline"
            >
              Was today an off day — tired, distracted, bear mobbed? Tap to
              mark it, and we&rsquo;ll read today gently.
            </button>
          ))}
        <Link
          href={`/app/child/${childId}/plan`}
          className="inline-flex min-h-12 items-center justify-center rounded-control bg-teal px-6 py-3 text-base font-semibold text-white hover:bg-teal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
        >
          See this week&rsquo;s plan
        </Link>
        {state.stopReason === "skips" && (
          <form action={startPointAndSeek.bind(null, childId)}>
            <button
              type="submit"
              className="min-h-11 w-full px-3 py-2 text-center text-sm text-ink-muted underline"
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
    const [pauseHeadline, ...pauseRest] = pauseLines.map((l) => interpolate(l, vars));
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <Card className="text-center">
          <div className="flex flex-col gap-3">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold text-ink-deep focus:outline-none"
            >
              {pauseHeadline ?? "Good stopping point."}
            </h1>
            {pauseRest.map((l, i) => (
              <p key={i} className="text-ink">
                {l}
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
              type="button"
              onClick={() => setShowResumeNote(false)}
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-teal underline"
            >
              Got it
            </button>
          </Card>
        )}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-center text-[0.9375rem] font-semibold text-amber-deep focus:outline-none"
        >
          {view.kind === "bonus" ? "One last one" : "Feed the bear"}
        </h1>
        <Card className="text-center">
          <p aria-hidden className="mb-2 text-6xl font-bold text-teal">
            {bigN}
          </p>
          <div className="flex flex-col gap-2">
            {view.lines.map((l, i) => (
              <div key={`${i}:${l}`} className="flex items-center justify-center gap-2">
                <p className="text-lg text-ink">{l}</p>
                <AudioButton key={l} line={l} available={audioSet} />
              </div>
            ))}
          </div>
        </Card>
        {/* The new prompt, announced once per step for screen readers. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {view.lines.join(" ")}
        </p>

        {noticeLine}

        {view.kind === "trial" && (
          <div className="flex flex-col gap-3">
            <Button
              disabled={pending}
              onClick={() => {
                if (canTap()) setShowCheck(true);
              }}
            >
              They&rsquo;re done &mdash; let&rsquo;s check
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={() => record("skip")}
              className={LINK_BUTTON}
            >
              Skip &mdash; {childName} didn&rsquo;t try this one
            </button>
          </div>
        )}

        {view.kind === "check" && (
          <div className="flex flex-col gap-3">
            <Button disabled={pending} onClick={() => record("correct", false)}>
              Yes, that&rsquo;s {bigN}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => record("correct", true)}
              className="border border-line"
            >
              Yes &mdash; after fixing it during the check
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => record("incorrect")}>
              Not quite
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={() => record("skip")}
              className={LINK_BUTTON}
            >
              Skip this one
            </button>
          </div>
        )}

        {view.kind === "bonus" && (
          <div className="flex flex-col gap-3">
            <Button disabled={pending} onClick={() => record("correct")}>
              They did it!
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => record("incorrect")}>
              Not this time
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={() => record("skip")}
              className={LINK_BUTTON}
            >
              Skip the last one
            </button>
          </div>
        )}
      </div>

      {/* sticky rules reminder + pause */}
      <div className="flex flex-col gap-3">
        {twoRecentSkips && (
          <Card className="bg-rung-glow/60">
            <p className="text-sm text-ink">
              <span className="font-semibold text-ink-deep">
                Two skips in a row?
              </span>{" "}
              The bear may need a nap. Pausing keeps everything — come back
              within two days and pick up right here.
            </p>
            <button
              type="button"
              onClick={() => setConfirmPause(true)}
              className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-teal underline"
            >
              Pause for now
            </button>
          </Card>
        )}
        <p className="rounded-xl bg-sea-glass/40 px-4 py-2 text-center text-xs text-ink">
          Read it exactly. Don&rsquo;t count for {childName}. Every answer earns
          a &ldquo;thank you.&rdquo;
          {otherNumberLanguage &&
            ` Number words go in ${childName}'s counting language.`}
        </p>
        <button
          type="button"
          onClick={() => setConfirmPause(true)}
          className={`${LINK_BUTTON} w-full`}
        >
          Pause and come back later
        </button>
      </div>
    </main>
  );
}
