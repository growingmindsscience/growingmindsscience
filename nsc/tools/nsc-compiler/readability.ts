/**
 * Flesch-Kincaid grade-level check — spec §7.1(3): artifact copy ≤ grade 8.
 *
 * Method note (mechanical, documented): FK is unstable on isolated short
 * fragments, so the check pools every string of ≥4 words in an artifact into
 * one text and grades the pool. Placeholders ({name}, {N}, {objects}) are
 * replaced with plain words before scoring.
 */

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;
  const stripped = w
    .replace(/(?:[^laeiouy]es|[^laeiouy]e|ed)$/, "")
    .replace(/^y/, "");
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export interface ReadabilityResult {
  grade: number;
  words: number;
  sentences: number;
  syllables: number;
  pooledStrings: number;
}

export function fleschKincaidGrade(texts: string[]): ReadabilityResult {
  const pooled = texts
    .filter((t) => t.trim().split(/\s+/).length >= 4)
    .map((t) =>
      t
        .replaceAll("{name}", "Sam")
        .replaceAll("{N}", "two")
        .replaceAll("{objects}", "blocks"),
    );

  const text = pooled.join(" ");
  const words = text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  const sentences = Math.max(
    1,
    (text.match(/[.!?]+(?:\s|$)/g) ?? []).length,
  );
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const wordCount = Math.max(1, words.length);
  const grade =
    0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;

  return {
    grade: Math.round(grade * 100) / 100,
    words: wordCount,
    sentences,
    syllables,
    pooledStrings: pooled.length,
  };
}
