/**
 * Guided Give-N titration engine — spec §2.2, §5.1.
 *
 * Pure, deterministic finite state machine. No I/O, no randomness, no clock.
 * State is a plain JSON-serializable object (pause/resume persists it as-is
 * into nsc_assessments.engine_state). All parent-facing copy lives in the
 * compiled assessment.copy artifact, keyed by the states this module emits —
 * this file knows nothing about words.
 *
 * Protocol:
 * - Start at N=1 always (§2.1 named tradeoff: comparability over speed).
 * - Correct → move toward N+1; incorrect → toward N−1 (skip repeats N).
 * - A set size N is CREDITED on 2 clean corrects (zero incorrects at N) or
 *   3 corrects total; FAILED at 2 incorrects. An ambiguous rung (✓✗✓) gets
 *   a 4th resolving trial; a 2✓/2✗ tie FAILS the rung — ties break downward
 *   (v1.1 "clean-or-confirmed" rule, spec amendment A2).
 *   WHY: subset-knowers randomly grabbing 2–10 are accidentally correct at
 *   the requested N ~1/9 of the time; under plain 2-of-3 crediting that
 *   chance floor inflates placements, so classification errors skewed
 *   LIBERAL — the opposite of §2.2's conservative policy. Clean-or-confirmed
 *   crediting halves spurious over-placement and flips the measured error
 *   skew to conservative (≥1.3:1 at ε=0.1, ≥2:1 at ε=0.2; see the §7.2
 *   property suite acceptance bars).
 * - Stops: (a) credited N with N+1 failed → N-knower; (b) credited 5 and 6
 *   → CP; (c) 18-trial budget or ≥4 skips → best-available + low confidence.
 * - End-on-success: after placement is decided, emit one bonus trial at the
 *   highest credited N ("one last one for bear"); its outcome never changes
 *   placement.
 * - Movement targets the nearest UNRESOLVED N in the direction of travel so
 *   resolved rungs are never re-tested (budget honesty).
 */

export type Outcome = "correct" | "incorrect" | "skip";
export type Placement = "L0" | "L1" | "L2" | "L3" | "L4" | "CP";
export type Confidence = "high" | "medium" | "low";
export type StopReason = "boundary" | "cp" | "budget" | "skips" | "exhausted";
export type Phase = "trial" | "bonus" | "done";

export interface TrialRecord {
  seq: number;
  n: number;
  outcome: Outcome;
  postCheck: boolean;
  isBonus: boolean;
  /**
   * Parent-reported: the child changed the amount during "count and check".
   * Optional analytics only — never feeds crediting. Placement stays scored
   * on the checked response (standard titrated Give-N; the check rescues a
   * true knower from an impulsive grab and cannot lift a subset-knower above
   * their level). The pre/post delta is the coaching/impulsivity signal.
   */
  selfCorrected?: boolean;
}

export interface LevelTally {
  correct: number;
  incorrect: number;
}

export interface TitrationConfig {
  minN: number;
  maxN: number;
  /** corrects that credit a level when the level has ZERO incorrects ("clean") */
  cleanCreditAt: number;
  /** corrects that credit a level regardless of incorrects ("confirmed") */
  confirmCreditAt: number;
  failAt: number; // incorrects needed to fail a level
  trialBudget: number; // scored + skipped trials, excluding bonus
  skipBudget: number; // session ends when skips reach this
}

export const DEFAULT_CONFIG: TitrationConfig = {
  minN: 1,
  maxN: 6,
  cleanCreditAt: 2,
  confirmCreditAt: 3,
  failAt: 2,
  trialBudget: 18,
  skipBudget: 4,
};

export interface TitrationState {
  config: TitrationConfig;
  phase: Phase;
  currentN: number;
  trials: TrialRecord[];
  tallies: Record<number, LevelTally>;
  skips: number;
  stopReason: StopReason | null;
}

export interface TitrationResult {
  placement: Placement;
  nearCP: boolean;
  confidence: Confidence;
  stopReason: StopReason;
  trialCount: number; // excludes bonus
  skips: number;
}

export function createSession(
  config: TitrationConfig = DEFAULT_CONFIG,
): TitrationState {
  return {
    config,
    phase: "trial",
    currentN: config.minN,
    trials: [],
    tallies: {},
    skips: 0,
    stopReason: null,
  };
}

function tally(state: TitrationState, n: number): LevelTally {
  return state.tallies[n] ?? { correct: 0, incorrect: 0 };
}

export function isFailed(state: TitrationState, n: number): boolean {
  return tally(state, n).incorrect >= state.config.failAt;
}

/**
 * v1.1 clean-or-confirmed crediting (amendment A2). Fail wins ties: a level
 * with 2 incorrects is failed even if it later would accrue corrects — but
 * movement never re-tests resolved rungs, so in practice the two are
 * mutually exclusive by construction.
 */
export function isCredited(state: TitrationState, n: number): boolean {
  if (isFailed(state, n)) return false;
  const t = tally(state, n);
  return (
    (t.correct >= state.config.cleanCreditAt && t.incorrect === 0) ||
    t.correct >= state.config.confirmCreditAt
  );
}

function isResolved(state: TitrationState, n: number): boolean {
  return isCredited(state, n) || isFailed(state, n);
}

function highestCredited(state: TitrationState): number {
  let h = 0;
  for (let n = state.config.minN; n <= state.config.maxN; n++) {
    if (isCredited(state, n)) h = n;
  }
  return h;
}

/**
 * Where to go after a scored trial at `from`. Protocol order:
 * 1. the adjacent step in the direction of travel, if unresolved;
 * 2. `from` itself, if unresolved (floor/ceiling re-test, blocked step);
 * 3. otherwise the nearest unresolved level, preferring the `dir` side —
 *    resolved rungs are never re-tested (budget honesty).
 */
function nextUnresolved(
  state: TitrationState,
  from: number,
  dir: 1 | -1,
): number | null {
  const { minN, maxN } = state.config;
  const inRange = (n: number) => n >= minN && n <= maxN;

  const step = from + dir;
  if (inRange(step) && !isResolved(state, step)) return step;
  if (!isResolved(state, from)) return from;

  for (let d = 1; d <= maxN - minN; d++) {
    const preferred = from + d * dir;
    if (inRange(preferred) && !isResolved(state, preferred)) return preferred;
    const other = from - d * dir;
    if (inRange(other) && !isResolved(state, other)) return other;
  }
  return null;
}

/** The request the parent should read next, or null when the session is over. */
export function nextRequest(
  state: TitrationState,
): { n: number; kind: "trial" | "bonus" } | null {
  if (state.phase === "done") return null;
  if (state.phase === "bonus") {
    return { n: highestCredited(state), kind: "bonus" };
  }
  return { n: state.currentN, kind: "trial" };
}

function checkStop(state: TitrationState): StopReason | null {
  const { minN, maxN } = state.config;
  // (b) CP: credited the top two set sizes
  if (isCredited(state, maxN - 1) && isCredited(state, maxN)) return "cp";
  // (a) boundary: some credited N with N+1 failed — or failed the floor
  if (isFailed(state, minN)) return "boundary";
  for (let n = minN; n < maxN; n++) {
    if (isCredited(state, n) && isFailed(state, n + 1)) return "boundary";
  }
  // (c) budgets
  if (state.trials.filter((t) => !t.isBonus).length >= state.config.trialBudget)
    return "budget";
  if (state.skips >= state.config.skipBudget) return "skips";
  return null;
}

/**
 * Record the outcome of the current request. Returns a NEW state (input is
 * never mutated). `postCheck` marks that the outcome was recorded after the
 * "can you count and check?" fix-allowed question (analytics only).
 */
export function applyOutcome(
  state: TitrationState,
  outcome: Outcome,
  postCheck = false,
): TitrationState {
  if (state.phase === "done") {
    throw new Error("applyOutcome called on a finished session");
  }

  if (state.phase === "bonus") {
    const bonus: TrialRecord = {
      seq: state.trials.length + 1,
      n: highestCredited(state),
      outcome,
      postCheck,
      isBonus: true,
    };
    return { ...state, trials: [...state.trials, bonus], phase: "done" };
  }

  const n = state.currentN;
  const record: TrialRecord = {
    seq: state.trials.length + 1,
    n,
    outcome,
    postCheck,
    isBonus: false,
  };

  const next: TitrationState = {
    ...state,
    trials: [...state.trials, record],
    tallies: { ...state.tallies },
    skips: outcome === "skip" ? state.skips + 1 : state.skips,
  };

  if (outcome !== "skip") {
    const t = tally(state, n);
    next.tallies[n] = {
      correct: t.correct + (outcome === "correct" ? 1 : 0),
      incorrect: t.incorrect + (outcome === "incorrect" ? 1 : 0),
    };
  }

  const stop = checkStop(next);
  if (stop) {
    next.stopReason = stop;
    // End-on-success: one guaranteed-win bonus trial at a previously
    // credited N — possible only if something was credited and the child
    // isn't already ending on that exact win.
    const h = highestCredited(next);
    const last = next.trials[next.trials.length - 1];
    const endedOnWin = last.outcome === "correct" && last.n >= h;
    next.phase =
      stop === "cp" || h < next.config.minN || endedOnWin ? "done" : "bonus";
    return next;
  }

  if (outcome === "skip") {
    // Child disengaged; same request stands (copy layer may reframe).
    return next;
  }

  const dir: 1 | -1 = outcome === "correct" ? 1 : -1;
  const target = nextUnresolved(next, n, dir);
  if (target === null) {
    // Every level resolved without a boundary (contradictory patterns).
    next.stopReason = "exhausted";
    next.phase = "done";
    return next;
  }
  next.currentN = target;
  return next;
}

/** True when a trial at `n` contradicts the final credited ladder. */
function contradictionCount(state: TitrationState): number {
  const h = highestCredited(state);
  return state.trials.filter(
    (t) => !t.isBonus && t.outcome === "incorrect" && t.n <= h,
  ).length;
}

/**
 * Decisions that carry a noise signature: a level credited despite an
 * incorrect (confirmed-not-clean credit) or failed despite a correct.
 * These are exactly the rungs where a chance grab or a mis-tap changed the
 * evidence; each one downgrades confidence (amendment A2/A3).
 */
function shakyDecisionCount(state: TitrationState): number {
  let shaky = 0;
  for (let n = state.config.minN; n <= state.config.maxN; n++) {
    const t = tally(state, n);
    if (isCredited(state, n) && t.incorrect > 0) shaky++;
    if (isFailed(state, n) && t.correct > 0) shaky++;
  }
  return shaky;
}

/** Credited set is contiguous from the floor and nothing above is credited below a failure. */
function isMonotone(state: TitrationState): boolean {
  const { minN, maxN } = state.config;
  const h = highestCredited(state);
  for (let n = minN; n <= h; n++) {
    if (isFailed(state, n)) return false;
  }
  // no credited level above a failed one
  for (let n = minN; n < maxN; n++) {
    if (isFailed(state, n)) {
      for (let m = n + 1; m <= maxN; m++) {
        if (isCredited(state, m)) return false;
      }
    }
  }
  return true;
}

/**
 * Final classification — spec §2.2 map. Available once phase !== 'trial'
 * (bonus outcome never changes it). Low confidence serves the conservative
 * (lower) placement by construction: placement derives only from credited
 * levels, never from unresolved ones.
 */
export function getResult(state: TitrationState): TitrationResult | null {
  if (state.phase === "trial" || state.stopReason === null) return null;

  const { maxN } = state.config;
  const h = highestCredited(state);
  const cp = isCredited(state, maxN - 1) && isCredited(state, maxN);

  let placement: Placement;
  let nearCP = false;
  if (cp) {
    placement = "CP";
  } else if (h >= 5) {
    // credits 5, fails/never-resolves 6 → "on the doorstep of CP"
    placement = "L4";
    nearCP = true;
  } else if (h >= 1) {
    placement = `L${h}` as Placement;
  } else {
    placement = "L0";
  }

  const scored = state.trials.filter((t) => !t.isBonus);
  const clean = state.stopReason === "boundary" || state.stopReason === "cp";
  const contradictions = contradictionCount(state);
  const shaky = shakyDecisionCount(state);
  const monotone = isMonotone(state);

  let confidence: Confidence;
  if (!clean || !monotone || shaky >= 2) {
    confidence = "low";
  } else if (contradictions === 0 && shaky === 0 && state.skips <= 1) {
    confidence = "high";
  } else if (contradictions <= 1 && state.skips <= 3) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    placement,
    nearCP,
    confidence,
    stopReason: state.stopReason,
    trialCount: scored.length,
    skips: state.skips,
  };
}
