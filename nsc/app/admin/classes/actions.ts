"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

function safeSlug(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createLesson(formData: FormData) {
  await requireClassAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const slug = safeSlug(String(formData.get("slug") || title));
  const moduleNumber = Number(formData.get("module_number"));
  const position = Number(formData.get("position"));
  if (!title || !slug || !Number.isInteger(moduleNumber) || moduleNumber < 1 || moduleNumber > 5 ||
      !Number.isInteger(position) || position < 1) {
    redirect("/admin/classes?error=invalid-lesson");
  }
  const { data, error } = await createServiceClient().from("class_lessons")
    .insert({ course_slug: "toddlerhood", title, slug, module_number: moduleNumber, position })
    .select("id")
    .single();
  if (error) redirect(`/admin/classes?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/classes");
  redirect(`/admin/classes/${data.id}`);
}

export async function saveLesson(id: string, formData: FormData) {
  await requireClassAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const transcript = String(formData.get("transcript") ?? "").trim();
  const moduleNumber = Number(formData.get("module_number"));
  const position = Number(formData.get("position"));
  const captionsReady = formData.get("captions_ready") === "on";
  const status = formData.get("status") === "published" ? "published" : "draft";
  if (!title || title.length > 160 || summary.length > 1000 || transcript.length > 100_000 ||
      !Number.isInteger(moduleNumber) || moduleNumber < 1 || moduleNumber > 5 ||
      !Number.isInteger(position) || position < 1) {
    redirect(`/admin/classes/${id}?error=invalid-lesson`);
  }
  const { error } = await createServiceClient().from("class_lessons")
    .update({ title, summary, transcript, module_number: moduleNumber, position,
      captions_ready: captionsReady, status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("course_slug", "toddlerhood");
  if (error) redirect(`/admin/classes/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${id}`);
  revalidatePath("/app/classes/toddlerhood");
  redirect(`/admin/classes/${id}?saved=1`);
}
