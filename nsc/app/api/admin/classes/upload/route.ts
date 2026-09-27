import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { muxApi } from "@/lib/mux.server";

export async function POST(request: Request) {
  const user = await getUser();
  if (!isClassAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const configuredOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://growingmindsscience.com").origin;
  const origin = request.headers.get("origin");
  if (!origin || origin !== configuredOrigin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const { lessonId } = await request.json() as { lessonId?: string };
  if (!lessonId) return NextResponse.json({ error: "Lesson required" }, { status: 400 });
  const service = createServiceClient();
  const { data: lesson } = await service.from("class_lessons")
    .select("id, title")
    .eq("id", lessonId)
    .eq("course_slug", "toddlerhood")
    .maybeSingle();
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  try {
    const result = await muxApi<{ data: { id: string; url: string } }>("/uploads", {
      method: "POST",
      body: JSON.stringify({
        cors_origin: configuredOrigin,
        new_asset_settings: {
          playback_policies: ["signed"],
          video_quality: "basic",
          max_resolution_tier: "1080p",
          passthrough: lesson.id,
          meta: { title: lesson.title, external_id: lesson.id },
        },
      }),
    });
    const { error } = await service.from("class_lessons")
      .update({ mux_upload_id: result.data.id, updated_at: new Date().toISOString() })
      .eq("id", lesson.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ url: result.data.url, uploadId: result.data.id }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Could not start upload" }, { status: 503 });
  }
}
