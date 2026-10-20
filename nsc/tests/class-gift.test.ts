import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLASS_GIFT_SCOPES,
  MAX_CLASS_GIFT_BATCH,
  grantsForClassGift,
  makeClassGiftCode,
  mintClassGiftCodesWith,
  newestUnusedCodes,
  normalizeClassGiftCode,
  redeemClassGiftCodeWith,
} from "../lib/class-gift";
import { ownsToddlerClass } from "../lib/classes";
import { FakeDb } from "./fake-supabase";

const asDb = (db: FakeDb) => db as unknown as SupabaseClient;
const uniques = {
  class_gift_codes: [["code"]],
  entitlements: [["user_id", "product_scope", "source", "source_ref"]],
};

describe("class gift codes", () => {
  it("formats as GM-XXXX-XXXX from the unambiguous alphabet", () => {
    for (let i = 0; i < 100; i++) expect(makeClassGiftCode()).toMatch(/^GM-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  });

  it("normalizes what a person types", () => {
    expect(normalizeClassGiftCode("gm-7q4k-2m8p")).toBe("GM-7Q4K-2M8P");
    expect(normalizeClassGiftCode("  GM 7Q4K 2M8P ")).toBe("GM-7Q4K-2M8P");
    expect(normalizeClassGiftCode("7q4k2m8p")).toBe("GM-7Q4K-2M8P");
    expect(normalizeClassGiftCode("")).toBe("");
  });

  it("unlocks all three classes and Growing Minds AI, for life", () => {
    expect(CLASS_GIFT_SCOPES).toEqual(["class:toddlerhood", "class:infant", "class:preschool", "ai:unlimited"]);
    const grants = grantsForClassGift("gift-1");
    expect(grants.every((g) => g.source === "gift" && g.expires_at === null && g.source_ref === "class-gift:gift-1")).toBe(true);
    // A gift grant counts as owning the class (unlike the shared AI code).
    expect(ownsToddlerClass(grants, new Date())).toBe(true);
  });
});

describe("minting (admin side)", () => {
  it("makes the requested number of codes, capped, with the note", async () => {
    const db = new FakeDb({ uniques });
    const codes = await mintClassGiftCodesWith(asDb(db), { count: 3, note: " For Sam ", createdBy: "admin-1" });
    expect(codes).toHaveLength(3);
    expect(db.rows("class_gift_codes")).toMatchObject(codes.map((code) => ({ code, note: "For Sam", created_by: "admin-1" })));
    const many = await mintClassGiftCodesWith(asDb(new FakeDb({ uniques })), { count: 500, note: "", createdBy: "admin-1" });
    expect(many).toHaveLength(MAX_CLASS_GIFT_BATCH);
  });

  it("replaces a colliding code with a fresh one", async () => {
    const db = new FakeDb({ uniques }).seed("class_gift_codes", [{ code: "GM-AAAA-BBBB" }]);
    const draws = ["GM-AAAA-BBBB", "GM-CCCC-DDDD"];
    expect(await mintClassGiftCodesWith(asDb(db), { count: 1, note: "", createdBy: "a" }, () => draws.shift()!)).toEqual(["GM-CCCC-DDDD"]);
  });

  it("throws on a database error", async () => {
    const down = new FakeDb({ uniques }).fail("class_gift_codes", "insert", { code: "08006", message: "down" });
    await expect(mintClassGiftCodesWith(asDb(down), { count: 1, note: "", createdBy: "a" })).rejects.toThrow(/insert failed/);
  });

  it("reads a new batch back from the list: this admin's newest unused codes", () => {
    // Newest first, as the page lists them.
    const rows = [
      { code: "GM-NEW2", created_by: "admin-1", redeemed_at: null },
      { code: "GM-OTHR", created_by: "admin-2", redeemed_at: null },
      { code: "GM-NEW1", created_by: "admin-1", redeemed_at: null },
      { code: "GM-USED", created_by: "admin-1", redeemed_at: "2026-10-01T00:00:00Z" },
      { code: "GM-OLD1", created_by: "admin-1", redeemed_at: null },
    ];
    const codes = (count: number) => newestUnusedCodes(rows, "admin-1", count).map((r) => r.code);
    expect(codes(2)).toEqual(["GM-NEW2", "GM-NEW1"]);
    expect(codes(3)).toEqual(["GM-NEW2", "GM-NEW1", "GM-OLD1"]);
    // A missing or hand-edited count shows nothing rather than guessing.
    for (const bad of [NaN, 0, -4]) expect(codes(bad)).toEqual([]);
    expect(newestUnusedCodes(Array.from({ length: 40 }, () => rows[0]), "admin-1", 500)).toHaveLength(MAX_CLASS_GIFT_BATCH);
  });
});

describe("redeeming (recipient side)", () => {
  const seeded = () =>
    new FakeDb({ uniques }).seed("class_gift_codes", [{ id: "gift-1", code: "GM-7Q4K-2M8P", redeemed_by: null }]);

  it("grants every class and the AI, and marks the code used", async () => {
    const db = seeded();
    expect(await redeemClassGiftCodeWith(asDb(db), "gm 7q4k 2m8p", "user-1")).toEqual({ ok: true });
    expect(db.rows("entitlements").map((r) => r.product_scope)).toEqual(CLASS_GIFT_SCOPES);
    expect(db.rows("entitlements").every((r) => r.user_id === "user-1" && r.source === "gift")).toBe(true);
    expect(db.rows("class_gift_codes")[0]).toMatchObject({ redeemed_by: "user-1" });
  });

  it("works once: a second person is refused, the same person is not", async () => {
    const db = seeded();
    await redeemClassGiftCodeWith(asDb(db), "GM-7Q4K-2M8P", "user-1");
    expect(await redeemClassGiftCodeWith(asDb(db), "GM-7Q4K-2M8P", "user-2")).toEqual({ ok: false, reason: "already_redeemed" });
    expect(await redeemClassGiftCodeWith(asDb(db), "GM-7Q4K-2M8P", "user-1")).toEqual({ ok: true });
  });

  it("refuses unknown codes and Number Path codes", async () => {
    const db = seeded();
    expect(await redeemClassGiftCodeWith(asDb(db), "GM-ZZZZ-ZZZZ", "user-1")).toEqual({ ok: false, reason: "unknown" });
    expect(await redeemClassGiftCodeWith(asDb(db), "NP-7Q4K-2M8P", "user-1")).toEqual({ ok: false, reason: "unknown" });
    expect(await redeemClassGiftCodeWith(asDb(db), "nonsense", "user-1")).toEqual({ ok: false, reason: "unknown" });
  });

  it("rolls the claim back when the grants fail, so the code still works", async () => {
    const db = seeded().fail("entitlements", "upsert", { message: "down" }, 1);
    expect(await redeemClassGiftCodeWith(asDb(db), "GM-7Q4K-2M8P", "user-1")).toEqual({ ok: false, reason: "error" });
    expect(db.rows("class_gift_codes")[0]).toMatchObject({ redeemed_by: null });
    expect(await redeemClassGiftCodeWith(asDb(db), "GM-7Q4K-2M8P", "user-1")).toEqual({ ok: true });
  });
});
