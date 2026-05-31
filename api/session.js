export const config = { runtime: "edge" };

import { getSession, isAuthConfigured } from "./_auth.js";
import { jsonResponse } from "./_security.js";

export default async function handler(request) {
  if (request.method !== "GET") {
    return jsonResponse(405, { error: "Use GET to check the session." });
  }

  const profile = await getSession(request);
  return jsonResponse(200, {
    authenticated: Boolean(profile),
    configured: isAuthConfigured(),
    profile,
  });
}
