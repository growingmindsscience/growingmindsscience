export const config = { runtime: "edge" };

import { jsonResponse } from "./_security.js";
import { checkRateLimit, rateLimitResponse } from "./_ratelimit.js";

// AI Pro subscription price. Env-configurable (AI_PRO_PRICE_ID) so the SKU can
// rotate (e.g. the planned membership absorption) without a code change. The
// fallback is the live-mode price, so test-mode keys need AI_PRO_PRICE_ID set.
const DEFAULT_PRICE_ID = "price_1Tgu9yLIy3W5wQUyOw1FYEPA";

export default async function handler(request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  // Every call creates a live Checkout Session on the Stripe account the whole
  // site shares, so keep crawlers and scripts from hammering it (soft,
  // per-isolate limit; robots.txt also disallows /api/).
  const rl = checkRateLimit(request, { key: "checkout", limit: 10, windowMs: 10 * 60 * 1000 });
  if (rl.limited) return rateLimitResponse(rl.retryAfter);

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return jsonResponse(500, { error: "Checkout not configured." });

  const priceId = process.env.AI_PRO_PRICE_ID || DEFAULT_PRICE_ID;
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
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        // Label the session so the webhook records the right product instead
        // of falling back to its "unknown" default when logging this purchase.
        "metadata[product]": "ai_pro",
        "subscription_data[metadata][product]": "ai_pro",
        "success_url": `${origin}/tools/growing-minds-ai?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url": `${origin}/tools/growing-minds-ai`,
        "billing_address_collection": "auto",
      }).toString(),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return jsonResponse(502, { error: "Could not reach payment provider." });
  }

  let session = null;
  try {
    session = await res.json();
  } catch {
    // A non-JSON answer (an outage page, a cut connection) is handled below.
  }
  if (!res.ok || typeof session?.url !== "string" || !session.url.startsWith("https://")) {
    return jsonResponse(502, { error: "Could not start checkout. Please try again." });
  }

  return Response.redirect(session.url, 303);
}
