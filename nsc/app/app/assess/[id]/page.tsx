import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAssessmentCopy } from "@/lib/content.server";
import { getAudioIds } from "@/lib/audio.server";
import { ageInMonths, RESUME_WINDOW_MS } from "@/lib/age";
import type { Placement, TitrationState } from "@/lib/titration";
import type { PSState } from "@/lib/pointandseek";
import { TrialRunner } from "./trial-runner";
import { PointSeekRunner } from "./point-seek-runner";

export default async function AssessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();
  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("nsc_assessments")
    .select(
      "id, child_id, status, engine_state, instrument, prescreen, started_at, completed_at",
    )
    .eq("id", id)
    .single();

  if (!assessment) notFound();
  if (assessment.status === "complete") {
    // The completing action's revalidatePath re-renders this route, so an
    // unconditional redirect here yanks the end-of-assessment readout off the
    // screen before the parent can read it. Grace window: a just-finished
    // assessment keeps rendering its readout (the runner's done view, with the
    // plan CTA); only stale completed URLs bounce straight to the plan.
    const completedMs = assessment.completed_at
      ? Date.now() - new Date(assessment.completed_at).getTime()
      : Infinity;
    if (completedMs > 10 * 60 * 1000) {
      redirect(`/app/child/${assessment.child_id}/plan`);
    }
  } else if (
    // The 48h resume promise holds here too, not just at the dashboard funnel —
    // a bookmarked URL must not resurrect a week-old half-session.
    Date.now() - new Date(assessment.started_at).getTime() >
    RESUME_WINDOW_MS
  ) {
    redirect(`/app/child/${assessment.child_id}/prescreen`);
  }

  const { data: child } = await supabase
    .from("nsc_children")
    .select("nickname, birth_month")
    .eq("id", assessment.child_id)
    .single();
  if (!child) notFound();
  const months = ageInMonths(String(child.birth_month).slice(0, 7), new Date());

  // Previous completed placement — lets the readout frame a re-run honestly
  // (held steady / climbed / read lower) instead of repeating itself.
  const { data: prior } = await supabase
    .from("nsc_assessments")
    .select("placement")
    .eq("child_id", assessment.child_id)
    .eq("status", "complete")
    .not("id", "eq", assessment.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevPlacement = (prior?.placement as Placement | undefined) ?? null;

  const numberLanguage =
    ((assessment.prescreen as Record<string, string> | null)?.number_language ??
      "english") !== "english";

  const copy = await getAssessmentCopy();
  const audioIds = await getAudioIds();

  if (assessment.instrument === "point_and_seek") {
    return (
      <PointSeekRunner
        assessmentId={assessment.id}
        childId={assessment.child_id}
        initialState={assessment.engine_state as PSState}
        copy={copy}
        childName={child.nickname}
        otherNumberLanguage={numberLanguage}
        audioIds={audioIds}
      />
    );
  }

  const state = assessment.engine_state as TitrationState;
  const resumed = state.trials.length > 0 || assessment.status === "paused";

  return (
    <TrialRunner
      assessmentId={assessment.id}
      childId={assessment.child_id}
      initialState={state}
      copy={copy}
      childName={child.nickname}
      objects="blocks"
      objectsSingular="block"
      resumed={resumed}
      prevPlacement={prevPlacement}
      ageMonths={months}
      otherNumberLanguage={numberLanguage}
      audioIds={audioIds}
    />
  );
}
