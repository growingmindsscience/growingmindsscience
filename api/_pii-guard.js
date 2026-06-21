// Output-side guard against leaking personal / contact information.
//
// This is a defense-in-depth backstop. The system prompt already instructs the
// model never to share contact details, never reveal its instructions, and to
// resist manipulation. This layer guarantees that even if the model is tricked
// or makes a mistake, no email address, phone number, or card-/account-like
// number reaches the user. It runs over the model's output, not its input, so
// it cannot be bypassed by clever phrasing in the question.

// High-precision patterns. Each is written to avoid clobbering the legitimate
// content this tutor produces (ages like "0-3 months", "100+ families",
// research citations, and DOIs such as 10.3389/frym.2024.1426649).
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// Phone numbers must use space/dash separators or a parenthesized area code, so
// dotted strings like DOIs and version numbers are not mistaken for phones.
const PHONE = /(?<!\d)(?:\+?\d{1,3}[\s-]?)?(?:\(\d{3}\)[\s-]?|\d{3}[\s-])\d{3}[\s-]\d{4}(?!\d)/g;

// Long digit runs (credit-card / account-like): 13–19 digits, optionally grouped
// with spaces or dashes between digits only. Word-boundaried so ordinary numbers
// are safe and trailing separators are not swallowed.
const LONG_NUMBER = /\b\d(?:[ -]?\d){12,18}\b/g;

const REDACTION = "[contact details removed]";

/**
 * Redact personal / contact information from a complete string.
 * @param {string} text
 * @returns {string}
 */
export function redactPII(text) {
  return String(text)
    .replace(EMAIL, REDACTION)
    .replace(PHONE, REDACTION)
    .replace(LONG_NUMBER, REDACTION);
}

// Length of the trailing region held back between chunks. A PII string that
// straddles a chunk boundary is fully redacted before any part of it is emitted
// as long as it is no longer than this. Emails and phone numbers are well under
// it; the buffered tail is flushed (and redacted) when the stream ends.
const TAIL = 80;

/**
 * Create a streaming redactor. Feed it model output deltas via `push`; it calls
 * `emit` with redacted, safe-to-send text and holds back a small tail so a PII
 * string split across two deltas is never partially emitted. Call `flush` once
 * the stream is complete to release the remaining buffer.
 *
 * @param {(safeText: string) => void} emit
 */
export function createPiiRedactor(emit) {
  let buffer = "";
  return {
    push(text) {
      if (!text) return;
      // Redact the whole buffer first, so any complete match is replaced before
      // we decide what is safe to emit. Re-redacting already-redacted text is a
      // no-op, so appending to a previously redacted buffer is fine.
      buffer = redactPII(buffer + text);
      if (buffer.length > TAIL) {
        const safe = buffer.slice(0, buffer.length - TAIL);
        buffer = buffer.slice(buffer.length - TAIL);
        if (safe) emit(safe);
      }
    },
    flush() {
      if (buffer) {
        emit(redactPII(buffer));
        buffer = "";
      }
    },
  };
}
