"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, EnrichmentFooter } from "@/components/ui";
import { AudioButton } from "@/components/audio-button";
import { Ladder } from "@/components/ladder";
import { brand } from "@/lib/config/brand";
import { stepView } from "@/lib/assessment";
import type { AssessmentCopy } from "@/lib/content-types";
import { interpolate } from "@/lib/assessment";
import { getResult, type Outcome, type Placement, type TitrationState } from "@/lib/titration";
import { flagOffDay, pauseAssessment, recordOutcome, startPointAndSeek } from "../actions";

const NUMWORDS = ["zero", "one", "two", "three", "four", "five", "six"];

/** Rung height, for framing a re-run against the previous placement. */
const RANK: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, CP: 5 };

export function TrialRunner({
  assessmentId,
  childId,
  initialState,
  copy,
  childName,
  objects,
  resumed,
  prevPlacement = null,
  otherNumberLanguage = false,
  audioIds = [],
}: {
  assessmentId: string;
  childId: string;
  initialState: TitrationState;
  copy: AssessmentCopy;
  childName: string;
  objects: string;
  resumed: boolean;
  prevPlacement?: Placement | null;
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

  const vars = { name: childName, objects };
  const view = stepView(state, copy, vars, showCheck);

  async function record(outcome: Outcome, selfCorrected?: boolean) {
    setPending(true);
    try {
      const { state: next } = await recordOutcome(
        assessmentId,
        outcome,
        selfCorrected,
      );
      setState(next);
      setShowCheck(false);
      setShowResumeNote(false);
    } finally {
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
    const delta =
      prevPlacement != null && view.placement != null
        ? (RANK[view.placement] ?? 0) - (RANK[prevPlacement] ?? 0)
        : null;
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
        {otherNumberLanguage && (
          <p className="text-center text-xs leading-relaxed text-teal-soft">
            Children learn each language&rsquo;s number words separately. If{" "}
            {childName} counts in another language, an English read can sit a
            rung low — that&rsquo;s the language, not the ladder.
          </p>
        )}
        {result?.confidence === "high" &&
          (offDayMarked ? (
            <p className="text-center text-sm text-teal-soft">
              Marked. We&rsquo;ll treat today as a rougher estimate — the
              plan stays the same, and the next check-in will tell you more.
            </p>
          ) : (
            <button
              onClick={async () => {
                setOffDayMarked(true);
                await flagOffDay(assessmentId);
              }}
              className="text-center text-sm text-teal-soft underline"
            >
              Was today an off day — tired, distracted, bear mobbed? Tap to
              mark it, and we&rsquo;ll read today gently.
            </button>
          ))}
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
              <div key={i} className="flex items-center justify-center gap-2">
                <p className="text-lg text-ink">{l}</p>
                <AudioButton line={l} available={audioSet} />
              </div>
            ))}
          </div>
        </Card>

        {view.kind === "trial" && (
          <div className="flex flex-col gap-3">
            <Button disabled={pending} onClick={() => setShowCheck(true)}>
              They&rsquo;re done &mdash; let&rsquo;s check
            </Button>
            <button
              disabled={pending}
              onClick={() => record("skip")}
              className="text-sm text-teal-soft underline disabled:opacity-50"
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
              className="border border-sea-glass"
            >
              Yes &mdash; after fixing it during the check
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
              onClick={() => setConfirmPause(true)}
              className="mt-2 text-sm font-semibold text-teal underline"
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
          onClick={() => setConfirmPause(true)}
          className="w-full text-center text-sm text-teal-soft underline"
        >
          Pause and come back later
        </button>
      </div>
    </main>
  );
}
