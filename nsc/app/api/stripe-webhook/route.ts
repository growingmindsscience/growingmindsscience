import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe, NSC_PRODUCT } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

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
    }
  }

  return NextResponse.json({ received: true });
}
