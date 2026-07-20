// Netlify mirror of the Growing Minds AI endpoint.
//
// This is deliberately a re-export, not an implementation. The canonical
// handler lives in api/growing-minds-ai.js (Anthropic, streaming SSE, knowledge
// retrieval, streaming PII redaction, free-tier + access-code + subscriber-token
// gating). An earlier fork here called OpenAI with a non-streaming JSON shape
// and drifted a month behind the canonical version — including behind its
// privacy hardening — which the 2026-07-19 audit flagged (§3.1). Sharing the
// module makes that class of drift structurally impossible.
//
// Both platforms use the same Web-API function shape (Request in, Response
// out; Netlify Functions v2 passes an extra context arg the handler ignores),
// and Netlify's bundler already resolves relative imports into api/ (the old
// fork imported api/_pii-guard.js the same way).
//
// Mirror prerequisites, on purpose NOT configured from this file:
// - Env: ANTHROPIC_API_KEY (the old OPENAI_API_KEY / OPENAI_MODEL /
//   OPENAI_VECTOR_STORE_ID vars are no longer read and can be removed).
// - Routing: the repo carries no /api/growing-minds-ai -> function mapping for
//   Netlify (no netlify.toml, nothing in _redirects), so the mirror only
//   serves this at /.netlify/functions/growing-minds-ai unless routing is
//   added deliberately. Leaving the mirror's AI dark is a product decision;
//   see the audit report before wiring it up.
export { default } from "../../api/growing-minds-ai.js";
