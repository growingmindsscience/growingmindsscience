import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { json, mockFetch } from "./_helpers.mjs";

const SECRET = "whsec_test_current";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
process.env.SUPABASE_URL = "https://legacy-project.supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
process.env.WEB3FORMS_ACCESS_KEY = "web3forms-test";
process.env.KIT_API_KEY = "kit-test";
process.env.KIT_FORM_ID = "123";

const { default: handler } = await import("../../api/stripe-webhook.js");
const { parseStripeSignature, verifyStripeSignature } = await import("../../api/_stripe.js");

const SUPABASE = "https://legacy-project.supabase.test/rest/v1/purchases";
const WEB3FORMS = "https://api.web3forms.com/submit";
const KIT = "https://api.convertkit.com/";

const sign = (body, secret, t = Math.floor(Date.now() / 1000)) =>
  createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");

function deliver(event, { header, secret = SECRET } = {}) {
  const body = typeof event === "string" ? event : JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  return handler(new Request("https://growingmindsscience.com/api/stripe-webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": header ?? `t=${t},v1=${sign(body, secret, t)}` },
    body,
  }));
}

const checkoutEvent = (session, type = "checkout.session.completed") => ({
  id: "evt_1", type,
  data: { object: { id: "cs_live_1", customer_details: { email: "parent@example.com" }, metadata: { product: "ai_pro" }, ...session } },
});

function services({ store = () => new Response(null, { status: 201 }) } = {}) {
  return mockFetch([
    [SUPABASE, store],
    [WEB3FORMS, () => json({ success: true })],
    [KIT, () => json({ subscription: {} })],
  ]);
}

test("A8: accepts the event when ANY v1 signature matches", async () => {
  const body = JSON.stringify({ id: "evt", type: "customer.created", data: { object: {} } });
  const t = Math.floor(Date.now() / 1000);
  const good = sign(body, SECRET, t);
  const old = sign(body, "whsec_old_secret", t);
  assert.equal(await verifyStripeSignature(body, `t=${t},v1=${good},v1=${old}`, SECRET), true);
  assert.equal(await verifyStripeSignature(body, `t=${t},v1=${old},v1=${good}`, SECRET), true);
  assert.equal(await verifyStripeSignature(body, `t=${t},v1=${old}`, SECRET), false);
  assert.deepEqual(parseStripeSignature(`t=1,v1=AA,v0=x,v1=bb`).signatures, ["aa", "bb"]);
});

test("A8: rejects a stale, missing or non-numeric timestamp", async () => {
  const body = "{}";
  const now = Math.floor(Date.now() / 1000);
  assert.equal(await verifyStripeSignature(body, `t=${now - 301},v1=${sign(body, SECRET, now - 301)}`, SECRET), false);
  assert.equal(await verifyStripeSignature(body, `v1=${sign(body, SECRET, now)}`, SECRET), false);
  assert.equal(await verifyStripeSignature(body, `t=abc,v1=${createHmac("sha256", SECRET).update(`abc.${body}`).digest("hex")}`, SECRET), false);
});

test("bad signatures are a 400 and touch nothing", async () => {
  const net = services();
  try {
    const res = await deliver(checkoutEvent({ payment_status: "paid" }), { secret: "whsec_wrong" });
    assert.equal(res.status, 400);
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});

test("A8: an unpaid checkout is acknowledged but not fulfilled", async () => {
  const net = services();
  try {
    const res = await deliver(checkoutEvent({ payment_status: "unpaid" }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true, fulfilled: false });
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});

test("A8: a paid checkout is stored, then Kit and the owner are told", async () => {
  const net = services();
  try {
    const res = await deliver(checkoutEvent({ payment_status: "paid" }));
    assert.equal(res.status, 200);
    assert.equal(net.count(SUPABASE), 1);
    assert.equal(net.count(KIT), 1);
    assert.equal(net.count(WEB3FORMS), 1);
    const stored = JSON.parse(net.calls.find((c) => c.url.startsWith(SUPABASE)).init.body);
    assert.deepEqual(stored, { email: "parent@example.com", stripe_session_id: "cs_live_1", product: "ai_pro" });
  } finally { net.restore(); }
});

test("A8: async payments are fulfilled on async_payment_succeeded; free checkouts count as paid", async () => {
  const net = services();
  try {
    assert.equal((await deliver(checkoutEvent({ payment_status: "paid" }, "checkout.session.async_payment_succeeded"))).status, 200);
    assert.equal((await deliver(checkoutEvent({ payment_status: "no_payment_required" }))).status, 200);
    assert.equal(net.count(SUPABASE), 2);
  } finally { net.restore(); }
});

test("A8: a failed insert is a 500 (so Stripe retries) and nothing else runs", async () => {
  for (const store of [() => json({ message: "db down" }, 503), () => { throw new TypeError("network"); }]) {
    const net = services({ store });
    try {
      const res = await deliver(checkoutEvent({ payment_status: "paid" }));
      assert.equal(res.status, 500);
      assert.equal(net.count(WEB3FORMS), 0);
      assert.equal(net.count(KIT), 0);
    } finally { net.restore(); }
  }
});

test("A8: a duplicate insert (409, a retried event) counts as stored", async () => {
  const net = services({ store: () => json({ code: "23505" }, 409) });
  try {
    assert.equal((await deliver(checkoutEvent({ payment_status: "paid" }))).status, 200);
  } finally { net.restore(); }
});

test("A10: a signed payload that is not an object is a 400", async () => {
  const net = services();
  try {
    assert.equal((await deliver("[]")).status, 400);
    assert.equal((await deliver("null")).status, 400);
  } finally { net.restore(); }
});

test("A10: the owner notification strips line breaks from the buyer's email", async () => {
  const net = services();
  try {
    await deliver(checkoutEvent({ payment_status: "paid", customer_details: { email: "a@b.co\r\nInjected: yes" } }));
    const sent = JSON.parse(net.calls.find((c) => c.url.startsWith(WEB3FORMS)).init.body);
    assert.ok(sent.message.includes("Email: a@b.co Injected: yes\nProduct: ai_pro"), sent.message);
  } finally { net.restore(); }
});

test("other events are acknowledged without side effects", async () => {
  const net = services();
  try {
    assert.equal((await deliver({ id: "evt", type: "invoice.paid", data: { object: {} } })).status, 200);
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});
