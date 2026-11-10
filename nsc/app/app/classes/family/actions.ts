"use server";

import { redirect } from "next/navigation";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, hasClassAccess } from "@/lib/classes.server";
import { FAMILY_COURSE } from "@/lib/classes";
import { stripe } from "@/lib/stripe";
import { siteOrigin } from "@/lib/site";

export async function startFamilyClassCheckout() {
  const user = await requireClassAuth("/app/classes/family");
  if (await hasClassAccess(user.id, FAMILY_COURSE.slug)) redirect("/app/classes/family");
  if (!(await classSalesOpen(FAMILY_COURSE.slug, user.id))) redirect("/app/classes/family?error=not-open");
  const priceId = process.env.FAMILY_CLASS_PRICE_ID;
  if (!priceId) redirect("/app/classes/family?error=checkout-unavailable");
  const origin = siteOrigin();
  let session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { product: FAMILY_COURSE.product, owner_id: user.id },
      success_url: `${origin}/nsc/app/classes/family/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/nsc/app/classes/family`,
      allow_promotion_codes: true,
    });
  } catch (cause) {
    console.error("[class-checkout] could not create a checkout session", cause);
    redirect("/app/classes/family?error=checkout-unavailable");
  }
  if (!session.url) redirect("/app/classes/family?error=checkout-unavailable");
  redirect(session.url);
}
