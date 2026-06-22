// Best-effort in-memory per-IP rate limiter for unauthenticated edge endpoints
// (login, subscription verification, contact, waitlist).
//
// State is per-instance and resets on cold start, so it bounds abuse per warm edge
// instance rather than globally — enough to blunt brute-force, customer enumeration,
// and form spam at near-zero cost with no extra infra. For a hard global limit, back
// this with a shared store (Upstash Redis / Vercel KV). The AI chat endpoint
// (growing-minds-ai.js) uses an equivalent inline limiter.

import { jsonResponse } from "./_security.js";

const buckets = new Map();
const MAX_KEYS = 10000; // ceiling so a flood of distinct IPs can't grow the Map unbounded

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  // Vercel sets x-forwarded-for to the real client chain; take the first hop.
  // Fall back to a shared bucket (still limited) rather than bypassing on a missing header.
  return forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

// Returns { limited, retryAfter }. `key` namespaces each endpoint so their budgets
// don't share a counter.
export function checkRateLimit(request, { key, limit, windowMs }) {
  const bucketKey = `${key}:${clientIp(request)}`;
  const now = Date.now();
  const entry = buckets.get(bucketKey);

  if (!entry || now - entry.windowStart > windowMs) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) {
        if (now - v.windowStart > windowMs) buckets.delete(k);
      }
    }
    buckets.set(bucketKey, { windowStart: now, count: 1 });
    return { limited: false, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { limited: true, retryAfter: Math.max(1, Math.ceil((windowMs - (now - entry.windowStart)) / 1000)) };
  }
  return { limited: false, retryAfter: 0 };
}

// Standard JSON 429 with Retry-After, matching the site's jsonResponse shape.
export function rateLimitResponse(retryAfter) {
  return jsonResponse(
    429,
    { error: "Too many requests. Please wait a moment and try again." },
    { "Retry-After": String(retryAfter) },
  );
}
