import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCitations, getGamesCatalog, getPromptsDeck } from "@/lib/content.server";
import { ageBand } from "@/lib/age";
import { buildWeeklyPlan, oneRungLower, type WeeklyPlan } from "@/lib/routing";
import { weekSeed } from "@/lib/isoweek";
import type { Citation } from "@/lib/content-types";
import type { Confidence, Placement } from "@/lib/titration";

export interface PlanContext {
  child: { id: string; nickname: string; birth_month: string };
  placement: Placement;
  servedPlacement: Placement; // conservative shift applied for low confidence
  nearCP: boolean;
  confidence: Confidence;
  /** When the placement assessment completed — drives the six-week rhythm. */
  assessedAt: string;
  plan: WeeklyPlan;
  citations: Map<string, Citation>;
  recentPlays: { game_id: string; played_at: string; reaction: string | null }[];
}

/**
 * Assemble the current week's plan for a child from their latest completed
 * assessment. Low-confidence placements are served one rung lower (§2.2
 * conservative rule). Returns null if there is no completed assessment yet.
 */
export async function getPlanContext(
  childId: string,
  now: Date,
): Promise<PlanContext | null> {
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("nsc_children")
    .select("id, nickname, birth_month")
    .eq("id", childId)
    .single();
  if (!child) return null;

  const { data: assessment } = await supabase
    .from("nsc_assessments")
    .select("placement, near_cp, confidence, completed_at")
    .eq("child_id", childId)
    .eq("status", "complete")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assessment?.placement) return null;

  const placement = assessment.placement as Placement;
  const confidence = (assessment.confidence ?? "medium") as Confidence;
  const nearCP = assessment.near_cp ?? false;
  const servedPlacement =
    confidence === "low" ? oneRungLower(placement) : placement;

  const band = ageBand(child.birth_month, now);

  // Reaction-aware rotation. A play tells the plan something, and the three
  // reactions must mean three different things (they used to be identical):
  //   flopped → rest it a good while (6 weeks), so a flop really removes it
  //   fine    → normal 2-week rotation
  //   loved   → never suppressed — keep playing what a child loves
  // Query 6 weeks so flopped games can be held out that long; the 2-week
  // window is applied per-play below.
  const now14 = now.getTime() - 14 * 86400000;
  const since = new Date(now.getTime() - 42 * 86400000)
    .toISOString()
    .slice(0, 10);
  const { data: allPlays } = await supabase
    .from("nsc_game_plays")
    .select("game_id, played_at, reaction")
    .eq("child_id", childId)
    .gte("played_at", since)
    .order("played_at", { ascending: false });

  const suppressed = new Set<string>();
  const recentPlays: {
    game_id: string;
    played_at: string;
    reaction: string | null;
  }[] = [];
  for (const p of allPlays ?? []) {
    const at = new Date(p.played_at).getTime();
    if (at >= now14) recentPlays.push(p); // "played this week" chip + display
    if (p.reaction === "flopped") suppressed.add(p.game_id); // full 6 weeks
    else if (p.reaction !== "loved" && at >= now14) suppressed.add(p.game_id);
  }

  const [catalog, deck, citationsTable] = await Promise.all([
    getGamesCatalog(),
    getPromptsDeck(),
    getCitations(),
  ]);

  const plan = buildWeeklyPlan({
    catalog,
    deck,
    placement: servedPlacement,
    band,
    nearCP: confidence === "low" ? false : nearCP,
    seed: weekSeed(childId, now),
    recentGameIds: [...suppressed],
  });

  const citations = new Map(citationsTable.citations.map((c) => [c.tag_id, c]));

  return {
    child,
    placement,
    servedPlacement,
    nearCP,
    confidence,
    assessedAt: assessment.completed_at,
    plan,
    citations,
    recentPlays,
  };
}
