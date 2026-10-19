export const config = { runtime: "edge" };

import { jsonResponse } from "./_security.js";

// AI Pro is no longer sold. This endpoint used to open a Stripe Checkout
// session for the $9/month subscription; it now sends any old link or bookmark
// to the pricing page and never calls Stripe. Existing subscribers still
// unlock through api/verify-subscription.js until their subscriptions end.
export default async function handler(request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }
  return Response.redirect(new URL("/pricing", request.url).toString(), 303);
}
