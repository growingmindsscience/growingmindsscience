"use server";

import { redirect } from "next/navigation";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, ownedClassSlugs } from "@/lib/classes.server";
import { CLASS_BUNDLE } from "@/lib/classes";
import { stripe } from "@/lib/stripe";
import { siteOrigin } from "@/lib/site";

/** The bundle is for a parent who owns none of the classes yet; it never sells a class twice. */
export async function startBundleCheckout() {
  const user = await requireClassAuth("/app/classes/bundle/enroll");
  const owned = await ownedClassSlugs(user.id);
  if (CLASS_BUNDLE.courses.some((slug) => owned.includes(slug))) redirect("/app/classes?error=bundle-owned");
  const open = await Promise.all(CLASS_BUNDLE.courses.map((slug) => classSalesOpen(slug, user.id)));
  if (!open.every(Boolean)) redirect("/app/classes?error=not-open");
  const priceId = process.env.CLASS_BUNDLE_PRICE_ID;
  if (!priceId) redirect("/app/classes?error=checkout-unavailable");
  const origin = siteOrigin();
  let session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { product: CLASS_BUNDLE.product, owner_id: user.id },
      success_url: `${origin}/nsc/app/classes/bundle/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/nsc/app/classes`,
      allow_promotion_codes: true,
    });
  } catch (cause) {
    console.error("[class-checkout] could not create a bundle checkout session", cause);
    redirect("/app/classes?error=checkout-unavailable");
  }
  if (!session.url) redirect("/app/classes?error=checkout-unavailable");
  redirect(session.url);
}
