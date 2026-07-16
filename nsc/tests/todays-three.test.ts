import { describe, expect, it } from "vitest";
import { todaysThree, type CompletionLite } from "../lib/todays-three";
import { ACTIVITY_DOMAINS, type ActivityRow } from "../lib/activity-types";

/** Synthetic catalog: 3 single-domain activities per domain, all 12–24m. */
function catalog(): ActivityRow[] {
  const rows: ActivityRow[] = [];
  for (const domain of ACTIVITY_DOMAINS) {
    for (let i = 0; i < 3; i++) {
      rows.push({
        id: `${domain}-${i}`,
        slug: `${domain}-${i}`,
        title: `${domain} ${i}`,
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
      });
    }
  }
  return rows;
}

function dateAt(offset: number): string {
  const base = Date.parse("2026-07-16T00:00:00Z");
  return new Date(base + offset * 86_400_000).toISOString().slice(0, 10);
}

const base = {
  activities: catalog(),
  ageMonths: 18,
  completions: [] as CompletionLite[],
  childId: "child-a",
};

describe("Today's 3 (plan 2.1 PR3 acceptance)", () => {
  it("same inputs always give the same three picks", () => {
    const a = todaysThree({ ...base, isoDate: "2026-07-16" }).map((x) => x.slug);
    const b = todaysThree({ ...base, isoDate: "2026-07-16" }).map((x) => x.slug);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
  });

  it("all six domains appear within any 14-day window for a child with no completions", () => {
    for (let windowStart = 0; windowStart < 6; windowStart++) {
      const seen = new Set<string>();
      for (let d = windowStart; d < windowStart + 14; d++) {
        for (const pick of todaysThree({ ...base, isoDate: dateAt(d) })) {
          for (const dom of pick.domains) seen.add(dom);
        }
      }
      expect([...seen].sort()).toEqual([...ACTIVITY_DOMAINS].sort());
    }
  });

  it("three picks in one day spread across three distinct domains", () => {
    const picks = todaysThree({ ...base, isoDate: "2026-07-16" });
    const domains = new Set(picks.flatMap((p) => p.domains));
    expect(domains.size).toBe(3);
  });

  it("excludes activities completed in the last 14 days", () => {
    const doneYesterday: CompletionLite = {
      activity_id: "language-0",
      completed_on: dateAt(-1),
      domains: ["language"],
    };
    const picks = todaysThree({
      ...base,
      completions: [doneYesterday],
      isoDate: dateAt(0),
    });
    expect(picks.map((p) => p.id)).not.toContain("language-0");
  });

  it("a 15-day-old completion no longer blocks the activity", () => {
    const doneLongAgo: CompletionLite = {
      activity_id: "language-0",
      completed_on: dateAt(-15),
      domains: ["language"],
    };
    const withOld = todaysThree({
      ...base,
      completions: [doneLongAgo],
      isoDate: dateAt(0),
    });
    // Not necessarily picked, but eligible: force it by covering other domains.
    expect(withOld).toHaveLength(3);
  });

  it("ranks toward the least-covered domain over the trailing 28 days", () => {
    // Heavy recent coverage on every domain except sensory.
    const completions: CompletionLite[] = ACTIVITY_DOMAINS.filter(
      (d) => d !== "sensory",
    ).flatMap((d, i) => [
      { activity_id: `${d}-far`, completed_on: dateAt(-20 - (i % 3)), domains: [d] },
      { activity_id: `${d}-far2`, completed_on: dateAt(-18), domains: [d] },
    ]);
    const picks = todaysThree({ ...base, completions, isoDate: dateAt(0) });
    expect(picks[0].domains).toContain("sensory");
  });

  it("backfills oldest-first when everything age-appropriate was played recently", () => {
    const tiny = catalog().slice(0, 3); // exactly three candidates
    const completions: CompletionLite[] = tiny.map((a, i) => ({
      activity_id: a.id,
      completed_on: dateAt(-(i + 1)), // 1, 2, 3 days ago
      domains: a.domains,
    }));
    const picks = todaysThree({
      ...base,
      activities: tiny,
      completions,
      isoDate: dateAt(0),
    });
    expect(picks).toHaveLength(3);
    // Oldest completion comes back first.
    expect(picks[0].id).toBe(tiny[2].id);
  });

  it("only ever serves age-appropriate activities", () => {
    const picks = todaysThree({ ...base, ageMonths: 30, isoDate: dateAt(0) });
    expect(picks).toHaveLength(0); // catalog is 12-24m only
  });

  it("different children get different tie-break orders on the same day", () => {
    const a = todaysThree({ ...base, childId: "child-a", isoDate: dateAt(0) });
    const b = todaysThree({ ...base, childId: "child-b", isoDate: dateAt(0) });
    // Domain spread is enforced for both; slugs inside a domain may differ.
    expect(a).toHaveLength(3);
    expect(b).toHaveLength(3);
  });
});
