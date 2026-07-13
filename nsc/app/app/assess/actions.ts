"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ARTIFACT_VERSION } from "@/lib/content.server";
import {
  applyOutcome,
  createSession,
  getResult,
  type Outcome,
  type TitrationState,
} from "@/lib/titration";
import {
  createPointSession,
  psApplyPick,
  psIsDone,
  psResult,
  type PSPick,
  type PSState,
} from "@/lib/pointandseek";
import { ageInMonths, MIN_ASSESSMENT_MONTHS, RESUME_WINDOW_MS } from "@/lib/age";

/** Below this age Point and Seek replaces Give-N as the default instrument (A5). */
const POINT_AND_SEEK_MAX_MONTHS = 30;

/** Create a child (nickname + birth month + languages) and go to the pre-screen. */
export async function createChild(formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const nickname = String(formData.get("nickname") ?? "").trim().slice(0, 30);
  const birthMonth = String(formData.get("birth_month") ?? ""); // yyyy-mm
  const languages = String(formData.get("home_languages") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!nickname || !/^\d{4}-\d{2}$/.test(birthMonth)) {
    redirect("/app/child/new?error=Please+add+a+name+and+birth+month.");
  }
  if (birthMonth > new Date().toISOString().slice(0, 7)) {
    redirect("/app/child/new?error=That+birth+month+is+in+the+future.");
  }

  const { data, error } = await supabase
    .from("nsc_children")
    .insert({
      owner_id: user.id,
      nickname,
      birth_month: `${birthMonth}-01`,
      home_languages: languages,
    })
    .select("id")
    .single();

  if (error) redirect(`/app/child/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/app");
  redirect(`/app/child/${data!.id}/prescreen`);
}

/** Persist pre-screen answers, open a fresh assessment, and start the game. */
export async function beginAssessment(childId: string, formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const prescreen = {
    count_band: String(formData.get("count_band") ?? ""),
    gives_one: String(formData.get("gives_one") ?? ""),
    points_counts: String(formData.get("points_counts") ?? ""),
    // Small number words are learned per-language (Wagner, Kimura & Barner
    // 2015) — the check-in should run in the child's counting language.
    number_language: String(formData.get("number_language") ?? "english"),
  };

  // Resume an in-flight assessment for this child inside the 48h window.
  const { data: existing } = await supabase
    .from("nsc_assessments")
    .select("id, status, started_at")
    .eq("child_id", childId)
    .in("status", ["in_progress", "paused"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    existing &&
    Date.now() - new Date(existing.started_at).getTime() < RESUME_WINDOW_MS
  ) {
    redirect(`/app/assess/${existing.id}`);
  }

  // Instrument routing (amendment A5): under ~30 months, Give-N compliance
  // is poor and these families previously got no assessment at all — the
  // Point-to-X-style "Point and Seek" runs instead (ev.protocol.silver2021).
  const { data: childRow } = await supabase
    .from("nsc_children")
    .select("birth_month")
    .eq("id", childId)
    .single();
  const months = childRow
    ? ageInMonths(String(childRow.birth_month).slice(0, 7), new Date())
    : POINT_AND_SEEK_MAX_MONTHS;
  // Under ~2 there is no assessment at all — the prescreen page shows the
  // "just talk" guidance instead; this guard is defense in depth.
  if (months < MIN_ASSESSMENT_MONTHS) {
    redirect(`/app/child/${childId}/prescreen`);
  }
  const usePointAndSeek = months < POINT_AND_SEEK_MAX_MONTHS;

  const { data, error } = await supabase
    .from("nsc_assessments")
    .insert({
      child_id: childId,
      owner_id: user.id,
      artifact_version: ARTIFACT_VERSION,
      status: "in_progress",
      prescreen,
      instrument: usePointAndSeek ? "point_and_seek" : "give_n",
      engine_state: (usePointAndSeek
        ? createPointSession()
        : createSession()) as unknown as object,
    })
    .select("id")
    .single();

  if (error) redirect(`/app/child/${childId}/prescreen?error=${encodeURIComponent(error.message)}`);
  redirect(`/app/assess/${data!.id}`);
}

/**
 * Start a Point and Seek session directly — the gentle retry offered after
 * a skip-heavy Give-N session ("the bear just wants to watch this time").
 * Reuses the child's most recent prescreen answers for context.
 */
export async function startPointAndSeek(childId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: latest } = await supabase
    .from("nsc_assessments")
    .select("prescreen")
    .eq("child_id", childId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("nsc_assessments")
    .insert({
      child_id: childId,
      owner_id: user.id,
      artifact_version: ARTIFACT_VERSION,
      status: "in_progress",
      prescreen: latest?.prescreen ?? {},
      instrument: "point_and_seek",
      engine_state: createPointSession() as unknown as object,
    })
    .select("id")
    .single();

  if (error) redirect(`/app?error=${encodeURIComponent(error.message)}`);
  redirect(`/app/assess/${data!.id}`);
}

async function loadAssessment(assessmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nsc_assessments")
    .select("id, child_id, status, engine_state, confidence")
    .eq("id", assessmentId)
    .single();
  if (error || !data) throw new Error("Assessment not found");
  return { supabase, data };
}

export interface OutcomeResult {
  state: TitrationState;
}

/**
 * Record one trial outcome. Loads the authoritative engine state (RLS scopes
 * to the owner), applies the pure FSM, persists the trial row + updated state,
 * and finalizes placement/confidence when the session ends. Returns the new
 * state so the client re-renders from the server's authority, never its own.
 */
export async function recordOutcome(
  assessmentId: string,
  outcome: Outcome,
  selfCorrected?: boolean,
): Promise<OutcomeResult> {
  await requireAuth();
  const { supabase, data } = await loadAssessment(assessmentId);
  if (data.status === "complete") {
    return { state: data.engine_state as TitrationState };
  }

  const prev = data.engine_state as TitrationState;
  const next = applyOutcome(prev, outcome, /* postCheck */ true);
  const seq = next.trials.length;
  const last = next.trials[next.trials.length - 1];
  if (selfCorrected !== undefined) last.selfCorrected = selfCorrected;

  await supabase.from("nsc_trials").insert({
    assessment_id: assessmentId,
    seq,
    requested_n: last.n,
    outcome: last.outcome,
    post_check: last.postCheck,
    is_bonus: last.isBonus,
  });

  const result = next.phase === "done" ? getResult(next) : null;
  await supabase
    .from("nsc_assessments")
    .update({
      engine_state: next as unknown as object,
      trial_count: next.trials.filter((t) => !t.isBonus).length,
      status: result ? "complete" : "in_progress",
      placement: result?.placement ?? null,
      near_cp: result?.nearCP ?? false,
      confidence: result?.confidence ?? null,
      completed_at: result ? new Date().toISOString() : null,
    })
    .eq("id", assessmentId);

  if (result) revalidatePath("/app");
  return { state: next };
}

/**
 * Parent marks a completed session as an off day (tired, distracted, shy).
 * Downward confounds are real, so a high-confidence read on a flagged day
 * is softened to medium. Confidence-only: placement never changes, and the
 * re-run invitation keeps its normal time gate — an instant "bad day, go
 * again" button would ratchet placements up through retest familiarity.
 */
export async function flagOffDay(assessmentId: string) {
  await requireAuth();
  const { supabase, data } = await loadAssessment(assessmentId);
  if (data.status !== "complete") return;

  const state = data.engine_state as TitrationState & { offDay?: boolean };
  const update: Record<string, unknown> = {
    engine_state: { ...state, offDay: true },
  };
  if (data.confidence === "high") update.confidence = "medium";
  await supabase.from("nsc_assessments").update(update).eq("id", assessmentId);
  revalidatePath("/app");
}

export async function pauseAssessment(assessmentId: string) {
  await requireAuth();
  const supabase = await createClient();
  await supabase
    .from("nsc_assessments")
    .update({ status: "paused" })
    .eq("id", assessmentId)
    .eq("status", "in_progress");
  revalidatePath("/app");
  redirect("/app");
}

export interface PointPickResult {
  state: PSState;
}

/**
 * Record one Point and Seek tap. Same authority pattern as recordOutcome:
 * load server-side state, apply the pure module, persist trial + state,
 * finalize the soft signal when done. Point and Seek NEVER writes a rung
 * above L1 and never better than medium confidence (amendment A5).
 */
export async function recordPointPick(
  assessmentId: string,
  pick: PSPick,
): Promise<PointPickResult> {
  await requireAuth();
  const { supabase, data } = await loadAssessment(assessmentId);
  if (data.status === "complete") {
    return { state: data.engine_state as PSState };
  }

  const prev = data.engine_state as PSState;
  const next = psApplyPick(prev, pick);
  const last = next.records[next.records.length - 1];

  await supabase.from("nsc_trials").insert({
    assessment_id: assessmentId,
    seq: last.seq,
    requested_n: last.target,
    outcome: last.pick === "skip" ? "skip" : last.correct ? "correct" : "incorrect",
    post_check: false,
    is_bonus: false,
  });

  const result = psIsDone(next) ? psResult(next) : null;
  await supabase
    .from("nsc_assessments")
    .update({
      engine_state: next as unknown as object,
      trial_count: next.records.length,
      status: result ? "complete" : "in_progress",
      placement: result?.routePlacement ?? null,
      near_cp: false,
      confidence: result?.routeConfidence ?? null,
      ps_signal: result?.signal ?? null,
      completed_at: result ? new Date().toISOString() : null,
    })
    .eq("id", assessmentId);

  if (result) revalidatePath("/app");
  return { state: next };
}
