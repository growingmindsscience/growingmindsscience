import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { claimLegacyClassPurchases } from "@/lib/legacy-class-claims";
import { grantsForLegacyClassPurchase } from "@/lib/grants";
import { ownsToddlerClass } from "@/lib/classes";
import { FakeDb } from "./fake-supabase";

const asDb = (db: FakeDb) => db as unknown as SupabaseClient;
const BUYER = { id: "user-1", email: "Buyer@Example.com ", email_confirmed_at: "2026-10-01T00:00:00Z" };

function seeded() {
  return new FakeDb().seed("class_legacy_purchases", [
    { source_ref: "thinkific:order-1", email: "buyer@example.com", course_slug: "toddlerhood", claimed_by: null },
    { source_ref: "thinkific:order-2", email: "someone@example.com", course_slug: "toddlerhood", claimed_by: null },
  ]);
}

describe("Thinkific buyer claim", () => {
  it("grants the class and AI to the confirmed account with the buyer's email", async () => {
    const db = seeded();
    expect(await claimLegacyClassPurchases(asDb(db), BUYER)).toBe(1);
    const grants = db.rows("entitlements");
    expect(grants.map((row) => row.product_scope).sort()).toEqual(["ai:unlimited", "class:toddlerhood"]);
    expect(grants.every((row) => row.user_id === "user-1" && row.source === "comp" &&
      row.source_ref === "thinkific:order-1" && row.expires_at === null)).toBe(true);
    // The imported grant counts as owning the class, unlike the shared access code.
    expect(ownsToddlerClass(grants.filter((row) => row.product_scope === "class:toddlerhood") as never, new Date())).toBe(true);
    const order = db.rows("class_legacy_purchases").find((row) => row.source_ref === "thinkific:order-1");
    expect(order?.claimed_by).toBe("user-1");
    // Another buyer's order is untouched.
    expect(db.rows("class_legacy_purchases").find((row) => row.source_ref === "thinkific:order-2")?.claimed_by).toBeNull();
  });

  it("refuses an unconfirmed email, so a sign-up cannot claim someone else's order", async () => {
    const db = seeded();
    expect(await claimLegacyClassPurchases(asDb(db), { ...BUYER, email_confirmed_at: null })).toBe(0);
    expect(await claimLegacyClassPurchases(asDb(db), { ...BUYER, email_confirmed_at: undefined })).toBe(0);
    expect(db.rows("entitlements")).toHaveLength(0);
  });

  it("claims an order once, for one account", async () => {
    const db = seeded();
    await claimLegacyClassPurchases(asDb(db), BUYER);
    const writes = db.log.filter((entry) => entry.table === "entitlements").length;
    expect(await claimLegacyClassPurchases(asDb(db), BUYER)).toBe(0);
    expect(await claimLegacyClassPurchases(asDb(db), { ...BUYER, id: "user-2" })).toBe(0);
    expect(db.log.filter((entry) => entry.table === "entitlements").length).toBe(writes);
  });

  it("leaves the order unclaimed when the grant fails, so the next sign-in retries", async () => {
    const db = seeded().fail("entitlements", "upsert", { message: "down" }, 1);
    await expect(claimLegacyClassPurchases(asDb(db), BUYER)).rejects.toThrow("entitlements upsert failed");
    expect(db.rows("class_legacy_purchases")[0].claimed_by).toBeNull();
    expect(await claimLegacyClassPurchases(asDb(db), BUYER)).toBe(1);
  });

  it("grants nothing for a reference that is not a Thinkific order", () => {
    expect(grantsForLegacyClassPurchase("class-access-code")).toEqual([]);
    expect(grantsForLegacyClassPurchase("thinkific:")).toEqual([]);
    expect(grantsForLegacyClassPurchase("thinkific:order-1")).toHaveLength(2);
  });
});
