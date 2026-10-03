import { describe, expect, it } from "vitest";
import {
  makeGiftCode,
  mintGiftCodeWith,
  normalizeGiftCode,
  redeemGiftCodeWith,
  secureRandom,
} from "../lib/gift";
import { FakeDb } from "./fake-supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const asDb = (db: FakeDb) => db as unknown as SupabaseClient;

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

  it("defaults to the platform CSPRNG (N24), never Math.random", () => {
    const original = Math.random;
    Math.random = () => {
      throw new Error("Math.random must not be used for gift codes");
    };
    try {
      const codes = new Set(Array.from({ length: 200 }, () => makeGiftCode()));
      expect(codes.size).toBe(200);
      for (const c of codes) expect(c).toMatch(/^NP-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    } finally {
      Math.random = original;
    }
    for (let i = 0; i < 1000; i++) {
      const x = secureRandom();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("normalizes user input: spacing, case, prefix, missing dashes", () => {
    expect(normalizeGiftCode("np-7q4k-2m8p")).toBe("NP-7Q4K-2M8P");
    expect(normalizeGiftCode("  NP-7Q4K-2M8P  ")).toBe("NP-7Q4K-2M8P");
    expect(normalizeGiftCode("7Q4K-2M8P")).toBe("NP-7Q4K-2M8P");
    expect(normalizeGiftCode("np 7q4k 2m8p")).toBe("NP-7Q4K-2M8P");
    expect(normalizeGiftCode("7q4k2m8p")).toBe("NP-7Q4K-2M8P");
    expect(normalizeGiftCode("NP-NPAB-CDEF")).toBe("NP-NPAB-CDEF");
    expect(normalizeGiftCode("")).toBe("");
  });
});

const giftUniques = {
  nsc_gift_codes: [["code"], ["stripe_checkout_session_id"]],
  nsc_purchases: [["stripe_checkout_session_id"]],
  entitlements: [["user_id", "product_scope", "source", "source_ref"]],
};
const mintOpts = {
  sessionId: "cs_gift_1",
  purchaserEmail: "gran@example.com",
  amountCents: 3400,
  product: "numberpath_full",
};

describe("minting (webhook side)", () => {
  it("is idempotent on the Stripe session id", async () => {
    const db = new FakeDb({ uniques: giftUniques });
    const first = await mintGiftCodeWith(asDb(db), mintOpts, () => "NP-AAAA-BBBB");
    const again = await mintGiftCodeWith(asDb(db), mintOpts, () => "NP-CCCC-DDDD");
    expect(first).toBe("NP-AAAA-BBBB");
    expect(again).toBe("NP-AAAA-BBBB");
    expect(db.rows("nsc_gift_codes")).toHaveLength(1);
  });

  it("retries a code collision with a fresh code", async () => {
    const db = new FakeDb({ uniques: giftUniques }).seed("nsc_gift_codes", [
      { code: "NP-AAAA-BBBB", stripe_checkout_session_id: "cs_other" },
    ]);
    const codes = ["NP-AAAA-BBBB", "NP-CCCC-DDDD"];
    const code = await mintGiftCodeWith(asDb(db), mintOpts, () => codes.shift()!);
    expect(code).toBe("NP-CCCC-DDDD");
  });

  it("throws on a database error so the webhook can ask Stripe to retry", async () => {
    const down = new FakeDb({ uniques: giftUniques }).fail("nsc_gift_codes", "insert", {
      code: "08006",
      message: "connection failure",
    });
    await expect(mintGiftCodeWith(asDb(down), mintOpts)).rejects.toThrow(/insert failed/);
    const lookupDown = new FakeDb().fail("nsc_gift_codes", "select", { message: "timeout" });
    await expect(mintGiftCodeWith(asDb(lookupDown), mintOpts)).rejects.toThrow(/lookup failed/);
  });
});

describe("redeeming (recipient side)", () => {
  const seeded = () =>
    new FakeDb({ uniques: giftUniques }).seed("nsc_gift_codes", [
      {
        id: "gift-1",
        code: "NP-7Q4K-2M8P",
        product: "numberpath_full",
        stripe_checkout_session_id: "cs_gift_1",
        redeemed_by: null,
      },
    ]);

  it("grants the purchase and mirrors a gift entitlement", async () => {
    const db = seeded();
    expect(await redeemGiftCodeWith(asDb(db), "np-7q4k-2m8p", "user-1")).toEqual({ ok: true });
    expect(db.rows("nsc_purchases")).toMatchObject([
      { owner_id: "user-1", product: "numberpath_full", stripe_checkout_session_id: "cs_gift_1" },
    ]);
    expect(db.rows("entitlements")).toMatchObject([
      { user_id: "user-1", product_scope: "numberpath_full", source: "gift", source_ref: "gift-1" },
    ]);
  });

  it("refuses a second redemption and unknown codes", async () => {
    const db = seeded();
    await redeemGiftCodeWith(asDb(db), "NP-7Q4K-2M8P", "user-1");
    expect(await redeemGiftCodeWith(asDb(db), "NP-7Q4K-2M8P", "user-2")).toEqual({
      ok: false,
      reason: "already_redeemed",
    });
    expect(await redeemGiftCodeWith(asDb(db), "NP-ZZZZ-ZZZZ", "user-2")).toEqual({
      ok: false,
      reason: "unknown",
    });
    expect(await redeemGiftCodeWith(asDb(db), "not a code", "user-2")).toEqual({
      ok: false,
      reason: "unknown",
    });
  });

  it("rolls the claim back when the grant write fails, so the gift isn't lost", async () => {
    const db = seeded().fail("nsc_purchases", "upsert", { message: "down" }, 1);
    expect(await redeemGiftCodeWith(asDb(db), "NP-7Q4K-2M8P", "user-1")).toEqual({
      ok: false,
      reason: "error",
    });
    expect(db.rows("nsc_gift_codes")[0].redeemed_by).toBeNull();
    // A retry now succeeds.
    expect(await redeemGiftCodeWith(asDb(db), "NP-7Q4K-2M8P", "user-1")).toEqual({ ok: true });
  });

  it("a missing entitlements table never blocks a redemption", async () => {
    const db = seeded().fail("entitlements", "upsert", { code: "42P01", message: "relation does not exist" });
    expect(await redeemGiftCodeWith(asDb(db), "NP-7Q4K-2M8P", "user-1")).toEqual({ ok: true });
    expect(db.rows("nsc_purchases")).toHaveLength(1);
  });
});
