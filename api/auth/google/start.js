export const config = { runtime: "edge" };

import { isGoogleAuthConfigured } from "../../_auth.js";
import { googleAuthUrl, randomState, stateCookie } from "./_shared.js";

function redirect(location, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return new Response("Use GET to start Google sign-in.", { status: 405 });
  }

  if (!isGoogleAuthConfigured()) {
    return redirect("/login?auth=google_not_configured");
  }

  const state = randomState();
  return redirect(googleAuthUrl(request, state), {
    "set-cookie": stateCookie(request, state),
  });
}
