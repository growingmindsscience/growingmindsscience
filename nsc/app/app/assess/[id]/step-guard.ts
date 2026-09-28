/**
 * Shared by both assessment runners. After every step change, taps are
 * ignored for a moment: the confirm button appears where the previous tap
 * landed, and a double tap (or a toddler's tap) must not answer a prompt
 * nobody read.
 */
export const STEP_LOCK_MS = 450;

export type TapNotice = "stale" | "error" | "flag";

/** Calm, no-blame copy for the ways a tap can fail to land. */
export const TAP_NOTICE: Record<TapNotice, string> = {
  stale:
    "This screen was a step behind, so we caught up to your last answer. Nothing was counted twice.",
  error: "That answer didn't save. Check your connection, then tap it again.",
  flag: "That didn't save. Please try again in a moment.",
};
