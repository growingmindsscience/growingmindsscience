import { test } from "node:test";
import assert from "node:assert/strict";
import { freshIp, json, mockFetch } from "./_helpers.mjs";

process.env.STRIPE_SECRET_KEY = "sk_test_never_sent";

const { default: handler } = await import("../../api/create-checkout-session.js");
const STRIPE = "https://api.stripe.com/v1/checkout/sessions";
const open = (ip = freshIp()) => handler(new Request("https://growingmindsscience.com/api/create-checkout-session", { headers: { "x-forwarded-for": ip } }));

test("A7: redirects to the Stripe Checkout URL", async () => {
  const net = mockFetch([[STRIPE, () => json({ url: "https://checkout.stripe.com/c/pay/cs_test_1" })]]);
  try {
    const res = await open();
    assert.equal(res.status, 303);
    assert.equal(res.headers.get("location"), "https://checkout.stripe.com/c/pay/cs_test_1");
    const params = new URLSearchParams(net.calls[0].init.body);
    assert.equal(params.get("mode"), "subscription");
    assert.equal(params.get("line_items[0][price]"), "price_1Tgu9yLIy3W5wQUyOw1FYEPA");
    assert.equal(params.get("success_url"), "https://growingmindsscience.com/tools/growing-minds-ai?subscribed=1&session_id={CHECKOUT_SESSION_ID}");
  } finally { net.restore(); }
});

test("A7: AI_PRO_PRICE_ID overrides the price", async () => {
  process.env.AI_PRO_PRICE_ID = "price_test_override";
  const net = mockFetch([[STRIPE, () => json({ url: "https://checkout.stripe.com/c/pay/x" })]]);
  try {
    await open();
    assert.equal(new URLSearchParams(net.calls[0].init.body).get("line_items[0][price]"), "price_test_override");
  } finally {
    net.restore();
    delete process.env.AI_PRO_PRICE_ID;
  }
});

test("A7: a non-JSON or failed Stripe answer is a 502, not a crash", async () => {
  for (const reply of [() => new Response("<html>502</html>", { status: 502 }), () => new Response("garbage", { status: 200 }), () => json({ error: {} }, 400), () => json({ url: "javascript:alert(1)" })]) {
    const net = mockFetch([[STRIPE, reply]]);
    try {
      const res = await open();
      assert.equal(res.status, 502);
    } finally { net.restore(); }
  }
});

test("A7: repeated calls from one client are throttled", async () => {
  const net = mockFetch([[STRIPE, () => json({ url: "https://checkout.stripe.com/c/pay/x" })]]);
  try {
    const ip = freshIp();
    const statuses = [];
    for (let i = 0; i < 11; i += 1) statuses.push((await open(ip)).status);
    assert.deepEqual(statuses.slice(0, 10), new Array(10).fill(303));
    assert.equal(statuses[10], 429);
    assert.equal(net.calls.length, 10);
  } finally { net.restore(); }
});
