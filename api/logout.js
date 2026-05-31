export const config = { runtime: "edge" };

import { clearSessionCookie } from "./_auth.js";
import { jsonResponse } from "./_security.js";

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Use POST to sign out." });
  }

  return jsonResponse(200, { ok: true }, {
    "set-cookie": clearSessionCookie(request),
  });
}
