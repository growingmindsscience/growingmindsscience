import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCaptionSignature } from "@/lib/captions";

/**
 * The corrected caption file for one lesson, fetched by Mux while it ingests
 * the uploaded track. Only a URL signed by the admin captions action, valid
 * for an hour, can read it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("exp"));
  const signature = url.searchParams.get("sig") ?? "";
  if (!verifyCaptionSignature(id, expires, signature, process.env.MUX_TOKEN_SECRET ?? "")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { data } = await createServiceClient().from("class_lessons")
    .select("caption_vtt")
    .eq("id", id)
    .maybeSingle();
  if (!data?.caption_vtt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new Response(data.caption_vtt, {
    headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
