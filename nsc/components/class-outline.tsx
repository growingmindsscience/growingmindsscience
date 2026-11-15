import Link from "next/link";
import { type ClassCourseSlug, type ClassLesson, lessonPath } from "@/lib/classes";
import { classJourney, journeyActionLabel, type JourneyProgressRow } from "@/lib/class-journey";
import { Card, LinkButton } from "@/components/ui";
import { sitePath } from "@/lib/site";

export type LessonProgress = JourneyProgressRow;

function minutes(seconds: number | null | undefined): number | null {
  return seconds ? Math.max(1, Math.round(seconds / 60)) : null;
}

/**
 * Top of an owned classroom: the one lesson to open next and a single button
 * to it, then a compact progress line. The lesson is the one the parent was
 * last partway through (even if they jumped ahead), else the next in order;
 * lib/class-journey keeps this in step with My classes.
 */
export function ClassResume({ lessons, progress, courseSlug, modules }: {
  lessons: ClassLesson[];
  progress: LessonProgress[];
  courseSlug: ClassCourseSlug;
  modules: readonly string[];
}) {
  const journey = classJourney(lessons, progress);
  const { next, total, complete } = journey;
  if (journey.status === "empty") return null;
  const progressLine = (
    <div className="mt-5 flex items-center gap-3">
      <div
        role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={complete}
        aria-label="Class progress"
        className="h-1.5 flex-1 overflow-hidden rounded-sm bg-tint"
      >
        <div className="h-full rounded-sm bg-teal" style={{ width: `${Math.round((complete / total) * 100)}%` }} />
      </div>
      <p className="shrink-0 text-sm text-ink-muted">{complete} of {total} lessons done</p>
    </div>
  );
  if (!next) {
    return (
      <Card>
        <h2 className="text-xl text-ink-deep">You have finished the class</h2>
        <p className="mt-1 text-sm text-ink-soft">Every lesson stays here for you. Come back to any of them whenever you need it.</p>
        <p className="mt-4 text-sm text-ink">
          What changed for you and your child? Matthew reads every note, and it shapes the next version of the class.{" "}
          <a href={sitePath(`/contact/?finished=${courseSlug}`)} className="font-semibold text-teal underline">Tell Matthew</a>
        </p>
        {progressLine}
      </Card>
    );
  }
  const timing = journey.minutesLeft
    ? journey.watchedSeconds > 0 ? `about ${journey.minutesLeft} min left` : `${journey.minutesLeft} min`
    : null;
  return (
    <Card>
      <p className="text-sm font-semibold text-amber-deep">
        {journey.watchedSeconds > 0 ? "Pick up where you left off" : journey.status === "not-started" ? "Start here" : "Up next"}
      </p>
      <h2 className="mt-1 text-xl text-ink-deep">{next.title}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Module {next.module_number}: {modules[next.module_number - 1]}
        {timing ? ` · ${timing}` : ""}
      </p>
      <LinkButton href={lessonPath(next.slug, courseSlug)} className="mt-4 w-full sm:w-auto">
        {journeyActionLabel(journey)}
      </LinkButton>
      {progressLine}
    </Card>
  );
}

/**
 * The class outline, module by module. Owners get a link per lesson with
 * its length and their progress, and the resume lesson is marked; `locked`
 * shows the same outline to a visitor who has not enrolled, without links.
 */
export function ClassOutline({ modules, lessons, progress = [], courseSlug, locked = false }: {
  modules: readonly string[];
  lessons: ClassLesson[];
  progress?: LessonProgress[];
  courseSlug: ClassCourseSlug;
  locked?: boolean;
}) {
  const byLesson = new Map(progress.map((row) => [row.lesson_id, row]));
  const upNext = locked ? null : classJourney(lessons, progress).next?.id ?? null;
  // Ruled rows, not cards (DESIGN.md): a hairline above each lesson and one
  // below the last. Linked rows wash to the tint on hover; locked rows stay flat.
  const row = "flex items-start justify-between gap-4 border-t border-line px-3 py-3 text-ink";
  return (
    <>
      {modules.map((title, index) => {
        const moduleLessons = lessons.filter((lesson) => lesson.module_number === index + 1);
        return (
          <section key={title} aria-labelledby={`module-${index + 1}`}>
            <p aria-hidden="true" className="font-display text-[0.9375rem] font-medium italic text-amber-deep">Module {index + 1}</p>
            <h2 id={`module-${index + 1}`} className="mb-2 text-xl text-ink-deep">
              <span className="sr-only">Module {index + 1}: </span>{title}
            </h2>
            {moduleLessons.length ? (
              <ol className="flex flex-col border-b border-line">
                {moduleLessons.map((lesson) => {
                  const place = byLesson.get(lesson.id);
                  const length = minutes(lesson.duration_seconds);
                  const current = lesson.id === upNext;
                  const partly = (place?.position_seconds ?? 0) > 0;
                  const body = (
                    <>
                      <span className="min-w-0">
                        <strong className="block font-semibold leading-snug">{lesson.title}</strong>
                        {lesson.summary && <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{lesson.summary}</span>}
                      </span>
                      <span className="shrink-0 text-right text-sm leading-snug text-ink-muted">
                        {place?.completed_at
                          ? <span className="block font-semibold text-teal"><span aria-hidden="true" className="mr-1">✓</span>Done</span>
                          : current
                            ? <span className="block font-semibold text-teal">{partly ? "Resume here" : "Up next"}</span>
                            : partly && <span className="block font-semibold text-teal">In progress</span>}
                        {length && <span className="block">{length} min</span>}
                      </span>
                    </>
                  );
                  return (
                    <li key={lesson.id}>
                      {locked
                        ? <div className={row}>{body}</div>
                        : (
                          <Link
                            href={lessonPath(lesson.slug, courseSlug)}
                            aria-current={current ? "step" : undefined}
                            className={`${row} transition-colors hover:bg-tint/60 ${current ? "bg-tint/40" : ""}`}
                          >
                            {body}
                          </Link>
                        )}
                    </li>
                  );
                })}
              </ol>
            ) : <p className="text-sm text-ink-muted">Lessons are being prepared.</p>}
          </section>
        );
      })}
    </>
  );
}
