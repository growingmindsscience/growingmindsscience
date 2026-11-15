/**
 * Where a parent is in a class, and what My classes offers next. Pure, so the
 * dashboard and the owned classroom agree and the rules are testable.
 */
import { CLASS_BUNDLE, type ClassCourseSlug, type ClassLesson } from "@/lib/classes";

/** Catalog order: youngest age first, then the any-age Family Systems class. */
export const CLASS_CATALOG_ORDER: readonly ClassCourseSlug[] = ["infant", "toddlerhood", "preschool", "family"];

export interface JourneyProgressRow {
  lesson_id: string;
  position_seconds: number | null;
  completed_at: string | null;
  updated_at?: string | null;
}

type JourneyLesson = Pick<ClassLesson, "id" | "slug" | "title" | "module_number" | "duration_seconds">;

export interface ClassJourney<L extends JourneyLesson = JourneyLesson> {
  /** empty: no published lessons. not-started: no saved progress in this class. */
  status: "empty" | "not-started" | "in-progress" | "complete";
  total: number;
  complete: number;
  /** The one lesson to open next; null when the class is empty or finished. */
  next: L | null;
  /** Seconds already watched of `next` (0 when it is a fresh start). */
  watchedSeconds: number;
  /** Rounded minutes left in `next`, or its full length when unwatched. */
  minutesLeft: number | null;
  /** Newest progress save in this class, for ordering courses by recency. */
  lastActivity: number;
}

function time(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function roundedMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

/**
 * The lesson to resume. Only this class's published lessons count, so rows from
 * other classes or unpublished lessons never steer it. A partly watched,
 * unfinished lesson wins when it is the newest thing the parent touched, even
 * if it is ahead in the outline; if they finished something after it, that
 * partial lesson is stale and the outline order takes over again. Missing or
 * unreadable timestamps sort oldest, and ties go to curriculum order.
 */
export function classJourney<L extends JourneyLesson>(lessons: readonly L[], progress: readonly JourneyProgressRow[]): ClassJourney<L> {
  const total = lessons.length;
  const empty = { total, complete: 0, next: null, watchedSeconds: 0, minutesLeft: null, lastActivity: Number.NEGATIVE_INFINITY };
  if (!total) return { status: "empty", ...empty };

  const ids = new Set(lessons.map((lesson) => lesson.id));
  const byLesson = new Map<string, JourneyProgressRow>();
  for (const row of progress) if (ids.has(row.lesson_id)) byLesson.set(row.lesson_id, row);

  const done = (lesson: L) => Boolean(byLesson.get(lesson.id)?.completed_at);
  const watched = (lesson: L) => Math.max(0, byLesson.get(lesson.id)?.position_seconds ?? 0);
  const complete = lessons.filter(done).length;
  const lastActivity = Math.max(Number.NEGATIVE_INFINITY, ...[...byLesson.values()].map((row) => time(row.updated_at)));
  const lastCompletion = Math.max(Number.NEGATIVE_INFINITY,
    ...[...byLesson.values()].filter((row) => row.completed_at).map((row) => time(row.updated_at)));

  let partial: L | null = null;
  for (const lesson of lessons) {
    if (done(lesson) || watched(lesson) <= 0) continue;
    // Strictly newer only, so equal or missing timestamps keep the earlier lesson.
    if (!partial || time(byLesson.get(lesson.id)?.updated_at) > time(byLesson.get(partial.id)?.updated_at)) partial = lesson;
  }
  const partialIsCurrent = partial && time(byLesson.get(partial.id)?.updated_at) >= lastCompletion;
  const next = (partialIsCurrent ? partial : null) ?? lessons.find((lesson) => !done(lesson)) ?? null;

  if (!next) return { ...empty, status: "complete", complete, lastActivity };
  const seconds = watched(next);
  const duration = next.duration_seconds ?? 0;
  const minutesLeft = duration > 0 ? roundedMinutes(seconds > 0 ? Math.max(60, duration - seconds) : duration) : null;
  const started = complete > 0 || [...byLesson.values()].some((row) => row.completed_at || (row.position_seconds ?? 0) > 0);
  return {
    status: started ? "in-progress" : "not-started",
    total, complete, next, watchedSeconds: seconds, minutesLeft, lastActivity,
  };
}

/** The button label for a journey's one next step, shared by every surface. */
export function journeyActionLabel(journey: Pick<ClassJourney, "status" | "watchedSeconds">): string {
  switch (journey.status) {
    case "empty": return "Open class";
    case "complete": return "Review class";
    case "not-started": return "Start class";
    default: return journey.watchedSeconds > 0 ? "Continue lesson" : "Start next lesson";
  }
}

/** Owned classes first in catalog order; Family Systems is a paid class like the others. */
export function splitCatalog(owned: readonly ClassCourseSlug[]) {
  return {
    ownedCourses: CLASS_CATALOG_ORDER.filter((slug) => owned.includes(slug)),
    otherCourses: CLASS_CATALOG_ORDER.filter((slug) => !owned.includes(slug)),
  };
}

/**
 * Mirrors startBundleCheckout: the three-class bundle is offered only when the
 * parent owns none of its three classes and all three are on sale. Classes
 * outside the bundle (Family Systems) never affect it.
 */
export function bundleOffered(owned: readonly ClassCourseSlug[], salesOpen: Partial<Record<ClassCourseSlug, boolean>>): boolean {
  return CLASS_BUNDLE.courses.every((slug) => !owned.includes(slug) && salesOpen[slug] === true);
}
