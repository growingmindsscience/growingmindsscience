import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { hasClassAccess } from "@/lib/classes.server";
import { createServiceClient } from "@/lib/supabase/server";
import { signedPlaybackToken } from "@/lib/mux.server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await hasClassAccess(user.id, "preschool"))) {
    return NextResponse.json({ error: "Class purchase required" }, { status: 403 });
  }
  const { id } = await context.params;
  const { data, error } = await createServiceClient().from("class_lessons")
    .select("mux_playback_id, duration_seconds")
    .eq("id", id)
    .eq("course_slug", "preschool")
    .eq("status", "published")
    .maybeSingle();
  if (error || !data?.mux_playback_id) {
    return NextResponse.json({ error: "Video unavailable" }, { status: 404 });
  }
  try {
    const signed = signedPlaybackToken(data.mux_playback_id, data.duration_seconds);
    return NextResponse.json({ playbackId: data.mux_playback_id, ...signed }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Video is not configured" }, { status: 503 });
  }
}
