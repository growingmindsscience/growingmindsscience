import { test } from "node:test";
import assert from "node:assert/strict";
import { freshIp, json, mockFetch } from "./_helpers.mjs";

process.env.WEB3FORMS_ACCESS_KEY = "web3forms-test";
process.env.KIT_API_KEY = "kit-test";
process.env.KIT_FORM_ID = "456";

const { logSiteEvent, waitlistEvent } = await import("../../api/_site-events.js");
const { default: contact } = await import("../../api/contact.js");
const { default: waitlist } = await import("../../api/waitlist.js");

const WEB3FORMS = "https://api.web3forms.com/submit";
const KIT = "https://api.convertkit.com/v3/forms/456/subscribe";
const OS = "https://os.example.supabase.co/rest/v1/site_events";

const form = (url, fields) => new Request(url, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json", "x-forwarded-for": freshIp() },
  body: new URLSearchParams(fields).toString(),
});

function withOs(fn) {
  return async () => {
    process.env.MATTHEW_OS_SUPABASE_URL = "https://os.example.supabase.co";
    process.env.MATTHEW_OS_PUBLISHABLE_KEY = "pk-test";
    try { await fn(); } finally {
      delete process.env.MATTHEW_OS_SUPABASE_URL;
      delete process.env.MATTHEW_OS_PUBLISHABLE_KEY;
    }
  };
}

test("waitlistEvent: class waitlists are sign-ups, the articles list is the newsletter", () => {
  assert.deepEqual(waitlistEvent("Family Systems Class Waitlist, From Little Onward"), { kind: "signup", detail: "Family Systems Class Waitlist" });
  assert.deepEqual(waitlistEvent("Articles Email Signup, From Little Onward"), { kind: "newsletter", detail: "Articles Email Signup" });
});

test("logSiteEvent does nothing when the operating system is not configured", async () => {
  const net = mockFetch([]);
  try {
    assert.equal(await logSiteEvent("contact", "Contact form"), false);
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});

test("a contact message logs one row with no name, email, or message text", withOs(async () => {
  const net = mockFetch([[WEB3FORMS, () => json({ success: true })], [OS, () => new Response(null, { status: 201 })]]);
  try {
    const res = await contact(form("https://x/api/contact", { name: "Pat Parent", email: "pat@example.com", message: "Hello there" }));
    assert.equal(res.status, 200);
    const call = net.calls.find((c) => c.url === OS);
    assert.ok(call, "site_events was written");
    const body = JSON.parse(call.init.body);
    assert.deepEqual(body, { kind: "contact", detail: "Contact form" });
    assert.equal(call.init.headers.apikey, "pk-test");
    assert.equal(call.init.headers.authorization, undefined);
  } finally { net.restore(); }
}));

test("a class waitlist signup logs a signup row", withOs(async () => {
  const net = mockFetch([[WEB3FORMS, () => json({ success: true })], [KIT, () => json({ subscription: {} })], [OS, () => new Response(null, { status: 201 })]]);
  try {
    const res = await waitlist(form("https://x/api/waitlist", { email: "pat@example.com", subject: "Family Systems Class Waitlist, From Little Onward" }));
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(net.calls.find((c) => c.url === OS).init.body), { kind: "signup", detail: "Family Systems Class Waitlist" });
  } finally { net.restore(); }
}));

test("a database failure never fails the visitor's request", withOs(async () => {
  const net = mockFetch([[WEB3FORMS, () => json({ success: true })], [OS, () => { throw new Error("down"); }]]);
  try {
    const res = await contact(form("https://x/api/contact", { email: "pat@example.com", message: "Hi" }));
    assert.equal(res.status, 200);
  } finally { net.restore(); }
}));
