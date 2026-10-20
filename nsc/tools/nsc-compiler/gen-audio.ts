/**
 * Offline audio generator. Voices every placeholder-free line of the
 * certified scripts (assessment copy + game scripts) with the chosen
 * ElevenLabs voice, writes one mp3 per line named by its deterministic clip
 * id, and emits content/audio.manifest.v1.json.
 *
 * Check-in lines are free and go to public/audio/ (served as static files).
 * Game lines are paid narration and go to private/audio/, which only the
 * /api/audio/[id] route reads, after checking the account can play the game.
 * A line in both scripts is written to both folders.
 *
 * Build-time only. The key is read from the local env (never Vercel, never
 * committed); the runtime serves the mp3s and never calls ElevenLabs.
 * Idempotent — existing clips are skipped, so a copy change regenerates only
 * the lines that changed (and with nothing missing, no key is needed: the
 * run just rewrites the manifest).
 *
 *   set -a && . ./.env.local && set +a
 *   npx tsx tools/nsc-compiler/gen-audio.ts
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUDIO_MODEL_ID,
  AUDIO_VOICE_ID,
  audioClipId,
  voiceableText,
} from "../../lib/audio";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publicDir = join(root, "public", "audio");
const privateDir = join(root, "private", "audio");
mkdirSync(publicDir, { recursive: true });
mkdirSync(privateDir, { recursive: true });

const key = process.env.ELEVENLABS_API_KEY;

// Collect every voiceable line from the certified scripts, by audience.
const copy = JSON.parse(
  readFileSync(join(root, "content/assessment.copy.v1.json"), "utf8"),
);
const games = JSON.parse(
  readFileSync(join(root, "content/games.catalog.v1.json"), "utf8"),
);

const checkinTexts = new Set<string>();
for (const state of Object.values(copy.states) as { lines: string[] }[]) {
  for (const line of state.lines ?? []) {
    const t = voiceableText(line);
    if (t) checkinTexts.add(t);
  }
}
const gameTexts = new Set<string>();
for (const g of games.games as { script: string[] }[]) {
  for (const line of g.script ?? []) {
    const t = voiceableText(line);
    if (t) gameTexts.add(t);
  }
}

const targets = [
  ...[...checkinTexts].sort().map((text) => ({ text, dir: publicDir, other: privateDir })),
  ...[...gameTexts].sort().map((text) => ({ text, dir: privateDir, other: publicDir })),
];
console.log(`${checkinTexts.size} check-in lines, ${gameTexts.size} game lines`);

async function synth(text: string): Promise<Buffer> {
  if (!key) {
    console.error("ELEVENLABS_API_KEY not set — `set -a && . ./.env.local && set +a` first.");
    process.exit(1);
  }
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
  for (const { text, dir, other } of targets) {
    const id = audioClipId(text);
    const file = join(dir, `${id}.mp3`);
    if (existsSync(file)) {
      skipped++;
      continue;
    }
    // A line shared by both scripts is voiced once and copied across.
    const twin = join(other, `${id}.mp3`);
    if (existsSync(twin)) {
      copyFileSync(twin, file);
      skipped++;
      continue;
    }
    const buf = await synth(text);
    writeFileSync(file, buf);
    made++;
    if (made % 25 === 0) console.log(`  ${made} generated…`);
    await new Promise((r) => setTimeout(r, 120)); // gentle pacing
  }

  const checkin = [...checkinTexts].map(audioClipId).sort();
  const gameIds = [...gameTexts].map(audioClipId).sort();
  writeFileSync(
    join(root, "content/audio.manifest.v1.json"),
    JSON.stringify(
      {
        voice: AUDIO_VOICE_ID,
        model: AUDIO_MODEL_ID,
        count: new Set([...checkin, ...gameIds]).size,
        checkin,
        games: gameIds,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`done: ${made} new, ${skipped} cached, ${checkin.length} check-in + ${gameIds.length} game clips in manifest`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
