import {
  base64UrlDecode,
  base64UrlEncode,
  cleanText,
  constantTimeEqual,
  cookieSecureAttribute,
  deriveKey,
  hmacSha256,
  normalizeEmail,
  parseCookies,
  pbkdf2Sha256,
  timingSafeEqual,
} from "./_security.js";
import { hasGoogleAllowlist } from "./auth/google/_shared.js";

const SESSION_COOKIE = "gms_session";
const PASSWORD_ITERATIONS = 210000;
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;

// Session cookies are signed with a key derived for this one purpose and carry
// `typ: "session"`. GMS_SESSION_SECRET also signs AI Pro subscriber tokens
// (api/verify-subscription.js) with the same payload.signature shape; without
// this separation a subscriber token, minted for whatever email was typed at
// Stripe Checkout, would pass as a signed-in session. Cookies signed the old
// way (raw secret, no typ) no longer verify, so those sessions sign in again.
const SESSION_TYPE = "session";
const SESSION_KEY_LABEL = "gms-session-cookie-v2";

function authConfig() {
  return {
    email: normalizeEmail(process.env.GMS_LOGIN_EMAIL),
    name: cleanText(process.env.GMS_LOGIN_NAME || "Growing Minds member", 80),
    passwordHash: String(process.env.GMS_LOGIN_PASSWORD_HASH || "").trim(),
    passwordSalt: String(process.env.GMS_LOGIN_PASSWORD_SALT || "").trim(),
    sessionSecret: String(process.env.GMS_SESSION_SECRET || "").trim(),
  };
}

function signSession(payload) {
  return deriveKey(authConfig().sessionSecret, SESSION_KEY_LABEL)
    .then((key) => hmacSha256(key, payload))
    .then(base64UrlEncode);
}

export function hasSessionSecret() {
  return Boolean(authConfig().sessionSecret);
}

export function isPasswordAuthConfigured() {
  const config = authConfig();
  return Boolean(config.email && config.passwordHash && config.passwordSalt && config.sessionSecret);
}

// Google sign-in also needs GOOGLE_ALLOWED_EMAILS or GOOGLE_ALLOWED_DOMAIN:
// without an allowlist it stays off rather than admitting any Google account.
export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    authConfig().sessionSecret &&
    hasGoogleAllowlist(),
  );
}

export function getAuthConfiguration() {
  const password = isPasswordAuthConfigured();
  const google = isGoogleAuthConfigured();
  return {
    configured: password || google,
    password,
    google,
  };
}

export async function verifyLogin(email, password) {
  const config = authConfig();
  if (!isPasswordAuthConfigured()) return { ok: false, reason: "not_configured" };

  // Always derive the password hash and compare both values, whether or not the
  // email matches, so response time does not reveal the configured email.
  const attemptedHash = base64UrlEncode(await pbkdf2Sha256(String(password || ""), config.passwordSalt, PASSWORD_ITERATIONS));
  const [emailMatches, hashMatches] = await Promise.all([
    timingSafeEqual(normalizeEmail(email), config.email),
    timingSafeEqual(attemptedHash, config.passwordHash),
  ]);
  if (!emailMatches || !hashMatches) return { ok: false, reason: "invalid" };

  return {
    ok: true,
    profile: {
      email: config.email,
      name: config.name,
    },
  };
}

export async function createSessionCookie(request, profile, remember) {
  const ttl = remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS;
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    typ: SESSION_TYPE,
    email: profile.email,
    name: profile.name,
    provider: profile.provider || "password",
    exp: expiresAt,
  })));
  const signature = await signSession(payload);

  return `${SESSION_COOKIE}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}${cookieSecureAttribute(request)}`;
}

export function clearSessionCookie(request) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecureAttribute(request)}`;
}

export async function getSession(request) {
  const value = parseCookies(request)[SESSION_COOKIE];
  if (!value || !hasSessionSecret()) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = await signSession(payload);
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  let session;
  try {
    session = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch (_) {
    return null;
  }

  if (!session || session.typ !== SESSION_TYPE) return null;
  if (typeof session.exp !== "number" || session.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    email: normalizeEmail(session.email),
    name: cleanText(session.name, 80),
    provider: cleanText(session.provider || "password", 40),
  };
}
