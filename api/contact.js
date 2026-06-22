export const config = { runtime: "edge" };

import { cleanText, isValidEmail, jsonResponse, normalizeEmail, parseRequestBody } from "./_security.js";
import { checkRateLimit } from "./_ratelimit.js";

const WEB3FORMS_URL = "https://api.web3forms.com/submit";

function acceptsHtml(request) {
  return (request.headers.get("accept") || "").includes("text/html");
}

function redirectResponse(location) {
  return new Response(null, {
    status: 303,
    headers: { location, "cache-control": "no-store" },
  });
}

function htmlErrorResponse(status, message) {
  const safeMessage = message.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contact error — Growing Minds Science</title></head><body><main><h1>Message could not be sent.</h1><p>${safeMessage}</p><p><a href="/contact/">Back to contact</a></p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

function errorResponse(request, status, message) {
  if (acceptsHtml(request)) return htmlErrorResponse(status, message);
  return jsonResponse(status, { error: message });
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Use POST to send a contact message." });
  }

  const rl = checkRateLimit(request, { key: "contact", limit: 5, windowMs: 10 * 60 * 1000 });
  if (rl.limited) return errorResponse(request, 429, "Too many requests. Please wait a moment and try again.");

  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    return errorResponse(request, 503, "The contact form is not configured yet.");
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

  const message = cleanText(payload.message, 2000);
  if (!message) {
    return errorResponse(request, 400, "Please enter a message.");
  }

  const submission = {
    access_key: accessKey,
    subject: "Contact Request — Growing Minds Science",
    name: cleanText(payload.name, 100),
    email,
    message,
    from_name: "Growing Minds Science Contact Form",
  };

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(WEB3FORMS_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(submission),
    });
  } catch (_) {
    return errorResponse(request, 502, "The contact service could not be reached. Please try again.");
  }

  if (!upstreamResponse.ok) {
    return errorResponse(request, 502, "The message could not be sent. Please try again.");
  }

  if (acceptsHtml(request)) return redirectResponse("/thank-you");
  return jsonResponse(200, { ok: true });
}
