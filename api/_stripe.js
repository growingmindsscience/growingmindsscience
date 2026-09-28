import { constantTimeEqual } from "./_security.js";

export const TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes, Stripe's default

// Stripe-Signature: t=<unix seconds>,v1=<hex>[,v1=<hex>...][,v0=...]
// While an endpoint secret is being rolled, Stripe signs with every active
// secret and sends one v1 per secret, in no promised order.
export function parseStripeSignature(header) {
  let timestamp = null;
  const signatures = [];
  for (const part of String(header || "").split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1" && value) signatures.push(value.toLowerCase());
  }
  return { timestamp, signatures };
}

async function hmacHex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Verifies the signature over the exact raw body. Accepts the event if ANY v1
// signature matches (every candidate is compared; there is no early exit).
export async function verifyStripeSignature(rawBody, header, secret, nowSeconds = Date.now() / 1000) {
  const { timestamp, signatures } = parseStripeSignature(header);
  if (!timestamp || !signatures.length || !secret) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  let matched = false;
  for (const candidate of signatures) {
    if (constantTimeEqual(expected, candidate)) matched = true;
  }
  return matched;
}
