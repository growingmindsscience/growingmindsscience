export const config = { runtime: "edge" };

import { jsonResponse, parseJsonBody } from "./_security.js";
import { createSessionCookie, verifyLogin } from "./_auth.js";
import { checkRateLimit, rateLimitResponse } from "./_ratelimit.js";

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Use POST to sign in." });
  }

  // Throttle credential-guessing per IP (PBKDF2 already slows each attempt server-side).
  const rl = checkRateLimit(request, { key: "login", limit: 10, windowMs: 10 * 60 * 1000 });
  if (rl.limited) return rateLimitResponse(rl.retryAfter);

  let payload;
  try {
    payload = await parseJsonBody(request);
  } catch (error) {
    return jsonResponse(error.status || 400, { error: error.message });
  }

  const email = String(payload.email || "").trim();
  const password = String(payload.password || "");
  const remember = Boolean(payload.remember);
  if (!email || !password || email.length > 254 || password.length > 256) {
    return jsonResponse(400, { error: "Enter your email and password." });
  }

  const result = await verifyLogin(email, password);
  if (result.reason === "not_configured") {
    return jsonResponse(503, { error: "Login is not configured yet." });
  }
  if (!result.ok) {
    return jsonResponse(401, { error: "The email or password was not recognized." });
  }

  return jsonResponse(200, {
    profile: result.profile,
  }, {
    "set-cookie": await createSessionCookie(request, result.profile, remember),
  });
}
