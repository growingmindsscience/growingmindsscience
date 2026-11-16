import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { classSalesOpen, hasClassAccess } from "@/lib/classes.server";
import { CLASS_COURSES, lessonPath, transcriptParagraphs, type ClassCourseSlug } from "@/lib/classes";
import { CLASS_PREVIEW_PATHS, classLessonNumber, type FreePreviewLesson } from "@/lib/class-preview";
import { CLASS_REFUND_POLICY } from "@/lib/refund-policy";
import { thisWeekPlan } from "@/lib/class-this-week";
import { sitePath } from "@/lib/site";
import { ClassHeader, ClassShell, Eyebrow } from "@/components/class-chrome";
import { ClassPlayer } from "@/components/class-player";
import { ClassLessonNav, ClassLessonText, ClassThisWeek } from "@/components/class-this-week";
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
 * class's sales are closed, the next step is its class page instead of checkout.
 */
export async function ClassPreviewPage({ config, lesson }: { config: ClassPreviewConfig; lesson: FreePreviewLesson | null }) {
  const course = CLASS_COURSES[config.courseSlug];
  const user = await getUser();
  // An owner watches it in the class itself, where their place is saved.
  if (lesson && user && await hasClassAccess(user.id, course.slug).catch(() => false)) {
    redirect(lessonPath(lesson.slug, course.slug));
  }
  // The signed-in parent's id lets the gate open for the preview-env test account.
  const salesOpen = lesson ? await classSalesOpen(course.slug, user?.id).catch(() => false) : false;
  const lessonCount = config.moduleLessonCounts.reduce((sum, count) => sum + count, 0);
  const lessonNumber = lesson ? classLessonNumber(config.moduleLessonCounts, lesson.module_number, lesson.position) : 0;
  const paragraphs = lesson ? transcriptParagraphs(lesson.transcript) : [];
  const leadIn = lesson ? config.leadIns[lesson.slug] : undefined;
  const nextHref = salesOpen
    ? `/class-signup?next=${encodeURIComponent(config.enrollPath)}`
    : sitePath(course.detailsPath);
  const nextLabel = salesOpen ? `Enroll, ${course.priceDisplay}` : "See class details";
  const detailsLink = (
    <a href={sitePath(course.detailsPath)} className="inline-flex min-h-11 items-center text-sm text-ink-muted underline underline-offset-4">← Class details</a>
  );
  const hasPractice = lesson ? Boolean(thisWeekPlan(course.slug, lesson.slug)) : false;

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
          <a href={sitePath(course.detailsPath)} className={buttonClasses("primary", "md", "self-start")}>See the class details</a>
        </main>
      ) : (
        <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 pb-14 pt-6 sm:gap-10 sm:pt-8">
          <header className="flex flex-col gap-2">
            <div>{detailsLink}</div>
            <Eyebrow>
              Free lesson · Module {lesson.module_number}: {course.modules[lesson.module_number - 1]}
            </Eyebrow>
            <h1 className="text-3xl text-ink-deep sm:text-5xl">{lesson.title}</h1>
            {lesson.summary && <p className="max-w-[60ch] text-ink-soft [text-wrap:pretty] sm:text-lg">{lesson.summary}</p>}
            <p className="text-sm text-ink-muted">From the {course.shortTitle} class. Free to watch, no account needed.</p>
          </header>
          {/* Video first; the Watch / Practice / Read row sits right above it so the
              rest of the page is one tap away on a phone. Plain hash links. */}
          <div className="-mt-3 flex flex-col gap-2 sm:-mt-5">
            <ClassLessonNav courseSlug={course.slug} lessonSlug={lesson.slug} always />
            <div id="watch" className="scroll-mt-6">
              <ClassPlayer
                lessonId={lesson.id}
                title={lesson.title}
                startTime={0}
                courseSlug={course.slug}
                preview
                posterLabel={`Free lesson · Module ${lesson.module_number}, lesson ${lessonNumber} of ${lessonCount}`}
                posterMinutes={lesson.duration_seconds ? Math.max(1, Math.round(lesson.duration_seconds / 60)) : null}
              />
            </div>
          </div>
          {/* After the video, so the player arrives on the first screen; the lesson itself still stands on its own. */}
          {leadIn && (
            <p className="-mt-3 max-w-[60ch] rounded-card bg-tint px-5 py-4 text-[0.9375rem] text-ink [text-wrap:pretty]">
              <span className="font-semibold text-ink-deep">Where this fits. </span>
              {leadIn}
            </p>
          )}
          <ClassThisWeek courseSlug={course.slug} lessonSlug={lesson.slug} paragraphs={paragraphs} />
          <PreviewOffer
            config={config} salesOpen={salesOpen} lessonNumber={lessonNumber} lessonCount={lessonCount}
            nextHref={nextHref} nextLabel={nextLabel}
          />
          <ClassLessonText courseSlug={course.slug} lessonSlug={lesson.slug} paragraphs={paragraphs} />
          {/* The written lesson runs long: a short way back up, not a second sales block. */}
          <nav aria-label="After this lesson" className="-mt-2 flex flex-wrap gap-x-5 border-t border-line pt-4 text-sm font-semibold">
            <a href="#watch" className={JUMP_LINK}>Back to the video</a>
            {hasPractice && <a href="#practice" className={JUMP_LINK}>Practice</a>}
            <a href="#class-offer" className={JUMP_LINK}>
              {salesOpen ? `Get the full class, ${course.priceDisplay}` : "About the full class"}
            </a>
          </nav>
        </main>
      )}
    </ClassShell>
  );
}

const JUMP_LINK = "inline-flex min-h-11 items-center rounded-sm text-teal underline underline-offset-4 hover:text-teal-hover";

/**
 * The page's one offer, right under the free lesson: where it sits in the
 * class, the price and terms when sales are open, and one primary action
 * (signup-then-enroll, or the class page while sales are closed).
 */
function PreviewOffer({ config, salesOpen, lessonNumber, lessonCount, nextHref, nextLabel }: {
  config: ClassPreviewConfig;
  salesOpen: boolean;
  lessonNumber: number;
  lessonCount: number;
  nextHref: string;
  nextLabel: string;
}) {
  const course = CLASS_COURSES[config.courseSlug];
  return (
    <section id="class-offer" aria-labelledby="class-heading" className="scroll-mt-6 rounded-card border border-line bg-surface p-5 sm:p-6">
      <h2 id="class-heading" className="text-xl text-ink-deep sm:text-2xl">
        This is lesson {lessonNumber} of {lessonCount}
      </h2>
      <p className="mt-2 max-w-[60ch] text-ink [text-wrap:pretty]">
        {salesOpen
          ? <>The full class is <strong className="font-semibold text-ink-deep">{course.priceDisplay} once</strong>, with lifetime access to all {lessonCount} lessons.</>
          : "The class page has the full outline and the latest on enrollment."}
      </p>
      <p className="mt-2 max-w-[60ch] text-sm text-ink-soft [text-wrap:pretty]">
        It walks through {config.span} in four modules: {config.modulesSentence} Every lesson has captions and a written version.
      </p>
      {salesOpen && <p className="mt-2 max-w-[60ch] text-sm text-ink-soft [text-wrap:pretty]">{CLASS_REFUND_POLICY}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <LinkButton href={nextHref} className="w-full sm:w-auto">{nextLabel}</LinkButton>
        <a href={sitePath(`${course.detailsPath}#syllabus`)} className={JUMP_LINK}>See the syllabus</a>
      </div>
    </section>
  );
}
