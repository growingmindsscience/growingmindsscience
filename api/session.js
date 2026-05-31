export const config = { runtime: "edge" };

import { getAuthConfiguration, getSession } from "./_auth.js";
import { jsonResponse } from "./_security.js";

export default async function handler(request) {
  if (request.method !== "GET") {
    return jsonResponse(405, { error: "Use GET to check the session." });
  }

  const profile = await getSession(request);
  const auth = getAuthConfiguration();
  return jsonResponse(200, {
    authenticated: Boolean(profile),
    configured: auth.configured,
    auth,
    profile,
  });
}
