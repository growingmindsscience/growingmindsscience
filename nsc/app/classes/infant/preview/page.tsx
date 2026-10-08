import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getUser } from "@/lib/auth";
import { freePreviewLesson, hasClassAccess } from "@/lib/classes.server";
import { INFANT_COURSE, INFANT_MODULE_LESSON_COUNTS, lessonPath, transcriptParagraphs } from "@/lib/classes";
import { INFANT_PREVIEW_PATH, classLessonNumber } from "@/lib/class-preview";
import { INFANT_ENROLL_PATH } from "@/lib/class-paths";
import { CLASS_REFUND_POLICY } from "@/lib/refund-policy";
import { sitePath } from "@/lib/site";
import { ClassHeader, ClassShell, Eyebrow } from "@/components/class-chrome";
import { ClassPlayer } from "@/components/class-player";
import { LinkButton, buttonClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

// Metadata and the page both need the lesson; read it once per request.
const loadPreview = cache(() => freePreviewLesson(INFANT_COURSE.slug));

const ENROLL_HREF = `/class-signup?next=${encodeURIComponent(INFANT_ENROLL_PATH)}`;
const ENROLL_LABEL = `Enroll, ${INFANT_COURSE.priceDisplay}`;
const LESSON_COUNT = INFANT_MODULE_LESSON_COUNTS.reduce((sum, count) => sum + count, 0);
const SYLLABUS_HREF = sitePath(`${INFANT_COURSE.detailsPath}#syllabus`);

export async function generateMetadata(): Promise<Metadata> {
  const lesson = await loadPreview();
  if (!lesson) {
    return {
      title: "Free lesson coming soon · Growing Minds Science Classes",
      description: `A free lesson from the ${INFANT_COURSE.shortTitle} class is coming soon.`,
      robots: { index: false },
    };
  }
  return {
    title: `Free lesson: ${lesson.title} · Growing Minds Science Classes`,
    description: `Watch ${lesson.title}, a full lesson from the ${INFANT_COURSE.shortTitle} class, free. No account needed.`,
    alternates: { canonical: sitePath(`/nsc${INFANT_PREVIEW_PATH}`) },
  };
}

/**
 * One lesson of the infant class, free to watch with no account, so a
 * parent can try the class before paying. Public in the middleware; the
 * lesson and its playback come only from the row flagged is_free_preview.
 */
export default async function InfantPreviewPage() {
  const [lesson, user] = await Promise.all([loadPreview(), getUser()]);
  // An owner watches it in the class itself, where their place is saved.
  if (lesson && user && await hasClassAccess(user.id, INFANT_COURSE.slug).catch(() => false)) {
    redirect(lessonPath(lesson.slug, INFANT_COURSE.slug));
  }
  const lessonNumber = lesson ? classLessonNumber(INFANT_MODULE_LESSON_COUNTS, lesson.module_number, lesson.position) : 0;
  const detailsLink = (
    <a href={sitePath(INFANT_COURSE.detailsPath)} className="inline-flex min-h-11 items-center text-sm text-ink-muted underline underline-offset-4">← Class details</a>
  );

  return (
    <ClassShell header={<ClassHeader email={user?.email} showNumberPath={false} />}>
      {!lesson ? (
        <main className="mx-auto flex max-w-4xl flex-col gap-7 px-6 py-10">
          <header>
            {detailsLink}
            <Eyebrow className="mt-2">Free lesson · {INFANT_COURSE.shortTitle} class</Eyebrow>
            <h1 className="mt-2 text-3xl text-ink-deep sm:text-4xl">The free lesson is coming soon</h1>
            <p className="mt-3 max-w-[60ch] text-ink-soft">We are getting this lesson ready to share. The class page has the full outline in the meantime.</p>
          </header>
          <a href={sitePath(INFANT_COURSE.detailsPath)} className={buttonClasses("ghost", "md", "self-start")}>See the class details</a>
        </main>
      ) : (
        <>
          <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 pb-14 pt-8">
            <header className="flex flex-col gap-3">
              <div>{detailsLink}</div>
              <Eyebrow>
                Free lesson · Module {lesson.module_number}: {INFANT_COURSE.modules[lesson.module_number - 1]}
              </Eyebrow>
              <h1 className="text-3xl text-ink-deep sm:text-5xl">{lesson.title}</h1>
              {lesson.summary && <p className="max-w-[60ch] text-lg text-ink-soft [text-wrap:pretty]">{lesson.summary}</p>}
              <p className="max-w-[60ch] text-ink-soft">A full lesson from the {INFANT_COURSE.shortTitle} class, free to watch. No account needed.</p>
            </header>
            <ClassPlayer
              lessonId={lesson.id}
              title={lesson.title}
              startTime={0}
              courseSlug={INFANT_COURSE.slug}
              preview
              posterLabel={`Free lesson · Module ${lesson.module_number}, lesson ${lessonNumber} of ${LESSON_COUNT}`}
              posterMinutes={lesson.duration_seconds ? Math.max(1, Math.round(lesson.duration_seconds / 60)) : null}
            />
            <section aria-labelledby="class-heading" className="border-t border-line pt-8">
              <h2 id="class-heading" className="text-2xl text-ink-deep">
                This is lesson {lessonNumber} of {LESSON_COUNT}
              </h2>
              <p className="mt-3 max-w-[60ch] text-ink-soft [text-wrap:pretty]">
                The class is {INFANT_COURSE.priceDisplay} once, with lifetime access. It walks through the first year in four modules:
                the newborn brain, reading your baby&rsquo;s cues, attachment, and language, movement, and play. Every lesson has
                captions and a written version.
              </p>
              <p className="mt-3 max-w-[60ch] text-ink-soft [text-wrap:pretty]">{CLASS_REFUND_POLICY}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <LinkButton href={ENROLL_HREF}>{ENROLL_LABEL}</LinkButton>
                <a href={SYLLABUS_HREF} className={buttonClasses("ghost", "md")}>See the syllabus</a>
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
                  Ready for the <span className="hl">other {LESSON_COUNT - 1}</span>?
                </h2>
                <p className="mt-2 text-on-dark-soft">{INFANT_COURSE.priceDisplay} once, lifetime access.</p>
              </div>
              <LinkButton href={ENROLL_HREF} variant="amber">{ENROLL_LABEL}</LinkButton>
            </div>
          </section>
        </>
      )}
    </ClassShell>
  );
}
