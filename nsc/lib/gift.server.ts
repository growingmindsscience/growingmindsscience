import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { NSC_PRODUCT } from "@/lib/stripe";
import {
  giftCodeForSessionWith,
  makeGiftCode,
  mintGiftCodeWith,
  normalizeGiftCode,
  redeemGiftCodeWith,
  type RedeemResult,
} from "@/lib/gift";

/**
 * Gift codes, bound to the service-role client. Minted by the Stripe webhook
 * on a paid gift checkout; redeemed by a signed-in recipient. The flows live
 * in lib/gift.ts (client injected, unit-tested).
 */

export { makeGiftCode, normalizeGiftCode, type RedeemResult };

/** Mint a code for a paid gift checkout. Throws on a database error. */
export function mintGiftCode(opts: {
  sessionId: string;
  purchaserEmail: string | null;
  amountCents: number | null;
}): Promise<string | null> {
  return mintGiftCodeWith(createServiceClient(), { ...opts, product: NSC_PRODUCT });
}

/** The code minted for a Stripe session, if the webhook has run yet. */
export function giftCodeForSession(sessionId: string): Promise<string | null> {
  return giftCodeForSessionWith(createServiceClient(), sessionId);
}

/** Redeem a code for `ownerId` (atomic claim, rollback on a failed grant). */
export function redeemGiftCode(code: string, ownerId: string): Promise<RedeemResult> {
  return redeemGiftCodeWith(createServiceClient(), code, ownerId);
}
