import type { ClassCourseSlug } from "@/lib/classes";

/** One answer to a scenario question, with the feedback shown when it is opened. */
export type CompanionChoice = {
  text: string;
  /** Short lead for the feedback, e.g. "Closest to the lesson." */
  verdict: string;
  feedback: string;
};

/** A place in the written lesson, found by real transcript text rather than a position. */
export type JumpAnchor = {
  label: string;
  /** A phrase that appears verbatim (ignoring case, spacing and curly quotes) in the stored transcript. */
  anchor: string;
};

/**
 * A lightweight learning companion for one lesson: a scenario to think through,
 * one if-then to try, and jump points into the written lesson. All of it is
 * static, with no storage and no server round trip.
 */
export type ThisWeekPlan = {
  scenario: { setup: string; question: string; choices: readonly CompanionChoice[] };
  /** Finishes "If ..." (pilot wording kept for the first lesson). */
  when: string;
  /** Finishes "then ...". */
  then: string;
  /** Optional extra steps, shown under the if-then. */
  steps?: readonly string[];
  /** The few words to say, shown as a quote. */
  say: string;
  reflection: string;
  jumps: readonly JumpAnchor[];
};

/**
 * Plans keyed by course, then lesson slug. A lesson with no entry shows nothing.
 * Each is grounded in its own lesson's written text. The first reuses the site's
 * free tantrum guidance ("What's underneath the meltdown"): stay close, name the
 * feeling once, keep the limit, teach later.
 */
const PLANS: Partial<Record<ClassCourseSlug, Record<string, ThisWeekPlan>>> = {
  toddlerhood: {
    "inside-a-tantrum": {
      scenario: {
        setup: "She wants to hold the bananas. Her father says not right now, and within seconds she is on the floor by the cereal, screaming and kicking.",
        question: "What might her father notice as the tantrum eases?",
        choices: [
          {
            text: "She’ll quickly be ready to hear why she can’t hold the bananas.",
            verdict: "The explanation can wait.",
            feedback: "When she is screaming and kicking, a long explanation is hard to take in. Try waiting until she is calmer.",
          },
          {
            text: "She might go from kicking and screaming to crying and reaching for him.",
            verdict: "Closest to the lesson.",
            feedback: "As the anger eases, distress can last longer. Look for signs that she wants comfort, and make yourself available.",
          },
          {
            text: "If she’s still crying after the kicking stops, the tantrum is getting worse.",
            verdict: "Crying can be part of settling.",
            feedback: "Crying may continue after the anger eases. Her father can stay nearby and look for a sign that she wants comfort.",
          },
        ],
      },
      when: "leaving the playground is the hard part this week",
      then: "I get close, keep my voice low, and say the plan once.",
      steps: [
        "Get close, and keep your voice low.",
        "Acknowledge that they wanted to stay.",
        "Say the plan once, then help them move.",
      ],
      say: "It’s time to go. I’ll help you.",
      reflection: "If you want to reflect, what did your child do as they began to settle?",
      jumps: [
        { label: "How long a tantrum really lasts", anchor: "How long is a tantrum?" },
        { label: "The shape: anger first, then sadness", anchor: "Those detailed accounts also revealed a shape" },
        { label: "What usually starts one", anchor: "What starts a tantrum is something parents agree on" },
        { label: "When to talk with your doctor", anchor: "So here is the short list" },
        { label: "The take-away: typical and short", anchor: "Tantrums are typical and short." },
      ],
    },
    "heading-it-off-routines-and-transitions": {
      scenario: {
        setup: "It is five o’clock at the park and time to go home. He was happy a moment ago.",
        question: "Which is closest to what this lesson suggests?",
        choices: [
          {
            text: "Call “five more minutes” from the bench, then pick him up when time is up.",
            verdict: "A good start, and it needs one more piece.",
            feedback: "The lesson says a warning is a beginning rather than a solution. What worked in the studies was the warning plus calm follow-through, saying what is coming and then making it happen without a fuss.",
          },
          {
            text: "Scoop him up quickly, since a fast ending is a kind one.",
            verdict: "Understandable when you are tired too.",
            feedback: "An ending from nowhere is one the child could not prepare for, and leaving means giving up something good. A short preview close to the event softens that.",
          },
          {
            text: "Preview at the gate, one warning in the same words, name the last turn, and give him the last step.",
            verdict: "Closest to the lesson.",
            feedback: "Short, concrete, and close to the event, and the best transitions give the toddler a job, like putting the bucket in the bag and carrying it to the gate.",
          },
        ],
      },
      when: "it is time to leave somewhere fun this week",
      then: "I give one warning a minute or two before, in the same words, name the last turn, and give them a job.",
      say: "Last turn on the slide. Then we go home for dinner.",
      reflection: "Optional: what job could be theirs at the end, and did it change how leaving felt?",
      jumps: [
        { label: "Why stopping is harder than starting", anchor: "Why is stopping so much harder than starting?" },
        { label: "What warnings can and can’t do", anchor: "What worked in those studies was the warning plus calm follow-through" },
        { label: "A short preview, close to the event", anchor: "preview is short, concrete, and close to the event" },
        { label: "Give your toddler a job", anchor: "The best transitions give the toddler a job" },
        { label: "Seeing the pile-up before the storm", anchor: "Parents call this the pile-up" },
      ],
    },
    "in-the-moment-your-calm-is-their-calm": {
      scenario: {
        setup: "She has refused her shoes for the third time and is on the hall floor, red-faced and screaming. You should have left five minutes ago.",
        question: "At the peak, which is closest to what this lesson suggests?",
        choices: [
          {
            text: "Explain once more why shoes matter, and offer two pairs to pick from.",
            verdict: "Kind, and better saved for later.",
            feedback: "Questions, choices, and explanations can wait. At the peak, one short sentence is enough, said once or twice in a low voice.",
          },
          {
            text: "Breathe out slowly, lower your voice, stay close, and say one short sentence.",
            verdict: "Closest to the lesson.",
            feedback: "Steady your own body first. Then keep her safe, stay near and quiet, and wait for the turn, the moment the screaming becomes crying and she looks for you.",
          },
          {
            text: "Turn your back until it stops.",
            verdict: "Common advice, and there is a distinction.",
            feedback: "You can give her space and still stay nearby. That makes it easier for her to reach for you when she wants comfort.",
          },
        ],
      },
      when: "the screaming is at its peak this week",
      then: "I breathe out slowly, stay close, and say one short sentence.",
      say: "I’m here. We’ll go when you’re ready.",
      reflection: "Optional: what did your body do first, and what helped you steady it?",
      jumps: [
        { label: "You are the brakes", anchor: "So in a meltdown, you are the brakes" },
        { label: "Distract on the way up, not at the peak", anchor: "Distraction works on the way up" },
        { label: "Stay near, quiet, and wait for the turn", anchor: "Until the turn, stay near and stay quiet" },
        { label: "One short sentence", anchor: "So at the peak, one short sentence is enough" },
        { label: "Keeping your own calm", anchor: "The practical move is small" },
      ],
    },
    "after-the-storm-repair": {
      scenario: {
        setup: "The screaming has stopped. He sits on the kitchen floor with wet cheeks and hiccups. His father feels relief, and guilt about the shouting in the middle of it.",
        question: "What is closest to what this lesson suggests he do now?",
        choices: [
          {
            text: "Sit him down for a talk about why shouting happened and why he must not do it.",
            verdict: "A caring wish, and too much for this moment.",
            feedback: "Reconnection with a toddler is physical and brief. A long talk now is for the parent rather than for him.",
          },
          {
            text: "Come down to the floor, soften his face, open his arms, say one thing about the feeling, and say he is sorry he shouted.",
            verdict: "Closest to the lesson.",
            feedback: "Repair is short, honest, and in the toddler’s words. The limit stays where it was, and then the day goes on.",
          },
          {
            text: "Say “Sorry I shouted, but you would not put your shoes on.”",
            verdict: "A very human thing to say, and a small change helps.",
            feedback: "An apology can be brief and specific. Own the shouting and give your child a chance to reconnect.",
          },
        ],
      },
      when: "a meltdown has just ended this week",
      then: "I come down to the floor, open my arms, and say one thing about the feeling.",
      steps: [
        "If you shouted: say it was too loud, you are sorry, and you are here now.",
      ],
      say: "That was so hard. I’m here now.",
      reflection: "Optional: how did it feel to come back, and what did your child do when you did?",
      jumps: [
        { label: "Reconnect at the turn, briefly", anchor: "Reconnection with a toddler is physical and brief" },
        { label: "Name the feeling in one word", anchor: "Say one thing about the feeling in his words" },
        { label: "Repair after shouting", anchor: "Repair with a toddler is short, honest, and in his words" },
        { label: "Leave out the but", anchor: "So leave out the but" },
        { label: "Talking about it later", anchor: "Should you talk about a meltdown afterward?" },
      ],
    },
  },
};

export function thisWeekPlan(courseSlug: ClassCourseSlug, lessonSlug: string): ThisWeekPlan | null {
  return PLANS[courseSlug]?.[lessonSlug] ?? null;
}

/** Lowercases, straightens curly quotes and collapses whitespace so an anchor matches however the transcript was typeset. */
function normalizeForMatch(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export type JumpPoint = { label: string; /** Index into the written lesson's paragraphs. */ index: number };

/**
 * Resolves a lesson's anchors against its stored written paragraphs. An anchor
 * that is not found is left out, and two anchors in one paragraph keep only the
 * first, so a link never points at the wrong place. Returned in reading order.
 */
export function resolveJumpPoints(jumps: readonly JumpAnchor[], paragraphs: readonly string[]): JumpPoint[] {
  const haystack = paragraphs.map(normalizeForMatch);
  const seen = new Set<number>();
  const found: JumpPoint[] = [];
  for (const { label, anchor } of jumps) {
    const needle = normalizeForMatch(anchor);
    if (!needle) continue;
    const index = haystack.findIndex((text) => text.includes(needle));
    if (index < 0 || seen.has(index)) continue;
    seen.add(index);
    found.push({ label, index });
  }
  return found.sort((a, b) => a.index - b.index);
}

/** Jump points for one lesson's written text; empty when the lesson has no plan or nothing matches. */
export function lessonJumpPoints(courseSlug: ClassCourseSlug, lessonSlug: string, paragraphs: readonly string[]): JumpPoint[] {
  const plan = thisWeekPlan(courseSlug, lessonSlug);
  return plan ? resolveJumpPoints(plan.jumps, paragraphs) : [];
}

/** The element id of a written paragraph that a jump point targets. */
export const lessonParagraphId = (index: number) => `lesson-text-${index + 1}`;
