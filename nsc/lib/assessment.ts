import type { AssessmentCopy } from "@/lib/content-types";
import {
  getResult,
  nextRequest,
  type Confidence,
  type Placement,
  type TitrationState,
} from "@/lib/titration";

/** Interpolate the live placeholders in compiled copy. */
export function interpolate(
  line: string,
  vars: { name: string; objects: string; objectsSingular?: string },
): string {
  // Copy always phrases counts as "«numberword» {objects}"; "one" takes the
  // singular so N=1 trials don't read "one blocks".
  return line
    .replaceAll("{name}", vars.name)
    .replaceAll("one {objects}", `one ${vars.objectsSingular ?? vars.objects}`)
    .replaceAll("{objects}", vars.objects);
}

/** Readout state key for a placement + confidence (nearCP uses the L4near copy). */
export function readoutKey(
  placement: Placement,
  nearCP: boolean,
  confidence: Confidence,
): string {
  const base = placement === "L4" && nearCP ? "L4near" : placement;
  return `end:${base}:${confidence}`;
}

export type StepKind = "trial" | "check" | "bonus" | "done";

export interface StepView {
  kind: StepKind;
  n?: number;
  lines: string[];
  /** present when kind === 'done' */
  placement?: Placement;
  nearCP?: boolean;
  confidence?: Confidence;
}

/** How many scored trials have happened at N (for the trial:{N}:{attempt} key). */
function attemptAt(state: TitrationState, n: number): number {
  const prior = state.trials.filter((t) => !t.isBonus && t.n === n).length;
  return Math.min(3, prior + 1);
}

function lines(copy: AssessmentCopy, key: string, fallback: string): string[] {
  return copy.states[key]?.lines ?? [fallback];
}

/**
 * Derive the current on-screen step (script + kind) from the engine state.
 * Pure: the UI renders whatever this returns. `showCheck` toggles the
 * count-and-check prompt shown before the final answer is recorded.
 */
export function stepView(
  state: TitrationState,
  copy: AssessmentCopy,
  vars: { name: string; objects: string },
  showCheck = false,
): StepView {
  const req = nextRequest(state);

  if (!req) {
    const result = getResult(state)!;
    const key = readoutKey(result.placement, result.nearCP, result.confidence);
    return {
      kind: "done",
      lines: lines(copy, key, "").map((l) => interpolate(l, vars)),
      placement: result.placement,
      nearCP: result.nearCP,
      confidence: result.confidence,
    };
  }

  if (req.kind === "bonus") {
    return {
      kind: "bonus",
      n: req.n,
      lines: lines(copy, "bonus", "One last one for the bear!").map((l) =>
        interpolate(l, vars),
      ),
    };
  }

  if (showCheck) {
    return {
      kind: "check",
      n: req.n,
      lines: lines(copy, `check:${req.n}`, `Is that ${req.n}? Can you count and check?`).map(
        (l) => interpolate(l, vars),
      ),
    };
  }

  const key = `trial:${req.n}:${attemptAt(state, req.n)}`;
  return {
    kind: "trial",
    n: req.n,
    lines: lines(copy, key, `Can you feed the bear ${req.n}?`).map((l) =>
      interpolate(l, vars),
    ),
  };
}
