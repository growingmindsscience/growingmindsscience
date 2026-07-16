import type { AgeBand, Game, GamesCatalog, PromptsDeck } from "@/lib/content-types";
import type { Placement } from "@/lib/titration";

/**
 * Placement → weekly plan (spec §1.2, §4.2, §4.3). Pure and deterministic:
 * the same (placement, band, seed, recent list) always yields the same plan,
 * so a week's plan is stable and testable. A low-confidence assessment is
 * routed one rung lower by the caller (conservative placement, §2.2).
 */

export const LADDER_ORDER: (Placement | "CPX")[] = [
  "L0",
  "L1",
  "L2",
  "L3",
  "L4",
  "CP",
  "CPX",
];

/** Small deterministic string hash → 32-bit int (FNV-1a). */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic order of an array by a seed (Schwartzian sort on hashed keys). */
function seededOrder<T>(items: T[], key: (t: T) => string, seed: string): T[] {
  return [...items]
    .map((item) => ({ item, rank: hash(seed + "|" + key(item)) }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.item);
}

/** Games applicable to a rung + band. nearCP (L4) also surfaces CP-doorstep games. */
export function applicableGames(
  catalog: GamesCatalog,
  placement: Placement,
  band: AgeBand,
  nearCP = false,
): Game[] {
  const rungs = new Set<string>([placement]);
  if (nearCP && placement === "L4") rungs.add("CP");
  return catalog.games.filter(
    (g) =>
      g.age_bands.includes(band) && g.levels.some((lv) => rungs.has(lv)),
  );
}

const BAND_ORDER: AgeBand[] = [
  "24-30m",
  "30-36m",
  "36-42m",
  "42-48m",
  "48-60m",
];

/**
 * Same-rung games from neighboring bands, nearest first (younger before
 * older at equal distance — content written for a slightly younger band
 * reads fine; older-band framing may assume skills the child lacks). The
 * rung carries the developmental fit; the band only tunes the framing, so
 * this is the safe way to keep a thin rung×band cell from starving a plan.
 */
function neighborBandGames(
  catalog: GamesCatalog,
  placement: Placement,
  band: AgeBand,
  nearCP: boolean,
): Game[] {
  const idx = BAND_ORDER.indexOf(band);
  const out: Game[] = [];
  const seen = new Set<string>();
  for (let d = 1; d < BAND_ORDER.length; d++) {
    for (const nb of [BAND_ORDER[idx - d], BAND_ORDER[idx + d]]) {
      if (!nb) continue;
      for (const g of applicableGames(catalog, placement, nb, nearCP)) {
        if (!seen.has(g.id)) {
          seen.add(g.id);
          out.push(g);
        }
      }
    }
  }
  return out;
}

export interface WeeklyPlan {
  games: Game[];
  prompts: string[]; // 7, one per day
  band: AgeBand;
  placement: Placement;
}

/**
 * Build a week's plan. `recentGameIds` (played in the last 2 weeks) are avoided
 * where possible; if applicable games run short, they are backfilled so the
 * parent always gets 3.
 */
export function buildWeeklyPlan(args: {
  catalog: GamesCatalog;
  deck: PromptsDeck;
  placement: Placement;
  band: AgeBand;
  nearCP?: boolean;
  seed: string; // e.g. `${childId}:${isoYear}-W${isoWeek}`
  recentGameIds?: string[];
}): WeeklyPlan {
  const { catalog, deck, placement, band, nearCP = false, seed } = args;
  const recent = new Set(args.recentGameIds ?? []);
  const applicable = applicableGames(catalog, placement, band, nearCP);
  // A rung×band cell can be thin or empty (a four-year-old pre-knower is
  // rare but real, and low-confidence reads route one rung lower). In-band
  // games always come first; neighbors only ever fill the gap to 3.
  const backfill =
    applicable.length < 3
      ? neighborBandGames(catalog, placement, band, nearCP).filter(
          (g) => !applicable.some((a) => a.id === g.id),
        )
      : [];
  const ordered = [...seededOrder(applicable, (g) => g.id, seed), ...backfill];

  const fresh = ordered.filter((g) => !recent.has(g.id));
  const chosen = [...fresh];
  for (const g of ordered) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(g)) chosen.push(g);
  }
  const games = chosen.slice(0, 3);

  // Level-aware prompt selection. The daily prompt is the product's
  // highest-frequency surface, so it must match the child's rung — not just
  // their age band. Prefer prompts the child can actually perform (level ≤
  // placement); backfill from the rest only if a rung is thin, so there are
  // always 7. `placement` here is the served (conservative) placement.
  const bandPrompts = deck.bands[band] ?? [];
  const bandLevels = deck.levels?.[band] ?? [];
  const ceiling = LADDER_ORDER.indexOf(placement);
  const performable: string[] = [];
  const rest: string[] = [];
  bandPrompts.forEach((text, i) => {
    const lvl = bandLevels[i];
    const rank = lvl ? LADDER_ORDER.indexOf(lvl) : 0;
    (rank <= ceiling ? performable : rest).push(text);
  });
  const orderedPerformable = seededOrder(performable, (p) => p, seed + ":prompts");
  const orderedRest = seededOrder(rest, (p) => p, seed + ":prompts:rest");
  const prompts = [...orderedPerformable, ...orderedRest].slice(0, 7);

  return { games, prompts, band, placement };
}

/** One rung down the ladder (conservative low-confidence placement). Floors at L0. */
export function oneRungLower(placement: Placement): Placement {
  const idx = LADDER_ORDER.indexOf(placement);
  if (idx <= 0) return "L0";
  return LADDER_ORDER[idx - 1] as Placement;
}
