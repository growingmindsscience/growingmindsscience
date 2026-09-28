const encoder = new TextEncoder();

export function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function requestError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Every JSON endpoint expects an object. `null`, arrays, numbers and strings
// are valid JSON but not a valid request, so they are a 400 here instead of a
// TypeError (and a 500) later in the handler.
function parseJsonObject(text) {
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch (_) {
    throw requestError("Please send a valid JSON request.");
  }
  if (!isPlainObject(parsed)) throw requestError("Please send a JSON object.");
  return parsed;
}

export async function parseJsonBody(request, maxChars = 4096) {
  const text = await request.text();
  if (text.length > maxChars) throw requestError("Request body is too large.", 413);
  return parseJsonObject(text);
}

export function parseFormBody(body) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

export async function parseRequestBody(request, maxChars = 8192) {
  const text = await request.text();
  if (text.length > maxChars) throw requestError("Request body is too large.", 413);

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return parseJsonObject(text);
  return parseFormBody(text);
}

// JSON APIs that only our own pages call. Two cheap checks:
//  - `Sec-Fetch-Site: cross-site` means another website made the browser send
//    this request (browsers set the header; older ones omit it, which passes).
//  - Requiring `application/json` forces a CORS preflight for any cross-origin
//    caller. We never answer preflights, so the browser never sends the POST.
//    Without it, a `text/plain` "simple request" from any page would reach us.
// Returns a Response to send back, or null when the request may proceed.
export function sameOriginJsonGuard(request) {
  const site = (request.headers.get("sec-fetch-site") || "").trim().toLowerCase();
  if (site === "cross-site") {
    return jsonResponse(403, { error: "Requests from other websites are not accepted.", code: "cross_site" });
  }
  const type = (request.headers.get("content-type") || "").trim().toLowerCase();
  if (!/^application\/json\s*(;|$)/.test(type)) {
    return jsonResponse(415, { error: "Please send the request as JSON.", code: "unsupported_media_type" });
  }
  return null;
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

// For any value that can end up in an email header (subject, sender name,
// reply-to) or on a single line of a notification: removes CR, LF and every
// other control character, including the Unicode line and paragraph separators.
const HEADER_UNSAFE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g;
export function cleanHeaderText(value, maxLength) {
  return String(value || "").replace(HEADER_UNSAFE, " ").replace(/ {2,}/g, " ").trim().slice(0, maxLength);
}

export function isValidEmail(value) {
  return /^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/.test(value) && value.length <= 254;
}

export function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(value) {
  const padded = String(value).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// `secret` is a string (encoded as UTF-8) or raw key bytes.
export async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    typeof secret === "string" ? encoder.encode(secret) : secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(signature);
}

// A sub-key for one purpose, so tokens made for one purpose can never verify
// as another (for example a subscriber token presented as a session cookie).
export function deriveKey(secret, label) {
  return hmacSha256(secret, `gms-key-derivation:${label}`);
}

export async function pbkdf2Sha256(password, salt, iterations = 210000) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations,
    },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export function constantTimeEqual(a, b) {
  const left = typeof a === "string" ? encoder.encode(a) : a;
  const right = typeof b === "string" ? encoder.encode(b) : b;
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

// Compares two secrets without revealing, through timing, where they differ or
// how long the expected one is: both sides are hashed to 32 bytes first.
export async function timingSafeEqual(a, b) {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(String(a ?? ""))),
    crypto.subtle.digest("SHA-256", encoder.encode(String(b ?? ""))),
  ]);
  return constantTimeEqual(new Uint8Array(left), new Uint8Array(right));
}

export function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  const cookies = Object.create(null);
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    cookies[name] = rest.join("=");
  }
  return cookies;
}

export function cookieSecureAttribute(request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const url = new URL(request.url);
  return forwardedProto === "https" || url.protocol === "https:" ? "; Secure" : "";
}
