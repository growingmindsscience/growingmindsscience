export const config = { runtime: "edge" };

import { cleanHeaderText, isValidEmail, jsonResponse, normalizeEmail, parseRequestBody } from "./_security.js";
import { checkRateLimit } from "./_ratelimit.js";

const WEB3FORMS_URL = "https://api.web3forms.com/submit";
const KIT_API_URL = "https://api.convertkit.com/v3/forms";

// The notification subject is chosen here, not taken from the request. Each
// signup form sends a hidden `subject` naming the page it lives on; only these
// known labels are used, anything else gets the default.
const DEFAULT_SUBJECT = "New Waitlist Signup - Growing Minds Science";
const KNOWN_SUBJECTS = new Set([
  "New Class Notify Signup — Growing Minds Science",
  "Articles Email Signup — Growing Minds Science",
  "Birth to 12 Months Waitlist — Growing Minds Science",
  "Preschool Class Waitlist — Growing Minds Science",
  "Family Systems Class Waitlist — Growing Minds Science",
]);

// Awaited (with a timeout) rather than fired and forgotten: an Edge function
// can stop as soon as its response is returned, which would drop the request.
async function subscribeToKit(email, firstName) {
  const apiKey = process.env.KIT_API_KEY;
  const formId = process.env.KIT_FORM_ID;
  if (!apiKey || !formId) return;
  try {
    await fetch(`${KIT_API_URL}/${encodeURIComponent(formId)}/subscribe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, email, first_name: firstName || "" }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (_) {
    // Kit failure is non-blocking; Web3Forms submission already succeeded
  }
}

function acceptsHtml(request) {
  return (request.headers.get("accept") || "").includes("text/html");
}

function redirectResponse(location) {
  return new Response(null, {
    status: 303,
    headers: {
      location,
      "cache-control": "no-store",
    },
  });
}

function htmlErrorResponse(status, message) {
  const safeMessage = message.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Waitlist error - Growing Minds Science</title></head><body><main><h1>Waitlist signup could not be sent.</h1><p>${safeMessage}</p><p><a href="/#signup">Back to the waitlist</a></p></main></body></html>`, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function errorResponse(request, status, message) {
  if (acceptsHtml(request)) return htmlErrorResponse(status, message);
  return jsonResponse(status, { error: message });
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Use POST to join the waitlist." });
  }

  const rl = checkRateLimit(request, { key: "waitlist", limit: 5, windowMs: 10 * 60 * 1000 });
  if (rl.limited) return errorResponse(request, 429, "Too many requests. Please wait a moment and try again.");

  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    return errorResponse(request, 503, "The waitlist form is not configured yet.");
  }

  let payload;
  try {
    payload = await parseRequestBody(request);
  } catch (error) {
    return errorResponse(request, error.status || 400, error.message);
  }

  if (payload.botcheck || payload["bot-field"]) {
    return acceptsHtml(request) ? redirectResponse("/thank-you") : jsonResponse(200, { ok: true });
  }

  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) {
    return errorResponse(request, 400, "Please enter a valid email address.");
  }

  const requestedSubject = cleanHeaderText(payload.subject, 120);
  const submission = {
    access_key: accessKey,
    subject: KNOWN_SUBJECTS.has(requestedSubject) ? requestedSubject : DEFAULT_SUBJECT,
    name: cleanHeaderText(payload.name, 100),
    email,
    interest: cleanHeaderText(payload.interest, 120) || "General waitlist",
    from_name: "Growing Minds Science",
  };

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(WEB3FORMS_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(submission),
    });
  } catch (_) {
    return errorResponse(request, 502, "The waitlist service could not be reached. Please try again.");
  }

  if (!upstreamResponse.ok) {
    return errorResponse(request, 502, "The waitlist service could not accept the signup. Please try again.");
  }

  const firstName = submission.name ? submission.name.split(" ")[0] : "";
  await subscribeToKit(email, firstName);

  if (acceptsHtml(request)) return redirectResponse("/thank-you");
  return jsonResponse(200, { ok: true });
}
