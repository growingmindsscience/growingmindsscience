import Stripe from "stripe";

/** Server-only Stripe client. Lazily constructed so a missing key fails at use, not import. */
let cached: Stripe | null = null;
export function stripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    cached = new Stripe(key);
  }
  return cached;
}

export const NSC_PRODUCT = "numberpath_full" as const;

/** Display price. Decided 2026-07-10: $39 one-time (Matthew). */
export const PRICE_DISPLAY = process.env.NEXT_PUBLIC_NSC_PRICE_DISPLAY ?? "$39";
