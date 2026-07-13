/**
 * Optional narrated audio for the verbatim scripts. A math-anxious parent
 * can tap play and hear the exact wording before saying it to their child —
 * removing performance anxiety and protecting Give-N fidelity.
 *
 * Audio is a pre-generated, static enhancement, not certified content: clips
 * are voiced offline (ElevenLabs, voice below), named by a deterministic id
 * of their exact text, committed under public/audio, and listed in
 * audio.manifest. The runtime computes the same id for a line it's about to
 * show; if a clip exists it renders a play button, otherwise nothing. Lines
 * containing a child's name are not voiced (the audio can't say the name), so
 * they simply have no button — a clean degrade, not an error.
 */

export const AUDIO_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah — reassuring
export const AUDIO_MODEL_ID = "eleven_multilingual_v2";
/** Fixed object word for the Give-N script (matches the runtime `objects`). */
export const AUDIO_OBJECTS = "blocks";

// Salt binds the id to voice+model so a voice change invalidates old clips.
const SALT = `${AUDIO_VOICE_ID}:${AUDIO_MODEL_ID}:v1`;

function fnv1a(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 16-hex deterministic id for a clip of exactly this text (two FNV passes). */
export function audioClipId(text: string): string {
  const s = `${SALT}|${text}`;
  const a = fnv1a(s, 0x811c9dc5);
  const b = fnv1a(s + "|b", 0x811c9dc5 ^ 0x9e3779b9);
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

/**
 * The exact string that gets voiced for a raw copy line, or null if it can't
 * be (a residual placeholder like {name} remains). The runtime must render
 * the same substituted string for the id to match.
 */
export function voiceableText(rawLine: string): string | null {
  const s = rawLine.replaceAll("{objects}", AUDIO_OBJECTS);
  return s.includes("{") ? null : s;
}

export function audioClipPath(id: string): string {
  // basePath (/nsc) must be explicit — the runtime plays these via the raw
  // `new Audio()` browser API, which doesn't get Next's basePath prefix.
  return `/nsc/audio/${id}.mp3`;
}
