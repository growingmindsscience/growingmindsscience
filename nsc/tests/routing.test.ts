import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applicableGames,
  buildWeeklyPlan,
  oneRungLower,
} from "../lib/routing";
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
      ["L0", ["24-30m", "30-36m", "36-42m"]],
      ["L1", ["24-30m", "30-36m", "36-42m"]],
      ["L2", ["30-36m", "36-42m", "42-48m"]],
      ["L3", ["36-42m", "42-48m"]],
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
