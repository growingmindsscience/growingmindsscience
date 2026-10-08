import { describe, expect, it } from "vitest";
import { buildVtt, captionSignature, parseVtt, realignCues, verifyCaptionSignature } from "@/lib/captions";

const VTT = `WEBVTT

00:00:00.000 --> 00:00:02.500
Welcome to the preschool year's class.

00:00:02.500 --> 00:00:05.000
In a study of 554-year-olds, they pushed

00:00:05.000 --> 00:00:08.250
the breaks on cray ons.
`;

describe("captions", () => {
  it("parses cues", () => {
    const cues = parseVtt(VTT);
    expect(cues).toHaveLength(3);
    expect(cues[2]).toEqual({ start: 5, end: 8.25, text: "the breaks on cray ons." });
  });

  it("puts the written words into the caption timing", () => {
    const text = "Welcome to the Preschool Years class.\n\nIn a study of 550 four-year-olds, they pushed the brakes on crayons.";
    const { cues, matched } = realignCues(parseVtt(VTT), text);
    expect(cues.map((cue) => cue.text)).toEqual([
      "Welcome to the Preschool Years class.",
      "In a study of 550 four-year-olds, they pushed",
      "the brakes on crayons.",
    ]);
    expect(cues.map((cue) => cue.start)).toEqual([0, 2.5, 5]);
    expect(matched).toBeGreaterThan(0.6);
  });

  it("keeps every written word, in order", () => {
    const text = "Welcome to the Preschool Years class. In a study of 550 four-year-olds, they pushed the brakes on crayons. Extra closing words.";
    const { cues } = realignCues(parseVtt(VTT), text);
    expect(cues.map((cue) => cue.text).join(" ")).toBe(text);
  });

  it("writes valid WebVTT with two-line wrapping", () => {
    const vtt = buildVtt([{ start: 61.5, end: 64, text: "A long caption line that needs to wrap onto two lines to fit." }]);
    expect(vtt).toBe("WEBVTT\n\n00:01:01.500 --> 00:01:04.000\nA long caption line that needs\nto wrap onto two lines to fit.\n");
    expect(parseVtt(vtt)[0].text).toBe("A long caption line that needs to wrap onto two lines to fit.");
  });

  it("signs caption URLs for one lesson and an expiry", () => {
    const sig = captionSignature("lesson-1", 2000, "secret");
    expect(verifyCaptionSignature("lesson-1", 2000, sig, "secret", 1000)).toBe(true);
    expect(verifyCaptionSignature("lesson-2", 2000, sig, "secret", 1000)).toBe(false);
    expect(verifyCaptionSignature("lesson-1", 2000, sig, "secret", 3000)).toBe(false);
    expect(verifyCaptionSignature("lesson-1", 2000, sig, "", 1000)).toBe(false);
  });
});
