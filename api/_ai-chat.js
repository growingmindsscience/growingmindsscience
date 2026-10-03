// Shared pieces of the Growing Minds AI endpoint (api/growing-minds-ai.js):
// the size limits, conversation-history cleanup, and the streaming transform
// from Anthropic's SSE events to the OpenAI-style events the chat page reads.
//
// The chat page (tools/growing-minds-ai.html) keeps a copy of LIMITS so it only
// sends what the server keeps; tests/api/limits.test.mjs fails if they drift.

import { createPiiRedactor } from "./_pii-guard.js";

export const LIMITS = Object.freeze({
  // A single question, as typed.
  QUESTION_MAX_CHARS: 1200,
  // Earlier turns kept as context, and the length each one is cut to.
  HISTORY_MAX_TURNS: 8,
  HISTORY_TURN_MAX_CHARS: 2000,
  // Whole JSON request. Sized so a full history (8 turns at the per-turn cap),
  // a full question and the unlock fields always fit, with room for JSON escaping.
  BODY_MAX_CHARS: 24000,
  // Free questions per visitor per UTC day (a soft, per-isolate limit; see _ratelimit.js).
  FREE_DAILY_LIMIT: 5,
});

/**
 * Cleans client-supplied history into what the Messages API accepts: only
 * user/assistant turns with non-empty text, each cut to the per-turn cap,
 * strictly alternating, starting with a user turn and ending with an assistant
 * turn (the new question is appended after it), newest turns kept.
 *
 * The history is still client-controlled text: a caller can invent earlier
 * "assistant" turns. The system prompt treats all of it as untrusted.
 */
export function sanitizeHistory(raw, {
  maxTurns = LIMITS.HISTORY_MAX_TURNS,
  maxChars = LIMITS.HISTORY_TURN_MAX_CHARS,
} = {}) {
  if (!Array.isArray(raw)) return [];
  const turns = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { role, content } = item;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const text = content.trim().slice(0, maxChars);
    if (text) turns.push({ role, content: text });
  }

  // Walk back from the newest turn, keeping only a strict assistant/user
  // alternation; turns that would break it are dropped.
  const kept = [];
  let expected = "assistant";
  for (let i = turns.length - 1; i >= 0 && kept.length < maxTurns; i -= 1) {
    if (turns[i].role !== expected) continue;
    kept.push(turns[i]);
    expected = expected === "assistant" ? "user" : "assistant";
  }
  kept.reverse();
  if (kept.length && kept[0].role !== "user") kept.shift();
  return kept;
}

// Anthropic stop_reason to the OpenAI-style finish_reason the page reads.
export function finishReasonFor(stopReason) {
  if (stopReason === "max_tokens") return "length";
  if (stopReason === "refusal") return "content_filter";
  return "stop";
}

export const INTERRUPTED_MESSAGE = "Growing Minds AI was interrupted before it could finish. Please try again.";

/**
 * Turns Anthropic's Messages SSE stream into the OpenAI-compatible stream the
 * chat page reads:
 *   data: {"choices":[{"index":0,"delta":{"content":"..."}}]}   text (PII-redacted)
 *   data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"|"length"|"content_filter"}]}
 *   data: {"error":"...","code":"upstream_error"|"interrupted"}  instead of a finish
 *   data: [DONE]
 *
 * - An `error` event from Anthropic, or a stream that ends without a stop
 *   reason, is reported to the page instead of passing silently as an empty
 *   or truncated answer.
 * - `onNoAnswer` runs when the stream failed before any text arrived, so the
 *   caller can refund the visitor's free question.
 * - Cancelling the returned stream (the visitor closed the page or started a
 *   new conversation) cancels the upstream body, which ends the Anthropic
 *   request instead of paying for the rest of an answer nobody reads.
 */
export function anthropicToOpenAiStream(upstreamBody, { onNoAnswer } = {}) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstreamBody.getReader();
  let clientGone = false;

  function releaseUpstream(reason) {
    return reader.cancel(reason).catch(() => {});
  }

  return new ReadableStream({
    async start(controller) {
      const send = (data) => {
        if (clientGone) return;
        try {
          const payload = typeof data === "string" ? data : JSON.stringify(data);
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (_) {
          // The page is gone; stop reading (and paying for) the upstream answer.
          clientGone = true;
          releaseUpstream();
        }
      };
      // Redact personal/contact information from the model's output before it
      // reaches the page. The redactor holds back a short tail so a redacted
      // value is never partly emitted across two chunks.
      const redactor = createPiiRedactor((safe) => {
        send({ choices: [{ index: 0, delta: { content: safe } }] });
      });

      let buffer = "";
      let stopReason = null;
      let failure = null;
      let sawText = false;

      try {
        read: while (!clientGone) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline;
          while ((newline = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newline).replace(/\r$/, "");
            buffer = buffer.slice(newline + 1);
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw) continue;

            let event;
            try {
              event = JSON.parse(raw);
            } catch (_) {
              continue; // a malformed line; nothing else is caught here
            }

            if (event.type === "content_block_delta" && event.delta?.type === "text_delta"
                && typeof event.delta.text === "string" && event.delta.text) {
              sawText = true;
              redactor.push(event.delta.text);
            } else if (event.type === "message_delta" && event.delta?.stop_reason) {
              stopReason = event.delta.stop_reason;
            } else if (event.type === "error") {
              failure = "upstream_error";
              break read;
            }
          }
        }
      } catch (_) {
        if (!clientGone) failure = "interrupted";
      }

      if (clientGone) return;
      if (!failure && !stopReason) failure = "interrupted"; // ended without finishing
      if (failure) releaseUpstream();

      redactor.flush();
      if (failure) {
        send({ error: INTERRUPTED_MESSAGE, code: failure });
        if (!sawText && onNoAnswer) onNoAnswer();
      } else {
        send({ choices: [{ index: 0, delta: {}, finish_reason: finishReasonFor(stopReason) }] });
      }
      send("[DONE]");
      try {
        controller.close();
      } catch (_) {
        // Already closed or cancelled.
      }
    },

    cancel(reason) {
      clientGone = true;
      return releaseUpstream(reason);
    },
  });
}
