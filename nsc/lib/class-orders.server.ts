import "server-only";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { applyGrants } from "@/lib/entitlements.server";
import { grantsForOneTimePurchase } from "@/lib/grants";
import { CLASS_COURSES, TODDLER_COURSE, courseForProduct, isClassCourseSlug, validClassPayment } from "@/lib/classes";
import { stripe } from "@/lib/stripe";

/** A signed Stripe event is necessary; price verification is an additional guard. */
export async function fulfillClassCheckout(session: Stripe.Checkout.Session) {
  const course = courseForProduct(session.metadata?.product);
  if (!course) return;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return;
  const userId = session.client_reference_id;
  const priceVariable = ({
    toddlerhood: "TODDLER_CLASS_PRICE_ID",
    infant: "INFANT_CLASS_PRICE_ID",
    preschool: "PRESCHOOL_CLASS_PRICE_ID",
  } as const)[course.slug];
  const expectedPrice = process.env[priceVariable];
  if (!expectedPrice) throw new Error(`${priceVariable} is not configured`);
  const items = await stripe().checkout.sessions.listLineItems(session.id, { limit: 10 });
  if (!validClassPayment({
    mode: session.mode,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    product: session.metadata?.product,
    ownerId: userId,
    metadataOwnerId: session.metadata?.owner_id,
    lineItems: items.data.map((item) => ({ priceId: item.price?.id, quantity: item.quantity })),
    expectedPriceId: expectedPrice,
    expectedProduct: course.product,
  })) {
    throw new Error("Class checkout did not pass owner and price verification");
  }
  if (!userId) throw new Error("Class checkout owner missing");

  const paymentIntent = typeof session.payment_intent === "string"
    ? session.payment_intent : session.payment_intent?.id ?? null;
  if (paymentIntent) {
    const intent = await stripe().paymentIntents.retrieve(paymentIntent, { expand: ["latest_charge"] });
    const charge = intent.latest_charge;
    if (charge && typeof charge !== "string" && (charge.refunded || charge.disputed)) return;
  }

  const service = createServiceClient();
  const { data: prior, error: readError } = await service.from("class_orders")
    .select("status")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (readError) throw new Error(`Could not read class order: ${readError.message}`);
  if (prior?.status === "refunded" || prior?.status === "disputed") return;

  const { error } = await service.from("class_orders").upsert({
    stripe_checkout_session_id: session.id,
    user_id: userId,
    course_slug: course.slug,
    stripe_payment_intent_id: paymentIntent,
    amount_cents: session.amount_total,
    status: "paid",
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_checkout_session_id" });
  if (error) throw new Error(`Could not save class order: ${error.message}`);
  await applyGrants(service, userId, grantsForOneTimePurchase({
    sessionId: session.id, product: course.product,
  }));
}

/** Revoke only this payment's grant; unrelated class grants survive. */
async function revokeClassPayment(paymentIntent: string, status: "refunded" | "disputed") {
  const service = createServiceClient();
  const { data: orders, error } = await service.from("class_orders")
    .select("stripe_checkout_session_id, user_id, course_slug")
    .eq("stripe_payment_intent_id", paymentIntent)
    .eq("status", "paid");
  if (error) throw new Error(`Could not find class order: ${error.message}`);
  for (const order of orders ?? []) {
    // Only the legacy toddler bundle also granted unlimited AI.
    const single = isClassCourseSlug(order.course_slug) && order.course_slug !== TODDLER_COURSE.slug
      ? CLASS_COURSES[order.course_slug] : null;
    const scopes = single ? [single.scope] : [TODDLER_COURSE.scope, "ai:unlimited"];
    const source = single ? "stripe_otp" : "stripe_otp_legacy";
    const now = new Date().toISOString();
    const { error: grantError } = await service.from("entitlements")
      .update({ expires_at: now, updated_at: now })
      .eq("user_id", order.user_id)
      .eq("source_ref", order.stripe_checkout_session_id)
      .eq("source", source)
      .in("product_scope", scopes);
    if (grantError) throw new Error(`Could not revoke class grant: ${grantError.message}`);
    const { error: orderError } = await service.from("class_orders")
      .update({ status, updated_at: now })
      .eq("stripe_checkout_session_id", order.stripe_checkout_session_id);
    if (orderError) throw new Error(`Could not mark class order: ${orderError.message}`);
  }
}

export async function revokeRefundedClassPurchase(charge: Stripe.Charge) {
  if (!charge.refunded || !charge.payment_intent) return;
  const intent = typeof charge.payment_intent === "string"
    ? charge.payment_intent : charge.payment_intent.id;
  await revokeClassPayment(intent, "refunded");
}

export async function revokeDisputedClassPurchase(dispute: Stripe.Dispute) {
  if (!dispute.payment_intent) return;
  const intent = typeof dispute.payment_intent === "string"
    ? dispute.payment_intent : dispute.payment_intent.id;
  await revokeClassPayment(intent, "disputed");
}
