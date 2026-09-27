import "server-only";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { TODDLER_COURSE, ownsToddlerClass, type ClassLesson } from "@/lib/classes";

export async function hasClassAccess(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entitlements")
    .select("expires_at, source, source_ref")
    .eq("user_id", userId)
    .eq("product_scope", TODDLER_COURSE.scope);
  if (error) throw new Error(`Could not check class ownership: ${error.message}`);
  return ownsToddlerClass(data ?? [], new Date());
}

export async function publishedLessons(): Promise<ClassLesson[]> {
  const { data, error } = await createServiceClient()
    .from("class_lessons")
    .select("*")
    .eq("course_slug", TODDLER_COURSE.slug)
    .eq("status", "published")
    .order("module_number")
    .order("position");
  if (error) throw new Error(`Could not load lessons: ${error.message}`);
  return (data ?? []) as ClassLesson[];
}

/** The existing offer promises 29 lessons immediately. Never sell an empty shell. */
export async function classSalesOpen(): Promise<boolean> {
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
