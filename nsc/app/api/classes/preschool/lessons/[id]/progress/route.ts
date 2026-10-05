import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { hasClassAccess } from "@/lib/classes.server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await hasClassAccess(user.id, "preschool"))) {
    return NextResponse.json({ error: "Class purchase required" }, { status: 403 });
  }
  const { id } = await context.params;
  const { data: lesson } = await createServiceClient().from("class_lessons")
    .select("id, duration_seconds")
    .eq("id", id)
    .eq("course_slug", "preschool")
    .eq("status", "published")
    .maybeSingle();
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  let body: { positionSeconds?: unknown; complete?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const position = body.positionSeconds;
  if (typeof position !== "number" || !Number.isFinite(position) || position < 0 ||
      position > (lesson.duration_seconds ?? 21600) + 60) {
    return NextResponse.json({ error: "Invalid playback position" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase.from("class_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: "Progress unavailable" }, { status: 503 });
  // completed_at is written only by the save that completes the lesson. A
  // position save leaves the column alone, so one that races a completion
  // (the pause that fires as a video ends) cannot undo it.
  const completing = body.complete === true && !existing?.completed_at;
  const { error } = await supabase.from("class_progress").upsert({
    user_id: user.id,
    lesson_id: id,
    position_seconds: Math.floor(position),
    ...(completing ? { completed_at: new Date().toISOString() } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,lesson_id" });
  if (error) return NextResponse.json({ error: "Could not save progress" }, { status: 503 });
  return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "private, no-store" } });
}
