import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The set of clip ids that have a generated mp3, from the committed manifest.
 * Passed to client components so an AudioButton renders only when its line
 * actually has audio. Returns [] if the manifest is absent (audio optional).
 */
export async function getAudioIds(): Promise<string[]> {
  try {
    const raw = await readFile(
      join(process.cwd(), "content", "audio.manifest.v1.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { ids?: string[] };
    return parsed.ids ?? [];
  } catch {
    return [];
  }
}
