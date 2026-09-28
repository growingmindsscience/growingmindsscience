import { test } from "node:test";
import assert from "node:assert/strict";
import { pbkdf2Sync, randomBytes } from "node:crypto";

const SECRET = "test-session-secret-0123456789abcdef";
const SALT = randomBytes(16).toString("base64url");
process.env.GMS_SESSION_SECRET = SECRET;
process.env.GMS_LOGIN_EMAIL = "owner@example.com";
process.env.GMS_LOGIN_NAME = "Owner";
process.env.GMS_LOGIN_PASSWORD_SALT = SALT;
process.env.GMS_LOGIN_PASSWORD_HASH = pbkdf2Sync("correct horse battery", SALT, 210000, 32, "sha256").toString("base64url");

const { createSessionCookie, getSession, verifyLogin, isGoogleAuthConfigured } = await import("../../api/_auth.js");
const { base64UrlEncode, hmacSha256 } = await import("../../api/_security.js");
const { validateGoogleUser } = await import("../../api/auth/google/_shared.js");

const cookieValue = (setCookie) => setCookie.split(";")[0].slice("gms_session=".length);
const withCookie = (value) => new Request("https://example.test/api/session", { headers: { cookie: `gms_session=${value}` } });

async function signedWithRawSecret(claims) {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const sig = base64UrlEncode(await hmacSha256(SECRET, payload));
  return `${payload}.${sig}`;
}

test("a session cookie round-trips", async () => {
  const setCookie = await createSessionCookie(new Request("https://example.test/"), { email: "owner@example.com", name: "Owner" }, false);
  assert.match(setCookie, /HttpOnly; SameSite=Lax; Max-Age=28800; Secure$/);
  const session = await getSession(withCookie(cookieValue(setCookie)));
  assert.deepEqual(session, { email: "owner@example.com", name: "Owner", provider: "password" });
});

test("an AI Pro subscriber token is not accepted as a session (A3)", async () => {
  // Exactly how api/verify-subscription.js mints tokens: same secret, same shape.
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = await signedWithRawSecret({ email: "owner@example.com", exp, type: "subscriber" });
  assert.equal(await getSession(withCookie(token)), null);
});

test("an old-format session (raw secret, no typ) no longer verifies", async () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const old = await signedWithRawSecret({ email: "owner@example.com", name: "Owner", provider: "password", exp });
  assert.equal(await getSession(withCookie(old)), null);
});

test("tampered or expired sessions are rejected", async () => {
  const setCookie = await createSessionCookie(new Request("https://example.test/"), { email: "a@example.com", name: "A" }, false);
  const [payload, sig] = cookieValue(setCookie).split(".");
  const forged = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: "session", email: "owner@example.com", exp: 9999999999 })));
  assert.equal(await getSession(withCookie(`${forged}.${sig}`)), null);
  assert.equal(await getSession(withCookie(`${payload}.${sig.slice(0, -2)}xx`)), null);

  const realDateNow = Date.now;
  try {
    Date.now = () => realDateNow() + 9 * 60 * 60 * 1000; // past the 8-hour session
    assert.equal(await getSession(withCookie(`${payload}.${sig}`)), null);
  } finally {
    Date.now = realDateNow;
  }
});

test("verifyLogin accepts the right password and rejects the rest", async () => {
  assert.equal((await verifyLogin("Owner@Example.com", "correct horse battery")).ok, true);
  assert.equal((await verifyLogin("owner@example.com", "wrong")).reason, "invalid");
  assert.equal((await verifyLogin("someone@example.com", "correct horse battery")).reason, "invalid");
});

test("verifyLogin always derives the password hash, even for an unknown email (A9)", async () => {
  const subtle = globalThis.crypto.subtle;
  const original = subtle.deriveBits;
  let calls = 0;
  subtle.deriveBits = function (...args) {
    calls += 1;
    return original.apply(this, args);
  };
  try {
    await verifyLogin("not-the-owner@example.com", "anything");
    assert.equal(calls, 1, "PBKDF2 ran for a non-matching email");
    await verifyLogin("owner@example.com", "anything");
    assert.equal(calls, 2);
  } finally {
    subtle.deriveBits = original;
  }
});

test("Google sign-in fails closed without an allowlist (A3)", () => {
  process.env.GOOGLE_CLIENT_ID = "id";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  delete process.env.GOOGLE_ALLOWED_EMAILS;
  delete process.env.GOOGLE_ALLOWED_DOMAIN;
  assert.equal(isGoogleAuthConfigured(), false);
  assert.equal(validateGoogleUser({ email: "stranger@gmail.com", email_verified: true }), null);

  process.env.GOOGLE_ALLOWED_DOMAIN = "example.com";
  assert.equal(isGoogleAuthConfigured(), true);
  assert.equal(validateGoogleUser({ email: "a@example.com", email_verified: true }).email, "a@example.com");
  assert.equal(validateGoogleUser({ email: "a@evilexample.com", email_verified: true }), null);
  assert.equal(validateGoogleUser({ email: "a@sub.example.com", email_verified: true }), null);
  assert.equal(validateGoogleUser({ email: "a@example.com", email_verified: false }), null);

  delete process.env.GOOGLE_ALLOWED_DOMAIN;
  process.env.GOOGLE_ALLOWED_EMAILS = "Owner@Gmail.com, second@example.org";
  assert.equal(validateGoogleUser({ email: "owner@gmail.com", email_verified: "true" }).email, "owner@gmail.com");
  assert.equal(validateGoogleUser({ email: "stranger@gmail.com", email_verified: true }), null);
});
