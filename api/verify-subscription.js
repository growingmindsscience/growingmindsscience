export const config = { runtime: "edge" };

import {
  jsonResponse,
  parseJsonBody,
  normalizeEmail,
  isValidEmail,
  hmacSha256,
  base64UrlEncode,
} from "./_security.js";

export default async function handler(request) {
  if (request.method !== "POST") return jsonResponse(405, { error: "Use POST." });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const sessionSecret = process.env.GMS_SESSION_SECRET;
  if (!stripeKey || !sessionSecret) return jsonResponse(500, { error: "Not configured." });

  let body;
  try {
    body = await parseJsonBody(request, 1024);
  } catch (err) {
    return jsonResponse(400, { error: err.message });
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return jsonResponse(400, { error: "Please enter a valid email address." });
  }

  let customersRes;
  try {
    customersRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=10`,
      { headers: { "Authorization": `Bearer ${stripeKey}` } },
    );
  } catch {
    return jsonResponse(502, { error: "Could not reach payment provider. Please try again." });
  }

  const customers = await customersRes.json();
  if (!customersRes.ok || !customers.data?.length) {
    return jsonResponse(404, { error: "No subscription found for that email. Make sure you use the email you signed up with." });
  }

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
    if (subs.data?.length > 0) {
      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days
      const payload = base64UrlEncode(
        new TextEncoder().encode(JSON.stringify({ email, exp, type: "subscriber" })),
      );
      const sig = base64UrlEncode(await hmacSha256(sessionSecret, payload));
      return jsonResponse(200, { token: `${payload}.${sig}` });
    }
  }

  return jsonResponse(404, {
    error: "No active subscription found for that email. If you just subscribed, please wait a moment and try again.",
  });
}
