import { getUser } from "@/lib/auth";
import { getAudioManifest } from "@/lib/audio.server";
import { hasFullAccess } from "@/lib/entitlements.server";
import { gameClipResponse, readGameClip } from "@/lib/game-audio";
import { freeGameClipIds } from "@/lib/plan.server";
import { getTimeZone } from "@/lib/tz.server";

/**
 * One narrated game line, for an account that can play that game (see
 * lib/game-audio). Not in the middleware's public list, so a signed-out
 * request is sent to sign in before it reaches here.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return gameClipResponse(request, id, {
    userId: async () => (await getUser())?.id ?? null,
    gameIds: async () => (await getAudioManifest()).games,
    fullAccess: hasFullAccess,
    freeClipIds: async (userId) => freeGameClipIds(userId, new Date(), await getTimeZone()),
    readClip: readGameClip,
  });
}
