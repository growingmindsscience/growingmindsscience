/** Pure gift-code helpers (no server deps) — shared by the server module and tests. */

// Unambiguous alphabet (no 0/O/1/I) for codes a grandparent reads off a card.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function makeGiftCode(rand: () => number = Math.random): string {
  const block = () =>
    Array.from({ length: 4 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join("");
  return `NP-${block()}-${block()}`;
}

/** Normalize user input: strip spaces, uppercase, ensure the NP- prefix. */
export function normalizeGiftCode(input: string): string {
  const s = input.trim().toUpperCase().replace(/\s+/g, "");
  return s.startsWith("NP-") ? s : s ? `NP-${s.replace(/^NP-?/, "")}` : s;
}
