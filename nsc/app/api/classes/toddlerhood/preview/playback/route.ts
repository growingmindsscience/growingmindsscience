import { freePreviewPlayback } from "@/lib/class-preview-playback";

// It takes no request input, so without this Next could prerender it at
// build time and serve one token, expired within the hour, to everyone.
export const dynamic = "force-dynamic";

/** Playback for the toddler class's free lesson, open to anyone; see lib/class-preview-playback.ts. */
export async function GET() {
  return freePreviewPlayback("toddlerhood");
}
