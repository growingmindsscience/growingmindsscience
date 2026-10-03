"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { stripe, NSC_PRODUCT } from "@/lib/stripe";
import { siteOrigin } from "@/lib/site";

/**
 * Create a one-time Stripe Checkout session for the full-access SKU and send
 * the parent to Stripe. client_reference_id carries the user id so the webhook
 * can grant the entitlement to the right owner; metadata.product labels the
 * session (the webhook never guesses a product).
 */
export async function startCheckout() {
  const user = await requireAuth();

  const priceId = process.env.NSC_PRICE_ID;
  if (!priceId) {
    redirect("/app/upgrade?error=Checkout+is+not+configured+yet.");
  }

  const hdrs = await headers();
  const origin = siteOrigin(`https://${hdrs.get("host") ?? "growingmindsscience.com"}`);

  let url: string | null = null;
  try {
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
    url = session.url;
  } catch (err) {
    console.error(`[checkout] session create failed: ${(err as Error).message}`);
  }

  if (!url) redirect("/app/upgrade?error=We+couldn%27t+start+checkout.+Please+try+again.");
  redirect(url);
}
