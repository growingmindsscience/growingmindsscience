import { describe, expect, it } from "vitest";
import { ownsToddlerClass, validClassPayment } from "@/lib/classes";

const now = new Date("2026-09-27T12:00:00Z");

describe("class ownership", () => {
  it("does not treat a shared access code as a purchase", () => {
    expect(ownsToddlerClass([{ source: "comp", source_ref: "class-access-code", expires_at: null }], now)).toBe(false);
  });

  it("accepts a verified lifetime purchase or migrated buyer", () => {
    expect(ownsToddlerClass([{ source: "stripe_otp_legacy", source_ref: "cs_123", expires_at: null }], now)).toBe(true);
    expect(ownsToddlerClass([{ source: "comp", source_ref: "thinkific:order-123", expires_at: null }], now)).toBe(true);
  });

  it("honors expiry without hiding a separate valid grant", () => {
    expect(ownsToddlerClass([{ source: "stripe_otp_legacy", source_ref: "cs_123", expires_at: "2026-09-26T12:00:00Z" }], now)).toBe(false);
    expect(ownsToddlerClass([
      { source: "stripe_otp_legacy", source_ref: "cs_123", expires_at: "2026-09-26T12:00:00Z" },
      { source: "comp", source_ref: "thinkific:order-123", expires_at: null },
    ], now)).toBe(true);
  });
});

describe("class checkout proof", () => {
  const paid = {
    mode: "payment", paymentStatus: "paid", amountTotal: 4900, product: "class_bundle_toddlerhood",
    ownerId: "user-1", metadataOwnerId: "user-1",
    lineItems: [{ priceId: "price_toddler", quantity: 1 }], expectedPriceId: "price_toddler",
    expectedProduct: "class_bundle_toddlerhood",
  };
  it("accepts only the paid, account-bound configured class price", () => {
    expect(validClassPayment(paid)).toBe(true);
    expect(validClassPayment({ ...paid, paymentStatus: "unpaid" })).toBe(false);
    expect(validClassPayment({ ...paid, ownerId: "user-2" })).toBe(false);
    expect(validClassPayment({ ...paid, lineItems: [{ priceId: "price_numberpath", quantity: 1 }] })).toBe(false);
    expect(validClassPayment({ ...paid, lineItems: [{ priceId: "price_toddler", quantity: 2 }] })).toBe(false);
    expect(validClassPayment({ ...paid, lineItems: [...paid.lineItems, ...paid.lineItems] })).toBe(false);
    expect(validClassPayment({ ...paid, product: "class_infant" })).toBe(false);
  });

  it("accepts the infant price for an infant order, including a full discount", () => {
    const infant = { ...paid, product: "class_infant", expectedProduct: "class_infant",
      lineItems: [{ priceId: "price_infant", quantity: 1 }], expectedPriceId: "price_infant" };
    expect(validClassPayment(infant)).toBe(true);
    expect(validClassPayment({ ...infant, paymentStatus: "no_payment_required", amountTotal: 0 })).toBe(true);
    expect(validClassPayment({ ...infant, paymentStatus: "no_payment_required", amountTotal: 4900 })).toBe(false);
  });
});
