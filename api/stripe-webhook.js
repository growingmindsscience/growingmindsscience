export const config = { runtime: "edge" };

import { cleanHeaderText, isPlainObject, jsonResponse } from "./_security.js";
import { verifyStripeSignature } from "./_stripe.js";

// Checkout events that can complete a purchase. A checkout paid by an
// asynchronous method (bank debit and similar) completes with payment_status
// "unpaid"; it is fulfilled later, on checkout.session.async_payment_succeeded.
// (The Stripe endpoint must be subscribed to both events.)
const FULFILMENT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);
const PAID_STATUSES = new Set(["paid", "no_payment_required"]);

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Use POST." });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return jsonResponse(503, { error: "Webhook not configured." });
  }

  // The signature covers the exact raw bytes, so read the body as text and
  // verify before parsing.
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
  if (!isPlainObject(event)) {
    return jsonResponse(400, { error: "Invalid payload." });
  }

  if (FULFILMENT_EVENTS.has(event.type)) {
    const session = isPlainObject(event.data?.object) ? event.data.object : {};
    if (!PAID_STATUSES.has(session.payment_status)) {
      // Not paid yet (or failed): nothing to fulfil. Acknowledge so Stripe does
      // not retry; a later async_payment_succeeded event fulfils it.
      return jsonResponse(200, { received: true, fulfilled: false });
    }

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

    // The purchase record must be stored before we acknowledge the event. If it
    // fails, answer 500 so Stripe retries (it retries for up to three days).
    // The side effects below only run once the record is safe.
    const stored = await storePurchase(email, sessionId, product);
    if (!stored) {
      return jsonResponse(500, { error: "Could not record the purchase. Stripe will retry." });
    }

    await Promise.allSettled([
      subscribeToKit(email),
      notifyOwner(email, product),
    ]);
  }

  return jsonResponse(200, { received: true });
}

// Returns true when the purchase is stored (or storage is not configured).
async function storePurchase(email, sessionId, product) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !email) return true;
  let res;
  try {
    res = await fetch(`${url}/rest/v1/purchases`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email, stripe_session_id: sessionId, product }),
    });
  } catch (_) {
    return false;
  }
  // 409: a unique constraint already holds this checkout, so a retried event
  // was stored the first time.
  return res.ok || res.status === 409;
}

async function subscribeToKit(email) {
  const apiKey = process.env.KIT_API_KEY;
  const formId = process.env.KIT_PAID_FORM_ID || process.env.KIT_FORM_ID;
  if (!apiKey || !formId || !email) return;
  await fetch(`https://api.convertkit.com/v3/forms/${encodeURIComponent(formId)}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, email: cleanHeaderText(email, 254) }),
    signal: AbortSignal.timeout(5000),
  });
}

async function notifyOwner(email, product) {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) return;
  const safeEmail = cleanHeaderText(email || "unknown", 254).replace(/[<>"]/g, "");
  const safeProduct = cleanHeaderText(product || "unknown", 80).replace(/[<>"]/g, "");
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
    signal: AbortSignal.timeout(5000),
  });
}
