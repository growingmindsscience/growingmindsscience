import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleStripeEvent, planCheckout, type WebhookDeps } from "../lib/stripe-webhook";
import { FakeDb } from "./fake-supabase";

const uniques = {
  nsc_purchases: [["stripe_checkout_session_id"]],
  entitlements: [["user_id", "product_scope", "source", "source_ref"]],
  subscriptions: [["stripe_subscription_id"]],
};

function deps(db: FakeDb, over: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    db: db as unknown as SupabaseClient,
    mintGiftCode: vi.fn(async () => "NP-AAAA-BBBB"),
    sendEmail: vi.fn(async () => ({ ok: true })),
    prices: { membershipMonthly: "price_mo", membershipAnnual: "price_yr" },
    site: "https://growingmindsscience.com",
    classes: {
      fulfill: vi.fn(async () => {}),
      revokeRefunded: vi.fn(async () => {}),
      revokeDisputed: vi.fn(async () => {}),
    },
    ...over,
  };
}

function checkout(
  session: Record<string, unknown>,
  type = "checkout.session.completed",
): Stripe.Event {
  return {
    id: "evt_1",
    type,
    created: 1_780_000_000,
    data: {
      object: {
        id: "cs_1",
        mode: "payment",
        payment_status: "paid",
        client_reference_id: "user-1",
        metadata: { product: "numberpath_full", owner_id: "user-1" },
        amount_total: 3400,
        payment_intent: "pi_1",
        customer_details: { email: "parent@example.com" },
        ...session,
      },
    },
  } as unknown as Stripe.Event;
}

describe("checkout fulfillment plan (pure)", () => {
  const base = {
    id: "cs_1",
    mode: "payment",
    payment_status: "paid",
    client_reference_id: "user-1",
    metadata: { product: "numberpath_full" },
  } as unknown as Parameters<typeof planCheckout>[0];

  it("fulfills paid and no-payment-required (100% promo) sessions", () => {
    expect(planCheckout(base)).toEqual({ kind: "purchase", ownerId: "user-1", product: "numberpath_full" });
    expect(planCheckout({ ...base, payment_status: "no_payment_required" }).kind).toBe("purchase");
  });

  it("waits on unpaid (async) sessions and ignores subscriptions", () => {
    expect(planCheckout({ ...base, payment_status: "unpaid" }).kind).toBe("ignore");
    expect(planCheckout({ ...base, mode: "subscription" }).kind).toBe("ignore");
  });

  it("never defaults the product: unlabeled or unknown sessions are ignored", () => {
    expect(planCheckout({ ...base, metadata: {} })).toEqual({ kind: "ignore", reason: "no product metadata" });
    expect(planCheckout({ ...base, metadata: { product: "ai_pro" } }).kind).toBe("ignore");
  });
});

describe("stripe webhook: on-site classes", () => {
  const classSession = { metadata: { product: "class_bundle_toddlerhood", owner_id: "user-1" } };

  it("hands a paid class checkout to class fulfilment, not the generic grant", async () => {
    const db = new FakeDb({ uniques });
    const d = deps(db);
    for (const type of ["checkout.session.completed", "checkout.session.async_payment_succeeded"]) {
      const out = await handleStripeEvent(checkout(classSession, type), d);
      expect(out.status).toBe(200);
    }
    expect(d.classes.fulfill).toHaveBeenCalledTimes(2);
    expect(vi.mocked(d.classes.fulfill).mock.calls[0][0]).toMatchObject({ id: "cs_1" });
    expect(db.rows("nsc_purchases")).toEqual([]);
    expect(db.rows("entitlements")).toEqual([]);
  });

  it("routes a preschool checkout to class fulfilment", async () => {
    const d = deps(new FakeDb({ uniques }));
    const out = await handleStripeEvent(checkout({ metadata: { product: "class_preschool", owner_id: "user-1" } }), d);
    expect(out).toEqual({ status: 200, body: { received: true, class: "preschool" } });
    expect(d.classes.fulfill).toHaveBeenCalledTimes(1);
  });

  it("routes an infant checkout to class fulfilment", async () => {
    const d = deps(new FakeDb({ uniques }));
    const out = await handleStripeEvent(checkout({ metadata: { product: "class_infant", owner_id: "user-1" } }), d);
    expect(out).toEqual({ status: 200, body: { received: true, class: "infant" } });
    expect(d.classes.fulfill).toHaveBeenCalledTimes(1);
  });

  it("waits on an unpaid class checkout", async () => {
    const d = deps(new FakeDb({ uniques }));
    const out = await handleStripeEvent(checkout({ ...classSession, payment_status: "unpaid" }), d);
    expect(out.status).toBe(200);
    expect(d.classes.fulfill).not.toHaveBeenCalled();
  });

  it("answers 500 when class fulfilment fails, so Stripe retries", async () => {
    const d = deps(new FakeDb({ uniques }), {
      classes: {
        fulfill: vi.fn(async () => {
          throw new Error("Class checkout did not pass owner and price verification");
        }),
        revokeRefunded: vi.fn(async () => {}),
        revokeDisputed: vi.fn(async () => {}),
      },
    });
    const out = await handleStripeEvent(checkout(classSession), d);
    expect(out.status).toBe(500);
  });

  it("revokes on a refund or a dispute, and retries when that fails", async () => {
    const d = deps(new FakeDb({ uniques }));
    const refund = { id: "evt_r", type: "charge.refunded", data: { object: { id: "ch_1", refunded: true, payment_intent: "pi_1" } } } as unknown as Stripe.Event;
    const dispute = { id: "evt_d", type: "charge.dispute.created", data: { object: { id: "dp_1", payment_intent: "pi_1" } } } as unknown as Stripe.Event;
    expect((await handleStripeEvent(refund, d)).status).toBe(200);
    expect((await handleStripeEvent(dispute, d)).status).toBe(200);
    expect(d.classes.revokeRefunded).toHaveBeenCalledWith(expect.objectContaining({ id: "ch_1" }));
    expect(d.classes.revokeDisputed).toHaveBeenCalledWith(expect.objectContaining({ id: "dp_1" }));

    const failing = deps(new FakeDb({ uniques }), {
      classes: {
        fulfill: vi.fn(async () => {}),
        revokeRefunded: vi.fn(async () => {
          throw new Error("Could not revoke class grant");
        }),
        revokeDisputed: vi.fn(async () => {}),
      },
    });
    expect((await handleStripeEvent(refund, failing)).status).toBe(500);
  });
});

describe("stripe webhook: one-time purchases", () => {
  it("grants the purchase and mirrors the entitlement", async () => {
    const db = new FakeDb({ uniques });
    const out = await handleStripeEvent(checkout({}), deps(db));
    expect(out.status).toBe(200);
    expect(db.rows("nsc_purchases")).toMatchObject([
      { owner_id: "user-1", product: "numberpath_full", stripe_checkout_session_id: "cs_1", amount_cents: 3400 },
    ]);
    expect(db.rows("entitlements")).toMatchObject([
      { user_id: "user-1", product_scope: "numberpath_full", source: "stripe_otp", expires_at: null },
    ]);
  });

  it("is idempotent across redeliveries", async () => {
    const db = new FakeDb({ uniques });
    await handleStripeEvent(checkout({}), deps(db));
    await handleStripeEvent(checkout({}), deps(db));
    expect(db.rows("nsc_purchases")).toHaveLength(1);
    expect(db.rows("entitlements")).toHaveLength(1);
  });

  it("fulfills a 100%-off promo checkout", async () => {
    const db = new FakeDb({ uniques });
    const out = await handleStripeEvent(checkout({ payment_status: "no_payment_required", amount_total: 0 }), deps(db));
    expect(out.status).toBe(200);
    expect(db.rows("nsc_purchases")).toHaveLength(1);
  });

  it("fulfills a delayed payment on async_payment_succeeded, not before", async () => {
    const db = new FakeDb({ uniques });
    await handleStripeEvent(checkout({ payment_status: "unpaid" }), deps(db));
    expect(db.rows("nsc_purchases")).toHaveLength(0);
    const out = await handleStripeEvent(
      checkout({ payment_status: "paid" }, "checkout.session.async_payment_succeeded"),
      deps(db),
    );
    expect(out.status).toBe(200);
    expect(db.rows("nsc_purchases")).toHaveLength(1);
  });

  it("answers 500 when the purchase write fails, so Stripe retries", async () => {
    const db = new FakeDb({ uniques }).fail("nsc_purchases", "upsert", { message: "connection reset" }, 1);
    const out = await handleStripeEvent(checkout({}), deps(db));
    expect(out.status).toBe(500);
    // The retry then succeeds.
    expect((await handleStripeEvent(checkout({}), deps(db))).status).toBe(200);
    expect(db.rows("nsc_purchases")).toHaveLength(1);
  });

  it("answers 500 when the entitlement mirror fails", async () => {
    const db = new FakeDb({ uniques }).fail("entitlements", "upsert", { message: "down" });
    expect((await handleStripeEvent(checkout({}), deps(db))).status).toBe(500);
  });

  it("ignores checkouts that aren't Number Path's (200, no writes)", async () => {
    const db = new FakeDb({ uniques });
    for (const s of [{ metadata: { product: "ai_pro" } }, { mode: "subscription" }, { metadata: {} }]) {
      expect((await handleStripeEvent(checkout(s), deps(db))).status).toBe(200);
    }
    expect(db.log.filter((l) => l.op !== "select")).toHaveLength(0);
  });
});

describe("stripe webhook: gifts", () => {
  const gift = (over: Record<string, unknown> = {}) =>
    checkout({ metadata: { kind: "gift" }, client_reference_id: null, ...over });

  it("mints and emails the code", async () => {
    const d = deps(new FakeDb({ uniques }));
    const out = await handleStripeEvent(gift(), d);
    expect(out.status).toBe(200);
    expect(d.sendEmail).toHaveBeenCalledOnce();
    const mail = vi.mocked(d.sendEmail).mock.calls[0][0];
    expect(mail.to).toBe("parent@example.com");
    expect(mail.text).toContain("NP-AAAA-BBBB");
    expect(mail.html).toContain("https://growingmindsscience.com/nsc/gift/card?code=NP-AAAA-BBBB");
  });

  it("answers 500 when no code could be minted, or minting throws", async () => {
    const nullCode = deps(new FakeDb(), { mintGiftCode: vi.fn(async () => null) });
    expect((await handleStripeEvent(gift(), nullCode)).status).toBe(500);
    const throws = deps(new FakeDb(), {
      mintGiftCode: vi.fn(async () => {
        throw new Error("db down");
      }),
    });
    expect((await handleStripeEvent(gift(), throws)).status).toBe(500);
  });

  it("retries a transient email failure but not a permanent rejection", async () => {
    const transient = deps(new FakeDb(), { sendEmail: vi.fn(async () => ({ ok: false, retryable: true })) });
    expect((await handleStripeEvent(gift(), transient)).status).toBe(500);
    const permanent = deps(new FakeDb(), { sendEmail: vi.fn(async () => ({ ok: false, retryable: false })) });
    expect((await handleStripeEvent(gift(), permanent)).status).toBe(200);
  });

  it("mints for a 100%-off gift too", async () => {
    const d = deps(new FakeDb());
    expect((await handleStripeEvent(gift({ payment_status: "no_payment_required" }), d)).status).toBe(200);
    expect(d.mintGiftCode).toHaveBeenCalledOnce();
  });
});

describe("stripe webhook: subscriptions", () => {
  const subEvent = (sub: Record<string, unknown>): Stripe.Event =>
    ({
      id: "evt_sub",
      type: "customer.subscription.updated",
      created: Date.UTC(2026, 6, 2) / 1000,
      data: {
        object: {
          id: "sub_1",
          status: "active",
          customer: "cus_1",
          cancel_at_period_end: false,
          metadata: { owner_id: "user-1" },
          items: {
            data: [
              {
                price: { id: "price_yr" },
                current_period_start: Date.UTC(2026, 6, 1) / 1000,
                current_period_end: Date.UTC(2027, 6, 1) / 1000,
              },
            ],
          },
          ...sub,
        },
      },
    }) as unknown as Stripe.Event;

  it("mirrors and grants a live membership", async () => {
    const db = new FakeDb({ uniques });
    expect((await handleStripeEvent(subEvent({}), deps(db))).status).toBe(200);
    expect(db.rows("subscriptions")).toMatchObject([{ user_id: "user-1", status: "active" }]);
    expect(db.rows("entitlements")).toMatchObject([{ product_scope: "membership", source_ref: "sub_1" }]);
  });

  it("caps a past_due renewal at 14 days from the unpaid period's start", async () => {
    const db = new FakeDb({ uniques });
    await handleStripeEvent(subEvent({ status: "past_due" }), deps(db));
    expect(db.rows("entitlements")[0].expires_at).toBe("2026-07-15T00:00:00.000Z");
  });

  it("reads a pre-Basil subscription-level period instead of granting forever", async () => {
    const db = new FakeDb({ uniques });
    await handleStripeEvent(
      subEvent({
        items: { data: [{ price: { id: "price_yr" } }] },
        current_period_start: Date.UTC(2026, 6, 1) / 1000,
        current_period_end: Date.UTC(2026, 7, 1) / 1000,
      }),
      deps(db),
    );
    expect(db.rows("entitlements")[0].expires_at).toBe("2026-08-04T00:00:00.000Z");
  });

  it("ignores non-membership prices without touching the database", async () => {
    const db = new FakeDb({ uniques });
    const out = await handleStripeEvent(
      subEvent({ items: { data: [{ price: { id: "price_other" } }] } }),
      deps(db),
    );
    expect(out.status).toBe(200);
    expect(db.log).toHaveLength(0);
  });

  it("answers 500 when the mirror write fails", async () => {
    const db = new FakeDb({ uniques }).fail("subscriptions", "upsert", { message: "down" });
    expect((await handleStripeEvent(subEvent({}), deps(db))).status).toBe(500);
  });
});
