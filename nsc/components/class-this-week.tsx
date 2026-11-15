import type { ClassCourseSlug } from "@/lib/classes";
import { lessonJumpPoints, lessonParagraphId, thisWeekPlan } from "@/lib/class-this-week";

const focusLink = "inline-flex min-h-11 items-center rounded-sm text-teal underline underline-offset-4 hover:text-teal-hover";

/**
 * A small Watch / Read / Practice row that jumps within the page. Plain hash
 * links, so it works without JavaScript. Renders only for a lesson with a
 * companion, so it is safe to mount on every lesson page.
 */
export function ClassLessonNav({ courseSlug, lessonSlug }: { courseSlug: ClassCourseSlug; lessonSlug: string }) {
  if (!thisWeekPlan(courseSlug, lessonSlug)) return null;
  return (
    <nav aria-label="On this page" className="-mt-1 flex flex-wrap gap-x-5 text-sm font-semibold">
      <a href="#watch" className={focusLink}>Watch</a>
      <a href="#practice" className={focusLink}>Practice</a>
      <a href="#read" className={focusLink}>Read</a>
    </nav>
  );
}

/** One margin-labelled part of the companion: a Newsreader note on the left, the content on the right. */
function Part({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-8 gap-y-3 border-t border-line-soft py-6 first:border-t-0 first:pt-0 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <h3 id={id} className="text-xl leading-snug text-ink-deep">{title}</h3>
      <div className="max-w-[60ch] text-ink">{children}</div>
    </div>
  );
}

/**
 * The learning companion under a lesson's video: a scenario to think through, one
 * if-then to try this week, and jump points into the written lesson. Matched by
 * course and lesson slug, so the free preview and the class show the same thing.
 * Everything is native HTML (details for the reveals), with no storage.
 */
export function ClassThisWeek({
  courseSlug,
  lessonSlug,
  paragraphs,
}: {
  courseSlug: ClassCourseSlug;
  lessonSlug: string;
  /** The lesson's written paragraphs, used to find the jump points. */
  paragraphs: readonly string[];
}) {
  const plan = thisWeekPlan(courseSlug, lessonSlug);
  if (!plan) return null;
  const jumps = lessonJumpPoints(courseSlug, lessonSlug, paragraphs);
  return (
    <section id="practice" aria-labelledby="practice-heading" className="scroll-mt-6 border-y border-line py-7">
      <h2 id="practice-heading" className="mb-6 text-2xl text-ink-deep">Practice</h2>

      <Part id="scenario-heading" title="Check your instinct">
        <p className="text-ink-soft">{plan.scenario.setup}</p>
        <p className="mt-3 font-semibold text-ink-deep">{plan.scenario.question}</p>
        <div role="group" aria-labelledby="scenario-heading" className="mt-3 flex flex-col gap-2">
          {plan.scenario.choices.map((choice) => (
            <details name="lesson-scenario" key={choice.text} className="group rounded-card border border-line bg-surface">
              <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 rounded-card px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="mt-[0.1em] shrink-0 text-teal group-open:rotate-90">▸</span>
                <span>{choice.text}</span>
              </summary>
              <p className="border-t border-line-soft px-4 py-3 text-ink">
                <span className="font-semibold text-ink-deep">{choice.verdict} </span>
                {choice.feedback}
              </p>
            </details>
          ))}
        </div>
      </Part>

      <Part id="try-heading" title="Try this week">
        <p className="text-lg leading-snug text-ink-deep">
          <span className="font-semibold">If</span> {plan.when}, <span className="font-semibold">then</span> {plan.then}
        </p>
        {plan.steps && (
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {plan.steps.map((step) => <li key={step}>{step}</li>)}
          </ul>
        )}
        <p className="mt-3 border-l border-field-line pl-4 font-display text-lg italic text-ink-deep">
          <span className="not-italic font-body text-sm font-semibold uppercase tracking-wide text-ink-muted">Say </span>
          &ldquo;{plan.say}&rdquo;
        </p>
        <p className="mt-3 text-ink-soft">{plan.reflection}</p>
      </Part>

      {jumps.length >= 2 && (
        <Part id="jump-heading" title="Find it in the written lesson">
          <ul aria-labelledby="jump-heading" className="flex flex-col">
            {jumps.map((jump) => (
              <li key={jump.index}>
                <a href={`#${lessonParagraphId(jump.index)}`} className={focusLink}>{jump.label}</a>
              </li>
            ))}
          </ul>
        </Part>
      )}
    </section>
  );
}

/**
 * The written lesson, with each paragraph a jump point targets given an id.
 * Full text is always shown, whether or not any anchor matched.
 */
export function ClassLessonText({
  courseSlug,
  lessonSlug,
  paragraphs,
}: {
  courseSlug: ClassCourseSlug;
  lessonSlug: string;
  paragraphs: readonly string[];
}) {
  const targets = new Set(lessonJumpPoints(courseSlug, lessonSlug, paragraphs).map((jump) => jump.index));
  return (
    <section id="read" aria-labelledby="read-heading" className="scroll-mt-6 border-t border-line pt-8">
      <h2 id="read-heading" className="text-2xl text-ink-deep">Read this lesson</h2>
      <div className="mt-5 flex max-w-[62ch] flex-col gap-4 text-base leading-relaxed text-ink [text-wrap:pretty]">
        {paragraphs.map((paragraph, i) => (
          <p key={i} id={targets.has(i) ? lessonParagraphId(i) : undefined} className={targets.has(i) ? "-ml-4 scroll-mt-6 border-l-2 border-transparent pl-4 target:border-field-line" : undefined} tabIndex={targets.has(i) ? -1 : undefined}>
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
