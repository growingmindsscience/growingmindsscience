import { describe, expect, it } from "vitest";
import { ownsToddlerClass, transcriptParagraphs, validClassPayment } from "@/lib/classes";

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

describe("transcript paragraphs", () => {
  const captions = [
    "Welcome. If you're here, you are probably somewhere in the first year with a",
    "baby or about to be.",
    "Maybe you're watching this at three in the morning with a sleeping infant on",
    "your chest.",
    "Maybe you're watching it in pieces five minutes at a time between feeds.",
    "However, you got here,",
    "I'm glad you're here. This class is about the first year of life. And it starts",
    "with a simple",
    "question. What is actually going on inside a newborn?",
  ].join("\n");

  it("reflows caption lines into paragraphs with no mid-sentence breaks", () => {
    const paragraphs = transcriptParagraphs(captions);
    expect(paragraphs.length).toBeGreaterThan(1);
    expect(paragraphs.join(" ")).not.toContain("\n");
    expect(paragraphs[0].startsWith("Welcome. If you're here, you are probably somewhere in the first year with a baby or about to be.")).toBe(true);
    // No words lost or added.
    expect(paragraphs.join(" ")).toBe(captions.replace(/\n/g, " "));
    for (const paragraph of paragraphs) expect(/[.?!]$/.test(paragraph)).toBe(true);
  });

  it("keeps an author's blank-line paragraph breaks", () => {
    expect(transcriptParagraphs("One line\nwrapped.\n\nSecond paragraph.")).toEqual(["One line wrapped.", "Second paragraph."]);
  });

  it("returns nothing for an empty transcript", () => {
    expect(transcriptParagraphs("")).toEqual([]);
    expect(transcriptParagraphs(null)).toEqual([]);
  });
});
