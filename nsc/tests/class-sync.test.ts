import { describe, expect, it } from "vitest";
import { lessonTranscriptAfterSync, shouldImportGeneratedTranscript } from "@/lib/class-sync";

const written = "Welcome to the Toddler Years class.\n\nToday we look at how a toddler joins your attention.";
const muxText = "welcome to the toddler years class today we look at how a toddler joins your attention";

describe("lesson text on video sync", () => {
  it("keeps the written lesson when a video is replaced", () => {
    expect(shouldImportGeneratedTranscript(written)).toBe(false);
    expect(lessonTranscriptAfterSync(written, muxText)).toBe(written);
  });

  it("keeps the written lesson even if Mux has no transcript yet", () => {
    expect(lessonTranscriptAfterSync(written, "")).toBe(written);
  });

  it("fills an empty lesson from the Mux transcript", () => {
    expect(shouldImportGeneratedTranscript("")).toBe(true);
    expect(shouldImportGeneratedTranscript("   \n")).toBe(true);
    expect(shouldImportGeneratedTranscript(null)).toBe(true);
    expect(lessonTranscriptAfterSync("", `  ${muxText}\n`)).toBe(muxText);
  });

  it("caps an imported transcript at 100,000 characters", () => {
    expect(lessonTranscriptAfterSync(null, "a".repeat(120_000))).toHaveLength(100_000);
  });
});
