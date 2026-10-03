"use server";

import { redirect } from "next/navigation";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, hasClassAccess } from "@/lib/classes.server";
import { INFANT_COURSE } from "@/lib/classes";
import { stripe } from "@/lib/stripe";

export async function startInfantClassCheckout() {
  const user = await requireClassAuth("/app/classes/infant");
  if (await hasClassAccess(user.id, INFANT_COURSE.slug)) redirect("/app/classes/infant");
  if (!(await classSalesOpen(INFANT_COURSE.slug, user.id))) redirect("/app/classes/infant?error=not-open");
  const priceId = process.env.INFANT_CLASS_PRICE_ID;
  if (!priceId) redirect("/app/classes/infant?error=checkout-unavailable");
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://growingmindsscience.com").replace(/\/+$/, "");
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { product: INFANT_COURSE.product, owner_id: user.id },
    success_url: `${origin}/nsc/app/classes/infant/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/nsc/app/classes/infant`,
    allow_promotion_codes: true,
  });
  if (!session.url) redirect("/app/classes/infant?error=checkout-unavailable");
  redirect(session.url);
}
