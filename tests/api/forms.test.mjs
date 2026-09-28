import { test } from "node:test";
import assert from "node:assert/strict";
import { freshIp, json, mockFetch } from "./_helpers.mjs";

process.env.WEB3FORMS_ACCESS_KEY = "web3forms-test";
process.env.KIT_API_KEY = "kit-test";
process.env.KIT_FORM_ID = "456";

const { default: waitlist } = await import("../../api/waitlist.js");
const { default: contact } = await import("../../api/contact.js");

const WEB3FORMS = "https://api.web3forms.com/submit";
const KIT = "https://api.convertkit.com/v3/forms/456/subscribe";

const form = (url, fields, accept = "text/html") => new Request(url, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", accept, "x-forwarded-for": freshIp() },
  body: new URLSearchParams(fields).toString(),
});
const jsonPost = (url, body) => new Request(url, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json", "x-forwarded-for": freshIp() },
  body,
});
const sentTo = (net, prefix) => JSON.parse(net.calls.find((c) => c.url.startsWith(prefix)).init.body);

test("A10: the waitlist waits for the Kit subscription before answering", async () => {
  let kitDone = false;
  const net = mockFetch([
    [WEB3FORMS, () => json({ success: true })],
    [KIT, async () => { await new Promise((r) => setTimeout(r, 40)); kitDone = true; return json({}); }],
  ]);
  try {
    const res = await waitlist(form("https://g.test/api/waitlist", { email: "parent@example.com", name: "Ann Lee" }));
    assert.equal(res.status, 303);
    assert.equal(kitDone, true, "Kit finished before the response");
    assert.equal(sentTo(net, KIT).first_name, "Ann");
  } finally { net.restore(); }
});

test("A10: the notification subject is chosen by the server", async () => {
  const net = mockFetch([[WEB3FORMS, () => json({ success: true })], [KIT, () => json({})]]);
  try {
    await waitlist(form("https://g.test/api/waitlist", { email: "a@example.com", subject: "URGENT: your account is locked\r\nBcc: x@y.z" }));
    assert.equal(sentTo(net, WEB3FORMS).subject, "New Waitlist Signup - Growing Minds Science");
    net.calls.length = 0;
    await waitlist(form("https://g.test/api/waitlist", { email: "a@example.com", subject: "Preschool Class Waitlist — Growing Minds Science" }));
    assert.equal(sentTo(net, WEB3FORMS).subject, "Preschool Class Waitlist — Growing Minds Science");
  } finally { net.restore(); }
});

test("A10: header-bound waitlist fields lose CR/LF", async () => {
  const net = mockFetch([[WEB3FORMS, () => json({ success: true })], [KIT, () => json({})]]);
  try {
    await waitlist(form("https://g.test/api/waitlist", { email: "a@example.com", name: "Ann\r\nBcc: x@y.z", interest: "Toddlerhood\nX-Extra: 1" }));
    const sent = sentTo(net, WEB3FORMS);
    assert.equal(sent.name, "Ann Bcc: x@y.z");
    assert.equal(sent.interest, "Toddlerhood X-Extra: 1");
  } finally { net.restore(); }
});

test("A10: non-object JSON is a 400 on both forms", async () => {
  const net = mockFetch([]);
  try {
    assert.equal((await waitlist(jsonPost("https://g.test/api/waitlist", "null"))).status, 400);
    assert.equal((await contact(jsonPost("https://g.test/api/contact", "[1]"))).status, 400);
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});

test("the honeypot answers like success and sends nothing", async () => {
  const net = mockFetch([]);
  try {
    const res = await waitlist(form("https://g.test/api/waitlist", { email: "bot@example.com", botcheck: "on" }));
    assert.equal(res.status, 303);
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});

test("A10: contact keeps message line breaks but strips them from the name", async () => {
  const net = mockFetch([[WEB3FORMS, () => json({ success: true })]]);
  try {
    const res = await contact(jsonPost("https://g.test/api/contact", JSON.stringify({ email: "a@example.com", name: "Bo\r\nCc: x@y.z", message: "Line one\nLine two" })));
    assert.equal(res.status, 200);
    const sent = sentTo(net, WEB3FORMS);
    assert.equal(sent.name, "Bo Cc: x@y.z");
    assert.equal(sent.message, "Line one\nLine two");
    assert.equal(sent.subject, "Contact Request — Growing Minds Science");
  } finally { net.restore(); }
});
