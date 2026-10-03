import "server-only";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CLASS_COURSES, INFANT_COURSE, TODDLER_COURSE, ownsToddlerClass, type ClassCourseSlug, type ClassLesson } from "@/lib/classes";

export async function hasClassAccess(userId: string, courseSlug: ClassCourseSlug = TODDLER_COURSE.slug): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entitlements")
    .select("expires_at, source, source_ref")
    .eq("user_id", userId)
    .eq("product_scope", CLASS_COURSES[courseSlug].scope);
  if (error) throw new Error(`Could not check class ownership: ${error.message}`);
  return ownsToddlerClass(data ?? [], new Date());
}

export async function publishedLessons(courseSlug: ClassCourseSlug = TODDLER_COURSE.slug): Promise<ClassLesson[]> {
  const { data, error } = await createServiceClient()
    .from("class_lessons")
    .select("*")
    .eq("course_slug", courseSlug)
    .eq("status", "published")
    .order("module_number")
    .order("position");
  if (error) throw new Error(`Could not load lessons: ${error.message}`);
  return (data ?? []) as ClassLesson[];
}

/** Open sales only after every promised lesson is published. */
export async function classSalesOpen(courseSlug: ClassCourseSlug = TODDLER_COURSE.slug, userId?: string): Promise<boolean> {
  if (courseSlug === INFANT_COURSE.slug) {
    if (process.env.INFANT_CLASS_SALES_ENABLED !== "1") return false;
    if (process.env.VERCEL_ENV === "preview" &&
        (!process.env.INFANT_CLASS_PREVIEW_USER_ID || userId !== process.env.INFANT_CLASS_PREVIEW_USER_ID)) return false;
    const lessons = await publishedLessons(courseSlug);
    return [5, 4, 3, 4].every((count, index) =>
      lessons.filter((lesson) => lesson.module_number === index + 1).length === count);
  }
  if (process.env.TODDLER_CLASS_SALES_ENABLED !== "1") return false;
  return (await publishedLessons()).length >= 29;
}

export async function progressForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("class_progress")
    .select("lesson_id, position_seconds, completed_at")
    .eq("user_id", userId);
  if (error) throw new Error(`Could not load class progress: ${error.message}`);
  return data ?? [];
}
