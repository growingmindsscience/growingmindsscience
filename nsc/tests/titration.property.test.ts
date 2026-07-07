/**
 * Property / simulation acceptance suite — spec §7.2, the crown-jewel grader.
 *
 * NOTE on thresholds: the spec's noise-tier acceptance line was truncated in
 * the source doc ("ε=0.10, …"). The ε=0 bar is verbatim (100% correct, all
 * high confidence). The noisy-tier bars below are proposed and need
 * Matthew's ratification: ε=0.10/σ=0.10 → ≥75% exact, ≥95% within one rung,
 * 100% terminate within budget.
 */
import { describe, expect, it } from "vitest";
import {
  applyOutcome,
  createSession,
  getResult,
  nextRequest,
} from "../lib/titration";
import {
  KNOWN,
  makeChild,
  mulberry32,
  runSession,
  type SimLevel,
} from "./simulators";

const LEVELS: SimLevel[] = ["L0", "L1", "L2", "L3", "L4", "CP"];

/** Rank on the ladder for distance metrics; L4+nearCP sits at 5. */
function rank(placement: string, nearCP: boolean): number {
  if (placement === "CP") return 6;
  if (placement === "L4" && nearCP) return 5;
  return Number(placement.slice(1));
}
function trueRank(level: SimLevel): number {
  return level === "CP" ? 6 : Number(level.slice(1));
}

describe("acceptance: ε=0, σ=0 (deterministic children)", () => {
  it("classifies every level with 100% accuracy and high confidence (600 runs)", () => {
    for (const level of LEVELS) {
      const rng = mulberry32(0xc0ffee + LEVELS.indexOf(level));
      for (let i = 0; i < 100; i++) {
        const child = makeChild(level, { rng, luckyGrabs: false });
        const end = runSession(child, createSession, applyOutcome, nextRequest);
        const r = getResult(end)!;
        const got =
          r.placement === "CP" ? "CP" : r.nearCP ? "L4+" : r.placement;
        const want = level === "CP" ? "CP" : level;
        expect(got, `level=${level} run=${i}`).toBe(want);
        expect(r.confidence, `level=${level} run=${i}`).toBe("high");
      }
    }
  });
});

describe("acceptance: ε=0.10, σ=0.10 (noisy empirical children)", () => {
  it("meets proposed thresholds over 6,000 seeded runs", () => {
    let exact = 0;
    let withinOne = 0;
    let total = 0;

    for (const level of LEVELS) {
      const rng = mulberry32(0xbea12 + LEVELS.indexOf(level) * 7919);
      for (let i = 0; i < 1000; i++) {
        const child = makeChild(level, {
          rng,
          epsilon: 0.1,
          sigma: 0.1,
          luckyGrabs: true,
        });
        const end = runSession(child, createSession, applyOutcome, nextRequest);
        const r = getResult(end)!;
        total++;
        const d = Math.abs(rank(r.placement, r.nearCP) - trueRank(level));
        if (d === 0 || (level === "CP" && r.placement === "CP")) exact++;
        if (d <= 1) withinOne++;
      }
    }

    const exactRate = exact / total;
    const withinOneRate = withinOne / total;
    expect(exactRate, `exact=${exactRate.toFixed(3)}`).toBeGreaterThanOrEqual(
      0.75,
    );
    expect(
      withinOneRate,
      `withinOne=${withinOneRate.toFixed(3)}`,
    ).toBeGreaterThanOrEqual(0.95);
  });

  it("high-noise sessions never report high confidence when stopped by budget/skips", () => {
    const rng = mulberry32(0xdeadbeef);
    for (let i = 0; i < 2000; i++) {
      const level = LEVELS[i % LEVELS.length];
      const child = makeChild(level, {
        rng,
        epsilon: 0.25,
        sigma: 0.2,
        luckyGrabs: true,
      });
      const end = runSession(child, createSession, applyOutcome, nextRequest);
      const r = getResult(end)!;
      if (r.stopReason === "budget" || r.stopReason === "skips") {
        expect(r.confidence).not.toBe("high");
      }
    }
  });
});

describe("structural invariants (all noise tiers, 10k sessions)", () => {
  it("always terminates ≤18 scored trials, ≤1 bonus; result always available", () => {
    const rng = mulberry32(0x5eed);
    for (let i = 0; i < 10_000; i++) {
      const level = LEVELS[i % LEVELS.length];
      const child = makeChild(level, {
        rng,
        epsilon: rng() * 0.3,
        sigma: rng() * 0.25,
        luckyGrabs: true,
      });
      const end = runSession(child, createSession, applyOutcome, nextRequest);
      const scored = end.trials.filter((t) => !t.isBonus);
      const bonus = end.trials.filter((t) => t.isBonus);
      expect(scored.length).toBeLessThanOrEqual(18);
      expect(bonus.length).toBeLessThanOrEqual(1);
      expect(end.phase).toBe("done");
      const r = getResult(end)!;
      expect(r).not.toBeNull();
      expect(["L0", "L1", "L2", "L3", "L4", "CP"]).toContain(r.placement);
      // bonus trials, when present, are at a credited N (guaranteed win for
      // a child at that level — the request is ≤ their knower level unless
      // noise credited above it, which is exactly what noise means)
      if (bonus.length === 1) {
        expect(bonus[0].n).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("is deterministic: same seed → byte-identical session twice", () => {
    for (const level of LEVELS) {
      const run = () => {
        const rng = mulberry32(0xabcdef);
        const child = makeChild(level, {
          rng,
          epsilon: 0.15,
          sigma: 0.1,
          luckyGrabs: true,
        });
        return runSession(child, createSession, applyOutcome, nextRequest);
      };
      expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
    }
  });
});
