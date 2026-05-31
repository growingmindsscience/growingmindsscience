export const config = { runtime: "edge" };

import { createSessionCookie, isGoogleAuthConfigured } from "../../_auth.js";
import {
  clearStateCookie,
  exchangeGoogleCode,
  isValidState,
  validateGoogleUser,
} from "./_shared.js";

function redirect(request, location, extraHeaders = {}) {
  const response = new Response(null, {
    status: 302,
    headers: {
      location,
      "cache-control": "no-store",
      "set-cookie": clearStateCookie(request),
    },
  });
  for (const [key, value] of Object.entries(extraHeaders)) {
    response.headers.append(key, value);
  }
  return response;
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return new Response("Use GET for the Google sign-in callback.", { status: 405 });
  }

  if (!isGoogleAuthConfigured()) {
    return redirect(request, "/login?auth=google_not_configured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const error = url.searchParams.get("error");

  if (error) return redirect(request, "/login?auth=google_cancelled");
  if (!code || !isValidState(request, state)) return redirect(request, "/login?auth=google_invalid");

  try {
    const googleUser = await exchangeGoogleCode(request, code);
    const profile = validateGoogleUser(googleUser);
    if (!profile) return redirect(request, "/login?auth=google_denied");

    return redirect(request, "/account", {
      "set-cookie": await createSessionCookie(request, profile, false),
    });
  } catch (_) {
    return redirect(request, "/login?auth=google_error");
  }
}
