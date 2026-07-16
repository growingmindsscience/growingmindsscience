import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe, NSC_PRODUCT } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { mintGiftCode } from "@/lib/gift.server";
import { sendEmail } from "@/lib/email.server";
import { applyGrants } from "@/lib/entitlements.server";
import {
  grantsForOneTimePurchase,
  grantsForSubscription,
  type PriceConfig,
} from "@/lib/grants";

/** Membership price wiring (plan 2.2). Unset env → no subscription grants,
 * so deploying ahead of the Stripe SKUs is a safe no-op. */
function pricesFromEnv(): PriceConfig {
  return {
    membershipMonthly: process.env.MEMBERSHIP_PRICE_MONTHLY,
    membershipAnnual: process.env.MEMBERSHIP_PRICE_ANNUAL,
    legacyAiPro: process.env.LEGACY_AI_PRO_PRICE,
  };
}

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://growingmindsscience.com").replace(
  /\/+$/,
  "",
);

/**
 * Stripe webhook — grants the full-access entitlement on a completed one-time
 * checkout. Public (no session): authenticity comes from the signature, and
 * the row is written with the service-role client. Idempotent via the unique
 * stripe_checkout_session_id.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Gift purchase: mint a redemption code instead of granting the buyer
    // access, and email the buyer the code + a printable card.
    if (session.metadata?.kind === "gift" && session.payment_status === "paid") {
      const email = session.customer_details?.email ?? null;
      const code = await mintGiftCode({
        sessionId: session.id,
        purchaserEmail: email,
        amountCents: session.amount_total ?? null,
      });
      if (code && email) {
        const cardUrl = `${SITE}/nsc/gift/card?code=${code}`;
        const redeemUrl = `${SITE}/nsc/redeem`;
        const html = `<!doctype html><html><body style="margin:0;background:#F0F5F3;font-family:Georgia,serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <p style="margin:0 0 20px;color:#1E5F62;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif">Number Path</p>
    <div style="background:#fff;border:1px solid #CFE3DE;border-radius:16px;padding:28px 24px">
      <h1 style="margin:0 0 16px;color:#0E2A2D;font-size:22px">Your gift is ready</h1>
      <p style="margin:0 0 14px;color:#15393C;font-size:16px;line-height:1.55">Here&rsquo;s the code to give:</p>
      <p style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:26px;font-weight:bold;letter-spacing:3px;color:#1E5F62">${code}</p>
      <p style="margin:0 0 20px;color:#15393C;font-size:16px;line-height:1.55">The family redeems it whenever they&rsquo;re ready, and it&rsquo;s theirs for good — no subscription, nothing to cancel.</p>
      <a href="${cardUrl}" style="display:inline-block;background:#1E5F62;color:#fff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-weight:bold;padding:12px 24px;border-radius:999px">Print a gift card</a>
      <p style="margin:16px 0 0;color:#2E7A77;font-size:13px;font-family:Helvetica,Arial,sans-serif">Or send them straight to <a href="${redeemUrl}" style="color:#2E7A77">${redeemUrl}</a></p>
    </div>
  </div>
</body></html>`;
        const text = `Your Number Path gift is ready.\n\nCode to give: ${code}\n\nThe family redeems it at ${redeemUrl} whenever they're ready — theirs for good, no subscription.\n\nPrintable card: ${cardUrl}\n`;
        await sendEmail({ to: email, subject: "Your Number Path gift code", html, text });
      }
      return NextResponse.json({ received: true });
    }

    const ownerId = session.client_reference_id ?? session.metadata?.owner_id;
    const product = session.metadata?.product ?? NSC_PRODUCT;

    if (ownerId && session.payment_status === "paid") {
      const supabase = createServiceClient();
      // upsert on the unique session id → double-delivery is a no-op
      await supabase
        .from("nsc_purchases")
        .upsert(
          {
            owner_id: ownerId,
            product,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,
            amount_cents: session.amount_total ?? null,
          },
          { onConflict: "stripe_checkout_session_id" },
        );
      // Phase 0 spine: mirror the purchase as an additive entitlement grant.
      await applyGrants(
        supabase,
        ownerId,
        grantsForOneTimePurchase({ sessionId: session.id, product }),
      );
    }
  }

  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    const sub = event.data.object as Stripe.Subscription;
    const supabase = createServiceClient();

    // Prefer explicit metadata (set by our checkout); fall back to the
    // mirror row a prior event created.
    let userId = sub.metadata?.owner_id ?? null;
    if (!userId) {
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();
      userId = data?.user_id ?? null;
    }

    if (userId) {
      const item = sub.items?.data?.[0];
      const priceId = item?.price?.id ?? "";
      // Basil-era API: current_period_end lives on the item, in seconds.
      const periodEndSec = item?.current_period_end ?? null;
      const periodEnd = periodEndSec
        ? new Date(periodEndSec * 1000).toISOString()
        : null;

      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id:
            typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
          price_id: priceId,
          status: sub.status,
          current_period_end: periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );

      await applyGrants(
        supabase,
        userId,
        grantsForSubscription({
          subscriptionId: sub.id,
          priceId,
          status: sub.status,
          currentPeriodEnd: periodEnd,
          prices: pricesFromEnv(),
        }),
      );
    }
  }

  return NextResponse.json({ received: true });
}
