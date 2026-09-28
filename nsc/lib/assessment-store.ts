import type { SupabaseClient } from "@supabase/supabase-js";
import { applyOutcome, getResult, type Outcome, type TitrationState } from "@/lib/titration";
import {
  psApplyPick,
  psIsDone,
  psResult,
  type PSPick,
  type PSState,
} from "@/lib/pointandseek";

/**
 * Persisting assessment taps. The server's engine_state is authoritative;
 * the client sends how far its screen had got, and a tap is applied only to
 * that exact state:
 *
 *  - Expected-sequence check: the screen reports how many answers it has
 *    seen. If the saved session has moved on (a lost response, back/forward,
 *    a second tab), nothing is applied and the saved state comes back so the
 *    screen can catch up. A tap is never re-aimed at a different N.
 *  - Optimistic lock: the update is conditional on the trial count it was
 *    computed from, so two racing requests can't both land.
 *  - The result is saved at the stop, not after the bonus, so a family that
 *    leaves during "one last one" still has a placement.
 *
 * The client is injected (the RLS-scoped user client in production) so this
 * is unit-testable.
 */

type Db = Pick<SupabaseClient, "from">;

export type TapStatus = "ok" | "stale";

export interface TapResult<S> {
  state: S;
  /** "stale": the screen was behind the saved session; nothing was applied. */
  status: TapStatus;
  /** True when this tap completed the assessment (placement saved). */
  finalized: boolean;
}

export class TapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TapError";
  }
}

const OUTCOMES: ReadonlySet<string> = new Set(["correct", "incorrect", "skip"]);
const PICKS: ReadonlySet<string> = new Set(["left", "right", "skip"]);
const OPEN_STATUSES = ["in_progress", "paused"];

interface AssessmentRow {
  id: string;
  status: string;
  engine_state: unknown;
  trial_count: number;
}

async function loadRow(db: Db, assessmentId: string): Promise<AssessmentRow> {
  const { data, error } = await db
    .from("nsc_assessments")
    .select("id, status, engine_state, trial_count")
    .eq("id", assessmentId)
    .maybeSingle();
  if (error) throw new TapError(`load failed: ${error.message}`);
  if (!data) throw new TapError("assessment not found");
  return data as AssessmentRow;
}

async function logTrial(db: Db, row: Record<string, unknown>): Promise<void> {
  // Analytics only (nothing reads nsc_trials at runtime). A duplicate seq
  // means a racing request already logged this position.
  const { error } = await db.from("nsc_trials").insert(row);
  if (error && error.code !== "23505") {
    console.error(`[assess] trial log failed: ${error.message}`);
  }
}

/** Record one Give-N answer (trial, check, or bonus). */
export async function recordGiveNTap(
  db: Db,
  assessmentId: string,
  outcome: Outcome,
  expectedTrials: number,
  selfCorrected?: boolean,
): Promise<TapResult<TitrationState>> {
  if (!OUTCOMES.has(outcome)) throw new TapError("invalid outcome");
  const row = await loadRow(db, assessmentId);
  const prev = row.engine_state as TitrationState | null;
  if (!prev || !Array.isArray(prev.trials)) throw new TapError("not a Give-N session");
  const stale: TapResult<TitrationState> = { state: prev, status: "stale", finalized: false };

  if (!Number.isInteger(expectedTrials) || expectedTrials !== prev.trials.length) return stale;
  if (prev.phase === "done") return stale;
  const isBonus = prev.phase === "bonus";
  // A completed session accepts only its bonus; an abandoned one nothing.
  if (row.status === "abandoned") return stale;
  if (row.status === "complete" && !isBonus) return stale;

  const next = applyOutcome(prev, outcome, /* postCheck */ true);
  const last = next.trials[next.trials.length - 1];
  if (selfCorrected !== undefined && !last.isBonus) last.selfCorrected = Boolean(selfCorrected);

  const scoredBefore = prev.trials.filter((t) => !t.isBonus).length;
  const scoredAfter = next.trials.filter((t) => !t.isBonus).length;
  // Non-null from the stop onward; the bonus never changes it.
  const result = getResult(next);
  const finalize = result !== null && row.status !== "complete";

  const patch: Record<string, unknown> = {
    engine_state: next,
    trial_count: scoredAfter,
  };
  if (finalize && result) {
    patch.status = "complete";
    patch.placement = result.placement;
    patch.near_cp = result.nearCP;
    patch.confidence = result.confidence;
    patch.completed_at = new Date().toISOString();
  } else if (!result) {
    patch.status = "in_progress";
  }

  const base = db.from("nsc_assessments").update(patch).eq("id", assessmentId);
  const locked = isBonus
    ? base.eq("status", row.status)
    : base.eq("trial_count", scoredBefore).in("status", OPEN_STATUSES);
  const { data: updated, error } = await locked.select("id");
  if (error) throw new TapError(`save failed: ${error.message}`);
  if (!updated || updated.length === 0) {
    // Another request moved the session first: hand back the saved state.
    const fresh = await loadRow(db, assessmentId);
    return { state: fresh.engine_state as TitrationState, status: "stale", finalized: false };
  }

  await logTrial(db, {
    assessment_id: assessmentId,
    seq: next.trials.length,
    requested_n: last.n,
    outcome: last.outcome,
    post_check: last.postCheck,
    is_bonus: last.isBonus,
  });
  return { state: next, status: "ok", finalized: finalize };
}

/** Record one Point and Seek tap. */
export async function recordPointTap(
  db: Db,
  assessmentId: string,
  pick: PSPick,
  expectedIndex: number,
): Promise<TapResult<PSState>> {
  if (!PICKS.has(pick)) throw new TapError("invalid pick");
  const row = await loadRow(db, assessmentId);
  const prev = row.engine_state as PSState | null;
  if (!prev || prev.kind !== "point_and_seek") throw new TapError("not a Point and Seek session");
  const stale: TapResult<PSState> = { state: prev, status: "stale", finalized: false };

  if (!Number.isInteger(expectedIndex) || expectedIndex !== prev.index) return stale;
  if (psIsDone(prev) || !OPEN_STATUSES.includes(row.status)) return stale;

  const next = psApplyPick(prev, pick);
  const last = next.records[next.records.length - 1];
  const result = psIsDone(next) ? psResult(next) : null;

  const patch: Record<string, unknown> = {
    engine_state: next,
    trial_count: next.records.length,
    status: result ? "complete" : "in_progress",
  };
  if (result) {
    // Point and Seek never writes a rung above L1 and never better than
    // medium confidence (amendment A5).
    patch.placement = result.routePlacement;
    patch.near_cp = false;
    patch.confidence = result.routeConfidence;
    patch.ps_signal = result.signal;
    patch.completed_at = new Date().toISOString();
  }

  const { data: updated, error } = await db
    .from("nsc_assessments")
    .update(patch)
    .eq("id", assessmentId)
    .eq("trial_count", prev.records.length)
    .in("status", OPEN_STATUSES)
    .select("id");
  if (error) throw new TapError(`save failed: ${error.message}`);
  if (!updated || updated.length === 0) {
    const fresh = await loadRow(db, assessmentId);
    return { state: fresh.engine_state as PSState, status: "stale", finalized: false };
  }

  await logTrial(db, {
    assessment_id: assessmentId,
    seq: last.seq,
    requested_n: last.target,
    outcome: last.pick === "skip" ? "skip" : last.correct ? "correct" : "incorrect",
    post_check: false,
    is_bonus: false,
  });
  return { state: next, status: "ok", finalized: result !== null };
}
