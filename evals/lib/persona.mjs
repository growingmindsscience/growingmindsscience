// Reconstructs the EXACT system prompt Growing Minds AI runs with, without
// modifying api/growing-minds-ai.js (owned by other work streams). The
// SYSTEM_PROMPT is a plain template literal with no ${} interpolation, so we
// extract it verbatim from the source file at runtime — single source of truth,
// zero drift. The grounding block is assembled identically to the edge handler.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AI_SOURCE = join(ROOT, "api", "growing-minds-ai.js");

export function extractSystemPrompt() {
  const src = readFileSync(AI_SOURCE, "utf8");
  // const SYSTEM_PROMPT = `…`;  — capture the backtick body.
  const m = src.match(/const\s+SYSTEM_PROMPT\s*=\s*`([\s\S]*?)`;/);
  if (!m) {
    throw new Error(
      "Could not extract SYSTEM_PROMPT from api/growing-minds-ai.js — the harness " +
      "must test the real prompt. Check that the const is a plain template literal.",
    );
  }
  if (/\$\{/.test(m[1])) {
    throw new Error("SYSTEM_PROMPT now contains ${} interpolation — update persona.mjs to evaluate it.");
  }
  return m[1];
}

// Mirrors the grounding assembly in api/growing-minds-ai.js. `retrieve` and
// `formatContext` are imported from the real retrieval module by the caller so
// the notes are byte-identical to production.
export function buildGroundedPrompt(systemPrompt, context) {
  if (!context) return systemPrompt;
  return (
    `${systemPrompt}\n\n` +
    `Research notes from the Growing Minds knowledge base for this question ` +
    `(use as your primary source; cite naturally; do not mention these notes exist):\n\n` +
    context
  );
}
