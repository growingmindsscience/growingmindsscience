export const config = { runtime: "edge" };

import { jsonResponse } from "./_security.js";

// AI Pro subscription price. Env-configurable so the SKU can rotate (e.g. the
// planned membership absorption) without a code change.
const PRICE_ID = process.env.AI_PRO_PRICE_ID || "price_1Tgu9yLIy3W5wQUyOw1FYEPA";

export default async function handler(request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return jsonResponse(500, { error: "Checkout not configured." });

  const origin = new URL(request.url).origin;

  let res;
  try {
    res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "line_items[0][price]": PRICE_ID,
        "line_items[0][quantity]": "1",
        // Label the session so webhooks never fall back to their
        // "toddlerhood-class" default when logging this purchase.
        "metadata[product]": "ai_pro",
        "subscription_data[metadata][product]": "ai_pro",
        "success_url": `${origin}/tools/growing-minds-ai?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url": `${origin}/tools/growing-minds-ai`,
        "billing_address_collection": "auto",
      }).toString(),
    });
  } catch {
    return jsonResponse(502, { error: "Could not reach payment provider." });
  }

  const session = await res.json();
  if (!res.ok || !session.url) {
    return jsonResponse(502, { error: "Could not start checkout. Please try again." });
  }

  return Response.redirect(session.url, 303);
}
