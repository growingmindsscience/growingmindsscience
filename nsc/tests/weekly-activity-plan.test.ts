import { describe, expect, it } from "vitest";
import { weeklyActivityPlan } from "../lib/weekly-activity-plan";
import {
  ACTIVITY_DOMAINS,
  type ActivityDomain,
  type ActivityRow,
} from "../lib/activity-types";

function makeActivity(
  slug: string,
  domain: ActivityDomain,
  over: Partial<ActivityRow> = {},
): ActivityRow {
  return {
    id: slug,
    slug,
    title: slug,
    months_min: 12,
    months_max: 24,
    themes: [],
    domains: [domain],
    intention: "x",
    mechanism_tags: [],
    materials: [],
    steps: [],
    adapt_down: "",
    adapt_up: "",
    evidence_note: "",
    duration_min: 5,
    mess_level: 1,
    setting: ["indoor"],
    safety_notes: "",
    locale: "en",
    status: "published",
    version: 1,
    published_at: "2026-07-01",
    ...over,
  };
}

/** 18 single-domain activities, three per domain, all 12-24m. */
function catalog(): ActivityRow[] {
  return ACTIVITY_DOMAINS.flatMap((d, di) =>
    [0, 1, 2].map((i) =>
      makeActivity(`${d}-${i}`, d, {
        mess_level: ((di + i) % 3) + 1,
        duration_min: 5 + ((di + i) % 3) * 10, // 5, 15, 25
      }),
    ),
  );
}

const base = {
  activities: catalog(),
  ageMonths: 18,
  seed: "child-a:2026-W29",
};

describe("weekly activity plan (plan 2.1 PR4)", () => {
  it("same seed always yields the same grid", () => {
    const a = weeklyActivityPlan(base);
    const b = weeklyActivityPlan(base);
    expect(a.days.map((d) => [d.anchor.slug, d.backup?.slug])).toEqual(
      b.days.map((d) => [d.anchor.slug, d.backup?.slug]),
    );
    expect(a.days).toHaveLength(7);
  });

  it("different weeks give a different grid", () => {
    const a = weeklyActivityPlan(base).days.map((d) => d.anchor.slug);
    const b = weeklyActivityPlan({ ...base, seed: "child-a:2026-W30" }).days.map(
      (d) => d.anchor.slug,
    );
    expect(a.join()).not.toBe(b.join());
  });

  it("no activity repeats while the pool has unused ones", () => {
    const plan = weeklyActivityPlan(base); // 18 activities, 14 slots
    const slugs = plan.days.flatMap((d) =>
      d.backup ? [d.anchor.slug, d.backup.slug] : [d.anchor.slug],
    );
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("anchors cover all six domains across the week", () => {
    const domains = new Set(
      weeklyActivityPlan(base).days.flatMap((d) => d.anchor.domains),
    );
    expect(domains.size).toBe(ACTIVITY_DOMAINS.length);
  });

  it("respects the mess budget", () => {
    const plan = weeklyActivityPlan({ ...base, maxMess: 1 });
    for (const d of plan.days) {
      expect(d.anchor.mess_level).toBeLessThanOrEqual(1);
      if (d.backup) expect(d.backup.mess_level).toBeLessThanOrEqual(1);
    }
    expect(plan.days.length).toBeGreaterThan(0);
  });

  it("respects the time budget", () => {
    const plan = weeklyActivityPlan({ ...base, maxDuration: 10 });
    for (const d of plan.days) {
      expect(d.anchor.duration_min).toBeLessThanOrEqual(10);
      if (d.backup) expect(d.backup.duration_min).toBeLessThanOrEqual(10);
    }
  });

  it("small pools fill all seven days by repeating rather than leaving blanks", () => {
    const tiny = catalog().slice(0, 2);
    const plan = weeklyActivityPlan({ ...base, activities: tiny });
    expect(plan.days).toHaveLength(7);
    for (const d of plan.days) {
      if (d.backup) expect(d.backup.id).not.toBe(d.anchor.id);
    }
  });

  it("a single-activity pool anchors every day with no self-backup", () => {
    const one = catalog().slice(0, 1);
    const plan = weeklyActivityPlan({ ...base, activities: one });
    expect(plan.days).toHaveLength(7);
    for (const d of plan.days) expect(d.backup).toBeNull();
  });

  it("age-inappropriate pools produce an empty plan", () => {
    const plan = weeklyActivityPlan({ ...base, ageMonths: 40 });
    expect(plan.days).toHaveLength(0);
  });
});
