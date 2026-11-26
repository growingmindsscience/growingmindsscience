// The written lesson (seeded from each lesson's narration script) is the source of truth.
// Mux's auto-transcript only fills a lesson that has no written text yet; it never
// replaces existing text, including when a lesson's video is swapped for a new one.
export function shouldImportGeneratedTranscript(written: string | null | undefined): boolean {
  return !written?.trim();
}

export function lessonTranscriptAfterSync(
  written: string | null | undefined,
  generated: string | null | undefined,
): string {
  if (!shouldImportGeneratedTranscript(written)) return written as string;
  return (generated ?? "").slice(0, 100_000).trim();
}
