import Link from "next/link";
import { CLASS_COURSES, type ClassCourseSlug, lessonPath } from "@/lib/classes";
import { sitePath } from "@/lib/site";
import { Card, LinkButton } from "@/components/ui";
import { AwaitClassAccess } from "@/app/app/classes/toddlerhood/success/wait";

/**
 * A short, personal note from the person who teaches the classes, shown
 * after enrolling. One concrete plan (a lesson a week, one idea tried),
 * and a real way to reach him.
 */
export function FounderNote({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="founder-note" className={`flex gap-4 text-left ${className}`}>
      {/* Served by the parent site, which proxies this app under /nsc. */}
      <img
        src="/assets/img/matthew-photo-400.jpg" alt="" width={56} height={70}
        className="h-14 w-14 shrink-0 rounded-full object-cover object-top"
      />
      <div className="min-w-0">
        <h2 id="founder-note" className="text-base font-semibold text-ink-deep">A note from Matthew</h2>
        <p className="mt-1 text-sm text-ink">
          Thank you for trusting me with this. The only plan you need: watch one lesson this week,
          then try one idea from it with your child. Small and steady works better than a weekend
          of watching.
        </p>
        <p className="mt-2 text-sm text-ink">
          If anything in a lesson is unclear,{" "}
          <a href={sitePath("/contact/")} className="font-semibold text-teal underline">write to me</a>.
          I read every message.
        </p>
      </div>
    </section>
  );
}

/**
 * The page a parent lands on after paying for one class. While the payment
 * is confirming it waits; once the class is theirs it leads with one button
 * to the first lesson.
 */
export function ClassWelcome({ ready, courseSlug, firstLessonSlug }: {
  ready: boolean;
  courseSlug: ClassCourseSlug;
  firstLessonSlug?: string;
}) {
  const course = CLASS_COURSES[courseSlug];
  const classHref = `/app/classes/${courseSlug}`;
  return (
    <Card>
      <h1 className="text-2xl text-ink-deep sm:text-3xl">{ready ? "Welcome. Your class is ready." : "Thank you for enrolling"}</h1>
      <p className="mt-3 text-ink">{ready
        ? `${course.shortTitle} is yours to keep. Each lesson is about ten minutes, and your place is saved as you go.`
        : "We're confirming your payment and adding the class to your account."}</p>
      {ready ? (
        <>
          <div className="mt-5 flex flex-col items-center gap-2">
            <LinkButton href={firstLessonSlug ? lessonPath(firstLessonSlug, courseSlug) : classHref}>
              {firstLessonSlug ? "Start the first lesson" : "Open class"}
            </LinkButton>
            {firstLessonSlug && <Link href={classHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline">See all lessons</Link>}
          </div>
          <FounderNote className="mt-6 border-t border-line pt-5" />
        </>
      ) : <AwaitClassAccess />}
      <p className="mt-4 text-xs text-ink-muted">You can always return through <Link href="/app/classes" className="underline">My classes</Link>.</p>
    </Card>
  );
}

/**
 * After the bundle: one row per class, each with its own first lesson, so a
 * parent starts with the class for their child's age instead of hunting.
 */
export function BundleWelcome({ ready, starts }: {
  ready: boolean;
  starts: { courseSlug: ClassCourseSlug; firstLessonSlug?: string }[];
}) {
  return (
    <Card>
      <h1 className="text-2xl text-ink-deep sm:text-3xl">{ready ? "Welcome. All three classes are ready." : "Thank you for enrolling"}</h1>
      <p className="mt-3 text-ink">{ready
        ? "They are yours to keep. Start with the class for your child's age today; the others will be here as they grow."
        : "We're confirming your payment and adding the classes to your account."}</p>
      {ready ? (
        <>
          <ul className="mt-5 flex flex-col border-b border-line text-left">
            {starts.map(({ courseSlug, firstLessonSlug }) => {
              const course = CLASS_COURSES[courseSlug];
              return (
                <li key={courseSlug} className="flex items-center justify-between gap-4 border-t border-line py-3">
                  <span className="min-w-0">
                    <strong className="block font-semibold text-ink-deep">{course.shortTitle}</strong>
                    <span className="block text-sm text-ink-muted">{course.ages}</span>
                  </span>
                  <LinkButton size="sm" href={firstLessonSlug ? lessonPath(firstLessonSlug, courseSlug) : `/app/classes/${courseSlug}`}>
                    {firstLessonSlug ? "Start lesson 1" : "Open class"}
                  </LinkButton>
                </li>
              );
            })}
          </ul>
          <FounderNote className="mt-6" />
        </>
      ) : <AwaitClassAccess />}
      <p className="mt-4 text-xs text-ink-muted">You can always return through <Link href="/app/classes" className="underline">My classes</Link>.</p>
    </Card>
  );
}
