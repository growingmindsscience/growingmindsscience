"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { stripe, NSC_PRODUCT } from "@/lib/stripe";

/**
 * Create a one-time Stripe Checkout session for the full-access SKU and send
 * the parent to Stripe. client_reference_id carries the user id so the webhook
 * can grant the entitlement to the right owner.
 */
export async function startCheckout() {
  const user = await requireAuth();

  const priceId = process.env.NSC_PRICE_ID;
  if (!priceId) {
    redirect("/app/upgrade?error=Checkout+is+not+configured+yet.");
  }

  const hdrs = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `https://${hdrs.get("host") ?? "growingmindsscience.com"}`;

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { product: NSC_PRODUCT, owner_id: user.id },
    success_url: `${origin}/nsc/app/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/nsc/app/upgrade`,
    allow_promotion_codes: true,
  });

  if (!session.url) redirect("/app/upgrade?error=Could+not+start+checkout.");
  redirect(session.url);
}
