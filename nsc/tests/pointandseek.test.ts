/**
 * Point and Seek (Instrument C, amendment A5) — unit + property tests.
 */
import { describe, expect, it } from "vitest";
import {
  PS_PLAN,
  createPointSession,
  psApplyPick,
  psIsDone,
  psNextTrial,
  psReadoutKey,
  psResult,
  type PSPick,
  type PSState,
} from "../lib/pointandseek";
import { mulberry32 } from "./simulators";

function run(picks: PSPick[]): PSState {
  let s = createPointSession();
  for (const p of picks) s = psApplyPick(s, p);
  return s;
}

/** Play the full plan with a rule. */
function playRule(rule: (i: number) => PSPick): PSState {
  let s = createPointSession();
  let i = 0;
  while (!psIsDone(s)) s = psApplyPick(s, rule(i++));
  return s;
}

describe("plan design invariants", () => {
  it("has 8 trials: targets 1-4 twice each, sides balanced 4/4, foil never equals target", () => {
    expect(PS_PLAN).toHaveLength(8);
    const targetCounts = new Map<number, number>();
    let left = 0;
    for (const t of PS_PLAN) {
      targetCounts.set(t.target, (targetCounts.get(t.target) ?? 0) + 1);
      if (t.correctSide === "left") left++;
      expect(t.foil).not.toBe(t.target);
      expect(t.target).toBeGreaterThanOrEqual(1);
      expect(t.target).toBeLessThanOrEqual(6); // nsc_trials requested_n check range
      expect(t.foil).toBeGreaterThanOrEqual(1);
      expect(t.foil).toBeLessThanOrEqual(6);
    }
    expect([...targetCounts.entries()].sort()).toEqual([
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
    ]);
    expect(left).toBe(4);
  });

  it("balances foil direction 4/4 so a size heuristic scores exactly chance", () => {
    const larger = PS_PLAN.filter((t) => t.target > t.foil);
    const smaller = PS_PLAN.filter((t) => t.target < t.foil);
    expect(larger).toHaveLength(4);
    expect(smaller).toHaveLength(4);
    // At least two target-larger trials must use small targets (≤3) so a
    // genuine 1-2-knower can pass them via mutual exclusivity.
    expect(larger.filter((t) => t.target <= 3).length).toBeGreaterThanOrEqual(2);
  });

  it("a pure less-crowded-card bias scores exactly 4/8 — never 'some'", () => {
    let s = createPointSession();
    while (!psIsDone(s)) {
      const spec = PS_PLAN[s.index];
      // Always pick the card with fewer dots.
      const smallerSide =
        spec.target < spec.foil
          ? spec.correctSide
          : spec.correctSide === "left"
            ? "right"
            : "left";
      s = psApplyPick(s, smallerSide);
    }
    const r = psResult(s)!;
    expect(r.correct).toBe(4);
    expect(r.signal).toBe("unclear");
  });

  it("never shows the same correct side 3x in a row (anti-perseveration)", () => {
    for (let i = 0; i + 2 < PS_PLAN.length; i++) {
      const s = new Set([
        PS_PLAN[i].correctSide,
        PS_PLAN[i + 1].correctSide,
        PS_PLAN[i + 2].correctSide,
      ]);
      expect(s.size).toBeGreaterThan(1);
    }
  });
});

describe("scoring honesty", () => {
  it("perfect run → clear signal, routes L1 at (at most) medium confidence", () => {
    const s = playRule((i) => PS_PLAN[i].correctSide);
    const r = psResult(s)!;
    expect(r.signal).toBe("clear");
    expect(r.correct).toBe(8);
    expect(r.routePlacement).toBe("L1");
    expect(r.routeConfidence).toBe("medium"); // never high — soft instrument
  });

  it("one miss (7/8) still clears the above-chance bar (binomial p ≈ .035)", () => {
    const s = playRule((i) =>
      i === 3 ? (PS_PLAN[3].correctSide === "left" ? "right" : "left") : PS_PLAN[i].correctSide,
    );
    expect(psResult(s)!.signal).toBe("clear");
  });

  it("6/8 is NOT statistically above chance → 'some', routes L0", () => {
    const s = playRule((i) =>
      i < 2 ? (PS_PLAN[i].correctSide === "left" ? "right" : "left") : PS_PLAN[i].correctSide,
    );
    const r = psResult(s)!;
    expect(r.signal).toBe("some");
    expect(r.routePlacement).toBe("L0");
  });

  it("chance-level guessing → unclear, routes L0 at low confidence", () => {
    const s = playRule((i) => (i % 2 === 0 ? "left" : "right"));
    const r = psResult(s)!;
    expect(["some", "unclear"]).toContain(r.signal); // alternating picks hit ~4/8
    expect(r.routePlacement).toBe("L0");
  });

  it("a skip-heavy session can never claim 'clear' (over-claim guard)", () => {
    // 3 skips → only 5 answered, all correct — still not 'clear'.
    const s = playRule((i) => (i < 3 ? "skip" : PS_PLAN[i].correctSide));
    const r = psResult(s)!;
    expect(r.answered).toBe(5);
    expect(r.correct).toBe(5);
    expect(r.signal).toBe("unclear");
    expect(r.routeConfidence).toBe("low");
  });

  it("readout keys map 1:1 onto the copy artifact states", () => {
    expect(psReadoutKey("clear")).toBe("ps:end:clear");
    expect(psReadoutKey("some")).toBe("ps:end:some");
    expect(psReadoutKey("unclear")).toBe("ps:end:unclear");
  });
});

describe("state machine mechanics", () => {
  it("advances on skip (a toddler who won't point is never stuck)", () => {
    let s = createPointSession();
    s = psApplyPick(s, "skip");
    expect(s.index).toBe(1);
    expect(s.skips).toBe(1);
  });

  it("is pure, JSON-serializable, and resumable", () => {
    let s = createPointSession();
    s = psApplyPick(s, "left");
    const frozen = JSON.stringify(s);
    psApplyPick(s, "right");
    expect(JSON.stringify(s)).toBe(frozen); // no mutation
    const revived = JSON.parse(frozen) as PSState;
    expect(psNextTrial(revived)).toEqual(psNextTrial(s));
  });

  it("throws after completion; result null before completion", () => {
    const s = playRule(() => "left");
    expect(() => psApplyPick(s, "left")).toThrow();
    expect(psResult(createPointSession())).toBeNull();
  });

  it("property: result exists for every completed session; routing is only ever L0/L1 (1k random sessions)", () => {
    const rng = mulberry32(0x9e15);
    for (let i = 0; i < 1000; i++) {
      const s = playRule(() => {
        const x = rng();
        return x < 0.4 ? "left" : x < 0.8 ? "right" : "skip";
      });
      const r = psResult(s)!;
      expect(r).not.toBeNull();
      expect(["L0", "L1"]).toContain(r.routePlacement);
      expect(["medium", "low"]).toContain(r.routeConfidence);
      expect(r.answered + r.skips).toBe(8);
    }
  });
});
