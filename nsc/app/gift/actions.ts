"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { stripe, NSC_PRODUCT } from "@/lib/stripe";
import { siteOrigin } from "@/lib/site";

/**
 * Start a GIFT checkout. No account required — Stripe collects the buyer's
 * email. The `kind: "gift"` metadata tells the webhook to mint a redemption
 * code instead of granting the buyer access.
 */
export async function startGiftCheckout() {
  const priceId = process.env.NSC_PRICE_ID;
  if (!priceId) redirect("/gift?error=Gifting+is+not+configured+yet.");

  const hdrs = await headers();
  const origin = siteOrigin(`https://${hdrs.get("host") ?? "growingmindsscience.com"}`);

  let url: string | null = null;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { kind: "gift", product: NSC_PRODUCT },
      success_url: `${origin}/nsc/gift/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/nsc/gift`,
      allow_promotion_codes: true,
    });
    url = session.url;
  } catch (err) {
    console.error(`[gift] checkout create failed: ${(err as Error).message}`);
  }

  if (!url) redirect("/gift?error=We+couldn%27t+start+checkout.+Please+try+again.");
  redirect(url);
}
