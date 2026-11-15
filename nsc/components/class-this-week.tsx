import type { ClassCourseSlug } from "@/lib/classes";
import { thisWeekPlan } from "@/lib/class-this-week";

/**
 * "Try this week": a small plan under a lesson's video. Renders only for a
 * lesson that has one (matched by course and lesson slug), so it is safe to
 * mount on every lesson page.
 */
export function ClassThisWeek({ courseSlug, lessonSlug }: { courseSlug: ClassCourseSlug; lessonSlug: string }) {
  const plan = thisWeekPlan(courseSlug, lessonSlug);
  if (!plan) return null;
  return (
    <section aria-labelledby="this-week-heading" className="rounded-card bg-tint px-5 py-5">
      <h2 id="this-week-heading" className="text-xl text-ink-deep">Try this week</h2>
      <p className="mt-2 max-w-[60ch] text-ink">{plan.situation}</p>
      <ol className="mt-2 flex max-w-[60ch] list-decimal flex-col gap-1 pl-5 text-ink">
        {plan.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <p className="mt-3 max-w-[60ch] text-ink">
        <span className="font-semibold text-ink-deep">Say: </span>
        &ldquo;{plan.say}&rdquo;
      </p>
    </section>
  );
}
