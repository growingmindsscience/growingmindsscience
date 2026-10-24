import { test } from "node:test";
import assert from "node:assert/strict";
import { freshIp, mockFetch } from "./_helpers.mjs";

process.env.STRIPE_SECRET_KEY = "sk_test_never_sent";

const { default: handler } = await import("../../api/create-checkout-session.js");
const open = (method = "GET") => handler(new Request("https://fromlittleonward.com/api/create-checkout-session", { method, headers: { "x-forwarded-for": freshIp() } }));

// AI Pro is retired: the old checkout link must never start a subscription.
test("A7: the retired AI Pro checkout redirects to pricing without calling Stripe", async () => {
  const net = mockFetch([]);
  try {
    for (const method of ["GET", "POST"]) {
      const res = await open(method);
      assert.equal(res.status, 303);
      assert.equal(res.headers.get("location"), "https://fromlittleonward.com/pricing");
    }
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});

test("A7: other methods are refused", async () => {
  const net = mockFetch([]);
  try {
    assert.equal((await open("PUT")).status, 405);
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});
