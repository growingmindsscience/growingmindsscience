"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { birthMonthFromForm } from "@/lib/birth-month";
import { SAVE_FAILED } from "@/lib/friendly-error";
import { localDateISO } from "@/lib/tz";
import { getTimeZone } from "@/lib/tz.server";

/** Child creation for the library (same spine table as Number Path). */
export async function createLibraryChild(formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const nickname = String(formData.get("nickname") ?? "").trim().slice(0, 30);
  const birth = birthMonthFromForm(formData, localDateISO(new Date(), await getTimeZone()));
  if (!nickname || (!birth.ok && birth.reason === "missing")) {
    redirect("/activities/today?error=Please+add+a+name+and+birth+month.");
  }
  if (!birth.ok) {
    redirect("/activities/today?error=That+birth+month+is+in+the+future.");
  }

  const { error } = await supabase.from("nsc_children").insert({
    owner_id: user.id,
    nickname,
    birth_month: `${birth.value}-01`,
  });
  if (error) {
    console.error(`[library] child insert failed: ${error.message}`);
    redirect(`/activities/today?error=${encodeURIComponent(SAVE_FAILED)}`);
  }
  revalidatePath("/activities/today");
  redirect("/activities/today");
}

/** Log a completion for today. Idempotent via the (child, activity, day)
 * uniqueness; RLS restricts writes to the signed-in owner. */
export async function markDone(childId: string, activityId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // RLS returns only the caller's children; a foreign child id just no-ops.
  const { data: child } = await supabase
    .from("nsc_children")
    .select("id")
    .eq("id", childId)
    .maybeSingle();
  if (!child) return;

  const { error } = await supabase.from("activity_completions").upsert(
    {
      user_id: user.id,
      child_id: childId,
      activity_id: activityId,
      // The parent's calendar day, so "done today" matches their today.
      completed_on: localDateISO(new Date(), await getTimeZone()),
    },
    { onConflict: "child_id,activity_id,completed_on", ignoreDuplicates: true },
  );
  if (error) {
    console.error(`[library] completion failed: ${error.message}`);
    redirect(`/activities/today?error=${encodeURIComponent(SAVE_FAILED)}`);
  }
  revalidatePath("/activities/today");
}
