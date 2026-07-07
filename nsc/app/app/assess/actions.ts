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

const RESUME_WINDOW_MS = 48 * 60 * 60 * 1000;

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

  const { data, error } = await supabase
    .from("nsc_assessments")
    .insert({
      child_id: childId,
      owner_id: user.id,
      artifact_version: ARTIFACT_VERSION,
      status: "in_progress",
      prescreen,
      engine_state: createSession() as unknown as object,
    })
    .select("id")
    .single();

  if (error) redirect(`/app/child/${childId}/prescreen?error=${encodeURIComponent(error.message)}`);
  redirect(`/app/assess/${data!.id}`);
}

async function loadAssessment(assessmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nsc_assessments")
    .select("id, child_id, status, engine_state")
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
