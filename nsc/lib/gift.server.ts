import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { NSC_PRODUCT } from "@/lib/stripe";
import { makeGiftCode, normalizeGiftCode } from "@/lib/gift";

/**
 * Gift codes. Minted by the Stripe webhook on a paid gift checkout; redeemed
 * by a signed-in recipient, which grants the full-access entitlement by
 * writing an nsc_purchases row that reuses the gift's Stripe session id (so
 * the grant is tied to the real payment and stays idempotent).
 *
 * All access is service-role (RLS is on with no policies) — codes are never
 * queried from the browser.
 */

export { makeGiftCode, normalizeGiftCode };

/** Mint a code for a paid gift checkout. Idempotent on the Stripe session id. */
export async function mintGiftCode(opts: {
  sessionId: string;
  purchaserEmail: string | null;
  amountCents: number | null;
}): Promise<string | null> {
  const supabase = createServiceClient();

  // If this session already minted a code (webhook retry), return it.
  const { data: existing } = await supabase
    .from("nsc_gift_codes")
    .select("code")
    .eq("stripe_checkout_session_id", opts.sessionId)
    .maybeSingle();
  if (existing?.code) return existing.code;

  // Retry on the rare code collision (unique constraint).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeGiftCode();
    const { error } = await supabase.from("nsc_gift_codes").insert({
      code,
      product: NSC_PRODUCT,
      stripe_checkout_session_id: opts.sessionId,
      purchaser_email: opts.purchaserEmail,
      amount_cents: opts.amountCents,
    });
    if (!error) return code;
    // Unique violation on session id → another retry already inserted it.
    const { data: race } = await supabase
      .from("nsc_gift_codes")
      .select("code")
      .eq("stripe_checkout_session_id", opts.sessionId)
      .maybeSingle();
    if (race?.code) return race.code;
    // else assume code collision and loop to try a fresh code
  }
  return null;
}

/** The code minted for a Stripe session, if the webhook has run yet. */
export async function giftCodeForSession(sessionId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("nsc_gift_codes")
    .select("code")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  return data?.code ?? null;
}

export type RedeemResult =
  | { ok: true }
  | { ok: false; reason: "unknown" | "already_redeemed" | "already_owned" };

/**
 * Redeem a code for `ownerId`. Atomic: the code is claimed with a conditional
 * update (redeemed_by is null) so two simultaneous redeems can't both win.
 */
export async function redeemGiftCode(
  code: string,
  ownerId: string,
): Promise<RedeemResult> {
  const supabase = createServiceClient();
  const normalized = normalizeGiftCode(code);

  const { data: gift } = await supabase
    .from("nsc_gift_codes")
    .select("id, product, stripe_checkout_session_id, redeemed_by")
    .eq("code", normalized)
    .maybeSingle();
  if (!gift) return { ok: false, reason: "unknown" };
  if (gift.redeemed_by) return { ok: false, reason: "already_redeemed" };

  // Claim the code atomically — only succeeds if still unredeemed.
  const { data: claimed } = await supabase
    .from("nsc_gift_codes")
    .update({ redeemed_by: ownerId, redeemed_at: new Date().toISOString() })
    .eq("id", gift.id)
    .is("redeemed_by", null)
    .select("id");
  if (!claimed || claimed.length === 0) {
    return { ok: false, reason: "already_redeemed" };
  }

  // Grant entitlement, reusing the gift's session id (unique + ties to payment).
  const { error: grantErr } = await supabase.from("nsc_purchases").upsert(
    {
      owner_id: ownerId,
      product: gift.product,
      stripe_checkout_session_id: gift.stripe_checkout_session_id,
    },
    { onConflict: "stripe_checkout_session_id" },
  );
  if (grantErr) {
    // Roll the claim back so the recipient can retry rather than lose the gift.
    await supabase
      .from("nsc_gift_codes")
      .update({ redeemed_by: null, redeemed_at: null })
      .eq("id", gift.id);
    return { ok: false, reason: "unknown" };
  }
  return { ok: true };
}
