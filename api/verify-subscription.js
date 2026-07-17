export const config = { runtime: "edge" };

import {
  jsonResponse,
  parseJsonBody,
  normalizeEmail,
  isValidEmail,
  hmacSha256,
  base64UrlEncode,
  base64UrlDecode,
  constantTimeEqual,
} from "./_security.js";
import { getSession } from "./_auth.js";
import { checkRateLimit, rateLimitResponse } from "./_ratelimit.js";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

async function mintSubscriberToken(email, sessionSecret) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ email, exp, type: "subscriber" })),
  );
  const sig = base64UrlEncode(await hmacSha256(sessionSecret, payload));
  return `${payload}.${sig}`;
}

// Same shape as the check in growing-minds-ai.js: HMAC-signed, unexpired,
// type "subscriber". Returns the embedded email, or null.
async function emailFromValidToken(token, sessionSecret) {
  const value = String(token || "").trim();
  if (!value || value.length > 512) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = base64UrlEncode(await hmacSha256(sessionSecret, payload));
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    if (data?.type !== "subscriber") return null;
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return normalizeEmail(data.email);
  } catch {
    return null;
  }
}

async function hasActiveSubscription(email, stripeKey) {
  let customersRes;
  try {
    customersRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=10`,
      { headers: { "Authorization": `Bearer ${stripeKey}` } },
    );
  } catch {
    return { error: "unreachable" };
  }

  const customers = await customersRes.json();
  if (!customersRes.ok || !customers.data?.length) return { active: false };

  for (const customer of customers.data) {
    let subsRes;
    try {
      subsRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=5`,
        { headers: { "Authorization": `Bearer ${stripeKey}` } },
      );
    } catch {
      continue;
    }
    const subs = await subsRes.json();
    if (subs.data?.length > 0) return { active: true };
  }
  return { active: false };
}

export default async function handler(request) {
  if (request.method !== "POST") return jsonResponse(405, { error: "Use POST." });

  // Throttle per IP to blunt customer enumeration via this email->subscription oracle.
  const rl = checkRateLimit(request, { key: "verify-sub", limit: 5, windowMs: 10 * 60 * 1000 });
  if (rl.limited) return rateLimitResponse(rl.retryAfter);

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const sessionSecret = process.env.GMS_SESSION_SECRET;
  if (!stripeKey || !sessionSecret) return jsonResponse(500, { error: "Not configured." });

  let body;
  try {
    body = await parseJsonBody(request, 1024);
  } catch (err) {
    return jsonResponse(400, { error: err.message });
  }

  // ── Path 1: Stripe Checkout session id (post-checkout redirect). Possession
  // of the id proves the purchase, so no site session is needed — checkout
  // itself never creates one.
  const sessionId = String(body.sessionId || "").trim();
  if (sessionId) {
    if (!/^cs_[a-zA-Z0-9_]{10,250}$/.test(sessionId)) {
      return jsonResponse(400, { error: "Invalid checkout session." });
    }

    let checkoutRes;
    try {
      checkoutRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
        { headers: { "Authorization": `Bearer ${stripeKey}` } },
      );
    } catch {
      return jsonResponse(502, { error: "Could not reach payment provider. Please try again." });
    }

    const checkout = await checkoutRes.json();
    if (!checkoutRes.ok || checkout.mode !== "subscription" || checkout.status !== "complete") {
      return jsonResponse(404, { error: "No completed subscription found for this checkout." });
    }

    const email = normalizeEmail(checkout.customer_details?.email);
    if (!isValidEmail(email)) {
      return jsonResponse(404, { error: "No completed subscription found for this checkout." });
    }

    // Guard against replaying an old checkout link after cancelling: the
    // subscription it created must still be active.
    const check = await hasActiveSubscription(email, stripeKey);
    if (check.error) return jsonResponse(502, { error: "Could not reach payment provider. Please try again." });
    if (!check.active) {
      return jsonResponse(404, {
        error: "No active subscription found. If you just subscribed, please wait a moment and try again.",
      });
    }

    return jsonResponse(200, { token: await mintSubscriberToken(email, sessionSecret) });
  }

  // ── Path 2: refresh with a still-valid subscriber token. The token itself
  // is the credential; we just re-check that the subscription is still active.
  const presentedToken = String(body.token || "").trim();
  if (presentedToken) {
    const email = await emailFromValidToken(presentedToken, sessionSecret);
    if (!email || !isValidEmail(email)) {
      return jsonResponse(401, { error: "Your saved access has expired. Please unlock again." });
    }

    const check = await hasActiveSubscription(email, stripeKey);
    if (check.error) return jsonResponse(502, { error: "Could not reach payment provider. Please try again." });
    if (!check.active) {
      return jsonResponse(404, { error: "No active subscription found for that email." });
    }

    return jsonResponse(200, { token: await mintSubscriberToken(email, sessionSecret) });
  }

  // ── Path 3: bare email. Requires a signed-in site session with the same
  // email, so this endpoint can't be used to mint tokens for someone else's
  // subscription.
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return jsonResponse(400, { error: "Please enter a valid email address." });
  }

  const session = await getSession(request);
  if (!session) {
    return jsonResponse(401, { error: "Please sign in with the subscriber email before unlocking AI Pro." });
  }
  if (normalizeEmail(session.email) !== email) {
    return jsonResponse(403, { error: "Sign in with the same email you used for your subscription." });
  }

  const check = await hasActiveSubscription(email, stripeKey);
  if (check.error) return jsonResponse(502, { error: "Could not reach payment provider. Please try again." });
  if (!check.active) {
    return jsonResponse(404, {
      error: "No active subscription found for that email. If you just subscribed, please wait a moment and try again.",
    });
  }

  return jsonResponse(200, { token: await mintSubscriberToken(email, sessionSecret) });
}
