import {
  base64UrlDecode,
  base64UrlEncode,
  cleanText,
  constantTimeEqual,
  cookieSecureAttribute,
  hmacSha256,
  normalizeEmail,
  parseCookies,
  pbkdf2Sha256,
} from "./_security.js";

const SESSION_COOKIE = "gms_session";
const PASSWORD_ITERATIONS = 210000;
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;

function authConfig() {
  return {
    email: normalizeEmail(process.env.GMS_LOGIN_EMAIL),
    name: cleanText(process.env.GMS_LOGIN_NAME || "Growing Minds member", 80),
    passwordHash: String(process.env.GMS_LOGIN_PASSWORD_HASH || "").trim(),
    passwordSalt: String(process.env.GMS_LOGIN_PASSWORD_SALT || "").trim(),
    sessionSecret: String(process.env.GMS_SESSION_SECRET || "").trim(),
  };
}

export function isAuthConfigured() {
  const config = authConfig();
  return Boolean(config.email && config.passwordHash && config.passwordSalt && config.sessionSecret);
}

export async function verifyLogin(email, password) {
  const config = authConfig();
  if (!isAuthConfigured()) return { ok: false, reason: "not_configured" };
  if (!constantTimeEqual(normalizeEmail(email), config.email)) return { ok: false, reason: "invalid" };

  const attemptedHash = base64UrlEncode(await pbkdf2Sha256(String(password || ""), config.passwordSalt, PASSWORD_ITERATIONS));
  if (!constantTimeEqual(attemptedHash, config.passwordHash)) return { ok: false, reason: "invalid" };

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
    email: profile.email,
    name: profile.name,
    exp: expiresAt,
  })));
  const signature = base64UrlEncode(await hmacSha256(authConfig().sessionSecret, payload));

  return `${SESSION_COOKIE}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}${cookieSecureAttribute(request)}`;
}

export function clearSessionCookie(request) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecureAttribute(request)}`;
}

export async function getSession(request) {
  const value = parseCookies(request)[SESSION_COOKIE];
  if (!value || !isAuthConfigured()) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = base64UrlEncode(await hmacSha256(authConfig().sessionSecret, payload));
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  let session;
  try {
    session = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch (_) {
    return null;
  }

  if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    email: normalizeEmail(session.email),
    name: cleanText(session.name, 80),
  };
}
