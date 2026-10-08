import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassCourseSlug, ClassLesson } from "@/lib/classes";

/** The public preview page for each class that has a free lesson. */
export const INFANT_PREVIEW_PATH = "/classes/infant/preview";

export type FreePreviewLesson = Pick<ClassLesson,
  "id" | "module_number" | "position" | "slug" | "title" | "summary" | "transcript" | "duration_seconds" | "mux_playback_id">;

/** A lesson's number across the whole class, counting every lesson in the modules before it. */
export function classLessonNumber(moduleCounts: readonly number[], moduleNumber: number, position: number): number {
  return moduleCounts.slice(0, moduleNumber - 1).reduce((sum, count) => sum + count, 0) + position;
}

/**
 * The one lesson of a class anyone may watch before buying, or null when
 * the class has none, it is not published, or it has no video. The row is
 * chosen by its flag alone, never by anything a visitor sends, so no other
 * lesson can come back. lib/classes.server.ts binds it to the service client
 * (class_lessons has no RLS policies). A read error, including the column
 * not existing before migration 0017 is applied, counts as no preview.
 */
export async function freePreviewLessonWith(db: SupabaseClient, courseSlug: ClassCourseSlug): Promise<FreePreviewLesson | null> {
  const { data, error } = await db.from("class_lessons")
    .select("id, module_number, position, slug, title, summary, transcript, duration_seconds, mux_playback_id")
    .eq("course_slug", courseSlug)
    .eq("is_free_preview", true)
    .eq("status", "published")
    .not("mux_playback_id", "is", null)
    .maybeSingle();
  if (error) {
    console.warn(`[class-preview] ${courseSlug} preview unavailable: ${error.code ?? "read failed"}`);
    return null;
  }
  return (data as FreePreviewLesson | null) ?? null;
}
