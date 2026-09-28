import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { mintGiftCode } from "@/lib/gift.server";
import { sendEmail } from "@/lib/email.server";
import { siteOrigin } from "@/lib/site";
import { handleStripeEvent } from "@/lib/stripe-webhook";
import type { PriceConfig } from "@/lib/grants";

/** Membership price wiring (plan 2.2). Unset env → no subscription grants,
 * so deploying ahead of the Stripe SKUs is a safe no-op. */
function pricesFromEnv(): PriceConfig {
  return {
    membershipMonthly: process.env.MEMBERSHIP_PRICE_MONTHLY,
    membershipAnnual: process.env.MEMBERSHIP_PRICE_ANNUAL,
    legacyAiPro: process.env.LEGACY_AI_PRO_PRICE,
  };
}

/**
 * Stripe webhook. Public (no session): authenticity comes from the signature
 * over the exact raw body, and rows are written with the service-role
 * client. Event handling lives in lib/stripe-webhook.ts; any failed write
 * answers 500 so Stripe retries (every write is an idempotent upsert).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });

  let client: Stripe;
  try {
    client = stripe();
  } catch {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  let db: ReturnType<typeof createServiceClient>;
  try {
    db = createServiceClient();
  } catch {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const outcome = await handleStripeEvent(event, {
    db,
    mintGiftCode,
    sendEmail,
    prices: pricesFromEnv(),
    site: siteOrigin(),
  });
  return NextResponse.json(outcome.body, { status: outcome.status });
}
