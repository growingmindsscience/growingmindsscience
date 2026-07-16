"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Child creation for the library (same spine table as Number Path). */
export async function createLibraryChild(formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const nickname = String(formData.get("nickname") ?? "").trim().slice(0, 30);
  const birthMonth = String(formData.get("birth_month") ?? ""); // yyyy-mm
  if (!nickname || !/^\d{4}-\d{2}$/.test(birthMonth)) {
    redirect("/activities/today?error=Please+add+a+name+and+birth+month.");
  }
  if (birthMonth > new Date().toISOString().slice(0, 7)) {
    redirect("/activities/today?error=That+birth+month+is+in+the+future.");
  }

  const { error } = await supabase.from("nsc_children").insert({
    owner_id: user.id,
    nickname,
    birth_month: `${birthMonth}-01`,
  });
  if (error) {
    redirect(`/activities/today?error=${encodeURIComponent(error.message)}`);
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

  await supabase.from("activity_completions").upsert(
    {
      user_id: user.id,
      child_id: childId,
      activity_id: activityId,
      completed_on: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "child_id,activity_id,completed_on", ignoreDuplicates: true },
  );
  revalidatePath("/activities/today");
}
