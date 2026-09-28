import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyGrants } from "@/lib/entitlement-writes";
import {
  grantsForOneTimePurchase,
  grantsForSubscription,
  isMembershipPrice,
  subscriptionPeriod,
  type PriceConfig,
  type SubscriptionPeriodSource,
} from "@/lib/grants";

/**
 * Stripe webhook event handling, separated from the route so it can be
 * unit-tested with an injected database and side effects. The route only
 * verifies the signature over the raw body and maps the outcome to HTTP.
 *
 * Retry contract: any failed write answers 500 so Stripe redelivers the
 * event. Every write is an idempotent upsert keyed on a Stripe id, so a
 * redelivery can never double-grant. Events that are not ours, or not yet
 * payable, answer 200 so Stripe stops retrying them.
 */

export interface WebhookDeps {
  /** Service-role client (writes bypass RLS by design). */
  db: Pick<SupabaseClient, "from">;
  mintGiftCode(opts: {
    sessionId: string;
    purchaserEmail: string | null;
    amountCents: number | null;
  }): Promise<string | null>;
  sendEmail(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ ok: boolean; skipped?: boolean; retryable?: boolean }>;
  prices: PriceConfig;
  /** Public origin for links in emails (lib/site siteOrigin()). */
  site: string;
}

export interface WebhookOutcome {
  status: 200 | 500;
  body: Record<string, unknown>;
}

/** Products that live in nsc_purchases (its check constraint's list). */
const PURCHASE_TABLE_PRODUCTS = new Set(["numberpath_full", "numberpath_printables"]);

const CHECKOUT_EVENTS = new Set([
  "checkout.session.completed",
  // Delayed methods (bank debits) complete as "unpaid" and succeed later.
  "checkout.session.async_payment_succeeded",
]);

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

type CheckoutSessionLike = Pick<
  Stripe.Checkout.Session,
  | "id"
  | "mode"
  | "payment_status"
  | "metadata"
  | "client_reference_id"
  | "amount_total"
  | "payment_intent"
  | "customer_details"
  | "customer_email"
>;

/**
 * Ready to fulfill: Stripe says paid, or no payment was needed at all
 * (a 100%-off promotion code completes as "no_payment_required").
 */
export function isFulfillable(session: Pick<CheckoutSessionLike, "payment_status">): boolean {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

export type CheckoutPlan =
  | { kind: "gift" }
  | { kind: "purchase"; ownerId: string; product: string }
  | { kind: "ignore"; reason: string };

/** What a completed Checkout Session asks of us. Pure. */
export function planCheckout(session: CheckoutSessionLike): CheckoutPlan {
  if (session.mode !== "payment") return { kind: "ignore", reason: "not a one-time payment" };
  if (!isFulfillable(session)) return { kind: "ignore", reason: "payment not settled yet" };
  if (session.metadata?.kind === "gift") return { kind: "gift" };

  // Never guess the product: every session this app creates labels it, and
  // other checkouts on the same Stripe account reach this endpoint too.
  const product = session.metadata?.product;
  if (!product) return { kind: "ignore", reason: "no product metadata" };
  if (grantsForOneTimePurchase({ sessionId: session.id, product }).length === 0) {
    return { kind: "ignore", reason: `unknown product ${product}` };
  }
  const ownerId = session.client_reference_id ?? session.metadata?.owner_id;
  if (!ownerId) return { kind: "ignore", reason: "no owner" };
  return { kind: "purchase", ownerId, product };
}

/** The gift-code email (plain words, no urgency). */
export function giftEmail(code: string, site: string): { subject: string; html: string; text: string } {
  const cardUrl = `${site}/nsc/gift/card?code=${encodeURIComponent(code)}`;
  const redeemUrl = `${site}/nsc/redeem`;
  const html = `<!doctype html><html><body style="margin:0;background:#F0F5F3;font-family:Georgia,serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <p style="margin:0 0 20px;color:#1E5F62;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif">Number Path</p>
    <div style="background:#fff;border:1px solid #CFE3DE;border-radius:16px;padding:28px 24px">
      <h1 style="margin:0 0 16px;color:#0E2A2D;font-size:22px">Your gift is ready</h1>
      <p style="margin:0 0 14px;color:#15393C;font-size:16px;line-height:1.55">Here&rsquo;s the code to give:</p>
      <p style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:26px;font-weight:bold;letter-spacing:3px;color:#1E5F62">${code}</p>
      <p style="margin:0 0 20px;color:#15393C;font-size:16px;line-height:1.55">The family redeems it whenever they&rsquo;re ready, and it&rsquo;s theirs for good. No subscription, nothing to cancel.</p>
      <a href="${cardUrl}" style="display:inline-block;background:#1E5F62;color:#fff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-weight:bold;padding:12px 24px;border-radius:999px">Print a gift card</a>
      <p style="margin:16px 0 0;color:#3D5A5A;font-size:13px;font-family:Helvetica,Arial,sans-serif">Or send them straight to <a href="${redeemUrl}" style="color:#1E5F62">${redeemUrl}</a></p>
    </div>
  </div>
</body></html>`;
  const text = `Your Number Path gift is ready.\n\nCode to give: ${code}\n\nThe family redeems it at ${redeemUrl} whenever they're ready. It's theirs for good, no subscription.\n\nPrintable card: ${cardUrl}\n`;
  return { subject: "Your Number Path gift code", html, text };
}

const ok = (body: Record<string, unknown>): WebhookOutcome => ({ status: 200, body });

async function handleCheckout(
  session: CheckoutSessionLike,
  deps: WebhookDeps,
): Promise<WebhookOutcome> {
  const plan = planCheckout(session);
  if (plan.kind === "ignore") return ok({ received: true, ignored: plan.reason });

  if (plan.kind === "gift") {
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    const code = await deps.mintGiftCode({
      sessionId: session.id,
      purchaserEmail: email,
      amountCents: session.amount_total ?? null,
    });
    if (!code) throw new Error("gift code could not be minted");
    if (email) {
      const sent = await deps.sendEmail({ to: email, ...giftEmail(code, deps.site) });
      // A retry re-mints nothing (idempotent) and resends the email. A
      // permanent rejection (bad address) would fail forever, so it is logged
      // instead; the code is still on the success page.
      if (!sent.ok && sent.retryable) throw new Error("gift email failed (retryable)");
      if (!sent.ok) console.error(`[stripe-webhook] gift email rejected for ${session.id}`);
    }
    return ok({ received: true, gift: true });
  }

  if (PURCHASE_TABLE_PRODUCTS.has(plan.product)) {
    const { error } = await deps.db.from("nsc_purchases").upsert(
      {
        owner_id: plan.ownerId,
        product: plan.product,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        amount_cents: session.amount_total ?? null,
      },
      { onConflict: "stripe_checkout_session_id" },
    );
    if (error) throw new Error(`nsc_purchases upsert failed: ${error.message}`);
  }
  // Phase 0 spine: mirror the purchase as an additive entitlement grant.
  await applyGrants(
    deps.db,
    plan.ownerId,
    grantsForOneTimePurchase({ sessionId: session.id, product: plan.product }),
  );
  return ok({ received: true, granted: plan.product });
}

async function handleSubscription(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookOutcome> {
  const sub = event.data.object as Stripe.Subscription;
  const priceId = sub.items?.data?.[0]?.price?.id ?? "";
  // Unset prices (membership SKUs not created yet) make this a no-op, and
  // other subscriptions on the account (e.g. legacy products) are not ours.
  if (!isMembershipPrice(priceId, deps.prices)) {
    return ok({ received: true, ignored: "not a membership price" });
  }

  // Prefer explicit metadata (set by our checkout); fall back to the mirror
  // row a prior event or the sign-in backfill created.
  let userId: string | null = sub.metadata?.owner_id ?? null;
  if (!userId) {
    const { data, error } = await deps.db
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", sub.id)
      .maybeSingle();
    if (error) throw new Error(`subscriptions lookup failed: ${error.message}`);
    userId = (data?.user_id as string | undefined) ?? null;
  }
  if (!userId) return ok({ received: true, ignored: "no linked account" });

  const period = subscriptionPeriod(sub as unknown as SubscriptionPeriodSource);
  const { error: mirrorErr } = await deps.db.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id:
        typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
      price_id: priceId,
      status: sub.status,
      current_period_end: period.end,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (mirrorErr) throw new Error(`subscriptions upsert failed: ${mirrorErr.message}`);

  await applyGrants(
    deps.db,
    userId,
    grantsForSubscription({
      subscriptionId: sub.id,
      priceId,
      status: sub.status,
      currentPeriodEnd: period.end,
      currentPeriodStart: period.start,
      prices: deps.prices,
      // Anchor for the past_due cap when the period start is missing: the
      // event's own time, so a late redelivery can't extend access.
      now: new Date(event.created * 1000),
    }),
  );
  return ok({ received: true, subscription: sub.status });
}

/** Handle one verified Stripe event. Never throws. */
export async function handleStripeEvent(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookOutcome> {
  try {
    if (CHECKOUT_EVENTS.has(event.type)) {
      return await handleCheckout(event.data.object as CheckoutSessionLike, deps);
    }
    if (SUBSCRIPTION_EVENTS.has(event.type)) {
      return await handleSubscription(event, deps);
    }
    return ok({ received: true, ignored: event.type });
  } catch (err) {
    console.error(`[stripe-webhook] ${event.type} ${event.id}: ${(err as Error).message}`);
    return { status: 500, body: { error: "processing failed; Stripe will retry" } };
  }
}
