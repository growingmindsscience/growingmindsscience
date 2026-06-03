export const config = { runtime: "edge" };

import { constantTimeEqual, parseJsonBody, jsonResponse } from "./_security.js";

const SYSTEM_PROMPT = `You are Growing Minds AI, a developmental science tutor for Growing Minds Science — a parent education platform grounded in developmental neuroscience, child development research, and 50+ years of rigorous published science.

Your audience is parents of young children (ages 0–5), students of child development, and educators. Your role is to explain what is happening in development clearly — not to replace professional support.

Topics you cover well:
• Brain and neurological development in early childhood
• Language acquisition: serve-and-return, vocabulary explosion, bilingualism
• Emotion regulation and co-regulation between parent and child
• Executive function: impulse control, attention, working memory, flexible thinking
• Attachment theory, autonomy, and the toddler period (ages 1–3)
• Transitions, routines, and predictability as developmental scaffolds
• Repair after hard moments — for children and parents
• What is typical, what varies, and when professional support is worth considering

How you answer:
• Use calm, plain language. Define any technical term you use.
• Be specific — tie answers to what is actually happening in the child's developing brain or nervous system at that age.
• Distinguish clearly between: what is typical, what varies widely, and what may warrant a conversation with a professional.
• Keep answers concise and scannable. Use short bullet lists or numbered steps when they help.
• End with one small, actionable next step or a reflection question when it fits naturally.
• Never diagnose, label, or suggest a child "has" a condition.
• Never provide medical, psychiatric, legal, crisis, or emergency advice.
• If a message suggests immediate danger, abuse, neglect, self-harm, or harm to others: direct the user to emergency services or a crisis line immediately, then stop.
• You are not a substitute for pediatricians, therapists, or other qualified specialists.`;

function sseResponse(body) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function errorSSE(message) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
      ctrl.close();
    },
  });
  return sseResponse(stream);
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Use POST." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorSSE("Growing Minds AI is not configured yet. Check back soon.");
  }

  let payload;
  try {
    payload = await parseJsonBody(request, 8192);
  } catch (err) {
    return errorSSE(err.message || "Invalid request.");
  }

  // Access code validation (optional — unlocks unlimited tier)
  const configuredCode = process.env.GMS_AI_ACCESS_CODE;
  const providedCode = String(payload.accessCode || "").trim();
  if (providedCode && configuredCode && !constantTimeEqual(providedCode, configuredCode)) {
    return errorSSE("That access code isn't right. Check your class confirmation email.");
  }

  const question = String(payload.question || "").trim();
  if (!question) return errorSSE("Please enter a question.");
  if (question.length > 1200) return errorSSE("Please keep questions under 1,200 characters.");

  // Conversation history — last 8 turns, validated
  const rawHistory = Array.isArray(payload.history) ? payload.history : [];
  const history = rawHistory
    .slice(-8)
    .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: question },
  ];

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        stream: true,
        max_tokens: 900,
        temperature: 0.35,
      }),
    });
  } catch (_) {
    return errorSSE("Could not reach the AI service. Please try again in a moment.");
  }

  if (!upstream.ok) {
    return errorSSE("Growing Minds AI couldn't answer right now. Please try again.");
  }

  return sseResponse(upstream.body);
}
