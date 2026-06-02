export const config = { runtime: "edge" };

import { constantTimeEqual, jsonResponse, parseJsonBody } from "./_security.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

const SYSTEM_PROMPT = `
You are Growing Minds AI, an educational developmental science tutor for Growing Minds Science.

Your audience is parents, students, and educators. Answer in calm, plain language while preserving developmental science accuracy.

Core rules:
- Explain development; do not diagnose children or adults.
- Do not provide medical, psychological, legal, crisis, or emergency advice.
- If a question suggests immediate danger, abuse, neglect, self-harm, harm to others, or urgent medical risk, tell the user to contact local emergency services or a qualified professional now.
- When relevant, distinguish what is typical, what varies, and what may be worth discussing with a pediatrician, therapist, teacher, or other qualified professional.
- Prefer practical, non-shaming guidance for ordinary family life.
- If the knowledge base does not provide enough support, say so clearly instead of overstating certainty.
- Keep answers concise. Use short headings or bullets when helpful.
- End with one small next step or reflection question when appropriate.
`;

// Per-instance rate limiting (best-effort; no shared state across edge instances).
const ipRequestLog = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 10;

function isRateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const entry = ipRequestLog.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipRequestLog.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX_PER_WINDOW;
}

function extractText(responseBody) {
  if (typeof responseBody.output_text === "string" && responseBody.output_text.trim()) {
    return responseBody.output_text.trim();
  }

  const chunks = [];
  for (const item of responseBody.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n\n").trim();
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Use POST to ask Growing Minds AI a question." });
  }

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || request.headers.get("x-real-ip")
    || "";

  if (isRateLimited(ip)) {
    return jsonResponse(429, {
      error: "Too many requests. Please wait a moment before asking another question.",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(503, {
      error: "Growing Minds AI is not configured yet. Add OPENAI_API_KEY in Vercel environment variables.",
    });
  }

  const configuredAccessCode = process.env.GMS_AI_ACCESS_CODE;
  if (!configuredAccessCode) {
    return jsonResponse(503, {
      error: "Growing Minds AI is available for enrolled families. Add GMS_AI_ACCESS_CODE in Vercel environment variables before enabling chat.",
    });
  }

  let payload;
  try {
    payload = await parseJsonBody(request, 4096);
  } catch (error) {
    return jsonResponse(error.status || 400, { error: error.message });
  }

  const accessCode = String(payload.accessCode || "").trim();
  if (!accessCode || !constantTimeEqual(accessCode, configuredAccessCode)) {
    return jsonResponse(401, {
      error: "Please enter the class access code to use Growing Minds AI.",
    });
  }

  const question = String(payload.question || "").trim();
  if (!question) {
    return jsonResponse(400, { error: "Please enter a question." });
  }
  if (question.length > 1200) {
    return jsonResponse(400, { error: "Please keep questions under 1,200 characters." });
  }

  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
  const tools = vectorStoreId
    ? [{ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 4 }]
    : [];

  const openaiPayload = {
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    instructions: SYSTEM_PROMPT,
    input: question,
    max_output_tokens: 900,
  };

  if (tools.length) openaiPayload.tools = tools;

  let openaiResponse;
  try {
    openaiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(openaiPayload),
    });
  } catch (_) {
    return jsonResponse(502, {
      error: "Growing Minds AI could not reach the AI service. Please try again in a moment.",
    });
  }

  const responseBody = await openaiResponse.json().catch(() => ({}));
  if (!openaiResponse.ok) {
    return jsonResponse(502, {
      error: "Growing Minds AI could not answer right now. Please try again in a moment.",
    });
  }

  const answer = extractText(responseBody);
  if (!answer) {
    return jsonResponse(502, {
      error: "Growing Minds AI returned an empty answer. Please try rephrasing your question.",
    });
  }

  return jsonResponse(200, { answer, grounded: Boolean(vectorStoreId) });
}
