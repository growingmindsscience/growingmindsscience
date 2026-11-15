import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { transcriptParagraphs } from "../lib/classes";
import { lessonJumpPoints, resolveJumpPoints, thisWeekPlan } from "../lib/class-this-week";

const MODULE_4 = [
  "inside-a-tantrum",
  "heading-it-off-routines-and-transitions",
  "in-the-moment-your-calm-is-their-calm",
  "after-the-storm-repair",
] as const;

// The stored transcripts: the migration contains the original stored transcripts.
const sql = readFileSync(join(__dirname, "../supabase/migrations/0022_toddler_class_lessons.sql"), "utf8");

function storedParagraphs(slug: string): string[] {
  const start = sql.indexOf(`'toddlerhood', 4, `);
  const row = sql.slice(start).match(new RegExp(`'${slug}', '[^']*', 'draft', \\$t\\$([\\s\\S]*?)\\$t\\$`));
  if (!row) throw new Error(`transcript for ${slug} not found`);
  return transcriptParagraphs(row[1]);
}

describe("toddler module 4 learning companion", () => {
  it.each(MODULE_4)("%s has a plan whose jump points all anchor in its own stored transcript", (slug) => {
    const plan = thisWeekPlan("toddlerhood", slug);
    expect(plan).not.toBeNull();
    const jumps = lessonJumpPoints("toddlerhood", slug, storedParagraphs(slug));
    expect(jumps).toHaveLength(plan!.jumps.length);
    expect(jumps.length).toBeGreaterThanOrEqual(3);
    expect(jumps.length).toBeLessThanOrEqual(5);
  });

  it("does not match one lesson's anchors in another lesson's text", () => {
    for (const slug of MODULE_4) {
      const plan = thisWeekPlan("toddlerhood", slug)!;
      for (const other of MODULE_4.filter((s) => s !== slug)) {
        expect(resolveJumpPoints(plan.jumps, storedParagraphs(other))).toHaveLength(0);
      }
    }
  });

  it("omits anchors that are missing and ignores case, spacing and curly quotes", () => {
    const text = ["Intro.", "It’s   a  Toddler’s PREVIEW.", "Closing."];
    const found = resolveJumpPoints(
      [{ label: "Preview", anchor: "toddler's preview" }, { label: "Gone", anchor: "not in the lesson" }],
      text,
    );
    expect(found).toEqual([{ label: "Preview", index: 1 }]);
  });

  it("shows nothing for lessons outside the pilot", () => {
    expect(thisWeekPlan("toddlerhood", "choices-and-warm-limits")).toBeNull();
    expect(lessonJumpPoints("toddlerhood", "choices-and-warm-limits", ["anything"])).toEqual([]);
  });
});
