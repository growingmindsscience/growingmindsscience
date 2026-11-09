import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getUser } from "@/lib/auth";
import { freePreviewLesson, hasClassAccess } from "@/lib/classes.server";
import { CLASS_COURSES, INFANT_MODULE_LESSON_COUNTS, TODDLER_MODULE_LESSON_COUNTS, PRESCHOOL_MODULE_LESSON_COUNTS, lessonPath, transcriptParagraphs, type ClassCourseSlug } from "@/lib/classes";
import { CLASS_PREVIEW_PATHS, classLessonNumber } from "@/lib/class-preview";
import { CLASS_REFUND_POLICY } from "@/lib/refund-policy";
import { sitePath } from "@/lib/site";
import { ClassHeader, ClassShell, Eyebrow } from "@/components/class-chrome";
import { ClassPlayer } from "@/components/class-player";
import { LinkButton, buttonClasses } from "@/components/ui";

const loadPreview = cache((courseSlug: ClassCourseSlug) => freePreviewLesson(courseSlug));
const MODULE_COUNTS = {
  infant: INFANT_MODULE_LESSON_COUNTS,
  toddlerhood: TODDLER_MODULE_LESSON_COUNTS,
  preschool: PRESCHOOL_MODULE_LESSON_COUNTS,
};

/**
 * The free lesson is not the first one, and its narration opens with "Welcome
 * back", so a visitor gets one line on what came before. Keyed by slug: if a
 * different lesson is ever flagged free, it shows no lead-in until it has one.
 * The video, captions and written version stay exactly as recorded.
 */
const PREVIEW_LEAD_INS: Record<string, string> = {
  "inside-a-tantrum":
    "This is module 4, lesson 1. Earlier lessons introduced the toddler brain, language, and independence. This lesson explains the shape of a tantrum; the following lessons cover prevention, responding in the moment, and repair.",
  "pretend-play":
    "This is module 2, lesson 1. Module 1 introduced preschool thinking and self-regulation. This lesson begins the module on play, before rough-and-tumble, guided play, and screens.",
  "serve-and-return":
    "You are joining at lesson 3, which is why it opens with “welcome back.” Lessons 1 and 2 showed that babies arrive built to connect with the people around them, and that the brain wires itself from ordinary family life; this lesson names the pattern inside that everyday life.",
};

export async function previewMetadata(courseSlug: ClassCourseSlug): Promise<Metadata> {
  const course = CLASS_COURSES[courseSlug];
  const lesson = await loadPreview(courseSlug);
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
    alternates: { canonical: sitePath(`/nsc${CLASS_PREVIEW_PATHS[courseSlug]}`) },
  };
}

/**
 * One selected lesson of each class, free to watch with no account, so a
 * parent can try the class before paying. Public in the middleware; the
 * lesson and its playback come only from the row flagged is_free_preview.
 */
export async function ClassPreview({ courseSlug }: { courseSlug: ClassCourseSlug }) {
  const course = CLASS_COURSES[courseSlug];
  const moduleCounts = MODULE_COUNTS[courseSlug];
  const lessonCount = moduleCounts.reduce((sum, count) => sum + count, 0);
  const enrollHref = `/class-signup?next=${encodeURIComponent(`/app/classes/${courseSlug}/enroll`)}`;
  const enrollLabel = `Enroll, ${course.priceDisplay}`;
  const syllabusHref = sitePath(`${course.detailsPath}#syllabus`);
  const [lesson, user] = await Promise.all([loadPreview(courseSlug), getUser()]);
  // An owner watches it in the class itself, where their place is saved.
  if (lesson && user && await hasClassAccess(user.id, course.slug).catch(() => false)) {
    redirect(lessonPath(lesson.slug, course.slug));
  }
  const lessonNumber = lesson ? classLessonNumber(moduleCounts, lesson.module_number, lesson.position) : 0;
  const leadIn = lesson ? PREVIEW_LEAD_INS[lesson.slug] : undefined;
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
              <p className="max-w-[60ch] text-sm text-ink-muted">Written and reviewed by Matthew McArthur, narrated with an AI model of his own voice. Captions and a written version are included.</p>
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
                The class is {course.priceDisplay} once, with lifetime access. {course.blurb} Every lesson has
                captions and a written version.
              </p>
              <p className="mt-3 max-w-[60ch] text-ink-soft [text-wrap:pretty]">{CLASS_REFUND_POLICY}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <LinkButton href={enrollHref}>{enrollLabel}</LinkButton>
                <a href={syllabusHref} className={buttonClasses("ghost", "md")}>See the syllabus</a>
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
                <p className="mt-2 text-on-dark-soft">{course.priceDisplay} once, lifetime access.</p>
              </div>
              <LinkButton href={enrollHref} variant="amber">{enrollLabel}</LinkButton>
            </div>
          </section>
        </>
      )}
    </ClassShell>
  );
}
