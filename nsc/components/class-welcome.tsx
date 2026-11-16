import Link from "next/link";
import { CLASS_BUNDLE, CLASS_COURSES, type ClassCourseSlug, lessonPath } from "@/lib/classes";
import { sitePath } from "@/lib/site";
import { Card, LinkButton } from "@/components/ui";
import { AwaitClassAccess } from "@/components/await-class-access";

/**
 * What a success page can honestly say.
 * - ready: the signed-in account owns the class (with or without a checkout
 *   reference in the URL).
 * - checking: no access yet, but the URL carries a well-formed checkout
 *   reference. That is not proof of payment, so the page checks for a short,
 *   bounded time and never says the purchase went through.
 * - no-reference: no access and nothing to check. No polling, no thanks.
 */
export type WelcomeState = "ready" | "checking" | "no-reference";

export function welcomeState(hasAccess: boolean, hasCheckoutReference: boolean): WelcomeState {
  if (hasAccess) return "ready";
  return hasCheckoutReference ? "checking" : "no-reference";
}

const MY_CLASSES = "/app/classes";

function ReturnLine() {
  return <p className="mt-4 text-xs text-ink-muted">You can always return through <Link href={MY_CLASSES} className="underline">My classes</Link>.</p>;
}

/**
 * The fallback for someone who expected a class here. Worded conditionally:
 * the page cannot tell whether a payment happened, and a delay must never
 * read as a reason to check out again.
 */
function ReceiptHelp({ plural }: { plural: boolean }) {
  return (
    <p className="mt-5 border-t border-line pt-4 text-sm text-ink-muted">
      Have a receipt but don&apos;t see {plural ? "the classes" : "the class"}? Make sure you&apos;re signed in
      with the account you used at checkout, or{" "}
      <a href={sitePath("/contact/")} className="font-semibold text-teal underline">write to us</a> with the
      receipt and we&apos;ll sort it out. If you were charged, there&apos;s no need to pay again.
    </p>
  );
}

/** The two states without access: the same shape for one class or the bundle. */
function NotReady({ state, subject, plural }: {
  state: Exclude<WelcomeState, "ready">;
  /** "Toddler years", or "the classes in the bundle". */
  subject: string;
  plural: boolean;
}) {
  if (state === "checking") {
    return (
      <>
        <h1 className="text-2xl text-ink-deep sm:text-3xl">Checking your class access</h1>
        <p className="mt-3 text-ink">
          We&apos;re looking for {subject} on your account. After checkout, access usually appears within a few seconds.
        </p>
        <AwaitClassAccess />
        <Link href={MY_CLASSES} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-teal underline">Go to My classes</Link>
        <ReceiptHelp plural={plural} />
      </>
    );
  }
  return (
    <>
      <h1 className="text-2xl text-ink-deep sm:text-3xl">{plural ? "Find your classes in My classes" : "Find your class in My classes"}</h1>
      <p className="mt-3 text-ink">There&apos;s no checkout to confirm on this page. Every class on your account is listed in My classes.</p>
      <div className="mt-5 flex flex-col items-center">
        <LinkButton href={MY_CLASSES} className="w-full sm:w-auto">Go to My classes</LinkButton>
      </div>
      <ReceiptHelp plural={plural} />
    </>
  );
}

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
 * The page a parent lands on after checkout for one class. Once the class is
 * theirs it leads with one button to the first lesson; until then it says
 * only what it knows (see WelcomeState).
 */
export function ClassWelcome({ state, courseSlug, firstLessonSlug }: {
  state: WelcomeState;
  courseSlug: ClassCourseSlug;
  firstLessonSlug?: string;
}) {
  const course = CLASS_COURSES[courseSlug];
  const classHref = `/app/classes/${courseSlug}`;
  if (state !== "ready") return <Card><NotReady state={state} subject={course.shortTitle} plural={false} /></Card>;
  return (
    <Card>
      <h1 className="text-2xl text-ink-deep sm:text-3xl">Welcome. Your class is ready.</h1>
      <p className="mt-3 text-ink">{`${course.shortTitle} is yours to keep. Each lesson is about ten minutes, and your place is saved as you go.`}</p>
      <div className="mt-5 flex flex-col items-center gap-2">
        <LinkButton href={firstLessonSlug ? lessonPath(firstLessonSlug, courseSlug) : classHref}>
          {firstLessonSlug ? "Start the first lesson" : "Open class"}
        </LinkButton>
        {firstLessonSlug && <Link href={classHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline">See all lessons</Link>}
      </div>
      <FounderNote className="mt-6 border-t border-line pt-5" />
      <ReturnLine />
    </Card>
  );
}

/**
 * After the bundle: one row per class, each with its own first lesson, so a
 * parent starts with the class for their child's age instead of hunting.
 */
export function BundleWelcome({ title = CLASS_BUNDLE.title, state, starts }: {
  /** The bundle's name, e.g. "All four classes". */
  title?: string;
  state: WelcomeState;
  starts: { courseSlug: ClassCourseSlug; firstLessonSlug?: string }[];
}) {
  if (state !== "ready") return <Card><NotReady state={state} subject="the classes in the bundle" plural /></Card>;
  return (
    <Card>
      <h1 className="text-2xl text-ink-deep sm:text-3xl">Welcome. {title} are ready.</h1>
      <p className="mt-3 text-ink">They are yours to keep. Start with the class for your child&apos;s age today; the others will be here as they grow.</p>
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
      <ReturnLine />
    </Card>
  );
}
