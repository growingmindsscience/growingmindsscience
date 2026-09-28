import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applicableGames,
  buildWeeklyPlan,
  fillName,
  oneRungLower,
  personalizePrompts,
  suppressedGameIds,
  teaserGame,
} from "../lib/routing";
import { interpolate } from "../lib/assessment";
import { addDaysISO } from "../lib/tz";
import { ageBandForMonths, ageInMonths } from "../lib/age";
import type { GamesCatalog, PromptsDeck } from "../lib/content-types";

const root = join(__dirname, "..");
const catalog: GamesCatalog = JSON.parse(
  readFileSync(join(root, "content/games.catalog.v1.json"), "utf8"),
);
const deck: PromptsDeck = JSON.parse(
  readFileSync(join(root, "content/prompts.deck.v1.json"), "utf8"),
);

describe("age banding", () => {
  it("computes whole months and floors partial months", () => {
    expect(ageInMonths("2023-01-01", new Date("2026-01-01T00:00:00Z"))).toBe(36);
    expect(ageInMonths("2023-01-15", new Date("2026-01-10T00:00:00Z"))).toBe(35);
  });
  it("maps months to bands at the boundaries", () => {
    expect(ageBandForMonths(24)).toBe("24-30m");
    expect(ageBandForMonths(29)).toBe("24-30m");
    expect(ageBandForMonths(30)).toBe("30-36m");
    expect(ageBandForMonths(47)).toBe("42-48m");
    expect(ageBandForMonths(60)).toBe("48-60m");
  });
});

describe("applicable games", () => {
  it("every rung×band cell the routing can hit has >=3 applicable games", () => {
    // Mirrors the cert coverage map so a plan can always be filled.
    const cells: [string, string[]][] = [
      ["L0", ["24-30m", "30-36m", "36-42m", "42-48m", "48-60m"]],
      ["L1", ["24-30m", "30-36m", "36-42m", "42-48m", "48-60m"]],
      ["L2", ["30-36m", "36-42m", "42-48m", "48-60m"]],
      ["L3", ["30-36m", "36-42m", "42-48m", "48-60m"]],
      ["L4", ["36-42m", "42-48m", "48-60m"]],
      ["CP", ["42-48m", "48-60m"]],
    ];
    for (const [lvl, bands] of cells) {
      for (const band of bands) {
        const n = applicableGames(catalog, lvl as never, band as never).length;
        expect(n, `${lvl}×${band}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("plan totality", () => {
  const BANDS = ["24-30m", "30-36m", "36-42m", "42-48m", "48-60m"] as const;
  const PLACEMENTS = ["L0", "L1", "L2", "L3", "L4"] as const;

  it("every placement×band serves a full 3-game, 7-prompt plan (neighbor backfill)", () => {
    // The titration engine is age-blind, so every cell is reachable — a
    // 27-month CP-knower and a 52-month pre-knower both deserve a real week.
    for (const placement of PLACEMENTS) {
      for (const band of BANDS) {
        const plan = buildWeeklyPlan({
          catalog,
          deck,
          placement,
          band,
          seed: `totality:${placement}:${band}`,
        });
        expect(plan.games, `${placement}×${band}`).toHaveLength(3);
        expect(plan.prompts, `${placement}×${band}`).toHaveLength(7);
        for (const g of plan.games) {
          expect(g.levels, `${placement}×${band} game ${g.id}`).toContain(
            placement,
          );
        }
      }
    }
  });

  it("in-band games always outrank neighbor-band backfill", () => {
    // L4×30-36m has exactly one in-band game; it must lead the plan.
    const inBand = applicableGames(catalog, "L4", "30-36m").map((g) => g.id);
    expect(inBand.length).toBeGreaterThanOrEqual(1);
    const plan = buildWeeklyPlan({
      catalog,
      deck,
      placement: "L4",
      band: "30-36m",
      seed: "backfill-order:w1",
    });
    for (const id of inBand) {
      expect(plan.games.map((g) => g.id)).toContain(id);
    }
  });
});

describe("weekly plan", () => {
  const base = {
    catalog,
    deck,
    placement: "L2" as const,
    band: "36-42m" as const,
    seed: "child-1:2026-W27",
  };

  it("returns exactly 3 games and 7 prompts", () => {
    const plan = buildWeeklyPlan(base);
    expect(plan.games).toHaveLength(3);
    expect(plan.prompts).toHaveLength(7);
  });

  it("is deterministic for the same seed", () => {
    expect(buildWeeklyPlan(base).games.map((g) => g.id)).toEqual(
      buildWeeklyPlan(base).games.map((g) => g.id),
    );
  });

  it("varies across weeks (different seed → generally different lead game)", () => {
    const w27 = buildWeeklyPlan(base).games.map((g) => g.id);
    const w28 = buildWeeklyPlan({ ...base, seed: "child-1:2026-W28" }).games.map(
      (g) => g.id,
    );
    // not asserting full disjointness (small pools), just that ordering shifts
    expect(w27.join()).not.toBe(w28.join());
  });

  it("avoids recently played games when it can", () => {
    const first = buildWeeklyPlan(base).games.map((g) => g.id);
    const plan = buildWeeklyPlan({ ...base, recentGameIds: first });
    // With >3 applicable games for L2×36-42m, none of last week's should repeat.
    const overlap = plan.games.filter((g) => first.includes(g.id));
    expect(overlap).toHaveLength(0);
  });

  it("all chosen games actually apply to the placement and band", () => {
    const plan = buildWeeklyPlan(base);
    for (const g of plan.games) {
      expect(g.age_bands).toContain("36-42m");
      expect(g.levels).toContain("L2");
    }
  });

  it("serves an older low-knower child only performable prompts", () => {
    // A 4-5yo assessed L1: every daily prompt must be one an L1 child can do
    // (level L0 or L1), never the band's CP arithmetic.
    const LADDER = ["L0", "L1", "L2", "L3", "L4", "CP"];
    const band = "48-60m" as const;
    const levels = deck.levels[band];
    const performable = new Set(
      deck.bands[band].filter((_, i) => LADDER.indexOf(levels[i]) <= 1),
    );
    const plan = buildWeeklyPlan({
      ...base,
      placement: "L1",
      band,
      seed: "child-9:2026-W30",
    });
    expect(plan.prompts).toHaveLength(7);
    for (const p of plan.prompts) {
      expect(performable.has(p)).toBe(true);
    }
  });

  it("serves a CP child the full band, arithmetic prompts included", () => {
    const plan = buildWeeklyPlan({
      ...base,
      placement: "CP",
      band: "48-60m",
      seed: "child-9:2026-W30",
    });
    expect(plan.prompts).toHaveLength(7);
  });
});

describe("conservative placement", () => {
  it("steps one rung down and floors at L0", () => {
    expect(oneRungLower("CP")).toBe("L4");
    expect(oneRungLower("L1")).toBe("L0");
    expect(oneRungLower("L0")).toBe("L0");
  });
});

describe("rendered plan copy (N4: no raw placeholders reach the page)", () => {
  const BANDS = ["24-30m", "30-36m", "36-42m", "42-48m", "48-60m"] as const;
  const PLACEMENTS = ["L0", "L1", "L2", "L3", "L4", "CP"] as const;
  const BRACES = /[{}]/;

  it("personalized prompts never show a {placeholder}, in any cell or week", () => {
    let withName = 0;
    for (const band of BANDS) {
      for (const placement of PLACEMENTS) {
        for (let w = 1; w <= 12; w++) {
          const plan = buildWeeklyPlan({ catalog, deck, placement, band, seed: `child-x:2026-W${w}` });
          withName += plan.prompts.filter((p) => p.includes("{name}")).length;
          for (const p of personalizePrompts(plan.prompts, "Mia")) {
            expect(p, `band ${band} ${placement} w${w}`).not.toMatch(BRACES);
          }
        }
      }
    }
    // The deck really does carry {name}; the guard above is not vacuous.
    expect(withName).toBeGreaterThan(0);
  });

  it("every game field a card renders is placeholder-free after interpolation", () => {
    const vars = { name: "Mia", objects: "" };
    for (const g of catalog.games) {
      for (const line of g.script) expect(interpolate(line, vars)).not.toMatch(BRACES);
      expect(interpolate(g.level_up, vars)).not.toMatch(BRACES);
      expect(interpolate(g.level_down, vars)).not.toMatch(BRACES);
      // Rendered raw (no interpolation), so they must carry no placeholders.
      for (const raw of [g.title, g.goal, g.frequency_rx, g.bilingual_note, ...g.materials]) {
        expect(raw, g.id).not.toMatch(BRACES);
      }
    }
  });

  it("fillName only replaces the name token", () => {
    expect(fillName("Give {name} two spoons: {name}!", "Leo")).toBe("Give Leo two spoons: Leo!");
    expect(fillName("No token here.", "Leo")).toBe("No token here.");
  });
});

describe("locked game cards (N9: paid content stays on the server)", () => {
  it("a teaser carries only what the locked card shows", () => {
    for (const g of catalog.games) {
      const t = teaserGame(g);
      expect(t).toMatchObject({ id: g.id, title: g.title, goal: g.goal, duration_min: g.duration_min });
      expect(t.script).toEqual([]);
      expect(t.materials).toEqual([]);
      expect(t.level_up).toBe("");
      expect(t.level_down).toBe("");
      expect(t.bilingual_note).toBe("");
      expect(t.evidence.tag_ids).toEqual([]);
      const json = JSON.stringify(t);
      for (const line of g.script) expect(json).not.toContain(line);
    }
  });
});

describe("weekly rotation (N9: the week is fixed on Monday)", () => {
  const MONDAY = "2026-09-28";
  const play = (game_id: string, played_at: string, reaction: string | null) => ({
    game_id,
    played_at,
    reaction,
  });

  it("plays logged this week never reshuffle this week's games", () => {
    const ids = suppressedGameIds(
      [play("g1", "2026-09-28", "fine"), play("g2", "2026-09-30", "flopped")],
      MONDAY,
    );
    expect(ids).toEqual([]);
  });

  it("rests fine games two weeks, flopped games six, loved games never", () => {
    const ids = suppressedGameIds(
      [
        play("fine-last-week", "2026-09-22", "fine"),
        play("fine-old", "2026-09-10", "fine"),
        play("unrated", "2026-09-21", null),
        play("flop-5wk", "2026-08-24", "flopped"),
        play("flop-7wk", "2026-08-08", "flopped"),
        play("loved", "2026-09-27", "loved"),
      ],
      MONDAY,
    );
    expect(ids.sort()).toEqual(["fine-last-week", "flop-5wk", "unrated"]);
  });

  it("a free family tapping reactions all week keeps the same unlocked game", () => {
    const seed = "child-1:2026-W40";
    const base = { catalog, deck, placement: "L2" as const, band: "36-42m" as const, seed };
    const firstFree = buildWeeklyPlan({ ...base, recentGameIds: suppressedGameIds([], MONDAY) }).games[0].id;
    const plays: { game_id: string; played_at: string; reaction: string | null }[] = [];
    for (let day = 0; day < 7; day++) {
      const plan = buildWeeklyPlan({ ...base, recentGameIds: suppressedGameIds(plays, MONDAY) });
      expect(plan.games[0].id).toBe(firstFree);
      plays.push(play(plan.games[0].id, addDaysISO(MONDAY, day), "fine"));
    }
  });
});
