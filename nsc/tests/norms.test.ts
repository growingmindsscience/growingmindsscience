import { describe, expect, it } from "vitest";
import {
  formatAge,
  friendlyAgeLabel,
  standingForAge,
  standingSummary,
  typicalRangeForMonths,
} from "../lib/norms";
import type { Placement } from "../lib/titration";

const RANK: Record<Placement, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  CP: 5,
};
const PLACEMENTS: Placement[] = ["L0", "L1", "L2", "L3", "L4", "CP"];
const MONTHS = Array.from({ length: 61 }, (_, i) => i + 24); // 24..84

describe("typicalRangeForMonths", () => {
  it("returns a valid range (low ≤ high) for every age", () => {
    for (const m of MONTHS) {
      const r = typicalRangeForMonths(m);
      expect(RANK[r.low]).toBeLessThanOrEqual(RANK[r.high]);
    }
  });

  it("is monotone: getting older never lowers the range's floor or ceiling", () => {
    for (let i = 1; i < MONTHS.length; i++) {
      const prev = typicalRangeForMonths(MONTHS[i - 1]);
      const cur = typicalRangeForMonths(MONTHS[i]);
      expect(RANK[cur.low]).toBeGreaterThanOrEqual(RANK[prev.low]);
      expect(RANK[cur.high]).toBeGreaterThanOrEqual(RANK[prev.high]);
    }
  });

  it("anchors to the literature at the ends", () => {
    // Just past two: pre-/one-knowers are typical; CP is not yet expected.
    expect(typicalRangeForMonths(25)).toEqual({ low: "L0", high: "L1" });
    // By four and a half+: CP is the ceiling and the floor is high.
    const r = typicalRangeForMonths(56);
    expect(r.high).toBe("CP");
    expect(RANK[r.low]).toBeGreaterThanOrEqual(RANK.L4);
  });

  it("clamps ages below the assessment floor to the first band", () => {
    expect(typicalRangeForMonths(20)).toEqual(typicalRangeForMonths(24));
  });
});

describe("standingForAge", () => {
  it("agrees with the range for every (age, placement) pair", () => {
    for (const m of MONTHS) {
      const range = typicalRangeForMonths(m);
      for (const p of PLACEMENTS) {
        const s = standingForAge(m, p);
        if (RANK[p] < RANK[range.low]) expect(s).toBe("earlier");
        else if (RANK[p] > RANK[range.high]) expect(s).toBe("ahead");
        else expect(s).toBe("typical");
      }
    }
  });

  it("spot checks: CP at 2 is ahead, L0 at 4 is earlier, L1 at 26m is typical", () => {
    expect(standingForAge(25, "CP")).toBe("ahead");
    expect(standingForAge(50, "L0")).toBe("earlier");
    expect(standingForAge(26, "L1")).toBe("typical");
  });
});

describe("standingSummary copy", () => {
  it("never uses deficit language, for any age × placement × confidence", () => {
    const banned = /behind|delay|deficit|struggl|falling|worry|red flag/i;
    for (const m of MONTHS) {
      for (const p of PLACEMENTS) {
        for (const confidence of ["high", "medium", "low", null] as const) {
          const s = standingSummary({
            months: m,
            placement: p,
            name: "Kai",
            confidence,
          });
          expect(s.headline).not.toMatch(banned);
          expect(s.detail).not.toMatch(banned);
          expect(s.caveat ?? "").not.toMatch(banned);
        }
      }
    }
  });

  it("leads with the child and names the range in the detail", () => {
    const s = standingSummary({ months: 38, placement: "L2", name: "Kai" });
    expect(s.headline.startsWith("Kai")).toBe(true);
    expect(s.detail).toContain(s.rangeLabel);
  });

  it("adds the hold-it-loosely caveat only on low confidence", () => {
    const low = standingSummary({
      months: 38,
      placement: "L2",
      name: "Kai",
      confidence: "low",
    });
    const high = standingSummary({
      months: 38,
      placement: "L2",
      name: "Kai",
      confidence: "high",
    });
    expect(low.caveat).toBeTruthy();
    expect(high.caveat).toBeNull();
  });

  it("earlier-side copy always pairs the range with the plan", () => {
    const s = standingSummary({ months: 50, placement: "L0", name: "Kai" });
    expect(s.standing).toBe("earlier");
    expect(s.detail).toMatch(/games/i);
  });
});

describe("age labels", () => {
  it("friendlyAgeLabel floors to the half year — never overstates age", () => {
    expect(friendlyAgeLabel(24)).toBe("2");
    expect(friendlyAgeLabel(27)).toBe("2");
    expect(friendlyAgeLabel(30)).toBe("2½");
    expect(friendlyAgeLabel(36)).toBe("3");
    expect(friendlyAgeLabel(45)).toBe("3½");
    expect(friendlyAgeLabel(48)).toBe("4");
  });

  it("formatAge builds a compact chip", () => {
    expect(formatAge(11)).toBe("11 mo");
    expect(formatAge(24)).toBe("2 yr");
    expect(formatAge(28)).toBe("2 yr 4 mo");
  });
});
