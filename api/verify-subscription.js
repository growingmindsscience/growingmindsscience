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
  sameOriginJsonGuard,
} from "./_security.js";
import { getSession } from "./_auth.js";
import { checkRateLimit, rateLimitResponse } from "./_ratelimit.js";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const STRIPE_API = "https://api.stripe.com/v1";
// Same rule as before this change (the old lookup filtered on status=active).
const ENTITLED_STATUSES = new Set(["active"]);

const NOT_REACHABLE = "Could not reach payment provider. Please try again.";

function isSubscriptionId(value) {
  return typeof value === "string" && /^sub_[A-Za-z0-9]{8,250}$/.test(value);
}

// Tokens are bound to the Stripe subscription they were issued for (`sub`), so a
// refresh checks that exact subscription rather than any subscription that
// happens to share the email. Tokens issued before this carry only an email.
async function mintSubscriberToken(email, subscriptionId, sessionSecret) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const claims = { email, exp, type: "subscriber" };
  if (isSubscriptionId(subscriptionId)) claims.sub = subscriptionId;
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const sig = base64UrlEncode(await hmacSha256(sessionSecret, payload));
  return `${payload}.${sig}`;
}

// Same shape as the check in growing-minds-ai.js: HMAC-signed, unexpired,
// type "subscriber". Returns { email, sub } or null.
async function readValidToken(token, sessionSecret) {
  const value = String(token || "").trim();
  if (!value || value.length > 1024) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = base64UrlEncode(await hmacSha256(sessionSecret, payload));
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    if (data?.type !== "subscriber") return null;
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: normalizeEmail(data.email), sub: isSubscriptionId(data.sub) ? data.sub : null };
  } catch {
    return null;
  }
}

// GET from the Stripe API. `ok` only for a 2xx with a JSON body; a network
// error or a non-JSON body comes back as { ok: false, status: 0 }.
async function stripeGet(path, stripeKey) {
  let res;
  try {
    res = await fetch(`${STRIPE_API}${path}`, {
      headers: { "Authorization": `Bearer ${stripeKey}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, status: 0, body: null };
  }
  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, status: 0, body: null };
  }
  return { ok: res.ok, status: res.status, body };
}

// Stripe's clean "this object does not exist" answer.
function isMissing(result) {
  return result.status === 404 && result.body?.error?.code === "resource_missing";
}

// One exact subscription: { active, subscriptionId } | { active: false } | { error: true }.
async function checkSubscription(subscriptionId, stripeKey) {
  const result = await stripeGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`, stripeKey);
  if (result.ok) {
    return ENTITLED_STATUSES.has(result.body?.status)
      ? { active: true, subscriptionId }
      : { active: false };
  }
  if (isMissing(result)) return { active: false };
  return { error: true };
}

// Any active subscription for customers with this email. Used only where the
// email is verified (a signed-in session) and, once, to migrate tokens issued
// before subscription binding. Any Stripe error (non-2xx, non-JSON, network)
// is an error, never "no subscription".
async function findActiveSubscriptionByEmail(email, stripeKey) {
  const customers = await stripeGet(`/customers?email=${encodeURIComponent(email)}&limit=10`, stripeKey);
  if (!customers.ok || !Array.isArray(customers.body?.data)) return { error: true };

  for (const customer of customers.body.data) {
    if (typeof customer?.id !== "string") continue;
    const subs = await stripeGet(
      `/subscriptions?customer=${encodeURIComponent(customer.id)}&status=active&limit=5`,
      stripeKey,
    );
    if (!subs.ok || !Array.isArray(subs.body?.data)) return { error: true };
    const match = subs.body.data.find((s) => ENTITLED_STATUSES.has(s?.status) && isSubscriptionId(s?.id));
    if (match) return { active: true, subscriptionId: match.id };
  }
  return { active: false };
}

export default async function handler(request) {
  if (request.method !== "POST") return jsonResponse(405, { error: "Use POST." });

  // Only the chat page posts here, as JSON (see sameOriginJsonGuard).
  const blocked = sameOriginJsonGuard(request);
  if (blocked) return blocked;

  // Throttle per client to blunt guessing and enumeration.
  const rl = checkRateLimit(request, { key: "verify-sub", limit: 5, windowMs: 10 * 60 * 1000 });
  if (rl.limited) return rateLimitResponse(rl.retryAfter);

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const sessionSecret = process.env.GMS_SESSION_SECRET;
  if (!stripeKey || !sessionSecret) return jsonResponse(500, { error: "Not configured." });

  let body;
  try {
    body = await parseJsonBody(request, 1024);
  } catch (err) {
    return jsonResponse(err.status || 400, { error: err.message });
  }

  // ── Path 1: Stripe Checkout session id (post-checkout redirect). Possession
  // of the id proves the purchase, so no site session is needed; checkout
  // itself never creates one. The token is bound to the subscription this
  // checkout created, and only that subscription is checked.
  const sessionId = String(body.sessionId || "").trim();
  if (sessionId) {
    if (!/^cs_[a-zA-Z0-9_]{10,250}$/.test(sessionId)) {
      return jsonResponse(400, { error: "Invalid checkout session." });
    }

    const checkout = await stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`, stripeKey);
    if (!checkout.ok) {
      return isMissing(checkout)
        ? jsonResponse(404, { error: "No completed subscription found for this checkout." })
        : jsonResponse(502, { error: NOT_REACHABLE });
    }

    const session = checkout.body;
    const email = normalizeEmail(session?.customer_details?.email);
    const subscriptionId = typeof session?.subscription === "string" ? session.subscription : session?.subscription?.id;
    if (session?.mode !== "subscription" || session?.status !== "complete"
        || !isValidEmail(email) || !isSubscriptionId(subscriptionId)) {
      return jsonResponse(404, { error: "No completed subscription found for this checkout." });
    }

    // Guard against replaying an old checkout link after cancelling: the
    // subscription this checkout created must still be active.
    const check = await checkSubscription(subscriptionId, stripeKey);
    if (check.error) return jsonResponse(502, { error: NOT_REACHABLE });
    if (!check.active) {
      return jsonResponse(404, {
        error: "No active subscription found. If you just subscribed, please wait a moment and try again.",
      });
    }

    return jsonResponse(200, { token: await mintSubscriberToken(email, subscriptionId, sessionSecret) });
  }

  // ── Path 2: refresh with a still-valid subscriber token. The token itself
  // is the credential; we re-check that its subscription is still active.
  const presentedToken = String(body.token || "").trim();
  if (presentedToken) {
    const claims = await readValidToken(presentedToken, sessionSecret);
    if (!claims || !isValidEmail(claims.email)) {
      return jsonResponse(401, { error: "Your saved access has expired. Please unlock again." });
    }

    // Tokens issued before subscription binding carry no `sub`: check them by
    // email one last time and bind the new token to the subscription found.
    const check = claims.sub
      ? await checkSubscription(claims.sub, stripeKey)
      : await findActiveSubscriptionByEmail(claims.email, stripeKey);
    if (check.error) return jsonResponse(502, { error: NOT_REACHABLE });
    if (!check.active) {
      return jsonResponse(404, { error: "No active subscription found for that email." });
    }

    return jsonResponse(200, { token: await mintSubscriberToken(claims.email, check.subscriptionId, sessionSecret) });
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

  const check = await findActiveSubscriptionByEmail(email, stripeKey);
  if (check.error) return jsonResponse(502, { error: NOT_REACHABLE });
  if (!check.active) {
    return jsonResponse(404, {
      error: "No active subscription found for that email. If you just subscribed, please wait a moment and try again.",
    });
  }

  return jsonResponse(200, { token: await mintSubscriberToken(email, check.subscriptionId, sessionSecret) });
}
