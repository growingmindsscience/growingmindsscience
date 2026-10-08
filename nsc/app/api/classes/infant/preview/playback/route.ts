import { NextResponse } from "next/server";
import { freePreviewLesson } from "@/lib/classes.server";
import { signedPlaybackToken } from "@/lib/mux.server";

// It takes no request input, so without this Next could prerender it at
// build time and serve one token, expired within the hour, to everyone.
export const dynamic = "force-dynamic";

/**
 * Playback for the infant class's free lesson, open to anyone. It reads
 * nothing from the request: the only video it can sign is the published
 * lesson flagged is_free_preview, and a Mux token is bound to one playback
 * id, so no token for another lesson can come out of it.
 */
export async function GET() {
  const lesson = await freePreviewLesson("infant");
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
