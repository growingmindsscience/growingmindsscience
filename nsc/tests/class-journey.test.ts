import { describe, expect, it } from "vitest";
import { bundleOffered, classJourney, journeyActionLabel, splitCatalog } from "@/lib/class-journey";
import { CLASS_BUNDLE_FOUR } from "@/lib/classes";

const lesson = (n: number, duration: number | null = 600) => ({
  id: `l${n}`, slug: `lesson-${n}`, title: `Lesson ${n}`, module_number: Math.ceil(n / 3), duration_seconds: duration,
});
const lessons = [1, 2, 3, 4, 5, 6].map((n) => lesson(n));
const row = (n: number, position: number, completed: string | null, updated: string | null | undefined) =>
  ({ lesson_id: `l${n}`, position_seconds: position, completed_at: completed, updated_at: updated });

describe("class journey resume", () => {
  it("handles an empty class and a class with no progress", () => {
    expect(classJourney([], []).status).toBe("empty");
    const fresh = classJourney(lessons, []);
    expect(fresh).toMatchObject({ status: "not-started", complete: 0, total: 6, watchedSeconds: 0, minutesLeft: 10 });
    expect(fresh.next?.id).toBe("l1");
    expect(journeyActionLabel(fresh)).toBe("Start class");
  });

  it("resumes a later lesson the parent jumped ahead to and partly watched", () => {
    const journey = classJourney(lessons, [
      row(1, 600, "2026-11-01T10:00:00Z", "2026-11-01T10:00:00Z"),
      row(5, 200, null, "2026-11-02T10:00:00Z"),
    ]);
    expect(journey.next?.id).toBe("l5");
    expect(journey).toMatchObject({ status: "in-progress", complete: 1, watchedSeconds: 200, minutesLeft: 7 });
    expect(journeyActionLabel(journey)).toBe("Continue lesson");
  });

  it("picks the newest of several partly watched lessons", () => {
    const journey = classJourney(lessons, [
      row(2, 100, null, "2026-11-03T10:00:00Z"),
      row(4, 100, null, "2026-11-05T10:00:00Z"),
      row(6, 100, null, "2026-11-04T10:00:00Z"),
    ]);
    expect(journey.next?.id).toBe("l4");
  });

  it("treats a partial lesson as stale once something newer was finished", () => {
    const journey = classJourney(lessons, [
      row(1, 600, "2026-11-01T10:00:00Z", "2026-11-01T10:00:00Z"),
      row(5, 200, null, "2026-11-02T10:00:00Z"),
      row(2, 600, "2026-11-03T10:00:00Z", "2026-11-03T10:00:00Z"),
    ]);
    expect(journey.next?.id).toBe("l3");
    expect(journey.watchedSeconds).toBe(0);
    expect(journeyActionLabel(journey)).toBe("Start next lesson");
  });

  it("never resumes a completed lesson, even the newest one", () => {
    const journey = classJourney(lessons, [row(3, 120, "2026-11-04T10:00:00Z", "2026-11-04T10:00:00Z")]);
    expect(journey.next?.id).toBe("l1");
    expect(journey.status).toBe("in-progress");
  });

  it("ignores progress from other classes and unpublished lessons", () => {
    const journey = classJourney(lessons, [
      { lesson_id: "other-course-lesson", position_seconds: 300, completed_at: null, updated_at: "2026-11-09T00:00:00Z" },
      { lesson_id: "draft-lesson", position_seconds: 300, completed_at: "2026-11-09T00:00:00Z", updated_at: "2026-11-09T00:00:00Z" },
    ]);
    expect(journey).toMatchObject({ status: "not-started", complete: 0 });
    expect(journey.next?.id).toBe("l1");
  });

  it("falls back to curriculum order for missing, invalid, or equal timestamps", () => {
    expect(classJourney(lessons, [row(4, 50, null, null), row(2, 50, null, undefined)]).next?.id).toBe("l2");
    expect(classJourney(lessons, [row(5, 50, null, "not a date"), row(3, 50, null, "")]).next?.id).toBe("l3");
    const same = "2026-11-05T10:00:00Z";
    expect(classJourney(lessons, [row(6, 50, null, same), row(4, 50, null, same)]).next?.id).toBe("l4");
    // A partial save stamped the same instant as a completion still counts as current.
    expect(classJourney(lessons, [row(1, 600, same, same), row(5, 50, null, same)]).next?.id).toBe("l5");
  });

  it("does not count a zero-position save as started", () => {
    const journey = classJourney(lessons, [row(4, 0, null, "2026-11-05T10:00:00Z")]);
    expect(journey).toMatchObject({ status: "not-started" });
    expect(journey.next?.id).toBe("l1");
  });

  it("reports a finished class without a next lesson", () => {
    const all = lessons.map((item, index) => row(index + 1, 600, "2026-11-01T10:00:00Z", "2026-11-01T10:00:00Z"));
    const journey = classJourney(lessons, all);
    expect(journey).toMatchObject({ status: "complete", complete: 6, next: null });
    expect(journeyActionLabel(journey)).toBe("Review class");
  });

  it("omits time left when the lesson length is unknown", () => {
    expect(classJourney([lesson(1, null)], [row(1, 90, null, "2026-11-01T00:00:00Z")]).minutesLeft).toBeNull();
  });
});

describe("my classes catalog", () => {
  it("lists a Family Systems owner's class as owned, on its own", () => {
    expect(splitCatalog(["family"])).toEqual({
      ownedCourses: ["family"], otherCourses: ["infant", "toddlerhood", "preschool"],
    });
    expect(splitCatalog([]).otherCourses).toEqual(["infant", "toddlerhood", "preschool", "family"]);
  });

  const open = { infant: true, toddlerhood: true, preschool: true };
  it("keeps the three-class bundle open to a parent who owns only Family Systems", () => {
    expect(bundleOffered(["family"], open)).toBe(true);
    expect(bundleOffered([], { ...open, family: false })).toBe(true);
  });

  it("closes the bundle once any of its classes is owned or off sale", () => {
    expect(bundleOffered(["toddlerhood"], open)).toBe(false);
    expect(bundleOffered(["family", "infant"], open)).toBe(false);
    expect(bundleOffered([], { ...open, preschool: false })).toBe(false);
    expect(bundleOffered([], { infant: true, toddlerhood: true })).toBe(false);
  });

  it("offers all four only when Family Systems is also unowned and on sale", () => {
    expect(bundleOffered([], { ...open, family: true }, CLASS_BUNDLE_FOUR)).toBe(true);
    expect(bundleOffered(["family"], { ...open, family: true }, CLASS_BUNDLE_FOUR)).toBe(false);
    expect(bundleOffered([], open, CLASS_BUNDLE_FOUR)).toBe(false);
  });
});
