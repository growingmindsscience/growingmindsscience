import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getUser } from "@/lib/auth";
import { freePreviewLesson, hasClassAccess } from "@/lib/classes.server";
import { INFANT_COURSE, INFANT_MODULE_LESSON_COUNTS, lessonPath, transcriptParagraphs } from "@/lib/classes";
import { INFANT_PREVIEW_PATH, classLessonNumber } from "@/lib/class-preview";
import { INFANT_ENROLL_PATH } from "@/lib/class-paths";
import { sitePath } from "@/lib/site";
import { ClassHeader, ClassShell, Eyebrow } from "@/components/class-chrome";
import { ClassPlayer } from "@/components/class-player";
import { Card, LinkButton, buttonClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

// Metadata and the page both need the lesson; read it once per request.
const loadPreview = cache(() => freePreviewLesson(INFANT_COURSE.slug));

const ENROLL_HREF = `/class-signup?next=${encodeURIComponent(INFANT_ENROLL_PATH)}`;
const ENROLL_LABEL = `Enroll in the full class, ${INFANT_COURSE.priceDisplay}`;
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
  const detailsLink = (
    <a href={sitePath(INFANT_COURSE.detailsPath)} className="inline-flex min-h-11 items-center text-sm text-teal-soft underline">← Class details</a>
  );

  return (
    <ClassShell header={<ClassHeader email={user?.email} showNumberPath={false} />}>
      {!lesson ? (
        <main className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-10">
          <header>
            {detailsLink}
            <Eyebrow className="mt-2">Free lesson · {INFANT_COURSE.shortTitle} class</Eyebrow>
            <h1 className="mt-2 text-3xl font-semibold text-ink-deep">The free lesson is coming soon</h1>
            <p className="mt-3 text-ink">We are getting this lesson ready to share. The class page has the full outline in the meantime.</p>
          </header>
          <a href={sitePath(INFANT_COURSE.detailsPath)} className={buttonClasses("ghost", "md", "self-start border border-teal")}>See the class details</a>
        </main>
      ) : (
        <main className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-10">
          <header>
            {detailsLink}
            <Eyebrow className="mt-2">
              Free lesson · Module {lesson.module_number}: {INFANT_COURSE.modules[lesson.module_number - 1]}
            </Eyebrow>
            <h1 className="mt-2 text-3xl font-semibold text-ink-deep">{lesson.title}</h1>
            {lesson.summary && <p className="mt-3 text-ink">{lesson.summary}</p>}
            <p className="mt-3 text-ink">A full lesson from the {INFANT_COURSE.shortTitle} class, free to watch. No account needed.</p>
          </header>
          <ClassPlayer lessonId={lesson.id} title={lesson.title} startTime={0} courseSlug={INFANT_COURSE.slug} preview />
          <Card>
            <h2 className="text-xl font-semibold text-ink-deep">
              This is lesson {classLessonNumber(INFANT_MODULE_LESSON_COUNTS, lesson.module_number, lesson.position)} of {LESSON_COUNT}
            </h2>
            <p className="mt-2 max-w-[60ch] text-ink">
              The class is {INFANT_COURSE.priceDisplay} once, with lifetime access. It walks through the first year in four modules:
              the newborn brain, reading your baby&rsquo;s cues, attachment, and language, movement, and play. Every lesson has
              captions and a written version.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <LinkButton href={ENROLL_HREF}>{ENROLL_LABEL}</LinkButton>
              <a href={SYLLABUS_HREF} className={buttonClasses("ghost", "md", "border border-teal")}>See the syllabus</a>
            </div>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold text-ink-deep">Read this lesson</h2>
            <div className="mt-4 flex max-w-[68ch] flex-col gap-4 text-base leading-relaxed text-ink [text-wrap:pretty]">
              {transcriptParagraphs(lesson.transcript).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            </div>
          </Card>
          {/* The written lesson runs long, so the next step is here too. */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-sea-glass pt-4">
            <p className="font-semibold text-ink-deep">Ready for the other {LESSON_COUNT - 1}?</p>
            <LinkButton href={ENROLL_HREF}>{ENROLL_LABEL}</LinkButton>
          </div>
        </main>
      )}
    </ClassShell>
  );
}
