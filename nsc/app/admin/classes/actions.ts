"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { CLASS_COURSES, isClassCourseSlug } from "@/lib/classes";
import { CLASS_PREVIEW_PATHS } from "@/lib/class-preview";

function safeSlug(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createLesson(formData: FormData) {
  await requireClassAdmin();
  const courseSlug = String(formData.get("course_slug") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const slug = safeSlug(String(formData.get("slug") || title));
  const moduleNumber = Number(formData.get("module_number"));
  const position = Number(formData.get("position"));
  if (!isClassCourseSlug(courseSlug) || !title || !slug ||
      !Number.isInteger(moduleNumber) || moduleNumber < 1 ||
      moduleNumber > CLASS_COURSES[courseSlug].modules.length ||
      !Number.isInteger(position) || position < 1) {
    redirect("/admin/classes?error=invalid-lesson");
  }
  const { data, error } = await createServiceClient().from("class_lessons")
    .insert({ course_slug: courseSlug, title, slug, module_number: moduleNumber, position })
    .select("id")
    .single();
  if (error) redirect(`/admin/classes?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/classes");
  redirect(`/admin/classes/${data.id}`);
}

export async function saveLesson(id: string, formData: FormData) {
  await requireClassAdmin();
  const service = createServiceClient();
  const { data: lesson } = await service.from("class_lessons")
    .select("course_slug")
    .eq("id", id)
    .maybeSingle();
  if (!lesson || !isClassCourseSlug(lesson.course_slug)) redirect("/admin/classes?error=lesson-not-found");
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const transcript = String(formData.get("transcript") ?? "").trim();
  const moduleNumber = Number(formData.get("module_number"));
  const position = Number(formData.get("position"));
  const captionsReady = formData.get("captions_ready") === "on";
  const status = formData.get("status") === "published" ? "published" : "draft";
  const freePreview = formData.get("is_free_preview") === "on";
  if (!title || title.length > 160 || summary.length > 1000 || transcript.length > 100_000 ||
      !Number.isInteger(moduleNumber) || moduleNumber < 1 ||
      moduleNumber > CLASS_COURSES[lesson.course_slug].modules.length ||
      !Number.isInteger(position) || position < 1) {
    redirect(`/admin/classes/${id}?error=invalid-lesson`);
  }
  if (freePreview) {
    // A class has at most one free lesson (a unique index enforces it), so the
    // flag moves here from whichever lesson in this class held it before.
    const { error: clearError } = await service.from("class_lessons")
      .update({ is_free_preview: false })
      .eq("course_slug", lesson.course_slug)
      .eq("is_free_preview", true)
      .neq("id", id);
    if (clearError) redirect(`/admin/classes/${id}?error=${encodeURIComponent(clearError.message)}`);
  }
  const { error } = await service.from("class_lessons")
    .update({ title, summary, transcript, module_number: moduleNumber, position,
      captions_ready: captionsReady, status, is_free_preview: freePreview, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("course_slug", lesson.course_slug);
  if (error) redirect(`/admin/classes/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${id}`);
  revalidatePath("/app/classes/toddlerhood");
  revalidatePath("/app/classes/infant");
  revalidatePath("/app/classes/preschool");
  revalidatePath("/app/classes/family");
  revalidatePath(CLASS_PREVIEW_PATHS[lesson.course_slug]);
  redirect(`/admin/classes/${id}?saved=1`);
}
