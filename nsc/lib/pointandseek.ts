/**
 * Point and Seek — Instrument C (spec amendment A5).
 *
 * A 2-minute, on-screen, two-alternative forced-choice check of emerging
 * number-word knowledge ("Which card has three?"), modeled on the Point-to-X
 * task validated for 2–3-year-olds by Silver et al. (2021, Frontiers in
 * Psychology; N=100; correlates with Give-N, captures partial knowledge
 * Give-N misses, no in-person vs. remote administration difference —
 * evidence tag ev.protocol.silver2021).
 *
 * Where it runs:
 *  - ages 24–30 months, as the DEFAULT instrument (Give-N compliance is
 *    poor this young; previously these families got no assessment at all);
 *  - any age, as the gentle retry after a skip-heavy Give-N session
 *    ("the bear just wants to watch this time").
 *
 * What it is NOT: a rung placement. The result is a soft signal — "clear
 * early signs" / "some early signs" / "no clear read" — that routes to the
 * L0/L1 content bands. Readout copy never names a knower level.
 *
 * Pure module: no I/O, no clock, no randomness. The 8-trial plan is fixed
 * and counterbalanced (each target 1–4 twice; correct side balanced 4/4;
 * mixed easy/hard foil ratios). State is JSON-serializable for pause/resume
 * in nsc_assessments.engine_state, same as the titration FSM.
 */

export type Side = "left" | "right";
export type PSPick = Side | "skip";
export type PSSignal = "clear" | "some" | "unclear";

export interface PSTrialSpec {
  /** the requested number word */
  target: number;
  /** the distractor set size shown on the other card */
  foil: number;
  /** which side shows the target set */
  correctSide: Side;
}

/**
 * Fixed, counterbalanced plan. Targets 1–4 twice each; correct side
 * balanced 4 left / 4 right with no side repeated 3× in a row; foils mix
 * easy (1:3) and hard (2:3, 3:4) ratios per the Point-to-X design.
 *
 * Foil DIRECTION is balanced 4/4 (target-larger vs target-smaller) so a
 * pure "point at the less-crowded card" (or busier-card) bias scores
 * exactly chance. The target-larger trials use SMALL targets (2v1, 3v2)
 * on purpose — a genuine 1–2-knower can pass them via the number word or
 * mutual exclusivity, the partial knowledge this instrument exists to see.
 */
export const PS_PLAN: readonly PSTrialSpec[] = [
  { target: 1, foil: 3, correctSide: "left" }, // smaller — gentle start
  { target: 2, foil: 1, correctSide: "right" }, // LARGER, small target
  { target: 3, foil: 5, correctSide: "right" }, // smaller
  { target: 2, foil: 4, correctSide: "left" }, // smaller
  { target: 4, foil: 2, correctSide: "left" }, // LARGER
  { target: 1, foil: 2, correctSide: "right" }, // smaller
  { target: 4, foil: 3, correctSide: "right" }, // LARGER
  { target: 3, foil: 2, correctSide: "left" }, // LARGER, small target
] as const;

export interface PSRecord {
  seq: number; // 1-based
  target: number;
  foil: number;
  correctSide: Side;
  pick: PSPick;
  correct: boolean; // false for skips
}

export interface PSState {
  kind: "point_and_seek";
  index: number; // next trial index into PS_PLAN
  records: PSRecord[];
  skips: number;
}

export interface PSResult {
  signal: PSSignal;
  answered: number;
  correct: number;
  skips: number;
  /**
   * Conservative content routing (never a rung claim): clear → L1 band,
   * everything else → L0 band. Confidence mirrors the softness of the
   * instrument: at best "medium".
   */
  routePlacement: "L0" | "L1";
  routeConfidence: "medium" | "low";
}

export function createPointSession(): PSState {
  return { kind: "point_and_seek", index: 0, records: [], skips: 0 };
}

/** The trial to present, or null when the session is over. */
export function psNextTrial(state: PSState): PSTrialSpec | null {
  return state.index < PS_PLAN.length ? PS_PLAN[state.index] : null;
}

/** Record the parent's tap. Pure — returns a new state. Skips advance. */
export function psApplyPick(state: PSState, pick: PSPick): PSState {
  const spec = psNextTrial(state);
  if (!spec) throw new Error("psApplyPick called on a finished session");
  const rec: PSRecord = {
    seq: state.records.length + 1,
    target: spec.target,
    foil: spec.foil,
    correctSide: spec.correctSide,
    pick,
    correct: pick !== "skip" && pick === spec.correctSide,
  };
  return {
    ...state,
    index: state.index + 1,
    records: [...state.records, rec],
    skips: state.skips + (pick === "skip" ? 1 : 0),
  };
}

export function psIsDone(state: PSState): boolean {
  return state.index >= PS_PLAN.length;
}

/**
 * Scoring (encoded thresholds, no runtime math beyond counting):
 * under chance (p = .5 per 2AFC trial), P(≥7 of 8 correct) ≈ .035 — that is
 * the only bar we call a "clear" sign. 5–6 of 8 is not statistically above
 * chance; it renders as "some early signs" and still routes to the gentlest
 * band. Fewer than 6 answered trials can never be "clear" — an engaged-but-
 * skippy session must not over-claim.
 */
export function psResult(state: PSState): PSResult | null {
  if (!psIsDone(state)) return null;
  const answered = state.records.filter((r) => r.pick !== "skip").length;
  const correct = state.records.filter((r) => r.correct).length;

  let signal: PSSignal;
  if (answered >= 6 && correct >= 7) {
    signal = "clear";
  } else if (answered >= 6 && correct >= 5) {
    signal = "some";
  } else {
    signal = "unclear";
  }

  return {
    signal,
    answered,
    correct,
    skips: state.skips,
    routePlacement: signal === "clear" ? "L1" : "L0",
    // Only "clear" (≥7/8, p≈.035) earns medium; "some" (5–6/8) is not
    // statistically above chance, so it carries no more confidence than
    // "unclear" does.
    routeConfidence: signal === "clear" ? "medium" : "low",
  };
}

/** Copy key for the end state (assessment.copy artifact). */
export function psReadoutKey(signal: PSSignal): string {
  return `ps:end:${signal}`;
}

/** Copy key for the i-th trial (1-based). */
export function psTrialKey(index: number): string {
  return `ps:trial:${index + 1}`;
}
