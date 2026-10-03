"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ARTIFACT_VERSION } from "@/lib/content.server";
import { createSession, type Outcome, type TitrationState } from "@/lib/titration";
import { createPointSession, type PSPick, type PSState } from "@/lib/pointandseek";
import { recordGiveNTap, recordPointTap, type TapResult } from "@/lib/assessment-store";
import { ageInMonths, MIN_ASSESSMENT_MONTHS, RESUME_WINDOW_MS } from "@/lib/age";
import { birthMonthFromForm } from "@/lib/birth-month";
import { SAVE_FAILED } from "@/lib/friendly-error";
import { localDateISO } from "@/lib/tz";
import { getTimeZone } from "@/lib/tz.server";

/** Below this age Point and Seek replaces Give-N as the default instrument (A5). */
const POINT_AND_SEEK_MAX_MONTHS = 30;

/** Create a child (nickname + birth month + languages) and go to the pre-screen. */
export async function createChild(formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const nickname = String(formData.get("nickname") ?? "").trim().slice(0, 30);
  const languages = String(formData.get("home_languages") ?? "")
    .split(",")
    .map((s) => s.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 6);
  const birth = birthMonthFromForm(formData, localDateISO(new Date(), await getTimeZone()));

  if (!nickname || (!birth.ok && birth.reason === "missing")) {
    redirect("/app/child/new?error=Please+add+a+name+and+birth+month.");
  }
  if (!birth.ok) {
    redirect("/app/child/new?error=That+birth+month+is+in+the+future.");
  }

  const { data, error } = await supabase
    .from("nsc_children")
    .insert({
      owner_id: user.id,
      nickname,
      birth_month: `${birth.value}-01`,
      home_languages: languages,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(`[child] insert failed: ${error?.message}`);
    redirect(`/app/child/new?error=${encodeURIComponent(SAVE_FAILED)}`);
  }
  revalidatePath("/app");
  redirect(`/app/child/${data.id}/prescreen`);
}

/**
 * The child row, visible only to its owner through RLS. Used as an
 * ownership check before writing rows that reference the child: the table
 * policies check owner_id, not that child_id belongs to the caller.
 */
async function ownChild(
  supabase: Awaited<ReturnType<typeof createClient>>,
  childId: string,
): Promise<{ id: string; birth_month: string } | null> {
  const { data } = await supabase
    .from("nsc_children")
    .select("id, birth_month")
    .eq("id", childId)
    .maybeSingle();
  return (data as { id: string; birth_month: string } | null) ?? null;
}

/** Persist pre-screen answers, open a fresh assessment, and start the game. */
export async function beginAssessment(childId: string, formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const child = await ownChild(supabase, childId);
  if (!child) redirect("/app");

  const answer = (name: string, fallback = "") =>
    String(formData.get(name) ?? fallback).slice(0, 32);
  const prescreen = {
    count_band: answer("count_band"),
    gives_one: answer("gives_one"),
    points_counts: answer("points_counts"),
    // Small number words are learned per-language (Wagner, Kimura & Barner
    // 2015) — the check-in should run in the child's counting language.
    number_language: answer("number_language", "english"),
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
  const months = ageInMonths(String(child.birth_month).slice(0, 7), new Date());
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

  if (error || !data) {
    console.error(`[assess] insert failed: ${error?.message}`);
    redirect(`/app/child/${childId}/prescreen?error=${encodeURIComponent(SAVE_FAILED)}`);
  }
  redirect(`/app/assess/${data.id}`);
}

/**
 * Start a Point and Seek session directly — the gentle retry offered after
 * a skip-heavy Give-N session ("the bear just wants to watch this time").
 * Reuses the child's most recent prescreen answers for context.
 */
export async function startPointAndSeek(childId: string) {
  const user = await requireAuth();
  const supabase = await createClient();
  if (!(await ownChild(supabase, childId))) redirect("/app");

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

  if (error || !data) {
    console.error(`[assess] point-and-seek insert failed: ${error?.message}`);
    redirect(`/app?error=${encodeURIComponent(SAVE_FAILED)}`);
  }
  redirect(`/app/assess/${data.id}`);
}

/**
 * Record one Give-N answer. `expectedTrials` is how many answers the
 * parent's screen had seen; a mismatch returns the saved state untouched
 * (status "stale") so a lost response or a stale tab can't record an answer
 * against a different number. Throws when the save fails (the runner shows
 * a calm "didn't save" note and the parent taps again).
 */
export async function recordOutcome(
  assessmentId: string,
  outcome: Outcome,
  expectedTrials: number,
  selfCorrected?: boolean,
): Promise<TapResult<TitrationState>> {
  await requireAuth();
  const supabase = await createClient();
  const result = await recordGiveNTap(supabase, assessmentId, outcome, expectedTrials, selfCorrected);
  if (result.finalized) revalidatePath("/app");
  return result;
}

/**
 * Parent marks a completed session as an off day (tired, distracted, shy).
 * Downward confounds are real, so a high-confidence read on a flagged day
 * is softened to medium. Confidence-only: placement never changes, and the
 * re-run invitation keeps its normal time gate — an instant "bad day, go
 * again" button would ratchet placements up through retest familiarity.
 */
export async function flagOffDay(assessmentId: string): Promise<{ ok: boolean }> {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nsc_assessments")
    .select("id, status, engine_state, confidence")
    .eq("id", assessmentId)
    .maybeSingle();
  if (error || !data) return { ok: false };
  if (data.status !== "complete") return { ok: false };

  const state = data.engine_state as TitrationState & { offDay?: boolean };
  const update: Record<string, unknown> = {
    engine_state: { ...state, offDay: true },
  };
  if (data.confidence === "high") update.confidence = "medium";
  const { error: saveErr } = await supabase
    .from("nsc_assessments")
    .update(update)
    .eq("id", assessmentId);
  if (saveErr) return { ok: false };
  revalidatePath("/app");
  return { ok: true };
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

/**
 * Record one Point and Seek tap. Same authority pattern as recordOutcome:
 * `expectedIndex` is the card pair the parent's screen showed. Point and
 * Seek NEVER writes a rung above L1 and never better than medium confidence
 * (amendment A5).
 */
export async function recordPointPick(
  assessmentId: string,
  pick: PSPick,
  expectedIndex: number,
): Promise<TapResult<PSState>> {
  await requireAuth();
  const supabase = await createClient();
  const result = await recordPointTap(supabase, assessmentId, pick, expectedIndex);
  if (result.finalized) revalidatePath("/app");
  return result;
}
