import { test } from "node:test";
import assert from "node:assert/strict";
import { freshIp, json, jsonRequest, mockFetch } from "./_helpers.mjs";

process.env.STRIPE_SECRET_KEY = "sk_test_never_sent";
process.env.GMS_SESSION_SECRET = "test-session-secret-0123456789abcdef";

const { default: handler } = await import("../../api/verify-subscription.js");
const { base64UrlDecode, base64UrlEncode, hmacSha256 } = await import("../../api/_security.js");

const URL_VERIFY = "https://growingmindsscience.com/api/verify-subscription";
const STRIPE = "https://api.stripe.com/v1";
const SUB_A = "sub_1AttackerLapsed00";
const SUB_V = "sub_1VictimActive0000";
const CS = "cs_test_a1b2c3d4e5f6g7h8";

const verify = (body, headers) => handler(jsonRequest(URL_VERIFY, body, { ip: freshIp(), headers }));
const claimsOf = (token) => JSON.parse(new TextDecoder().decode(base64UrlDecode(token.split(".")[0])));

async function token(claims) {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  return `${payload}.${base64UrlEncode(await hmacSha256(process.env.GMS_SESSION_SECRET, payload))}`;
}
const inDays = (d) => Math.floor(Date.now() / 1000) + d * 86400;

// A small Stripe double. `subs` maps subscription id to status; `customers`
// is what a customer search by email returns; `fail` forces an error answer.
function stripe({ checkout, subs = {}, customers = [], customerSubs = {}, fail } = {}) {
  return mockFetch([
    [`${STRIPE}/checkout/sessions/`, () => fail?.checkout ?? (checkout ? json(checkout) : json({ error: { code: "resource_missing" } }, 404))],
    [`${STRIPE}/subscriptions/`, (url) => {
      if (fail?.sub) return fail.sub;
      const id = decodeURIComponent(url.slice(`${STRIPE}/subscriptions/`.length));
      return subs[id] ? json({ id, status: subs[id] }) : json({ error: { code: "resource_missing" } }, 404);
    }],
    [`${STRIPE}/customers?`, () => fail?.customers ?? json({ data: customers })],
    [`${STRIPE}/subscriptions?customer=`, (url) => {
      const id = new URL(url).searchParams.get("customer");
      return json({ data: (customerSubs[id] || []).map(([sid, status]) => ({ id: sid, status })) });
    }],
  ]);
}

test("only same-origin JSON", async () => {
  const res = await handler(new Request(URL_VERIFY, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }));
  assert.equal(res.status, 415);
});

test("A5: checkout unlock binds the token to the subscription it created", async () => {
  const net = stripe({
    checkout: { mode: "subscription", status: "complete", customer_details: { email: "Parent@Example.com" }, subscription: SUB_V },
    subs: { [SUB_V]: "active" },
  });
  try {
    const res = await verify({ sessionId: CS });
    assert.equal(res.status, 200);
    const claims = claimsOf((await res.json()).token);
    assert.equal(claims.sub, SUB_V);
    assert.equal(claims.email, "parent@example.com");
    assert.equal(net.count(`${STRIPE}/customers`), 0, "no lookup by email");
  } finally { net.restore(); }
});

test("A5: a lapsed subscription does not ride on another customer's with the same email", async () => {
  // The attacker paid once with the victim's email, then let it lapse.
  const net = stripe({
    subs: { [SUB_A]: "canceled", [SUB_V]: "active" },
    customers: [{ id: "cus_attacker" }, { id: "cus_victim" }],
    customerSubs: { cus_victim: [[SUB_V, "active"]] },
  });
  try {
    const res = await verify({ token: await token({ email: "victim@example.com", exp: inDays(3), type: "subscriber", sub: SUB_A }) });
    assert.equal(res.status, 404);
  } finally { net.restore(); }
});

test("A5: checkout unlock refuses a checkout whose subscription has ended", async () => {
  const net = stripe({
    checkout: { mode: "subscription", status: "complete", customer_details: { email: "p@example.com" }, subscription: SUB_A },
    subs: { [SUB_A]: "canceled" },
  });
  try {
    assert.equal((await verify({ sessionId: CS })).status, 404);
  } finally { net.restore(); }
});

test("A6: Stripe trouble is a 502, never a 404", async () => {
  const cases = [
    { fail: { sub: json({ error: { type: "rate_limit_error" } }, 429) } },
    { fail: { sub: json({ error: { type: "api_error" } }, 500) } },
    { fail: { sub: new Response("<html>Bad gateway</html>", { status: 502 }) } },
    { fail: { sub: new Response("not json", { status: 200 }) } },
  ];
  for (const c of cases) {
    const net = stripe(c);
    try {
      const res = await verify({ token: await token({ email: "p@example.com", exp: inDays(3), type: "subscriber", sub: SUB_V }) });
      assert.equal(res.status, 502);
    } finally { net.restore(); }
  }

  const netCheckout = stripe({ fail: { checkout: json({ error: {} }, 500) } });
  try {
    assert.equal((await verify({ sessionId: CS })).status, 502);
  } finally { netCheckout.restore(); }
});

test("A6: legacy tokens (no subscription id) check by email once, and errors stay 502", async () => {
  const legacy = await token({ email: "p@example.com", exp: inDays(3), type: "subscriber" });

  const ok = stripe({ customers: [{ id: "cus_1" }], customerSubs: { cus_1: [[SUB_V, "active"]] } });
  try {
    const res = await verify({ token: legacy });
    assert.equal(res.status, 200);
    assert.equal(claimsOf((await res.json()).token).sub, SUB_V, "the new token is bound");
  } finally { ok.restore(); }

  const limited = stripe({ fail: { customers: json({ error: { type: "rate_limit_error" } }, 429) } });
  try {
    assert.equal((await verify({ token: legacy })).status, 502);
  } finally { limited.restore(); }

  const none = stripe({ customers: [] });
  try {
    assert.equal((await verify({ token: legacy })).status, 404);
  } finally { none.restore(); }
});

test("a token refresh keeps the subscription binding; bad tokens are 401", async () => {
  const net = stripe({ subs: { [SUB_V]: "active" } });
  try {
    const res = await verify({ token: await token({ email: "p@example.com", exp: inDays(3), type: "subscriber", sub: SUB_V }) });
    assert.equal(res.status, 200);
    const claims = claimsOf((await res.json()).token);
    assert.equal(claims.sub, SUB_V);
    assert.ok(claims.exp > inDays(29));

    const expired = await token({ email: "p@example.com", exp: inDays(-1), type: "subscriber", sub: SUB_V });
    assert.equal((await verify({ token: expired })).status, 401);
    const wrongType = await token({ email: "p@example.com", exp: inDays(3), type: "session", sub: SUB_V });
    assert.equal((await verify({ token: wrongType })).status, 401);
    assert.equal((await verify({ token: "abc.def" })).status, 401);
  } finally { net.restore(); }
});

test("bare email needs a signed-in session", async () => {
  const net = stripe();
  try {
    assert.equal((await verify({ email: "p@example.com" })).status, 401);
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});
