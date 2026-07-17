import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { applyGrants } from "@/lib/entitlements.server";
import { grantsForSubscription, type PriceConfig } from "@/lib/grants";

/**
 * Link a user's pre-existing Stripe purchases to their new Supabase account.
 *
 * Why this exists: subscriptions bought on the legacy parent site (AI Pro
 * $9/mo) were created by Stripe Checkout with no site account — the webhook
 * had no user id to grant to. When such a customer later signs up here with
 * the SAME email, this reconciles by email: it finds their live Stripe
 * subscriptions and writes the additive membership grant keyed to their new
 * user id, exactly as the webhook would have.
 *
 * Scope + limits:
 *  - Subscriptions only. Standalone Number Path one-time buys already grant at
 *    checkout via client_reference_id, so there's nothing to recover. The
 *    legacy $49 class bundle lives on Thinkific, not Stripe, so it cannot be
 *    recovered here — that unlock stays on the emailed access-code path.
 *  - Email match is the identity link. Stripe email is not identity-verified,
 *    but the caller only invokes this for the *authenticated* user's own
 *    verified Supabase email, so the join is sound.
 *  - Idempotent: applyGrants upserts on (user, scope, source, ref); the
 *    subscriptions mirror upserts on stripe_subscription_id. Safe to re-run.
 *  - Best-effort: any Stripe/DB error is swallowed. A failed backfill must
 *    never block sign-in; the user can still buy, and a later webhook (e.g. a
 *    renewal) will grant then.
 *
 * Returns the number of subscription grants applied (0 when nothing matched).
 */
export async function backfillEntitlementsForUser(
  userId: string,
  email: string,
): Promise<number> {
  const normalized = email.trim().toLowerCase();
  if (!userId || !normalized) return 0;

  const prices: PriceConfig = {
    membershipMonthly: process.env.MEMBERSHIP_PRICE_MONTHLY,
    membershipAnnual: process.env.MEMBERSHIP_PRICE_ANNUAL,
    legacyAiPro: process.env.LEGACY_AI_PRO_PRICE,
  };
  // Nothing to map onto membership → skip the Stripe round-trip entirely.
  if (!prices.membershipMonthly && !prices.membershipAnnual && !prices.legacyAiPro) {
    return 0;
  }

  let service: SupabaseClient;
  try {
    service = createServiceClient();
  } catch {
    return 0;
  }

  let applied = 0;
  try {
    const client = stripe();
    const customers = await client.customers.list({ email: normalized, limit: 10 });

    for (const customer of customers.data) {
      const subs = await client.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 20,
      });

      for (const sub of subs.data) {
        const item = sub.items?.data?.[0];
        const priceId = item?.price?.id ?? "";
        // Basil-era API: period end lives on the item, in seconds.
        const periodEndSec =
          (item as { current_period_end?: number } | undefined)?.current_period_end ?? null;
        const periodEnd = periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null;

        const grants = grantsForSubscription({
          subscriptionId: sub.id,
          priceId,
          status: sub.status,
          currentPeriodEnd: periodEnd,
          prices,
        });
        if (grants.length === 0) continue; // not a membership price, or lapsed

        await service.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: customer.id,
            price_id: priceId,
            status: sub.status,
            current_period_end: periodEnd,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" },
        );
        await applyGrants(service, userId, grants);
        applied += grants.length;
      }
    }
  } catch {
    return applied;
  }

  return applied;
}
