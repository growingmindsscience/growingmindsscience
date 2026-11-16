import Link from "next/link";
import { CLASS_COURSES, lessonPath, transcriptParagraphs, type ClassCourseSlug, type ClassLesson } from "@/lib/classes";
import type { JourneyProgressRow } from "@/lib/class-journey";
import { Eyebrow } from "@/components/class-chrome";
import { ClassPlayer } from "@/components/class-player";
import { ClassLessonNav, ClassLessonText, ClassThisWeek } from "@/components/class-this-week";

/** At or past this many paragraphs, the written lesson ends with a short way on. */
export const LONG_LESSON_PARAGRAPHS = 4;

const jumpLink = "inline-flex min-h-11 items-center rounded-sm text-teal underline underline-offset-4 hover:text-teal-hover";

function minutes(seconds: number | null | undefined): number | null {
  return seconds ? Math.max(1, Math.round(seconds / 60)) : null;
}

/**
 * One enrolled lesson, the same in every class: where it sits, Watch / Practice /
 * Read shortcuts, the video, the lessons either side by name, the companion when
 * the lesson has one, and the written lesson. The route keeps auth, access,
 * lesson lookup and saved progress; this only lays them out. All plain links.
 */
export function ClassLessonView({ courseSlug, lessons, index, place }: {
  courseSlug: ClassCourseSlug;
  /** The class's published lessons in outline order. */
  lessons: readonly ClassLesson[];
  /** Position of this lesson in `lessons`. */
  index: number;
  /** The parent's saved place in this lesson, if any. */
  place?: Pick<JourneyProgressRow, "position_seconds" | "completed_at">;
}) {
  const course = CLASS_COURSES[courseSlug];
  const lesson = lessons[index];
  const previous = index > 0 ? lessons[index - 1] : null;
  const upcoming = index + 1 < lessons.length ? lessons[index + 1] : null;
  const paragraphs = transcriptParagraphs(lesson.transcript);
  const position = `Lesson ${index + 1} of ${lessons.length}`;
  const outlineHref = `/app/classes/${courseSlug}#module-${lesson.module_number}`;
  // Name the module only when a neighbour sits in a different one.
  const moduleNote = (other: ClassLesson) =>
    other.module_number !== lesson.module_number ? ` · Module ${other.module_number}` : "";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href={outlineHref} className="inline-flex min-h-11 items-center text-sm text-ink-muted underline underline-offset-4">
          <span aria-hidden="true" className="mr-1">←</span>Class outline
        </Link>
        <Eyebrow className="mt-2">
          Module {lesson.module_number}: {course.modules[lesson.module_number - 1]} · {position}
        </Eyebrow>
        <h1 className="mt-2 text-3xl text-ink-deep sm:text-4xl">{lesson.title}</h1>
        {lesson.summary && <p className="mt-3 max-w-[60ch] text-ink [text-wrap:pretty]">{lesson.summary}</p>}
      </header>

      {/* The shortcuts sit right above the video, so the rest of the page is one tap away on a phone. */}
      <div className="-mt-3 flex flex-col gap-2">
        <ClassLessonNav courseSlug={courseSlug} lessonSlug={lesson.slug} always />
        <div id="watch" className="scroll-mt-6">
          <ClassPlayer
            lessonId={lesson.id}
            title={lesson.title}
            posterLabel={`Module ${lesson.module_number} · ${position}`}
            posterMinutes={minutes(lesson.duration_seconds)}
            startTime={place?.completed_at ? 0 : (place?.position_seconds ?? 0)}
            completed={Boolean(place?.completed_at)}
            next={upcoming ? { href: lessonPath(upcoming.slug, courseSlug), title: upcoming.title, minutes: minutes(upcoming.duration_seconds) } : undefined}
            courseSlug={courseSlug}
          />
        </div>
      </div>

      <nav aria-label="Previous and next lessons" className="-mt-2">
        <ul className="grid border-y border-line sm:grid-cols-2">
          {previous && (
            <li>
              <PagerLink
                href={lessonPath(previous.slug, courseSlug)}
                label={<><span aria-hidden="true">← </span>Previous lesson{moduleNote(previous)}</>}
                title={previous.title}
              />
            </li>
          )}
          <li className={`${previous ? "border-t border-line sm:border-l sm:border-t-0" : "sm:col-start-2"} sm:text-right`}>
            {upcoming
              ? <PagerLink href={lessonPath(upcoming.slug, courseSlug)} label={<>Next lesson{moduleNote(upcoming)}<span aria-hidden="true"> →</span></>} title={upcoming.title} />
              : <PagerLink href="/app/classes" label={<>Last lesson of the class<span aria-hidden="true"> →</span></>} title="My classes" />}
          </li>
        </ul>
      </nav>

      <ClassThisWeek courseSlug={courseSlug} lessonSlug={lesson.slug} paragraphs={paragraphs} />

      {paragraphs.length ? (
        <ClassLessonText courseSlug={courseSlug} lessonSlug={lesson.slug} paragraphs={paragraphs} />
      ) : (
        <section id="read" aria-labelledby="read-heading" className="scroll-mt-6 border-t border-line pt-8">
          <h2 id="read-heading" className="text-2xl text-ink-deep">Read this lesson</h2>
          <p className="mt-3 text-ink-soft">The written version of this lesson is not ready yet. The video has captions.</p>
        </section>
      )}

      {/* A long read ends with a short way on, so the next step never sits under a couple of thousand words. */}
      {paragraphs.length >= LONG_LESSON_PARAGRAPHS && (
        <nav aria-label="After reading" className="-mt-2 flex flex-wrap justify-between gap-x-5 border-t border-line pt-3 text-sm font-semibold">
          <a href="#watch" className={jumpLink}><span aria-hidden="true" className="mr-1">↑</span>Back to the video</a>
          {upcoming
            ? <Link href={lessonPath(upcoming.slug, courseSlug)} className={`${jumpLink} text-right`}>Next: {upcoming.title}<span aria-hidden="true" className="ml-1">→</span></Link>
            : <Link href="/app/classes" className={jumpLink}>My classes<span aria-hidden="true" className="ml-1">→</span></Link>}
        </nav>
      )}
    </main>
  );
}

/** One side of the lesson pager: a short teal label over the neighbouring lesson's title. */
function PagerLink({ href, label, title }: { href: string; label: React.ReactNode; title: string }) {
  return (
    <Link href={href} className="group flex min-h-11 flex-col gap-0.5 px-3 py-3 transition-colors hover:bg-tint/60">
      <span className="text-sm font-semibold text-teal">{label}</span>
      <span className="font-semibold leading-snug text-ink-deep underline decoration-field-line underline-offset-4 [text-wrap:pretty] group-hover:decoration-current">{title}</span>
    </Link>
  );
}
