import {
  base64UrlEncode,
  cleanText,
  constantTimeEqual,
  cookieSecureAttribute,
  normalizeEmail,
  parseCookies,
} from "../../_security.js";

const STATE_COOKIE = "gms_google_oauth_state";
const STATE_TTL_SECONDS = 60 * 10;
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export function googleConfig() {
  return {
    clientId: String(process.env.GOOGLE_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || "").trim(),
    allowedEmails: String(process.env.GOOGLE_ALLOWED_EMAILS || "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean),
    allowedDomain: String(process.env.GOOGLE_ALLOWED_DOMAIN || "").trim().toLowerCase().replace(/^@/, ""),
  };
}

export function googleRedirectUri(request) {
  const url = new URL(request.url);
  return `${url.origin}/api/auth/google/callback`;
}

export function randomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function stateCookie(request, state) {
  return `${STATE_COOKIE}=${state}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=${STATE_TTL_SECONDS}${cookieSecureAttribute(request)}`;
}

export function clearStateCookie(request) {
  return `${STATE_COOKIE}=; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecureAttribute(request)}`;
}

export function readStateCookie(request) {
  return parseCookies(request)[STATE_COOKIE] || "";
}

export function isValidState(request, state) {
  const storedState = readStateCookie(request);
  return Boolean(state && storedState && constantTimeEqual(state, storedState));
}

export function googleAuthUrl(request, state) {
  const config = googleConfig();
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeGoogleCode(request, code) {
  const config = googleConfig();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: googleRedirectUri(request),
      grant_type: "authorization_code",
    }),
  });

  const tokenBody = await response.json().catch(() => ({}));
  if (!response.ok || !tokenBody.access_token) {
    throw new Error("Google could not complete sign-in.");
  }

  const userResponse = await fetch(USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${tokenBody.access_token}` },
  });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok) throw new Error("Google profile could not be loaded.");
  return user;
}

export function validateGoogleUser(user) {
  const config = googleConfig();
  const email = normalizeEmail(user.email);
  const verified = user.email_verified === true || user.email_verified === "true";
  if (!email || !verified) return null;

  if (config.allowedEmails.length && !config.allowedEmails.includes(email)) {
    return null;
  }

  if (config.allowedDomain && !email.endsWith(`@${config.allowedDomain}`)) {
    return null;
  }

  return {
    email,
    name: cleanText(user.name || user.given_name || email, 80),
    provider: "google",
  };
}
