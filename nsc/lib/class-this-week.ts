import type { ClassCourseSlug } from "@/lib/classes";

/** A short, practical plan shown under a lesson's video, so it can be found without reading the transcript. */
export type ThisWeekPlan = {
  /** One sentence setting the situation. */
  situation: string;
  steps: readonly string[];
  /** The words to say, shown as a quote. */
  say: string;
};

/**
 * Plans keyed by course, then lesson slug. A lesson with no entry shows nothing.
 * The wording reuses the site's free tantrum guidance ("What's underneath the
 * meltdown"): stay close, name the feeling once, keep the limit, teach later.
 */
const PLANS: Partial<Record<ClassCourseSlug, Record<string, ThisWeekPlan>>> = {
  toddlerhood: {
    "inside-a-tantrum": {
      situation: "If leaving the playground is the hard part this week:",
      steps: [
        "Get close, and keep your voice low.",
        "Acknowledge that they wanted to stay.",
        "Say the plan once, then help them move.",
      ],
      say: "It’s time to go. I’ll help you.",
    },
  },
};

export function thisWeekPlan(courseSlug: ClassCourseSlug, lessonSlug: string): ThisWeekPlan | null {
  return PLANS[courseSlug]?.[lessonSlug] ?? null;
}
