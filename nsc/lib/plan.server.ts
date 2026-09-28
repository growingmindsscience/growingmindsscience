import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCitations, getGamesCatalog, getPromptsDeck } from "@/lib/content.server";
import { ageBand } from "@/lib/age";
import {
  buildWeeklyPlan,
  oneRungLower,
  personalizePrompts,
  suppressedGameIds,
  type WeeklyPlan,
} from "@/lib/routing";
import { weekSeed, weekStartISO } from "@/lib/isoweek";
import { addDaysISO, DEFAULT_TZ, localDateISO } from "@/lib/tz";
import type { Citation } from "@/lib/content-types";
import type { Confidence, Placement } from "@/lib/titration";

export interface PlanContext {
  child: { id: string; nickname: string; birth_month: string };
  placement: Placement;
  servedPlacement: Placement; // conservative shift applied for low confidence
  nearCP: boolean;
  confidence: Confidence;
  /** Which instrument produced the placement. Point and Seek never names a rung. */
  instrument: "give_n" | "point_and_seek";
  /** When the placement assessment completed — drives the six-week rhythm. */
  assessedAt: string;
  /** Prompts are personalized (the child's nickname filled in). */
  plan: WeeklyPlan;
  citations: Map<string, Citation>;
  recentPlays: { game_id: string; played_at: string; reaction: string | null }[];
}

/**
 * Assemble the current week's plan for a child from their latest completed
 * assessment. Low-confidence placements are served one rung lower (§2.2
 * conservative rule). Returns null if there is no completed assessment yet.
 * `tz` is the parent's time zone: the week turns over at their Monday.
 */
export async function getPlanContext(
  childId: string,
  now: Date,
  tz: string = DEFAULT_TZ,
): Promise<PlanContext | null> {
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("nsc_children")
    .select("id, nickname, birth_month")
    .eq("id", childId)
    .maybeSingle();
  if (!child) return null;

  const { data: assessment } = await supabase
    .from("nsc_assessments")
    .select("placement, near_cp, confidence, completed_at, instrument")
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

  // Reaction-aware rotation, fixed for the week: only plays from before this
  // week's Monday decide what rests (lib/routing suppressedGameIds).
  //   flopped → rest 6 weeks · fine → 2 weeks · loved → never suppressed
  const weekStart = weekStartISO(now, tz);
  const today = localDateISO(now, tz);
  const since = addDaysISO(weekStart, -42);
  const { data: allPlays } = await supabase
    .from("nsc_game_plays")
    .select("game_id, played_at, reaction")
    .eq("child_id", childId)
    .gte("played_at", since)
    .order("played_at", { ascending: false });

  const plays = (allPlays ?? []) as PlanContext["recentPlays"];
  // "Played recently" chips on the cards: the last two weeks.
  const recentFrom = addDaysISO(today, -14);
  const recentPlays = plays.filter((p) => p.played_at.slice(0, 10) >= recentFrom);

  const [catalog, deck, citationsTable] = await Promise.all([
    getGamesCatalog(),
    getPromptsDeck(),
    getCitations(),
  ]);

  const built = buildWeeklyPlan({
    catalog,
    deck,
    placement: servedPlacement,
    band,
    nearCP: confidence === "low" ? false : nearCP,
    seed: weekSeed(childId, now, tz),
    recentGameIds: suppressedGameIds(plays, weekStart),
  });
  const plan: WeeklyPlan = {
    ...built,
    prompts: personalizePrompts(built.prompts, child.nickname),
  };

  const citations = new Map(citationsTable.citations.map((c) => [c.tag_id, c]));

  return {
    child,
    placement,
    servedPlacement,
    nearCP,
    confidence,
    instrument: assessment.instrument === "point_and_seek" ? "point_and_seek" : "give_n",
    assessedAt: assessment.completed_at,
    plan,
    citations,
    recentPlays,
  };
}
