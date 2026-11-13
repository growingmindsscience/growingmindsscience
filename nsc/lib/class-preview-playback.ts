import { NextResponse } from "next/server";
import type { ClassCourseSlug } from "@/lib/classes";
import { freePreviewLesson } from "@/lib/classes.server";
import { signedPlaybackToken } from "@/lib/mux.server";

/**
 * Playback for one class's free lesson, open to anyone. Each route passes a
 * fixed class and reads nothing from the request: the only video it can sign
 * is that class's published lesson flagged is_free_preview, and a Mux token is
 * bound to one playback id, so no token for another lesson can come out of it.
 */
export async function freePreviewPlayback(courseSlug: ClassCourseSlug) {
  const lesson = await freePreviewLesson(courseSlug);
  if (!lesson?.mux_playback_id) {
    return NextResponse.json({ error: "Video unavailable" }, { status: 404 });
  }
  try {
    const signed = signedPlaybackToken(lesson.mux_playback_id, lesson.duration_seconds);
    return NextResponse.json({ playbackId: lesson.mux_playback_id, ...signed }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Video is not configured" }, { status: 503 });
  }
}
