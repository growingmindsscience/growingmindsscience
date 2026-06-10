export const config = { runtime: "edge" };

import { jsonResponse } from "./_security.js";

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Use POST." });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return jsonResponse(503, { error: "Checkout is not yet configured. Check back soon." });
  }

  const siteUrl = process.env.SITE_URL || "https://growingmindsscience.com";
  const priceId = process.env.STRIPE_PRICE_ID;

  const fields = {
    mode: "payment",
    "payment_method_types[]": "card",
    "success_url": `${siteUrl}/thank-you?purchase=1&session_id={CHECKOUT_SESSION_ID}`,
    "cancel_url": `${siteUrl}/classes/toddlerhood.html`,
    "allow_promotion_codes": "true",
    "metadata[product]": "toddlerhood-class",
    // What buyers see on their card statement (5–22 chars, no special chars).
    // Keeps the charge recognizable as the class purchase.
    "payment_intent_data[statement_descriptor]": "GROWINGMINDS SCIENCE",
    "payment_intent_data[description]": "Toddler Years Class — Growing Minds Science",
  };

  if (priceId) {
    fields["line_items[0][price]"] = priceId;
    fields["line_items[0][quantity]"] = "1";
  } else {
    // Inline price — used when no Stripe Price object has been created yet
    fields["line_items[0][price_data][currency]"] = "usd";
    fields["line_items[0][price_data][unit_amount]"] = "4900";
    fields["line_items[0][price_data][product_data][name]"] = "Toddler Years Class — Growing Minds Science";
    fields["line_items[0][price_data][product_data][description]"] =
      "Self-paced class on language, autonomy, and big feelings for ages 1–3. Lifetime access + unlimited Growing Minds AI included.";
    fields["line_items[0][quantity]"] = "1";
  }

  let res;
  try {
    res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(fields),
    });
  } catch (_) {
    return jsonResponse(502, { error: "Could not reach checkout service. Please try again." });
  }

  const data = await res.json();
  if (!res.ok) {
    return jsonResponse(502, { error: data?.error?.message || "Checkout session could not be created." });
  }

  return jsonResponse(200, { url: data.url });
}
