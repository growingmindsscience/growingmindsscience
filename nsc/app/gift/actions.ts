"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";

function normalizeOrigin(raw: string): string {
  let origin = raw.trim();
  if (origin && !/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
  return origin.replace(/\/+$/, "");
}

/**
 * Start a GIFT checkout. No account required — Stripe collects the buyer's
 * email. The `kind: "gift"` metadata tells the webhook to mint a redemption
 * code instead of granting the buyer access.
 */
export async function startGiftCheckout() {
  const priceId = process.env.NSC_PRICE_ID;
  if (!priceId) redirect("/gift?error=Gifting+is+not+configured+yet.");

  const hdrs = await headers();
  const origin = normalizeOrigin(
    process.env.NEXT_PUBLIC_SITE_URL ||
      `https://${hdrs.get("host") ?? "growingmindsscience.com"}`,
  );

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { kind: "gift" },
    success_url: `${origin}/nsc/gift/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/nsc/gift`,
    allow_promotion_codes: true,
  });

  if (!session.url) redirect("/gift?error=Could+not+start+checkout.");
  redirect(session.url);
}
