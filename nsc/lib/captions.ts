import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Corrected captions for class lessons.
 *
 * Mux's generated English captions have good timing but the transcriber's
 * wording (misheard names, split words, numbers merged into hyphenated ages).
 * The lesson's written version is the narration script, word for word. These
 * helpers keep Mux's cue timing and swap in the written version's words:
 * align the two word sequences, give every written word the cue its aligned
 * caption word sits in, then rebuild each cue's text.
 */

export interface Cue {
  start: number; // seconds
  end: number;
  text: string;
}

export function parseVtt(vtt: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = vtt.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n");
    const at = lines.findIndex((line) => line.includes("-->"));
    if (at < 0) continue;
    const [from, to] = lines[at].split("-->").map((part) => part.trim().split(/\s+/)[0]);
    const start = parseTime(from);
    const end = parseTime(to);
    if (start === null || end === null) continue;
    const text = lines.slice(at + 1).join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    cues.push({ start, end, text });
  }
  return cues;
}

function parseTime(value: string | undefined): number | null {
  const match = value?.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{3})$/);
  if (!match) return null;
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function formatTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
}

/** Comparison key for a word: lowercase letters and digits only. */
function key(word: string): string {
  return word.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]/g, "");
}

/** Index pairs (a in left, b in right) of a longest common subsequence of keys. */
function lcsPairs(left: string[], right: string[]): Array<[number, number]> {
  const n = left.length;
  const m = right.length;
  const width = m + 1;
  const table = new Uint16Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] = left[i] === right[j]
        ? table[(i + 1) * width + j + 1] + 1
        : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (left[i] === right[j]) { pairs.push([i, j]); i++; j++; }
    else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++;
    else j++;
  }
  return pairs;
}

export interface Realigned {
  cues: Cue[];
  /** Share of written-version words matched to a caption word. */
  matched: number;
  words: number;
}

/** Put `text`'s words into `cues`' timing. Cues left with no words are dropped. */
export function realignCues(cues: Cue[], text: string): Realigned {
  const captionWords: string[] = [];
  const captionCue: number[] = [];
  cues.forEach((cue, index) => {
    for (const word of cue.text.split(/\s+/)) {
      if (!key(word)) continue;
      captionWords.push(key(word));
      captionCue.push(index);
    }
  });
  const words = text.split(/\s+/).filter(Boolean);
  // Hyphenated words ("four-year-olds") are one written word but several caption words.
  const keyed: string[] = [];
  const owner: number[] = [];
  words.forEach((word, index) => {
    for (const part of word.split(/[-–—]/)) {
      if (!key(part)) continue;
      keyed.push(key(part));
      owner.push(index);
    }
  });
  const assigned: Array<number | null> = new Array(words.length).fill(null);
  let matchedParts = 0;
  for (const [a, b] of lcsPairs(keyed, captionWords)) {
    matchedParts++;
    if (assigned[owner[a]] === null) assigned[owner[a]] = captionCue[b];
  }
  // Unmatched words sit between two matched neighbours: the first half of a run
  // joins the cue before it, the second half the cue after it.
  let index = 0;
  while (index < words.length) {
    if (assigned[index] !== null) { index++; continue; }
    let stop = index;
    while (stop < words.length && assigned[stop] === null) stop++;
    const before = index > 0 ? assigned[index - 1] : null;
    const after = stop < words.length ? assigned[stop] : null;
    const run = stop - index;
    for (let k = 0; k < run; k++) {
      const useBefore = after === null || (before !== null && k < Math.ceil(run / 2));
      assigned[index + k] = useBefore ? before ?? 0 : after;
    }
    index = stop;
  }
  // Keep cues in order even if alignment ever crossed.
  for (let k = 1; k < assigned.length; k++) {
    if ((assigned[k] as number) < (assigned[k - 1] as number)) assigned[k] = assigned[k - 1];
  }
  const texts: string[][] = cues.map(() => []);
  words.forEach((word, k) => texts[assigned[k] as number].push(word));
  const out = cues
    .map((cue, k) => ({ start: cue.start, end: cue.end, text: texts[k].join(" ") }))
    .filter((cue) => cue.text.length > 0);
  return { cues: out, matched: keyed.length ? matchedParts / keyed.length : 0, words: words.length };
}

/** Wrap a cue onto at most two balanced lines. */
function wrap(text: string, max = 42): string {
  if (text.length <= max) return text;
  const words = text.split(" ");
  let best = text;
  let bestScore = Infinity;
  for (let k = 1; k < words.length; k++) {
    const first = words.slice(0, k).join(" ");
    const second = words.slice(k).join(" ");
    const score = Math.max(first.length, second.length);
    if (score < bestScore) { bestScore = score; best = `${first}\n${second}`; }
  }
  return best;
}

export function buildVtt(cues: Cue[]): string {
  return "WEBVTT\n\n" + cues
    .map((cue) => `${formatTime(cue.start)} --> ${formatTime(cue.end)}\n${wrap(cue.text)}`)
    .join("\n\n") + "\n";
}

/** Signature for the short-lived caption file URL Mux fetches. */
export function captionSignature(lessonId: string, expires: number, secret: string): string {
  return createHmac("sha256", secret).update(`caption:${lessonId}:${expires}`).digest("base64url");
}

export function verifyCaptionSignature(
  lessonId: string, expires: number, signature: string, secret: string, now = Date.now() / 1000,
): boolean {
  if (!secret || !Number.isFinite(expires) || expires < now) return false;
  const expected = Buffer.from(captionSignature(lessonId, expires, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
