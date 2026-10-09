import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { muxApi, signedPlaybackToken } from "@/lib/mux.server";
import { buildVtt, captionSignature, parseVtt, realignCues } from "@/lib/captions";

interface MuxTrack {
  id: string;
  type: string;
  text_type?: string;
  text_source?: string;
  status?: string;
  language_code?: string;
  name?: string;
}
interface MuxAsset { data: { id: string; tracks?: MuxTrack[] } }

const CORRECTED_NAME = "English";

/**
 * Replaces a lesson's generated English captions with its written version,
 * keeping Mux's cue timing (see lib/captions.ts).
 *
 * - "preview": build the corrected captions and report how well they aligned.
 * - "replace": store them and add them to the Mux asset as an uploaded track.
 * - "finish":  once the uploaded track is ready, delete the generated track(s).
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!isClassAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const configuredOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://growingmindsscience.com").origin;
  if (request.headers.get("origin") !== configuredOrigin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const { lessonId, action } = await request.json() as { lessonId?: string; action?: string };
  if (!lessonId || !["preview", "replace", "finish"].includes(action ?? "")) {
    return NextResponse.json({ error: "Lesson and action required" }, { status: 400 });
  }
  const service = createServiceClient();
  const { data: lesson } = await service.from("class_lessons")
    .select("id, mux_asset_id, mux_playback_id, duration_seconds, transcript, status")
    .eq("id", lessonId)
    .in("course_slug", ["toddlerhood", "infant", "preschool"])
    .maybeSingle();
  if (!lesson?.mux_asset_id || !lesson.mux_playback_id) {
    return NextResponse.json({ error: "No ready video" }, { status: 404 });
  }
  if (!lesson.transcript?.trim()) {
    return NextResponse.json({ error: "No written version to caption from" }, { status: 409 });
  }
  try {
    const asset = await muxApi<MuxAsset>(`/assets/${encodeURIComponent(lesson.mux_asset_id)}`);
    const tracks = (asset.data.tracks ?? []).filter((track) => track.type === "text");
    const generated = tracks.filter((track) => track.text_source?.startsWith("generated"));
    const uploaded = tracks.filter((track) => !track.text_source?.startsWith("generated") && track.name === CORRECTED_NAME);
    const summary = tracks.map((track) => ({ name: track.name, source: track.text_source, status: track.status }));

    if (action === "finish") {
      const ready = uploaded.find((track) => track.status === "ready");
      if (!ready) return NextResponse.json({ status: "waiting", tracks: summary });
      for (const track of generated) {
        await muxApi(`/assets/${encodeURIComponent(asset.data.id)}/tracks/${encodeURIComponent(track.id)}`, { method: "DELETE" });
      }
      return NextResponse.json({ status: "done", removed: generated.length });
    }

    const source = generated.find((track) => track.status === "ready" && track.language_code?.startsWith("en"));
    if (!source) return NextResponse.json({ error: "No ready generated English captions to take timing from", tracks: summary }, { status: 409 });
    const { token } = signedPlaybackToken(lesson.mux_playback_id, lesson.duration_seconds ?? 0);
    const response = await fetch(
      `https://stream.mux.com/${encodeURIComponent(lesson.mux_playback_id)}/text/${encodeURIComponent(source.id)}.vtt?token=${encodeURIComponent(token)}`,
      { headers: { Referer: configuredOrigin }, cache: "no-store" },
    );
    if (!response.ok) throw new Error(`Caption download returned ${response.status}`);
    const cues = parseVtt(await response.text());
    const realigned = realignCues(cues, lesson.transcript);
    const vtt = buildVtt(realigned.cues);
    const report = {
      cuesBefore: cues.length,
      cuesAfter: realigned.cues.length,
      words: realigned.words,
      matched: Math.round(realigned.matched * 1000) / 1000,
      sample: realigned.cues.slice(0, 3).map((cue) => cue.text),
      tracks: summary,
    };
    if (action === "preview") return NextResponse.json(report);

    if (realigned.matched < 0.9) {
      return NextResponse.json({ error: "Written version and captions differ too much to align", ...report }, { status: 409 });
    }
    if (uploaded.length) {
      return NextResponse.json({ error: "Corrected captions already added; run finish", ...report }, { status: 409 });
    }
    const secret = process.env.MUX_TOKEN_SECRET ?? "";
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const { error } = await service.from("class_lessons")
      .update({ caption_vtt: vtt, updated_at: new Date().toISOString() })
      .eq("id", lesson.id);
    if (error) throw new Error(error.message);
    const url = `${configuredOrigin}/nsc/api/classes/captions/${lesson.id}?exp=${expires}&sig=${captionSignature(lesson.id, expires, secret)}`;
    await muxApi(`/assets/${encodeURIComponent(asset.data.id)}/tracks`, {
      method: "POST",
      body: JSON.stringify({
        url,
        type: "text",
        text_type: "subtitles",
        language_code: "en",
        name: CORRECTED_NAME,
        closed_captions: false,
        passthrough: "corrected from the written version",
      }),
    });
    return NextResponse.json({ status: "added", ...report });
  } catch (cause) {
    return NextResponse.json({ error: (cause as Error).message }, { status: 503 });
  }
}
