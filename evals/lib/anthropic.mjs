// Minimal Anthropic Messages client for the eval harness (Node global fetch).
// Used both to GENERATE answers (with the real Growing Minds AI system prompt)
// and to run the JUDGE. Non-streaming — the harness wants the whole answer.

const API_URL = "https://api.anthropic.com/v1/messages";

export function haveApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * @param {object} opts
 * @param {string} opts.system      system prompt
 * @param {Array}  opts.messages    [{role, content}]
 * @param {string} [opts.model]     defaults to the production default
 * @param {number} [opts.maxTokens] defaults 1024 (matches production)
 * @param {number} [opts.temperature]
 * @returns {Promise<string>} concatenated text output
 */
export async function generate({ system, messages, model, maxTokens = 1024, temperature }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  const body = {
    model: model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages,
  };
  if (typeof temperature === "number") body.temperature = temperature;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 400)}`);
  }
  const data = await res.json();
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// Parse a JSON object out of a model reply that may be fenced or chatty.
export function parseJsonReply(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`No JSON object in reply: ${text.slice(0, 200)}`);
  return JSON.parse(candidate.slice(start, end + 1));
}
