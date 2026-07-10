/**
 * Deterministic unit tests for the titration FSM — spec §2.2 mechanics.
 * Property/simulation acceptance lives in titration.property.test.ts.
 */
import { describe, expect, it } from "vitest";
import {
  applyOutcome,
  createSession,
  getResult,
  nextRequest,
  type Outcome,
  type TitrationState,
} from "../lib/titration";

function play(outcomes: Outcome[], state = createSession()): TitrationState {
  let s = state;
  for (const o of outcomes) {
    s = applyOutcome(s, o);
  }
  return s;
}

/** Feed outcomes chosen per-request via a rule until the session ends. */
function playRule(rule: (n: number) => Outcome): TitrationState {
  let s = createSession();
  let guard = 0;
  for (;;) {
    const req = nextRequest(s);
    if (!req) return s;
    s = applyOutcome(s, rule(req.n));
    if (++guard > 100) throw new Error("no termination");
  }
}

describe("session start", () => {
  it("always opens at N=1 (§2.1 start-at-1 rule)", () => {
    expect(nextRequest(createSession())).toEqual({ n: 1, kind: "trial" });
  });
});

describe("movement", () => {
  it("moves up after correct, down after incorrect, floor at 1", () => {
    let s = createSession();
    s = applyOutcome(s, "correct"); // 1 ✓ → 2
    expect(nextRequest(s)!.n).toBe(2);
    s = applyOutcome(s, "incorrect"); // 2 ✗ → back to 1
    expect(nextRequest(s)!.n).toBe(1);
    s = applyOutcome(s, "incorrect"); // 1 ✗ → floor: re-test 1
    expect(nextRequest(s)!.n).toBe(1);
  });

  it("skip repeats the same request and counts toward the skip budget", () => {
    let s = createSession();
    s = applyOutcome(s, "skip");
    expect(nextRequest(s)!.n).toBe(1);
    expect(s.skips).toBe(1);
  });

  it("never re-tests a resolved level", () => {
    // Credit 1 (two corrects) with a dip to a failed 2 in between.
    const s = play(["correct", "incorrect", "correct", "incorrect"]);
    // trace: 1✓→2, 2✗→1, 1✓ credited→2, 2✗ failed → boundary stop
    expect(s.stopReason).toBe("boundary");
  });
});

describe("classification map (§2.2)", () => {
  it("fails 1 → L0", () => {
    const s = play(["incorrect", "incorrect"]);
    const r = getResult(s)!;
    expect(r.placement).toBe("L0");
    expect(r.stopReason).toBe("boundary");
  });

  it("credits 1, fails 2 → L1", () => {
    const s = playRule((n) => (n <= 1 ? "correct" : "incorrect"));
    expect(getResult(s)!.placement).toBe("L1");
  });

  it("credits 2, fails 3 → L2", () => {
    const s = playRule((n) => (n <= 2 ? "correct" : "incorrect"));
    expect(getResult(s)!.placement).toBe("L2");
  });

  it("credits 3, fails 4 → L3", () => {
    const s = playRule((n) => (n <= 3 ? "correct" : "incorrect"));
    expect(getResult(s)!.placement).toBe("L3");
  });

  it("credits 4, fails 5 → L4, no nearCP", () => {
    const s = playRule((n) => (n <= 4 ? "correct" : "incorrect"));
    const r = getResult(s)!;
    expect(r.placement).toBe("L4");
    expect(r.nearCP).toBe(false);
  });

  it("credits 5, fails 6 → L4 + nearCP (doorstep of CP)", () => {
    const s = playRule((n) => (n <= 5 ? "correct" : "incorrect"));
    const r = getResult(s)!;
    expect(r.placement).toBe("L4");
    expect(r.nearCP).toBe(true);
  });

  it("credits 5 and 6 → CP, ends immediately on the top-rung win", () => {
    const s = playRule(() => "correct");
    const r = getResult(s)!;
    expect(r.placement).toBe("CP");
    expect(r.stopReason).toBe("cp");
    expect(s.phase).toBe("done"); // no bonus after CP
    // 1..6 singles, then re-tests credit 6 and 5 → 8 scored trials
    expect(r.trialCount).toBe(8);
  });
});

describe("clean-or-confirmed crediting (v1.1, amendment A2)", () => {
  it("does NOT credit 2 corrects that carry an incorrect; a 3rd correct confirms", () => {
    let s = createSession();
    s = applyOutcome(s, "incorrect"); // 1: 0-1, still at 1
    s = applyOutcome(s, "correct"); // 1: 1-1 → move to 2
    s = applyOutcome(s, "incorrect"); // 2: 0-1 → back to 1
    s = applyOutcome(s, "correct"); // 1: 2-1 → AMBIGUOUS under v1.1, not credited
    expect(s.phase).toBe("trial"); // old 2-of-3 rule would have credited 1 here
    // walk moves up to the unresolved 2 first; failing 2 brings it back to 1
    s = applyOutcome(s, "incorrect"); // 2: 0-2 → failed (no boundary: 1 not credited)
    s = applyOutcome(s, "correct"); // 1: 3-1 → confirmed credit → boundary → L1
    const r = getResult(s)!;
    expect(r.placement).toBe("L1");
    // confirmed-not-clean credit is a shaky decision → never high confidence
    expect(r.confidence).not.toBe("high");
  });

  it("a 2✓/2✗ tie FAILS the rung — ties break downward (conservative)", () => {
    // Rung 2 accumulates ✓✓✗✗ across visits and must resolve as failed.
    const s = play([
      "correct", // 1: 1-0 → 2
      "incorrect", // 2: 0-1 → 1
      "correct", // 1: 2-0 clean credit → 2
      "correct", // 2: 1-1 → 3
      "incorrect", // 3: 0-1 → 2
      "correct", // 2: 2-1 ambiguous → 3
      "incorrect", // 3: 0-2 failed → 2 (no boundary: 2 unresolved)
      "incorrect", // 2: 2-2 TIE → failed → boundary at credited 1
    ]);
    const r = getResult(s)!;
    expect(r.placement).toBe("L1"); // old rule would have credited 2 → L2
    expect(r.confidence).toBe("medium"); // one shaky decision, flagged
  });
});

describe("stop conditions", () => {
  it("trial budget (18) ends the session with best-available estimate", () => {
    // Contradictory child: alternates forever at low N without resolving 2.
    // ✓ at 1 always; at 2 alternate ✓/✗ so 2 never hits 2-of-anything… it
    // will resolve eventually (3 scored trials at 2 forces 2-1 or 1-2) — so
    // instead alternate correct/incorrect strictly by parity of trial count.
    let s = createSession();
    let i = 0;
    while (s.phase === "trial") {
      s = applyOutcome(s, i++ % 2 === 0 ? "correct" : "incorrect");
      if (i > 50) break;
    }
    const scored = s.trials.filter((t) => !t.isBonus);
    expect(scored.length).toBeLessThanOrEqual(18);
    const r = getResult(s);
    expect(r).not.toBeNull();
  });

  it("4 skips end the session at low confidence", () => {
    const s = play(["skip", "skip", "skip", "skip"]);
    const r = getResult(s)!;
    expect(r.stopReason).toBe("skips");
    expect(r.confidence).toBe("low");
    expect(r.placement).toBe("L0"); // nothing credited → conservative floor
  });

  it("low-confidence placement is conservative: only credited rungs count", () => {
    // Child succeeds once at 1, once at 2, then stalls out on skips.
    const s = play(["correct", "skip", "skip", "skip", "skip"]);
    const r = getResult(s)!;
    expect(r.placement).toBe("L0"); // one ✓ at 1 is not credited yet
    expect(r.confidence).toBe("low");
  });
});

describe("end-on-success bonus (§2.2)", () => {
  it("offers a bonus win trial when the session ends on a failure", () => {
    // Play only the scored phase; stop as soon as the bonus is offered.
    let s = createSession();
    while (s.phase === "trial") {
      s = applyOutcome(s, nextRequest(s)!.n <= 2 ? "correct" : "incorrect");
    }
    // Ends by failing 3; child credited 2 → bonus at 2.
    expect(s.phase).toBe("bonus");
    expect(nextRequest(s)).toEqual({ n: 2, kind: "bonus" });
    const done = applyOutcome(s, "correct");
    expect(done.phase).toBe("done");
    // bonus never changes placement
    expect(getResult(done)!.placement).toBe("L2");
    expect(done.trials[done.trials.length - 1].isBonus).toBe(true);
  });

  it("skips the bonus for L0 (nothing credited to win at)", () => {
    const s = play(["incorrect", "incorrect"]);
    expect(s.phase).toBe("done");
  });
});

describe("confidence tiers (§2.2)", () => {
  it("clean monotone run, no skips → high", () => {
    const s = playRule((n) => (n <= 3 ? "correct" : "incorrect"));
    expect(getResult(s)!.confidence).toBe("high");
  });

  it("one contradictory trial below the boundary → medium (confirmed-credit path)", () => {
    let s = createSession();
    s = applyOutcome(s, "incorrect"); // contradiction at 1 (later credited)
    s = applyOutcome(s, "correct"); // 1: 1-1 → 2
    s = applyOutcome(s, "incorrect"); // 2: 0-1 → 1
    s = applyOutcome(s, "correct"); // 1: 2-1 → ambiguous under v1.1 → walk to 2
    s = applyOutcome(s, "incorrect"); // 2: 0-2 → failed → back to 1
    s = applyOutcome(s, "correct"); // 1: 3-1 → confirmed credit → boundary → L1
    const r = getResult(s)!;
    expect(r.placement).toBe("L1");
    expect(r.confidence).toBe("medium");
  });

  it("budget/skip stops are never high confidence", () => {
    const s = play(["correct", "skip", "skip", "skip", "skip"]);
    expect(getResult(s)!.confidence).toBe("low");
  });
});

describe("state integrity", () => {
  it("state is JSON-serializable and resumes identically (pause/resume)", () => {
    let s = createSession();
    s = applyOutcome(s, "correct");
    s = applyOutcome(s, "correct");
    const revived = JSON.parse(JSON.stringify(s)) as TitrationState;
    expect(nextRequest(revived)).toEqual(nextRequest(s));
    const a = applyOutcome(s, "incorrect");
    const b = applyOutcome(revived, "incorrect");
    expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));
  });

  it("applyOutcome never mutates its input", () => {
    const s = createSession();
    const frozen = JSON.stringify(s);
    applyOutcome(s, "correct");
    expect(JSON.stringify(s)).toBe(frozen);
  });

  it("throws on outcome after done", () => {
    let s = play(["incorrect", "incorrect"]);
    expect(s.phase).toBe("done");
    expect(() => applyOutcome(s, "correct")).toThrow();
  });
});
