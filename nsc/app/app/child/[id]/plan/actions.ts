"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Reaction = "loved" | "fine" | "flopped";

/** Log that a game was played, with the child's reaction (v1 analytics only). */
export async function logPlay(
  childId: string,
  gameId: string,
  reaction: Reaction,
) {
  const user = await requireAuth();
  const supabase = await createClient();
  await supabase.from("nsc_game_plays").insert({
    child_id: childId,
    owner_id: user.id,
    game_id: gameId,
    reaction,
  });
  revalidatePath(`/app/child/${childId}/plan`);
  revalidatePath(`/app/child/${childId}/progress`);
}
