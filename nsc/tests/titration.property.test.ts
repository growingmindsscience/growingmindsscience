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

/**
 * v1.1 certified acceptance tiers (spec amendment A3) — measured with the
 * empirically honest simulator (luckyGrabs: true, so subset-knowers are
 * accidentally correct ~1/9 of the time above their level, per the observed
 * random-grab signature). The v1.0 "100% exact at ε=0" bar is provably
 * unattainable under that simulator; what the clean-or-confirmed rule DOES
 * guarantee is the direction of residual error: conservative. Thresholds
 * carry safety margin below measured performance.
 */
describe("v1.1 acceptance: certified tiers (lucky grabs on, 7 levels incl. 5-knower)", () => {
  const LEVELS7: SimLevel[] = ["L0", "L1", "L2", "L3", "L4", "L5", "CP"];

  function tier(epsilon: number, sigma: number, seedBase: number, perLevel: number) {
    let exact = 0;
    let withinOne = 0;
    let under = 0; // conservative errors
    let over = 0; // liberal errors
    let errNotHigh = 0;
    let total = 0;
    let scoredSum = 0;

    for (const level of LEVELS7) {
      const rng = mulberry32(seedBase + LEVELS7.indexOf(level) * 7919);
      for (let i = 0; i < perLevel; i++) {
        const child = makeChild(level, { rng, epsilon, sigma, luckyGrabs: true });
        const end = runSession(child, createSession, applyOutcome, nextRequest);
        const r = getResult(end)!;
        total++;
        scoredSum += end.trials.filter((t) => !t.isBonus).length;
        const got = rank(r.placement, r.nearCP);
        const want = level === "L5" ? 5 : trueRank(level);
        const d = got - want;
        if (d === 0) exact++;
        if (Math.abs(d) <= 1) withinOne++;
        if (d < 0) under++;
        if (d > 0) over++;
        if (d !== 0 && r.confidence !== "high") errNotHigh++;
      }
    }
    return { exact, withinOne, under, over, errNotHigh, total, meanScored: scoredSum / total };
  }

  it("ε=0, σ=0: ≥98% exact, ≥99.5% within one rung, ZERO under-placements, mean ≤12 trials", () => {
    const s = tier(0, 0, 0x11a11, 1500);
    expect(s.exact / s.total, `exact=${(s.exact / s.total).toFixed(3)}`).toBeGreaterThanOrEqual(0.98);
    expect(s.withinOne / s.total).toBeGreaterThanOrEqual(0.995);
    expect(s.under, "a clean responder must never be under-placed").toBe(0);
    expect(s.meanScored).toBeLessThanOrEqual(12);
  });

  it("ε=0.10, σ=0.05: ≥86% exact, ≥95% within one, errors skew conservative ≥1.3:1", () => {
    const s = tier(0.1, 0.05, 0x22b22, 1500);
    expect(s.exact / s.total, `exact=${(s.exact / s.total).toFixed(3)}`).toBeGreaterThanOrEqual(0.86);
    expect(s.withinOne / s.total).toBeGreaterThanOrEqual(0.95);
    expect(s.under, `under=${s.under} over=${s.over}`).toBeGreaterThanOrEqual(1.3 * s.over);
    expect(s.meanScored).toBeLessThanOrEqual(12);
  });

  it("ε=0.20, σ=0.10: ≥65% exact, ≥81% within one, conservative ≥2:1, ≥60% of errors flagged below high", () => {
    const s = tier(0.2, 0.1, 0x33c33, 1500);
    expect(s.exact / s.total, `exact=${(s.exact / s.total).toFixed(3)}`).toBeGreaterThanOrEqual(0.65);
    expect(s.withinOne / s.total, `withinOne=${(s.withinOne / s.total).toFixed(3)}`).toBeGreaterThanOrEqual(0.81);
    expect(s.under, `under=${s.under} over=${s.over}`).toBeGreaterThanOrEqual(2 * s.over);
    const errors = s.total - s.exact;
    expect(s.errNotHigh / Math.max(1, errors)).toBeGreaterThanOrEqual(0.6);
    expect(s.meanScored).toBeLessThanOrEqual(12);
  });
});

/**
 * Monotonicity property (spec §7.2): flipping any single incorrect→correct
 * never lowers placement. The child is modeled as a fixed outcome table
 * keyed by (requestedN, attempt#-at-that-N) so replays stay well-defined
 * when the walk diverges. Budget/skip-stopped runs are excluded: under a
 * hard trial budget an extra early success can reallocate scarce trials
 * upward, and those runs are already flagged low-confidence.
 */
describe("v1.1 monotonicity property", () => {
  const LEVELS7: SimLevel[] = ["L0", "L1", "L2", "L3", "L4", "L5", "CP"];
  const MAX_ATTEMPTS = 5;

  it("one extra correct never lowers placement (protocol-terminated runs)", () => {
    let checked = 0;
    for (let seed = 1; seed <= 250; seed++) {
      for (const level of LEVELS7) {
        const rng = mulberry32(seed * 131 + LEVELS7.indexOf(level));
        const child = makeChild(level, { rng, epsilon: 0.15, sigma: 0, luckyGrabs: true });
        const table: ("correct" | "incorrect")[][] = [];
        for (let n = 1; n <= 6; n++) {
          table[n] = [];
          for (let a = 0; a < MAX_ATTEMPTS; a++) {
            table[n][a] = child(n) as "correct" | "incorrect";
          }
        }
        const fromTable = (flip?: { n: number; a: number }) => {
          const attempts: Record<number, number> = {};
          return (reqN: number) => {
            const a = attempts[reqN] ?? 0;
            attempts[reqN] = a + 1;
            if (flip && flip.n === reqN && flip.a === a) return "correct" as const;
            return table[reqN][Math.min(a, MAX_ATTEMPTS - 1)];
          };
        };
        const base = runSession(fromTable(), createSession, applyOutcome, nextRequest);
        const baseResult = getResult(base)!;
        if (baseResult.stopReason === "budget" || baseResult.stopReason === "skips") continue;
        const baseRank = rank(baseResult.placement, baseResult.nearCP);
        for (let n = 1; n <= 6; n++) {
          for (let a = 0; a < MAX_ATTEMPTS; a++) {
            if (table[n][a] !== "incorrect") continue;
            const flipped = runSession(fromTable({ n, a }), createSession, applyOutcome, nextRequest);
            const fr = getResult(flipped)!;
            if (fr.stopReason === "budget" || fr.stopReason === "skips") continue;
            expect(
              rank(fr.placement, fr.nearCP),
              `seed=${seed} level=${level} flip=(${n},${a})`,
            ).toBeGreaterThanOrEqual(baseRank);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(3000);
  });
});
