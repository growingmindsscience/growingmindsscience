import { describe, expect, it } from "vitest";
import {
  grantForGiftRedemption,
  grantsForOneTimePurchase,
  grantsForSubscription,
  unlocksNumberPath,
  type PriceConfig,
} from "../lib/grants";

const prices: PriceConfig = {
  membershipMonthly: "price_member_mo",
  membershipAnnual: "price_member_yr",
  legacyAiPro: "price_aipro_legacy",
};

describe("subscription grants (plan 2.2 reconciliation)", () => {
  const base = {
    subscriptionId: "sub_1",
    status: "active",
    currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    prices,
  };

  it("membership prices grant membership bounded by period end + grace", () => {
    for (const priceId of ["price_member_mo", "price_member_yr"]) {
      const grants = grantsForSubscription({ ...base, priceId });
      expect(grants).toHaveLength(1);
      expect(grants[0].product_scope).toBe("membership");
      expect(grants[0].source).toBe("stripe_sub");
      const expires = new Date(grants[0].expires_at!);
      expect(expires.getTime()).toBeGreaterThan(
        new Date(base.currentPeriodEnd).getTime(),
      );
    }
  });

  it("legacy AI Pro price is absorbed into membership at the same bill", () => {
    const grants = grantsForSubscription({ ...base, priceId: "price_aipro_legacy" });
    expect(grants.map((g) => g.product_scope)).toEqual(["membership"]);
  });

  it("trialing and past_due keep access; canceled/unpaid grant nothing new", () => {
    for (const status of ["trialing", "past_due"]) {
      expect(
        grantsForSubscription({ ...base, priceId: "price_member_mo", status }),
      ).toHaveLength(1);
    }
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired"]) {
      expect(
        grantsForSubscription({ ...base, priceId: "price_member_mo", status }),
      ).toHaveLength(0);
    }
  });

  it("unknown prices grant nothing (no accidental scope from other SKUs)", () => {
    expect(
      grantsForSubscription({ ...base, priceId: "price_something_else" }),
    ).toHaveLength(0);
  });
});

describe("one-time purchase grants", () => {
  it("Number Path stays a perpetual standalone grant", () => {
    const grants = grantsForOneTimePurchase({
      sessionId: "cs_1",
      product: "numberpath_full",
    });
    expect(grants).toEqual([
      {
        product_scope: "numberpath_full",
        source: "stripe_otp",
        source_ref: "cs_1",
        expires_at: null,
      },
    ]);
  });

  it("legacy $49 bundle is honored forever: class + unlimited AI", () => {
    const grants = grantsForOneTimePurchase({
      sessionId: "cs_2",
      product: "class_bundle_toddlerhood",
    });
    expect(grants.map((g) => g.product_scope).sort()).toEqual([
      "ai:unlimited",
      "class:toddlerhood",
    ]);
    for (const g of grants) {
      expect(g.source).toBe("stripe_otp_legacy");
      expect(g.expires_at).toBeNull();
    }
  });

  it("gift redemption grants perpetual Number Path from source gift", () => {
    const g = grantForGiftRedemption({ giftCodeId: "gc_1" });
    expect(g.product_scope).toBe("numberpath_full");
    expect(g.source).toBe("gift");
    expect(g.expires_at).toBeNull();
  });
});

describe("union semantics", () => {
  const now = new Date("2026-07-16T00:00:00.000Z");

  it("membership unlocks Number Path while live", () => {
    expect(
      unlocksNumberPath(
        [{ product_scope: "membership", expires_at: "2026-08-01T00:00:00.000Z" }],
        now,
      ),
    ).toBe(true);
  });

  it("an expired membership no longer unlocks, but a standalone purchase still does", () => {
    const rows = [
      { product_scope: "membership", expires_at: "2026-06-01T00:00:00.000Z" },
      { product_scope: "numberpath_full", expires_at: null },
    ];
    expect(unlocksNumberPath(rows, now)).toBe(true);
    expect(unlocksNumberPath([rows[0]], now)).toBe(false);
  });

  it("unrelated scopes never unlock Number Path", () => {
    expect(
      unlocksNumberPath(
        [
          { product_scope: "ai:unlimited", expires_at: null },
          { product_scope: "class:toddlerhood", expires_at: null },
        ],
        now,
      ),
    ).toBe(false);
  });
});
