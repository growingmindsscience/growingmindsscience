import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { classSalesOpen, hasClassAccess } from "@/lib/classes.server";
import { CLASS_COURSES, lessonPath, transcriptParagraphs, type ClassCourseSlug } from "@/lib/classes";
import { CLASS_PREVIEW_PATHS, classLessonNumber, type FreePreviewLesson } from "@/lib/class-preview";
import { CLASS_REFUND_POLICY } from "@/lib/refund-policy";
import { sitePath } from "@/lib/site";
import { ClassHeader, ClassShell, Eyebrow } from "@/components/class-chrome";
import { ClassPlayer } from "@/components/class-player";
import { LinkButton, buttonClasses } from "@/components/ui";

/** What differs between the classes' free lesson pages. */
export type ClassPreviewConfig = {
  courseSlug: ClassCourseSlug;
  moduleLessonCounts: readonly number[];
  /** The /app/classes/<slug>/enroll path; signup sends the parent there after an account is made. */
  enrollPath: string;
  /** Finishes "It walks through ... in four modules: " */
  span: string;
  modulesSentence: string;
  /**
   * One line on what came before, keyed by lesson slug, because a free lesson
   * mid-class can point back to earlier ones. If a different lesson is ever
   * flagged free, it shows no lead-in until it has one. The video, captions
   * and written version stay exactly as recorded.
   */
  leadIns: Record<string, string>;
};

export function classPreviewMetadata(config: ClassPreviewConfig, lesson: FreePreviewLesson | null): Metadata {
  const course = CLASS_COURSES[config.courseSlug];
  if (!lesson) {
    return {
      title: "Free lesson coming soon · From Little Onward Classes",
      description: `A free lesson from the ${course.shortTitle} class is coming soon.`,
      robots: { index: false },
    };
  }
  return {
    title: `Free lesson: ${lesson.title} · From Little Onward Classes`,
    description: `Watch ${lesson.title}, a full lesson from the ${course.shortTitle} class, free. No account needed.`,
    alternates: { canonical: sitePath(`/nsc${CLASS_PREVIEW_PATHS[config.courseSlug]}`) },
  };
}

/**
 * One lesson of a class, free to watch with no account, so a parent can try
 * the class before paying. Public in the middleware; the lesson and its
 * playback come only from the class's row flagged is_free_preview. While a
 * class's sales are closed, the next step is its waitlist instead of checkout.
 */
export async function ClassPreviewPage({ config, lesson }: { config: ClassPreviewConfig; lesson: FreePreviewLesson | null }) {
  const course = CLASS_COURSES[config.courseSlug];
  const user = await getUser();
  // An owner watches it in the class itself, where their place is saved.
  if (lesson && user && await hasClassAccess(user.id, course.slug).catch(() => false)) {
    redirect(lessonPath(lesson.slug, course.slug));
  }
  const salesOpen = lesson ? await classSalesOpen(course.slug).catch(() => false) : false;
  const lessonCount = config.moduleLessonCounts.reduce((sum, count) => sum + count, 0);
  const lessonNumber = lesson ? classLessonNumber(config.moduleLessonCounts, lesson.module_number, lesson.position) : 0;
  const leadIn = lesson ? config.leadIns[lesson.slug] : undefined;
  const nextHref = salesOpen
    ? `/class-signup?next=${encodeURIComponent(config.enrollPath)}`
    : sitePath(`${course.detailsPath}#waitlist`);
  const nextLabel = salesOpen ? `Enroll, ${course.priceDisplay}` : "Join the waitlist";
  const detailsLink = (
    <a href={sitePath(course.detailsPath)} className="inline-flex min-h-11 items-center text-sm text-ink-muted underline underline-offset-4">← Class details</a>
  );

  return (
    <ClassShell header={<ClassHeader email={user?.email} showNumberPath={false} />}>
      {!lesson ? (
        <main className="mx-auto flex max-w-4xl flex-col gap-7 px-6 py-10">
          <header>
            {detailsLink}
            <Eyebrow className="mt-2">Free lesson · {course.shortTitle} class</Eyebrow>
            <h1 className="mt-2 text-3xl text-ink-deep sm:text-4xl">The free lesson is coming soon</h1>
            <p className="mt-3 max-w-[60ch] text-ink-soft">We are getting this lesson ready to share. The class page has the full outline in the meantime.</p>
          </header>
          <a href={sitePath(course.detailsPath)} className={buttonClasses("ghost", "md", "self-start")}>See the class details</a>
        </main>
      ) : (
        <>
          <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 pb-14 pt-8">
            <header className="flex flex-col gap-3">
              <div>{detailsLink}</div>
              <Eyebrow>
                Free lesson · Module {lesson.module_number}: {course.modules[lesson.module_number - 1]}
              </Eyebrow>
              <h1 className="text-3xl text-ink-deep sm:text-5xl">{lesson.title}</h1>
              {lesson.summary && <p className="max-w-[60ch] text-lg text-ink-soft [text-wrap:pretty]">{lesson.summary}</p>}
              <p className="max-w-[60ch] text-ink-soft">A full lesson from the {course.shortTitle} class, free to watch. No account needed.</p>
              {leadIn && (
                <p className="mt-2 max-w-[60ch] rounded-card bg-tint px-5 py-4 text-[0.9375rem] text-ink [text-wrap:pretty]">
                  <span className="font-semibold text-ink-deep">Where this fits. </span>
                  {leadIn}
                </p>
              )}
            </header>
            <ClassPlayer
              lessonId={lesson.id}
              title={lesson.title}
              startTime={0}
              courseSlug={course.slug}
              preview
              posterLabel={`Free lesson · Module ${lesson.module_number}, lesson ${lessonNumber} of ${lessonCount}`}
              posterMinutes={lesson.duration_seconds ? Math.max(1, Math.round(lesson.duration_seconds / 60)) : null}
            />
            <section aria-labelledby="class-heading" className="border-t border-line pt-8">
              <h2 id="class-heading" className="text-2xl text-ink-deep">
                This is lesson {lessonNumber} of {lessonCount}
              </h2>
              <p className="mt-3 max-w-[60ch] text-ink-soft [text-wrap:pretty]">
                {salesOpen
                  ? `The class is ${course.priceDisplay} once, with lifetime access. `
                  : "The full class opens soon; the waitlist hears first. "}
                It walks through {config.span} in four modules: {config.modulesSentence} Every lesson has captions and a written version.
              </p>
              {salesOpen && <p className="mt-3 max-w-[60ch] text-ink-soft [text-wrap:pretty]">{CLASS_REFUND_POLICY}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <LinkButton href={nextHref}>{nextLabel}</LinkButton>
                <a href={sitePath(`${course.detailsPath}#syllabus`)} className={buttonClasses("ghost", "md")}>See the syllabus</a>
              </div>
            </section>
            <section aria-labelledby="read-heading" className="border-t border-line pt-8">
              <h2 id="read-heading" className="text-2xl text-ink-deep">Read this lesson</h2>
              <div className="mt-5 flex max-w-[62ch] flex-col gap-4 text-base leading-relaxed text-ink [text-wrap:pretty]">
                {transcriptParagraphs(lesson.transcript).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
              </div>
            </section>
          </main>
          {/* The written lesson runs long, so the next step is here too, on the ink band that closes every Seminar page. */}
          <section aria-labelledby="next-heading" className="ink-band ink-grid bg-ink-800 text-on-dark">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-8 gap-y-5 px-6 py-12">
              <div className="min-w-0">
                <h2 id="next-heading" className="text-2xl text-on-dark sm:text-3xl">
                  Ready for the <span className="hl">other {lessonCount - 1}</span>?
                </h2>
                <p className="mt-2 text-on-dark-soft">
                  {salesOpen ? `${course.priceDisplay} once, lifetime access.` : "Join the waitlist to hear when the class opens."}
                </p>
              </div>
              <LinkButton href={nextHref} variant="amber">{nextLabel}</LinkButton>
            </div>
          </section>
        </>
      )}
    </ClassShell>
  );
}
