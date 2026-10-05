import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { muxApi, signedPlaybackToken } from "@/lib/mux.server";

interface MuxUpload { data: { status: string; asset_id?: string } }
interface MuxAsset { data: {
  id: string;
  status: string;
  duration?: number;
  playback_ids?: { id: string; policy: string }[];
  tracks?: { id: string; type: string; text_type?: string; status?: string; language_code?: string }[];
} }

export async function POST(request: Request) {
  const user = await getUser();
  if (!isClassAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const configuredOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://growingmindsscience.com").origin;
  if (request.headers.get("origin") !== configuredOrigin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const { lessonId } = await request.json() as { lessonId?: string };
  if (!lessonId) return NextResponse.json({ error: "Lesson required" }, { status: 400 });
  const service = createServiceClient();
  const { data: lesson } = await service.from("class_lessons")
    .select("id, mux_upload_id, mux_asset_id, status, transcript")
    .eq("id", lessonId)
    .in("course_slug", ["toddlerhood", "infant", "preschool"])
    .maybeSingle();
  if (!lesson?.mux_upload_id) return NextResponse.json({ error: "No upload started" }, { status: 404 });
  try {
    const upload = await muxApi<MuxUpload>(`/uploads/${encodeURIComponent(lesson.mux_upload_id)}`);
    if (!upload.data.asset_id) return NextResponse.json({ status: upload.data.status });
    const asset = await muxApi<MuxAsset>(`/assets/${encodeURIComponent(upload.data.asset_id)}`);
    if (asset.data.status !== "ready") {
      return NextResponse.json({ status: asset.data.status });
    }
    const playbackIds = asset.data.playback_ids ?? [];
    if (playbackIds.some((item) => item.policy === "public")) {
      throw new Error("Public playback ID found; refusing to publish");
    }
    const playbackId = playbackIds.find((item) => item.policy === "signed")?.id;
    if (!playbackId) throw new Error("Signed playback ID missing");
    if (lesson.status === "published" && lesson.mux_asset_id !== asset.data.id) {
      return NextResponse.json({ error: "Unpublish this lesson before replacing its video." }, { status: 409 });
    }

    // Generate captions once, then let the admin review them before publishing.
    const textTracks = asset.data.tracks?.filter((track) => track.type === "text" && track.text_type === "subtitles") ?? [];
    if (!textTracks.length) {
      const audio = asset.data.tracks?.find((track) => track.type === "audio");
      if (audio) {
        await muxApi(`/assets/${encodeURIComponent(asset.data.id)}/tracks/${encodeURIComponent(audio.id)}/generate-subtitles`, {
          method: "POST",
          body: JSON.stringify({ generated_subtitles: [{ language_code: "en", name: "English CC" }] }),
        });
      }
    }
    const replacing = lesson.mux_asset_id !== asset.data.id;
    let transcript = replacing ? "" : lesson.transcript;
    const readyCaption = textTracks.find((track) => track.status === "ready" && track.language_code?.startsWith("en"));
    if (!transcript && readyCaption) {
      try {
        const { token } = signedPlaybackToken(playbackId, Math.ceil(asset.data.duration ?? 0));
        const textResponse = await fetch(
          `https://stream.mux.com/${encodeURIComponent(playbackId)}/text/${encodeURIComponent(readyCaption.id)}.txt?token=${encodeURIComponent(token)}`,
          { headers: { Referer: configuredOrigin }, cache: "no-store" },
        );
        if (textResponse.ok) transcript = (await textResponse.text()).slice(0, 100_000).trim();
      } catch { /* Admin may paste the written lesson manually. */ }
    }
    const { error } = await service.from("class_lessons")
      .update({
        mux_asset_id: asset.data.id,
        mux_playback_id: playbackId,
        duration_seconds: Math.ceil(asset.data.duration ?? 0),
        ...(replacing ? { captions_ready: false } : {}),
        transcript,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lesson.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({
      status: "ready",
      captions: textTracks.map((track) => ({ status: track.status, language: track.language_code })),
      transcriptImported: Boolean(transcript),
    });
  } catch (cause) {
    return NextResponse.json({ error: (cause as Error).message }, { status: 503 });
  }
}
