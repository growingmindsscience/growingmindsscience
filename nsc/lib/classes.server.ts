import "server-only";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  CLASS_COURSES, INFANT_COURSE, INFANT_MODULE_LESSON_COUNTS, PRESCHOOL_COURSE, PRESCHOOL_MODULE_LESSON_COUNTS,
  TODDLER_COURSE, infantSalesGate, ownsToddlerClass, preschoolSalesGate,
  type ClassCourseSlug, type ClassLesson,
} from "@/lib/classes";
import { freePreviewLessonWith, type FreePreviewLesson } from "@/lib/class-preview";

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

/** Every class this account owns, in one read. */
export async function ownedClassSlugs(userId: string): Promise<ClassCourseSlug[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entitlements")
    .select("product_scope, expires_at, source, source_ref")
    .eq("user_id", userId)
    .in("product_scope", Object.values(CLASS_COURSES).map((course) => course.scope));
  if (error) throw new Error(`Could not check class ownership: ${error.message}`);
  const now = new Date();
  return (Object.keys(CLASS_COURSES) as ClassCourseSlug[]).filter((slug) =>
    ownsToddlerClass((data ?? []).filter((row) => row.product_scope === CLASS_COURSES[slug].scope), now));
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

/** The class's free sample lesson, if it has a published one with a video. */
export function freePreviewLesson(courseSlug: ClassCourseSlug): Promise<FreePreviewLesson | null> {
  return freePreviewLessonWith(createServiceClient(), courseSlug);
}

/** A published lesson's title, for the browser tab; null when there is none. */
export async function publishedLessonTitle(courseSlug: ClassCourseSlug, slug: string): Promise<string | null> {
  const { data } = await createServiceClient()
    .from("class_lessons")
    .select("title")
    .eq("course_slug", courseSlug)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data?.title as string | undefined) ?? null;
}

/** Open sales only after every promised lesson is published. */
export async function classSalesOpen(courseSlug: ClassCourseSlug = TODDLER_COURSE.slug, userId?: string): Promise<boolean> {
  if (courseSlug === INFANT_COURSE.slug || courseSlug === PRESCHOOL_COURSE.slug) {
    const infant = courseSlug === INFANT_COURSE.slug;
    const required = infant ? INFANT_MODULE_LESSON_COUNTS : PRESCHOOL_MODULE_LESSON_COUNTS;
    const lessons = await publishedLessons(courseSlug);
    const gate = (infant ? infantSalesGate : preschoolSalesGate)({
      salesFlag: infant ? process.env.INFANT_CLASS_SALES_ENABLED : process.env.PRESCHOOL_CLASS_SALES_ENABLED,
      vercelEnv: process.env.VERCEL_ENV,
      previewUserId: infant ? process.env.INFANT_CLASS_PREVIEW_USER_ID : process.env.PRESCHOOL_CLASS_PREVIEW_USER_ID,
      testUserId: infant ? process.env.INFANT_CLASS_TEST_USER_ID : process.env.PRESCHOOL_CLASS_TEST_USER_ID,
      userId,
      moduleCounts: required.map((_, index) =>
        lessons.filter((lesson) => lesson.module_number === index + 1).length),
    });
    // The reason names the failing condition only; it never holds a value.
    if (!gate.open) console.warn(`[class-sales] ${courseSlug} enrollment closed: ${gate.reason}`);
    return gate.open;
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
