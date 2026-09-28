// Shared helpers for the keyless API tests (run: node --test "tests/api/*.test.mjs").
// No test here may reach a real service: mockFetch throws on any URL it does
// not know, so a forgotten route fails loudly instead of calling Anthropic,
// Stripe, Google, Kit, Web3Forms or Supabase.

export function mockFetch(routes) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push({ url, init });
    for (const [match, handler] of routes) {
      const hit = typeof match === "string" ? url.startsWith(match) : match.test(url);
      if (hit) return handler(url, init, calls);
    }
    throw new Error(`Unexpected network call in a test: ${url}`);
  };
  return {
    calls,
    count: (prefix) => calls.filter((c) => c.url.startsWith(prefix)).length,
    restore() { globalThis.fetch = original; },
  };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export function jsonRequest(url, body, { ip = "203.0.113.1", headers = {}, method = "POST" } = {}) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// Reads an SSE response into a list of parsed `data:` payloads ("[DONE]" kept as a string).
export async function sseEvents(res) {
  const text = await res.text();
  return text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6))
    .map((raw) => (raw === "[DONE]" ? raw : JSON.parse(raw)));
}

// An Anthropic-style SSE body from a list of event objects.
export function anthropicSse(events) {
  const text = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(text, { status: 200, headers: { "content-type": "text/event-stream" } });
}

export const textDelta = (text) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });
export const stop = (reason = "end_turn") => ({ type: "message_delta", delta: { stop_reason: reason } });
export const overloaded = () => ({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } });

let counter = 0;
// A fresh client address per call, so per-client limits never leak between tests.
export function freshIp() {
  counter += 1;
  return `10.${(counter >> 16) & 255}.${(counter >> 8) & 255}.${counter & 255}`;
}
