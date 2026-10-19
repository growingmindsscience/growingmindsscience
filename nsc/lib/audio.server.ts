import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface AudioManifest {
  /** Check-in clips, served publicly from public/audio. */
  checkin: string[];
  /** Game clips, served from private/audio by /api/audio/[id]. */
  games: string[];
}

/**
 * The clip ids that have a generated mp3, from the committed manifest. Pages
 * pass client components only the ids they may play, so an AudioButton
 * renders only when its line actually has audio. Returns empty lists if the
 * manifest is absent (audio optional).
 */
export async function getAudioManifest(): Promise<AudioManifest> {
  try {
    const raw = await readFile(
      join(process.cwd(), "content", "audio.manifest.v1.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as Partial<AudioManifest>;
    return { checkin: parsed.checkin ?? [], games: parsed.games ?? [] };
  } catch {
    return { checkin: [], games: [] };
  }
}
