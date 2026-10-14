import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { applyGrants } from "@/lib/entitlement-writes";
import { claimLegacyClassPurchases, type ClaimingUser } from "@/lib/legacy-class-claims";
import {
  grantsForSubscription,
  subscriptionPeriod,
  type PriceConfig,
  type SubscriptionPeriodSource,
} from "@/lib/grants";

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
 *    legacy $49 class bundle was sold on Thinkific, not Stripe, so it cannot
 *    be recovered here; claimThinkificPurchases (below) links those buyers.
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
        const priceId = sub.items?.data?.[0]?.price?.id ?? "";
        // Item-level period (Basil API) with the subscription-level fallback.
        const period = subscriptionPeriod(sub as unknown as SubscriptionPeriodSource);

        const grants = grantsForSubscription({
          subscriptionId: sub.id,
          priceId,
          status: sub.status,
          currentPeriodEnd: period.end,
          currentPeriodStart: period.start,
          prices,
        });
        if (grants.length === 0) continue; // not a membership price, or lapsed

        const { error: mirrorErr } = await service.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: customer.id,
            price_id: priceId,
            status: sub.status,
            current_period_end: period.end,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" },
        );
        if (mirrorErr) throw new Error(`subscriptions upsert failed: ${mirrorErr.message}`);
        await applyGrants(service, userId, grants);
        applied += grants.length;
      }
    }
  } catch {
    return applied;
  }

  return applied;
}

/**
 * Link a Thinkific toddler-class order imported for this account's confirmed
 * email (see claimLegacyClassPurchases). Best-effort: an error never blocks
 * sign-in, and an unclaimed order is tried again at the next sign-in.
 */
export async function claimThinkificPurchases(user: ClaimingUser): Promise<number> {
  try {
    return await claimLegacyClassPurchases(createServiceClient(), user);
  } catch (err) {
    console.error(`[backfill] Thinkific claim failed: ${(err as Error).message}`);
    return 0;
  }
}
