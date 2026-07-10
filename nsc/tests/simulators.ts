/**
 * Simulated-child responders for titration property tests — spec §7.2.
 *
 * Perfect N-knower signature: correct for requests ≤ K (the child's knower
 * level); for requests > K the child grabs a uniform-random handful of 2–10
 * (the empirical subset-knower behavior). `luckyGrabs` controls whether a
 * random grab may coincide with the request (true = empirically honest;
 * false = the deterministic responder used for the ε=0 acceptance bar, where
 * the spec demands 100% classification).
 */
import type { Outcome } from "../lib/titration";

/** mulberry32 — tiny deterministic PRNG; tests must be seed-reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SimLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "CP";

export const KNOWN: Record<SimLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  // "five-knower": knows 1-5 but not 6 - the empirical doorstep-of-CP child
  // (Le Corre & Carey 2007 found no stable 5-knowers; Krajcsi et al. 2023
  // shows such children still behave like subset-knowers). The engine maps
  // them to L4 + nearCP.
  L5: 5,
  CP: 6,
};

export interface SimOptions {
  epsilon?: number; // per-response flip probability
  sigma?: number; // per-request skip probability
  luckyGrabs?: boolean;
  rng: () => number;
}

export function makeChild(level: SimLevel, opts: SimOptions) {
  const K = KNOWN[level];
  const { epsilon = 0, sigma = 0, luckyGrabs = true, rng } = opts;

  return (requestedN: number): Outcome => {
    if (sigma > 0 && rng() < sigma) return "skip";

    let correct: boolean;
    if (requestedN <= K) {
      correct = true;
    } else {
      // grab a random handful of 2–10
      const grab = 2 + Math.floor(rng() * 9);
      correct = luckyGrabs ? grab === requestedN : false;
    }

    if (epsilon > 0 && rng() < epsilon) correct = !correct;
    return correct ? "correct" : "incorrect";
  };
}

export function runSession(
  child: (n: number) => Outcome,
  createSession: () => import("../lib/titration").TitrationState,
  applyOutcome: typeof import("../lib/titration").applyOutcome,
  nextRequest: typeof import("../lib/titration").nextRequest,
) {
  let state = createSession();
  let guard = 0;
  for (;;) {
    const req = nextRequest(state);
    if (!req) break;
    state = applyOutcome(state, child(req.n));
    if (++guard > 100) throw new Error("session failed to terminate");
  }
  return state;
}
