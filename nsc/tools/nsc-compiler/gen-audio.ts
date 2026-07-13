/**
 * Offline audio generator. Voices every placeholder-free line of the
 * certified scripts (assessment copy + game scripts) with the chosen
 * ElevenLabs voice, writes one mp3 per line under public/audio/ named by its
 * deterministic clip id, and emits content/audio.manifest.v1.json.
 *
 * Build-time only. The key is read from the local env (never Vercel, never
 * committed); the runtime serves the static mp3s and never calls ElevenLabs.
 * Idempotent — existing clips are skipped, so a copy change regenerates only
 * the lines that changed.
 *
 *   set -a && . ./.env.local && set +a
 *   npx tsx tools/nsc-compiler/gen-audio.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUDIO_MODEL_ID,
  AUDIO_VOICE_ID,
  audioClipId,
  voiceableText,
} from "../../lib/audio";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const audioDir = join(root, "public", "audio");
mkdirSync(audioDir, { recursive: true });

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY not set — `set -a && . ./.env.local && set +a` first.");
  process.exit(1);
}

// Collect every voiceable line from the certified scripts.
const copy = JSON.parse(
  readFileSync(join(root, "content/assessment.copy.v1.json"), "utf8"),
);
const games = JSON.parse(
  readFileSync(join(root, "content/games.catalog.v1.json"), "utf8"),
);

const texts = new Set<string>();
for (const state of Object.values(copy.states) as { lines: string[] }[]) {
  for (const line of state.lines ?? []) {
    const t = voiceableText(line);
    if (t) texts.add(t);
  }
}
for (const g of games.games as { script: string[] }[]) {
  for (const line of g.script ?? []) {
    const t = voiceableText(line);
    if (t) texts.add(t);
  }
}

const lines = [...texts].sort();
console.log(`${lines.length} voiceable lines`);

async function synth(text: string): Promise<Buffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${AUDIO_VOICE_ID}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key!,
        "content-type": "application/json",
      },
      body: JSON.stringify({ text, model_id: AUDIO_MODEL_ID }),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  let made = 0;
  let skipped = 0;
  const ids: string[] = [];
  for (const text of lines) {
    const id = audioClipId(text);
    ids.push(id);
    const file = join(audioDir, `${id}.mp3`);
    if (existsSync(file)) {
      skipped++;
      continue;
    }
    const buf = await synth(text);
    writeFileSync(file, buf);
    made++;
    if (made % 25 === 0) console.log(`  ${made} generated…`);
    await new Promise((r) => setTimeout(r, 120)); // gentle pacing
  }

  writeFileSync(
    join(root, "content/audio.manifest.v1.json"),
    JSON.stringify(
      { voice: AUDIO_VOICE_ID, model: AUDIO_MODEL_ID, count: ids.length, ids: ids.sort() },
      null,
      2,
    ) + "\n",
  );

  console.log(`done: ${made} new, ${skipped} cached, ${ids.length} in manifest`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
