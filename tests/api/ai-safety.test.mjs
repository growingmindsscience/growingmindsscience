// Safety behaviour of Ask the research: public help lines survive the output
// redactor, the system prompt routes danger first, and retrieval puts the
// red-flag and at-the-edge guidance in front of the model for natural
// phrasings. Keyless: the model is mocked (see _helpers.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { anthropicSse, freshIp, json, jsonRequest, mockFetch, sseEvents, stop, textDelta } from "./_helpers.mjs";

process.env.ANTHROPIC_API_KEY = "test-key-never-sent";

const ai = await import("../../api/growing-minds-ai.js");
const { HELP_LINES, formatHelpLines, createHelpLineFormatter, protectHelpLines, furtherReading } = ai;
const { anthropicToOpenAiStream } = await import("../../api/_ai-chat.js");
const { redactPII } = await import("../../api/_pii-guard.js");
const { retrieve, RED_FLAG_CARDS, AT_THE_EDGE_CARDS } = await import("../../api/_retrieval.js");
const { KNOWLEDGE } = await import("../../api/_knowledge-data.js");
const { extractSystemPrompt } = await import("../../evals/lib/persona.mjs");

const URL_AI = "https://www.fromlittleonward.com/api/growing-minds-ai";
const ANTHROPIC = "https://api.anthropic.com/";
const ENTITLEMENTS = "https://www.fromlittleonward.com/nsc/api/entitlements/me";
const NB = "‑";
const nb = (s) => s.replace(/-/g, NB);

const upstreamFrom = (events) => anthropicSse(events).body;
async function streamText(events) {
  const out = await sseEvents(new Response(anthropicToOpenAiStream(protectHelpLines(upstreamFrom(events)))));
  return {
    text: out.filter((e) => e.choices?.[0]?.delta?.content).map((e) => e.choices[0].delta.content).join(""),
    events: out,
  };
}

// ── Help lines ────────────────────────────────────────────────────────────

test("help lines: every allowed line, in every common format, becomes one fixed form", () => {
  for (const raw of ["1-800-222-1222", "800-222-1222", "(800) 222-1222", "1 800 222 1222", "+1 (800) 222-1222", "1.800.222.1222"]) {
    assert.equal(formatHelpLines(`Call ${raw} now.`), `Call ${nb("1-800-222-1222")} now.`, raw);
  }
  assert.equal(formatHelpLines("1-833-852-6262"), nb("1-833-852-6262"));
  assert.equal(formatHelpLines("1-800-422-4453"), nb("1-800-422-4453"));
  assert.deepEqual(Object.keys(HELP_LINES).sort(), ["8002221222", "8004224453", "8338526262"]);
});

test("help lines: lookalikes and private numbers are left for the redactor", () => {
  for (const other of ["1-800-222-1223", "555-123-4567", "(312) 555-0199"]) {
    assert.equal(formatHelpLines(other), other);
    assert.ok(redactPII(formatHelpLines(`call ${other}`)).includes("[contact details removed]"), other);
  }
});

test("help lines: the fixed form passes the redactor untouched", () => {
  for (const digits of Object.keys(HELP_LINES)) {
    const shown = formatHelpLines(`1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`);
    assert.equal(redactPII(`Call ${shown} today.`), `Call ${shown} today.`);
  }
});

test("help lines: a number split across deltas is still recognised", () => {
  const f = createHelpLineFormatter();
  let out = "";
  for (const piece of ["Call Poison Help at 1-8", "00-22", "2-12", "22 now, or 911."]) out += f.push(piece);
  out += f.flush();
  assert.equal(out, `Call Poison Help at ${nb("1-800-222-1222")} now, or 911.`);
});

test("stream: public help lines reach the page; other numbers are still removed", async () => {
  const { text, events } = await streamText([
    textDelta("Call Poison Help at 1-800-"), textDelta("222-1222 or text (833) 852-"), textDelta("6262 (1-833-TLC-MAMA). "),
    textDelta("Childhelp: 1-800-422-4453. Not 1-800-222-1223 or my cell 555-123-4567."), stop("end_turn"),
  ]);
  assert.ok(text.includes(nb("1-800-222-1222")), text);
  assert.ok(text.includes(nb("1-833-852-6262")), text);
  assert.ok(text.includes("1-833-TLC-MAMA"), text);
  assert.ok(text.includes(nb("1-800-422-4453")), text);
  assert.ok(!text.includes("1-800-222-1223") && !text.includes("555-123-4567"), text);
  assert.equal(text.split("[contact details removed]").length - 1, 2, text);
  assert.equal(events.at(-2).choices[0].finish_reason, "stop");
  assert.equal(events.at(-1), "[DONE]");
});

test("stream: a number held at the end of the answer is released before the finish", async () => {
  const { text } = await streamText([textDelta("If she swallowed it, call 1-800-222-1222"), stop("end_turn")]);
  assert.equal(text, `If she swallowed it, call ${nb("1-800-222-1222")}`);
});

test("stream: an upstream error after held text still reports the interruption", async () => {
  const { text, events } = await streamText([textDelta("Call 911 or 1-800-222"), { type: "error", error: { type: "overloaded_error" } }]);
  assert.ok(text.startsWith("Call 911"));
  assert.equal(events.at(-2).code, "upstream_error");
});

// ── System prompt ─────────────────────────────────────────────────────────

test("prompt: danger comes first, with acute red flags and the lines to call", () => {
  const p = extractSystemPrompt();
  assert.match(p, /Give the safety step first/);
  for (const needle of [
    "call 911 now", "Poison Help at 1-800-222-1222", "button battery", "100.4°F (38°C)",
    "put the baby down on their back", "call or text 988", "1-833-852-6262", "1-800-422-4453",
  ]) assert.ok(p.includes(needle), needle);
  assert.ok(!/\bthen stop\.?$/m.test(p.split("When someone may be in danger")[0]), "no bare 'then stop' rule before the routing block");
  assert.match(p, /The only phone numbers you may give are the public help lines named above/);
});

test("prompt: every number the prompt names survives the stream as written or in the fixed form", async () => {
  const p = extractSystemPrompt();
  const numbers = p.match(/\b1-8\d\d-\d{3}-\d{4}\b/g);
  assert.ok(numbers.length >= 3);
  const { text } = await streamText([textDelta(numbers.join(" ; ")), stop()]);
  assert.ok(!text.includes("[contact details removed]"), text);
});

test("prompt: no em dashes, and asks the model to avoid them", () => {
  const p = extractSystemPrompt();
  assert.ok(!p.includes("—"));
  assert.match(p, /Do not use em dashes/);
});

// ── Retrieval ─────────────────────────────────────────────────────────────

test("retrieval: the pinned cards exist (a re-export that renumbers chunks fails here)", () => {
  for (const id of [...RED_FLAG_CARDS, ...AT_THE_EDGE_CARDS]) assert.ok(KNOWLEDGE.some((c) => c.id === id), id);
});

test("retrieval: natural red-flag phrasings put the red-flag guidance first", () => {
  for (const q of [
    "My 18 month old stopped saying words he used to say",
    "my 15 month old doesn't respond to her name",
    "my 15 month old doesn’t respond to her name",
    "my son is losing words he used to say",
    "my 2 year old stopped talking",
    "my baby doesn't make eye contact",
    "is my toddler autistic?",
  ]) {
    const ids = retrieve(q, 4).map((r) => r.card.id);
    assert.deepEqual(ids.slice(0, 2), [...RED_FLAG_CARDS], q);
  }
});

test("retrieval: look-alike questions do not pull in red-flag cards", () => {
  for (const q of [
    "is the 4 month sleep regression real",
    "my toddler stopped napping",
    "how do I get my toddler to stop hitting",
    "should I name her feelings when she won't look at me",
    "he regressed in potty training",
  ]) {
    const ids = retrieve(q, 4).map((r) => r.card.id);
    assert.ok(!ids.some((id) => RED_FLAG_CARDS.includes(id)), q);
  }
});

test("retrieval: a parent at the edge with a crying baby gets the put-the-baby-down plan", () => {
  for (const q of [
    "the crying is making me lose it, I want to shake him",
    "I got so frustrated last night I shook my baby for a second",
    "my baby won't stop crying and I'm scared I'll lose control",
  ]) assert.equal(retrieve(q, 4)[0].card.id, AT_THE_EDGE_CARDS[0], q);
  for (const q of ["Is it okay to shake a rattle for my baby?", "Why does my baby cry so much in the evening?"]) {
    assert.ok(!retrieve(q, 4).some((r) => r.pinned), q);
  }
});

test("retrieval: questions the library does not cover get no unrelated notes", () => {
  for (const q of ["my toddler swallowed a button battery", "my baby has a fever of 101 and is 6 weeks old", "Is it safe to give my 6 month old honey?"]) {
    assert.deepEqual(retrieve(q, 4), [], q);
  }
  // Covered questions keep their full set.
  assert.equal(retrieve("How do I handle tantrums without giving in or yelling?", 4).length, 4);
  assert.equal(retrieve("Why does my baby cry so much in the evening?", 4).length, 4);
});

test("retrieval: '2.5-year-old' is read as thirty months, not five years", () => {
  const r = retrieve("My 2.5-year-old won't share toys at daycare", 4);
  assert.ok(r.length > 0);
  assert.ok(!r.every((x) => (x.card.ageBands || []).length === 1 && x.card.ageBands[0] === "3-5 years"));
});

// ── Further reading ──────────────────────────────────────────────────────

test("further reading: only listed public pages, never class chunks, at most three", () => {
  const reading = furtherReading(retrieve("What developmental red flags are worth paying attention to?", 4));
  assert.deepEqual(reading.map((s) => s.url), ["https://www.cdc.gov/ncbddd/actearly/"]);
  assert.ok(!reading[0].label.includes("—"));
  assert.deepEqual(furtherReading(retrieve("How do I handle tantrums without giving in or yelling?", 4)), []);
  const all = furtherReading(KNOWLEDGE.filter((c) => c.source?.url).map((card) => ({ card, score: 10, matched: 3 })));
  assert.ok(all.length <= 3);
});

test("endpoint: sends further reading first, then the answer with help lines intact", async () => {
  const net = mockFetch([
    [ANTHROPIC, () => anthropicSse([textDelta("Talk with your doctor. If it is ever urgent, call 1-800-"), textDelta("222-1222."), stop()])],
    [ENTITLEMENTS, () => json({ authenticated: false, unlimitedAi: false })],
  ]);
  try {
    const res = await ai.default(jsonRequest(URL_AI, { question: "What developmental red flags are worth paying attention to?" }, { ip: freshIp() }));
    assert.equal(res.status, 200);
    const events = await sseEvents(res);
    assert.deepEqual(events[0], { sources: [{ label: "CDC: Learn the Signs. Act Early.", url: "https://www.cdc.gov/ncbddd/actearly/" }] });
    const text = events.filter((e) => e.choices?.[0]?.delta?.content).map((e) => e.choices[0].delta.content).join("");
    assert.equal(text, `Talk with your doctor. If it is ever urgent, call ${nb("1-800-222-1222")}.`);
    const body = JSON.parse(net.calls.find((c) => c.url.startsWith(ANTHROPIC)).init.body);
    assert.ok(body.system.includes("Signs That Are About More Than Words") || body.system.includes("act early"));
  } finally { net.restore(); }
});

test("endpoint: no sources event when nothing public fits", async () => {
  const net = mockFetch([
    [ANTHROPIC, () => anthropicSse([textDelta("Go to the emergency room now."), stop()])],
    [ENTITLEMENTS, () => json({ authenticated: false, unlimitedAi: false })],
  ]);
  try {
    const res = await ai.default(jsonRequest(URL_AI, { question: "my toddler swallowed a button battery" }, { ip: freshIp() }));
    const events = await sseEvents(res);
    assert.ok(!events.some((e) => e && e.sources));
    const body = JSON.parse(net.calls.find((c) => c.url.startsWith(ANTHROPIC)).init.body);
    assert.ok(!body.system.includes("Research notes from the From Little Onward knowledge base"));
  } finally { net.restore(); }
});
