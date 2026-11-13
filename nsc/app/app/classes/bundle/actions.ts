"use server";

import { redirect } from "next/navigation";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, ownedClassSlugs } from "@/lib/classes.server";
import { CLASS_BUNDLE, CLASS_BUNDLE_FOUR, type ClassBundle } from "@/lib/classes";
import { stripe } from "@/lib/stripe";
import { siteOrigin } from "@/lib/site";

/** Each bundle has its own Stripe price; the two are never interchangeable. */
const PRICE_VARIABLE = { bundle: "CLASS_BUNDLE_PRICE_ID", "all-four": "CLASS_BUNDLE_FOUR_PRICE_ID" } as const;

/** The three age classes, $119. */
export async function startBundleCheckout() {
  await startCheckout(CLASS_BUNDLE);
}

/** All four classes, $159. */
export async function startAllFourCheckout() {
  await startCheckout(CLASS_BUNDLE_FOUR);
}

/** A bundle is for a parent who owns none of its classes yet; it never sells a class twice. */
async function startCheckout(bundle: ClassBundle) {
  const user = await requireClassAuth(`/app/classes/${bundle.slug}/enroll`);
  const owned = await ownedClassSlugs(user.id);
  if (bundle.courses.some((slug) => owned.includes(slug))) redirect("/app/classes?error=bundle-owned");
  const open = await Promise.all(bundle.courses.map((slug) => classSalesOpen(slug, user.id)));
  if (!open.every(Boolean)) redirect("/app/classes?error=not-open");
  const priceId = process.env[PRICE_VARIABLE[bundle.slug]];
  if (!priceId) redirect("/app/classes?error=checkout-unavailable");
  const origin = siteOrigin();
  let session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { product: bundle.product, owner_id: user.id },
      success_url: `${origin}/nsc/app/classes/${bundle.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/nsc/app/classes`,
      allow_promotion_codes: true,
    });
  } catch (cause) {
    console.error(`[class-checkout] could not create a ${bundle.slug} checkout session`, cause);
    redirect("/app/classes?error=checkout-unavailable");
  }
  if (!session.url) redirect("/app/classes?error=checkout-unavailable");
  redirect(session.url);
}
