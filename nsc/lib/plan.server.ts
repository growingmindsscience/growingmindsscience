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
    .select("placement, near_cp, confidence")
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

  // Repeat-avoidance: games played in the last 14 days.
  const since = new Date(now.getTime() - 14 * 86400000)
    .toISOString()
    .slice(0, 10);
  const { data: recentPlays } = await supabase
    .from("nsc_game_plays")
    .select("game_id, played_at, reaction")
    .eq("child_id", childId)
    .gte("played_at", since)
    .order("played_at", { ascending: false });

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
    recentGameIds: (recentPlays ?? []).map((p) => p.game_id),
  });

  const citations = new Map(citationsTable.citations.map((c) => [c.tag_id, c]));

  return {
    child,
    placement,
    servedPlacement,
    nearCP,
    confidence,
    plan,
    citations,
    recentPlays: recentPlays ?? [],
  };
}
