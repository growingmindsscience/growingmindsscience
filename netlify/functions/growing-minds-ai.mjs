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

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(503, {
      error: "Growing Minds AI is not configured yet. Add OPENAI_API_KEY in Netlify environment variables.",
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return jsonResponse(400, { error: "Please send a valid JSON request." });
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
    ? [{
        type: "file_search",
        vector_store_ids: [vectorStoreId],
        max_num_results: 4,
      }]
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
    const message = responseBody.error && responseBody.error.message
      ? responseBody.error.message
      : "The AI service returned an error.";
    return jsonResponse(openaiResponse.status, { error: message });
  }

  const answer = extractText(responseBody);
  if (!answer) {
    return jsonResponse(502, {
      error: "Growing Minds AI returned an empty answer. Please try rephrasing your question.",
    });
  }

  return jsonResponse(200, {
    answer,
    grounded: Boolean(vectorStoreId),
  });
}
