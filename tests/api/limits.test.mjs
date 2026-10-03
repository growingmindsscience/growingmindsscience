// The chat page keeps a copy of the server's limits so it only sends what the
// server keeps (a full history must never trip the body cap). These checks
// fail when the two copies drift, and guard a few page-side contracts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LIMITS } from "../../api/_ai-chat.js";
import { extractSystemPrompt } from "../../evals/lib/persona.mjs";

const PAGE = readFileSync(fileURLToPath(new URL("../../tools/growing-minds-ai.html", import.meta.url)), "utf8");

function pageLimits() {
  const m = PAGE.match(/const LIMITS = \{([\s\S]*?)\};/);
  assert.ok(m, "tools/growing-minds-ai.html defines const LIMITS = { ... };");
  return Object.fromEntries([...m[1].matchAll(/([A-Z_]+):\s*(\d+)/g)].map(([, k, v]) => [k, Number(v)]));
}

test("page LIMITS match api/_ai-chat.js LIMITS exactly", () => {
  assert.deepEqual(pageLimits(), { ...LIMITS });
});

test("the question box allows exactly the server's question length", () => {
  const m = PAGE.match(/id="chatInput"[\s\S]*?maxlength="(\d+)"/);
  assert.equal(Number(m[1]), LIMITS.QUESTION_MAX_CHARS);
});

test("a full history at the caps fits the body cap", () => {
  const history = [];
  for (let i = 0; i < LIMITS.HISTORY_MAX_TURNS; i += 1) {
    history.push({ role: i % 2 ? "assistant" : "user", content: "Toddlers, sleep & \"routines\".\n".repeat(80).slice(0, LIMITS.HISTORY_TURN_MAX_CHARS) });
  }
  const body = JSON.stringify({
    question: "q".repeat(LIMITS.QUESTION_MAX_CHARS),
    history,
    accessCode: "x".repeat(40),
    subscriberToken: "t".repeat(400),
  });
  assert.ok(body.length <= LIMITS.BODY_MAX_CHARS, `${body.length} > ${LIMITS.BODY_MAX_CHARS}`);
});

test("page contracts: safe storage, validate-only unlock, text-only errors", () => {
  const script = PAGE.slice(PAGE.indexOf("const TOPICS"));
  assert.ok(!/\b(localStorage|sessionStorage)\s*\./.test(script), "storage goes through safeStore()");
  assert.match(script, /validateOnly: true/);
  assert.ok(!/innerHTML\s*=\s*`[^`]*\$\{[^}]*error/i.test(script), "server error text is never set as HTML");
  assert.match(script, /aria-busy/);
  assert.match(script, /new AbortController\(\)/);
});

test("the eval harness can still read the live system prompt", () => {
  const prompt = extractSystemPrompt();
  assert.ok(prompt.startsWith("You are Growing Minds AI"));
  assert.ok(!prompt.includes("${"));
});
