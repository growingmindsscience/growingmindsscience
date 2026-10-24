import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isAudioClipId } from "@/lib/audio";

/**
 * The gate in front of the paid game narration (/api/audio/[id]). Check-in
 * clips are free and static under public/audio; a game clip is served only
 * to an account that can play that game: Tallykin full access (a
 * purchase, a redeemed Tallykin gift, or membership), or, on the free
 * tier, the one free game on each of its children's plans this week.
 *
 * Kept free of Next and Supabase so the allow/deny decisions are unit-tested
 * with fakes; the route handler wires the live dependencies. Only the route
 * imports this module, so only its bundle carries the clips (next.config).
 */
export interface GameClipDeps {
  /** The signed-in user's id, or null when signed out. */
  userId(): Promise<string | null>;
  /** Every game clip id in the audio manifest. */
  gameIds(): Promise<readonly string[]>;
  /** Tallykin full access. */
  fullAccess(): Promise<boolean>;
  /** Clip ids of the free game(s) on this account's plans this week. */
  freeClipIds(userId: string): Promise<readonly string[]>;
  /** The clip's bytes, or null if the file is missing. */
  readClip(id: string): Promise<Uint8Array | null>;
}

/** The bytes of one game clip from private/audio, or null when there is no such clip. */
export async function readGameClip(id: string): Promise<Uint8Array | null> {
  // The id becomes a file name, so it must be exactly a clip id: no dots, no
  // slashes, nothing that could reach outside the folder.
  if (!isAudioClipId(id)) return null;
  try {
    return await readFile(join(process.cwd(), "private", "audio", `${id}.mp3`));
  } catch {
    return null;
  }
}

const json = (error: string, status: number) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });

export async function gameClipResponse(
  request: Request,
  id: string,
  deps: GameClipDeps,
): Promise<Response> {
  // Shape first: the id names a file, so nothing else reaches the disk.
  if (!isAudioClipId(id) || !(await deps.gameIds()).includes(id)) {
    return json("Not found", 404);
  }
  const userId = await deps.userId();
  if (!userId) return json("Sign in required", 401);
  const allowed = (await deps.fullAccess()) || (await deps.freeClipIds(userId)).includes(id);
  if (!allowed) return json("Tallykin purchase required", 403);

  const bytes = await deps.readClip(id);
  if (!bytes) return json("Not found", 404);
  return clipResponse(bytes, request.headers.get("range"));
}

/**
 * The mp3, honoring a single byte range. Safari (iPhone especially) asks
 * for ranges before it will play an audio element, and won't play a clip
 * whose server ignores them.
 */
export function clipResponse(bytes: Uint8Array, range: string | null): Response {
  const size = bytes.byteLength;
  const headers: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    // Paid content: the browser may keep it, a shared cache must not.
    "Cache-Control": "private, max-age=3600",
  };
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (!match || (!match[1] && !match[2])) {
    // No range, or a form we don't serve (several ranges): the whole clip.
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: { ...headers, "Content-Length": String(size) },
    });
  }
  let start: number;
  let end: number;
  if (!match[1]) {
    // "bytes=-500": the last 500 bytes.
    start = Math.max(size - Number(match[2]), 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (start >= size || start > end) {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }
  return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
    },
  });
}
