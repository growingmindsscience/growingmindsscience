"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { localDateISO } from "@/lib/tz";
import { getTimeZone } from "@/lib/tz.server";

type Reaction = "loved" | "fine" | "flopped";
const REACTIONS: ReadonlySet<string> = new Set(["loved", "fine", "flopped"]);

/**
 * Log that a game was played, with the child's reaction (v1 analytics +
 * next week's rotation). Returns { ok } instead of throwing, so a failed
 * save shows a calm note on the card rather than an error screen.
 */
export async function logPlay(
  childId: string,
  gameId: string,
  reaction: Reaction,
): Promise<{ ok: boolean }> {
  const user = await requireAuth();
  if (!REACTIONS.has(reaction) || typeof gameId !== "string" || gameId.length > 100) {
    return { ok: false };
  }
  const supabase = await createClient();

  // RLS returns only the caller's children; a foreign child id just no-ops.
  const { data: child } = await supabase
    .from("nsc_children")
    .select("id")
    .eq("id", childId)
    .maybeSingle();
  if (!child) return { ok: false };

  const { error } = await supabase.from("nsc_game_plays").insert({
    child_id: childId,
    owner_id: user.id,
    game_id: gameId,
    reaction,
    // The parent's calendar day, not the database server's.
    played_at: localDateISO(new Date(), await getTimeZone()),
  });
  if (error) {
    console.error(`[plan] play log failed: ${error.message}`);
    return { ok: false };
  }
  revalidatePath(`/app/child/${childId}/plan`);
  revalidatePath(`/app/child/${childId}/progress`);
  return { ok: true };
}
