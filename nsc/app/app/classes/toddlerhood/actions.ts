"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { classSalesOpen, hasClassAccess } from "@/lib/classes.server";
import { TODDLER_COURSE } from "@/lib/classes";
import { stripe } from "@/lib/stripe";

export async function startClassCheckout() {
  const user = await requireAuth();
  if (await hasClassAccess(user.id)) redirect("/app/classes/toddlerhood");
  if (!(await classSalesOpen())) redirect("/app/classes/toddlerhood?error=not-open");
  const priceId = process.env.TODDLER_CLASS_PRICE_ID;
  if (!priceId) redirect("/app/classes/toddlerhood?error=checkout-unavailable");
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://growingmindsscience.com").replace(/\/+$/, "");
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { product: TODDLER_COURSE.product, owner_id: user.id },
    success_url: `${origin}/nsc/app/classes/toddlerhood/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/nsc/app/classes/toddlerhood`,
    allow_promotion_codes: true,
  });
  if (!session.url) redirect("/app/classes/toddlerhood?error=checkout-unavailable");
  redirect(session.url);
}
