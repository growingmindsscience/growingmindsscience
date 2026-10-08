import Link from "next/link";
import { type ClassCourseSlug, type ClassLesson, lessonPath } from "@/lib/classes";
import { Card, LinkButton } from "@/components/ui";

export interface LessonProgress { lesson_id: string; position_seconds: number | null; completed_at: string | null }

function minutes(seconds: number | null | undefined): number | null {
  return seconds ? Math.max(1, Math.round(seconds / 60)) : null;
}

/**
 * Top of an owned classroom: how far along the parent is and one button
 * to the next thing to watch, so they never have to scan the outline to
 * find their place.
 */
export function ClassResume({ lessons, progress, courseSlug, modules }: {
  lessons: ClassLesson[];
  progress: LessonProgress[];
  courseSlug: ClassCourseSlug;
  modules: readonly string[];
}) {
  if (!lessons.length) return null;
  const byLesson = new Map(progress.map((row) => [row.lesson_id, row]));
  const complete = lessons.filter((lesson) => byLesson.get(lesson.id)?.completed_at).length;
  const next = lessons.find((lesson) => !byLesson.get(lesson.id)?.completed_at);
  const watched = next ? (byLesson.get(next.id)?.position_seconds ?? 0) : 0;
  const started = complete > 0 || lessons.some((lesson) => byLesson.has(lesson.id));
  const left = next?.duration_seconds && watched > 0 ? minutes(Math.max(60, next.duration_seconds - watched)) : null;
  const length = minutes(next?.duration_seconds);
  return (
    <Card>
      <div
        role="progressbar" aria-valuemin={0} aria-valuemax={lessons.length} aria-valuenow={complete}
        aria-label="Class progress"
        className="h-2 overflow-hidden rounded-sm bg-tint"
      >
        <div className="h-full rounded-sm bg-teal" style={{ width: `${Math.round((complete / lessons.length) * 100)}%` }} />
      </div>
      <p className="mt-2 text-sm text-ink-muted">{complete} of {lessons.length} lessons complete</p>
      {next ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h2 className="text-xl text-ink-deep">{started ? "Continue" : "Start here"}: {next.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Module {next.module_number}: {modules[next.module_number - 1]}
              {left ? ` · about ${left} min left` : length ? ` · ${length} min` : ""}
            </p>
          </div>
          <LinkButton href={lessonPath(next.slug, courseSlug)}>{watched > 0 ? "Continue lesson" : "Start lesson"}</LinkButton>
        </div>
      ) : (
        <div className="mt-4">
          <h2 className="text-xl text-ink-deep">You have finished the class</h2>
          <p className="mt-1 text-sm text-ink-soft">Every lesson stays here for you. Come back to any of them whenever you need it.</p>
        </div>
      )}
    </Card>
  );
}

/**
 * The class outline, module by module. Owners get a link per lesson with
 * its length and their progress; `locked` shows the same outline to a
 * visitor who has not enrolled, without links.
 */
export function ClassOutline({ modules, lessons, progress = [], courseSlug, locked = false }: {
  modules: readonly string[];
  lessons: ClassLesson[];
  progress?: LessonProgress[];
  courseSlug: ClassCourseSlug;
  locked?: boolean;
}) {
  const byLesson = new Map(progress.map((row) => [row.lesson_id, row]));
  // Ruled rows, not cards (DESIGN.md): a hairline above each lesson and one
  // below the last. Linked rows wash to the tint on hover; locked rows stay flat.
  const row = "flex items-center justify-between gap-4 border-t border-line px-3 py-4 text-ink";
  return (
    <>
      {modules.map((title, index) => {
        const moduleLessons = lessons.filter((lesson) => lesson.module_number === index + 1);
        return (
          <section key={title} aria-labelledby={`module-${index + 1}`}>
            <p aria-hidden="true" className="font-display text-[0.9375rem] font-medium italic text-amber-deep">Module {index + 1}</p>
            <h2 id={`module-${index + 1}`} className="mb-3 text-xl text-ink-deep">
              <span className="sr-only">Module {index + 1}: </span>{title}
            </h2>
            {moduleLessons.length ? (
              <ol className="flex flex-col border-b border-line">
                {moduleLessons.map((lesson) => {
                  const place = byLesson.get(lesson.id);
                  const length = minutes(lesson.duration_seconds);
                  const body = (
                    <>
                      <span className="min-w-0">
                        <strong className="block font-semibold">{lesson.title}</strong>
                        {lesson.summary && <span className="block text-sm text-ink-soft">{lesson.summary}</span>}
                      </span>
                      <span className="shrink-0 text-right text-sm text-ink-muted">
                        {place?.completed_at
                          ? <span className="block font-semibold text-teal"><span aria-hidden="true" className="mr-1">✓</span>Done</span>
                          : (place?.position_seconds ?? 0) > 0 && <span className="block font-semibold text-teal">In progress</span>}
                        {length && <span className="block">{length} min</span>}
                      </span>
                    </>
                  );
                  return (
                    <li key={lesson.id}>
                      {locked
                        ? <div className={row}>{body}</div>
                        : <Link href={lessonPath(lesson.slug, courseSlug)} className={`${row} transition-colors hover:bg-tint/60`}>{body}</Link>}
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
