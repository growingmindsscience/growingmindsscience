// The daily allowances as the shared Supabase counter sees them: which limit
// each caller is held to, and which key it is counted under. The counter itself
// (ai_take_free_question) is mocked; the in-memory fallback is covered in
// ai-endpoint.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { anthropicSse, freshIp, json, jsonRequest, mockFetch, sseEvents, stop, textDelta } from "./_helpers.mjs";

process.env.ANTHROPIC_API_KEY = "test-key-never-sent";
process.env.GMS_AI_ACCESS_CODE = "Class-Code-7f3a9c";
process.env.GMS_SESSION_SECRET = "test-session-secret-0123456789abcdef";
process.env.AI_USAGE_SUPABASE_URL = "https://usage-project.supabase.test";
process.env.AI_USAGE_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";

const { default: handler } = await import("../../api/growing-minds-ai.js");

const URL_AI = "https://www.fromlittleonward.com/api/growing-minds-ai";
const ANTHROPIC = "https://api.anthropic.com/";
const ENTITLEMENTS = "https://www.fromlittleonward.com/nsc/api/entitlements/me";
const TAKE = "https://usage-project.supabase.test/rest/v1/rpc/ai_take_free_question";
const REFUND = "https://usage-project.supabase.test/rest/v1/rpc/ai_refund_free_question";

const ask = (body, ip, headers) => handler(jsonRequest(URL_AI, body, { ip, headers }));

// `taken` decides what the counter answers; every take is recorded.
function network({ taken = () => true, entitlement = { authenticated: false, unlimitedAi: false }, anthropic } = {}) {
  const takes = [];
  const net = mockFetch([
    [TAKE, (url, init) => { const body = JSON.parse(init.body); takes.push(body); return json(taken(body)); }],
    [REFUND, () => json(null)],
    [ENTITLEMENTS, () => json(entitlement)],
    [ANTHROPIC, anthropic || (() => anthropicSse([textDelta("ok"), stop()]))],
  ]);
  return { ...net, takes };
}

test("a visitor without access is held to the free limit of 5", async () => {
  const net = network();
  try {
    await (await ask({ question: "q" }, freshIp())).text();
    assert.equal(net.takes.length, 1);
    assert.equal(net.takes[0].p_limit, 5);
  } finally { net.restore(); }
});

test("the shared class code is held to 50 a day, counted apart from the free limit", async () => {
  const net = network();
  try {
    const ip = freshIp();
    await (await ask({ question: "q" }, ip)).text();
    await (await ask({ question: "q", accessCode: "Class-Code-7f3a9c" }, ip)).text();
    assert.deepEqual(net.takes.map((t) => t.p_limit), [5, 50]);
    assert.notEqual(net.takes[0].p_key_hash, net.takes[1].p_key_hash, "free and class keys never share a row");
  } finally { net.restore(); }
});

test("at the limit, a class family gets class_limit_reached and the model is not called", async () => {
  const net = network({ taken: () => false });
  try {
    const res = await ask({ question: "q", accessCode: "Class-Code-7f3a9c" }, freshIp());
    assert.equal(res.status, 429);
    const [event] = await sseEvents(res);
    assert.equal(event.code, "class_limit_reached");
    assert.match(event.error, /50 questions today/);
    assert.equal(net.count(ANTHROPIC), 0);
  } finally { net.restore(); }
});

test("a signed-in class account is counted per account, whatever network it asks from", async () => {
  const net = network({ entitlement: { authenticated: true, unlimitedAi: true, membership: false, userId: "user-class-2" } });
  try {
    await (await ask({ question: "q" }, freshIp(), { cookie: "sb-session=present" })).text();
    await (await ask({ question: "q" }, freshIp(), { cookie: "sb-session=present" })).text();
    assert.deepEqual(net.takes.map((t) => t.p_limit), [50, 50]);
    assert.equal(net.takes[0].p_key_hash, net.takes[1].p_key_hash);
  } finally { net.restore(); }
});

test("an older class app without userId falls back to counting per network", async () => {
  const net = network({ entitlement: { authenticated: true, unlimitedAi: true, membership: false } });
  try {
    await (await ask({ question: "q" }, freshIp(), { cookie: "sb-session=present" })).text();
    await (await ask({ question: "q" }, freshIp(), { cookie: "sb-session=present" })).text();
    assert.deepEqual(net.takes.map((t) => t.p_limit), [50, 50]);
    assert.notEqual(net.takes[0].p_key_hash, net.takes[1].p_key_hash);
  } finally { net.restore(); }
});

test("membership is not counted", async () => {
  const net = network({ entitlement: { authenticated: true, unlimitedAi: true, membership: true, userId: "user-member-2" } });
  try {
    const res = await ask({ question: "q" }, freshIp(), { cookie: "sb-session=present" });
    assert.equal(res.status, 200);
    await res.text();
    assert.equal(net.takes.length, 0);
  } finally { net.restore(); }
});

test("a class question the model never answers is given back", async () => {
  const net = network({ anthropic: () => json({ type: "error" }, 529) });
  try {
    const res = await ask({ question: "q", accessCode: "Class-Code-7f3a9c" }, freshIp());
    assert.equal(res.status, 502);
    assert.equal(net.takes[0].p_limit, 50);
    assert.equal(net.count(REFUND), 1);
  } finally { net.restore(); }
});
