import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Attempt limit for the legacy AI access-code form. The code is one shared
 * secret that grants Growing Minds AI for life, so each account gets a few
 * tries per UTC day. Every try counts, right or wrong, and is taken before
 * the comparison.
 *
 * The counter is the shared daily one from migration 0021
 * (ai_take_free_question, atomic, service role only). The key is a sha256 of
 * a string the AI endpoint never hashes, so it can't share a row with that
 * endpoint's per-visitor keys.
 */
export const ACCESS_CODE_DAILY_ATTEMPTS = 8;

export function accessCodeAttemptKey(userId: string, now: Date): string {
  const day = now.toISOString().slice(0, 10);
  return createHash("sha256").update(`access-code|${userId}|${day}`).digest("hex");
}

export type AccessCodeAttempt = "ok" | "locked" | "unavailable";

/**
 * Take one of today's tries. Fails closed: when the counter can't be
 * reached, the form asks the person to try later rather than allow a try
 * that isn't counted. Redeeming a code is rare, so that costs little.
 */
export async function takeAccessCodeAttemptWith(
  db: Pick<SupabaseClient, "rpc">,
  userId: string,
  now: Date = new Date(),
): Promise<AccessCodeAttempt> {
  try {
    const { data, error } = await db.rpc("ai_take_free_question", {
      p_key_hash: accessCodeAttemptKey(userId, now),
      p_limit: ACCESS_CODE_DAILY_ATTEMPTS,
    });
    if (error || typeof data !== "boolean") {
      console.error(`[account] access-code counter unavailable: ${error?.message ?? "no answer"}`);
      return "unavailable";
    }
    return data ? "ok" : "locked";
  } catch (err) {
    console.error(`[account] access-code counter unavailable: ${(err as Error).message}`);
    return "unavailable";
  }
}
