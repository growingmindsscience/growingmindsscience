import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAssessmentCopy } from "@/lib/content.server";
import type { TitrationState } from "@/lib/titration";
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
    .select("id, child_id, status, engine_state, instrument")
    .eq("id", id)
    .single();

  if (!assessment) notFound();
  if (assessment.status === "complete") {
    redirect(`/app/child/${assessment.child_id}/plan`);
  }

  const { data: child } = await supabase
    .from("nsc_children")
    .select("nickname")
    .eq("id", assessment.child_id)
    .single();
  if (!child) notFound();

  const copy = await getAssessmentCopy();

  if (assessment.instrument === "point_and_seek") {
    return (
      <PointSeekRunner
        assessmentId={assessment.id}
        childId={assessment.child_id}
        initialState={assessment.engine_state as PSState}
        copy={copy}
        childName={child.nickname}
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
      resumed={resumed}
    />
  );
}
