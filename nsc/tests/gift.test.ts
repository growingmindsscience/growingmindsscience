import { describe, expect, it } from "vitest";
import { makeGiftCode, normalizeGiftCode } from "../lib/gift";

describe("gift codes", () => {
  it("formats as NP-XXXX-XXXX from an unambiguous alphabet", () => {
    let seed = 0.123;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const code = makeGiftCode(rand);
    expect(code).toMatch(/^NP-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    // No ambiguous characters.
    expect(code).not.toMatch(/[01OI]/);
  });

  it("is deterministic for a given rng and varies across draws", () => {
    const rng = (seq: number[]) => {
      let i = 0;
      return () => seq[i++ % seq.length];
    };
    expect(makeGiftCode(rng([0.1]))).toBe(makeGiftCode(rng([0.1])));
    expect(makeGiftCode(rng([0.1]))).not.toBe(makeGiftCode(rng([0.9])));
  });

  it("normalizes user input: spacing, case, prefix", () => {
    expect(normalizeGiftCode("np-7q4k-2m8p")).toBe("NP-7Q4K-2M8P");
    expect(normalizeGiftCode("  NP-7Q4K-2M8P  ")).toBe("NP-7Q4K-2M8P");
    expect(normalizeGiftCode("7Q4K-2M8P")).toBe("NP-7Q4K-2M8P");
    expect(normalizeGiftCode("")).toBe("");
  });
});
