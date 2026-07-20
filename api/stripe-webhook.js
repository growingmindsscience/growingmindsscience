export const config = { runtime: "edge" };

import { jsonResponse, constantTimeEqual } from "./_security.js";

const TIMESTAMP_TOLERANCE = 300; // 5 minutes

async function verifyStripeSignature(rawBody, header, secret) {
  const parts = Object.fromEntries(
    header.split(",").flatMap((p) => {
      const idx = p.indexOf("=");
      return idx === -1 ? [] : [[p.slice(0, idx), p.slice(idx + 1)]];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > TIMESTAMP_TOLERANCE) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedPayload = `${timestamp}.${rawBody}`;
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return constantTimeEqual(computed, signature);
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Use POST." });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return jsonResponse(503, { error: "Webhook not configured." });
  }

  const rawBody = await request.text();
  const sigHeader = request.headers.get("stripe-signature") || "";

  const valid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
  if (!valid) {
    return jsonResponse(400, { error: "Invalid signature." });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (_) {
    return jsonResponse(400, { error: "Invalid payload." });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email || null;
    const sessionId = session.id;
    // Every Stripe Checkout Session and Payment Link that reaches this webhook
    // must set metadata.product (see api/create-checkout-session.js for the
    // pattern). We deliberately do not default to a specific product: with more
    // than one thing for sale, guessing "toddlerhood-class" silently mislabels
    // every other purchase in the purchases table and in the owner
    // notification. An unlabelled session is recorded as "unknown" so it is
    // visible and correctable, not attributed to the wrong course.
    const product = session.metadata?.product || "unknown";

    await Promise.allSettled([
      storePurchase(email, sessionId, product),
      subscribeToKit(email),
      notifyOwner(email, product),
    ]);
  }

  return jsonResponse(200, { received: true });
}

async function storePurchase(email, sessionId, product) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !email) return;
  await fetch(`${url}/rest/v1/purchases`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ email, stripe_session_id: sessionId, product }),
  });
}

async function subscribeToKit(email) {
  const apiKey = process.env.KIT_API_KEY;
  const formId = process.env.KIT_PAID_FORM_ID || process.env.KIT_FORM_ID;
  if (!apiKey || !formId || !email) return;
  await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, email }),
  });
}

async function notifyOwner(email, product) {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) return;
  const safeEmail = String(email || "unknown").replace(/[<>"]/g, "");
  const safeProduct = String(product || "unknown").replace(/[<>"]/g, "");
  const unlabelledNote =
    safeProduct === "unknown"
      ? `\n\nHEADS UP: this checkout arrived without a product label, so it was recorded as "unknown". Check which product it was, and set metadata.product on the Stripe Checkout Session or Payment Link that produced it (see api/create-checkout-session.js) so future purchases are labelled correctly.`
      : "";
  await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      access_key: accessKey,
      subject: `New Purchase, Growing Minds Science`,
      from_name: "Growing Minds Science (Purchase Notification)",
      message: `New purchase received.\n\nEmail: ${safeEmail}\nProduct: ${safeProduct}${unlabelledNote}\n\nIf this is a class purchase, send the AI access code to this customer via your ConvertKit sequence or by replying to their confirmation email. AI Pro (ai_pro) subscriptions unlock automatically, no action needed.`,
    }),
  });
}
