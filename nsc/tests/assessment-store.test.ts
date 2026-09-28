import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordGiveNTap, recordPointTap, TapError } from "../lib/assessment-store";
import { createSession, type Outcome, type TitrationState } from "../lib/titration";
import { createPointSession, PS_PLAN } from "../lib/pointandseek";
import { FakeDb } from "./fake-supabase";

const asDb = (db: FakeDb) => db as unknown as SupabaseClient;
const uniques = { nsc_trials: [["assessment_id", "seq"]] };

function giveNDb(state: TitrationState = createSession(), status = "in_progress") {
  return new FakeDb({ uniques }).seed("nsc_assessments", [
    {
      id: "a1",
      status,
      engine_state: state,
      trial_count: state.trials.filter((t) => !t.isBonus).length,
      placement: null,
      completed_at: null,
    },
  ]);
}

/** Play outcomes through the store, always with the screen in sync. */
async function tapAll(db: FakeDb, outcomes: Outcome[]) {
  let state = db.rows("nsc_assessments")[0].engine_state as TitrationState;
  let last;
  for (const o of outcomes) {
    last = await recordGiveNTap(asDb(db), "a1", o, state.trials.length);
    expect(last.status).toBe("ok");
    state = last.state;
  }
  return last!;
}

describe("Give-N taps (N5: a tap lands only on the step it was made for)", () => {
  it("applies an in-sync tap and logs the trial", async () => {
    const db = giveNDb();
    const r = await recordGiveNTap(asDb(db), "a1", "correct", 0);
    expect(r.status).toBe("ok");
    expect(r.state.trials).toHaveLength(1);
    const row = db.rows("nsc_assessments")[0];
    expect(row.trial_count).toBe(1);
    expect(db.rows("nsc_trials")).toMatchObject([{ seq: 1, requested_n: 1, outcome: "correct" }]);
  });

  it("a stale screen (lost response, back button, second tab) changes nothing", async () => {
    const db = giveNDb();
    await recordGiveNTap(asDb(db), "a1", "correct", 0); // server now at N=2
    // The parent re-taps from a screen that still shows the first step.
    const r = await recordGiveNTap(asDb(db), "a1", "correct", 0);
    expect(r.status).toBe("stale");
    expect(r.state.trials).toHaveLength(1); // authoritative state returned
    expect(db.rows("nsc_trials")).toHaveLength(1);
    expect((db.rows("nsc_assessments")[0].engine_state as TitrationState).trials).toHaveLength(1);
  });

  it("the conditional update loses cleanly to a racing request", async () => {
    // Simulate another request having bumped the row after our load: the
    // stored count no longer matches the state this tap was computed from.
    const db = giveNDb();
    db.rows("nsc_assessments")[0].trial_count = 1;
    const r = await recordGiveNTap(asDb(db), "a1", "correct", 0);
    expect(r.status).toBe("stale");
    expect(db.rows("nsc_trials")).toHaveLength(0);
  });

  it("surfaces a failed save as an error instead of pretending", async () => {
    const db = giveNDb().fail("nsc_assessments", "update", { message: "down" });
    await expect(recordGiveNTap(asDb(db), "a1", "correct", 0)).rejects.toBeInstanceOf(TapError);
  });

  it("rejects values outside the enumerated outcomes", async () => {
    const db = giveNDb();
    await expect(
      recordGiveNTap(asDb(db), "a1", "maybe" as unknown as Outcome, 0),
    ).rejects.toBeInstanceOf(TapError);
  });
});

describe("Give-N stop and bonus (N6)", () => {
  // 1✓ 2✓ 3✗ 2✓ 3✗: a two-knower; the stop offers a bonus at 2.
  const TWO_KNOWER: Outcome[] = ["correct", "correct", "incorrect", "correct", "incorrect"];

  it("saves the placement at the stop, before the bonus", async () => {
    const db = giveNDb();
    const r = await tapAll(db, TWO_KNOWER);
    expect(r.state.phase).toBe("bonus");
    expect(r.finalized).toBe(true);
    const row = db.rows("nsc_assessments")[0];
    expect(row).toMatchObject({ status: "complete", placement: "L2", confidence: "high" });
    expect(row.completed_at).toBeTruthy();
  });

  it("records the bonus afterwards without touching the saved result", async () => {
    const db = giveNDb();
    const atStop = await tapAll(db, TWO_KNOWER);
    const saved = { ...db.rows("nsc_assessments")[0] };
    const r = await recordGiveNTap(asDb(db), "a1", "correct", atStop.state.trials.length);
    expect(r.status).toBe("ok");
    expect(r.state.phase).toBe("done");
    const row = db.rows("nsc_assessments")[0];
    expect(row.placement).toBe(saved.placement);
    expect(row.completed_at).toBe(saved.completed_at);
    expect(db.rows("nsc_trials").at(-1)).toMatchObject({ is_bonus: true });
  });

  it("the bonus can be skipped or answered honestly", async () => {
    for (const o of ["skip", "incorrect"] as const) {
      const db = giveNDb();
      const atStop = await tapAll(db, TWO_KNOWER);
      const r = await recordGiveNTap(asDb(db), "a1", o, atStop.state.trials.length);
      expect(r.state.phase).toBe("done");
      expect(db.rows("nsc_assessments")[0].placement).toBe("L2");
    }
  });

  it("a finished session accepts nothing more", async () => {
    const db = giveNDb();
    const atStop = await tapAll(db, TWO_KNOWER);
    const done = await recordGiveNTap(asDb(db), "a1", "correct", atStop.state.trials.length);
    const again = await recordGiveNTap(asDb(db), "a1", "correct", done.state.trials.length);
    expect(again.status).toBe("stale");
  });

  it("four skips end the session with no bonus, and it is saved", async () => {
    const db = giveNDb();
    const r = await tapAll(db, ["correct", "correct", "incorrect", "correct", "skip", "skip", "skip", "skip"]);
    expect(r.state.phase).toBe("done");
    expect(db.rows("nsc_assessments")[0]).toMatchObject({ status: "complete", placement: "L2", confidence: "low" });
  });
});

describe("Point and Seek taps", () => {
  const psDb = () =>
    new FakeDb({ uniques }).seed("nsc_assessments", [
      { id: "a1", status: "in_progress", engine_state: createPointSession(), trial_count: 0 },
    ]);

  it("applies in-sync taps and completes with the soft signal", async () => {
    const db = psDb();
    let index = 0;
    let r;
    for (const spec of PS_PLAN) {
      r = await recordPointTap(asDb(db), "a1", spec.correctSide, index);
      expect(r.status).toBe("ok");
      index = r.state.index;
    }
    expect(r!.finalized).toBe(true);
    expect(db.rows("nsc_assessments")[0]).toMatchObject({
      status: "complete",
      placement: "L1",
      confidence: "medium",
      ps_signal: "clear",
    });
    expect(db.rows("nsc_trials")).toHaveLength(8);
  });

  it("a stale screen is caught up, not re-aimed at the next card", async () => {
    const db = psDb();
    await recordPointTap(asDb(db), "a1", "left", 0);
    const r = await recordPointTap(asDb(db), "a1", "left", 0);
    expect(r.status).toBe("stale");
    expect(r.state.index).toBe(1);
    expect(db.rows("nsc_trials")).toHaveLength(1);
  });

  it("refuses a Give-N session and invalid picks", async () => {
    await expect(recordPointTap(asDb(giveNDb()), "a1", "left", 0)).rejects.toBeInstanceOf(TapError);
    await expect(
      recordPointTap(asDb(psDb()), "a1", "middle" as unknown as "left", 0),
    ).rejects.toBeInstanceOf(TapError);
  });
});
