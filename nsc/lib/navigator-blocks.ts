import type { Tier } from "@/lib/navigator-types";

/**
 * Shared action-sheet blocks (plan 3.3 terminal spec). Tier-keyed so every
 * terminal gets a complete sheet by construction. Static, reviewed copy:
 * no model calls, no interpolation, no child identifiers.
 */

export const TIER_LABEL: Record<Tier, string> = {
  typical_range: "Inside the typical range",
  monitor: "Worth watching",
  discuss: "Worth discussing now",
  act_now: "Act on this now",
};

/** The pediatrician script: literal sentences to say. */
export function scriptFor(tier: Tier, addon?: string): string[] {
  const lines: string[] = [];
  if (tier === "typical_range" || tier === "monitor") {
    lines.push(
      "I've been keeping notes on how my child communicates, and I'd like to go through them with you.",
      "If anything here would change your read, I'd like to know what to watch for next.",
    );
  } else {
    lines.push(
      "I have specific concerns about how my child communicates, and I've written down what I'm seeing.",
      "I'd like a developmental screening.",
    );
  }
  if (tier === "act_now") {
    lines.push("I want to request an evaluation, not just monitoring.");
  }
  if (addon) lines.push(addon);
  return lines;
}

export const PART_C_BLOCK = {
  title: "Early intervention: what it is and how to reach it",
  body: [
    "Every U.S. state runs a free early intervention program (often called 'Part C') for children from birth to age three. It evaluates development and, where useful, provides support like speech therapy, usually at home.",
    "Three things parents are rarely told: the evaluation is free no matter your income, you can refer your own child, and you do not need a doctor's referral or permission to call.",
    "If an evaluation finds your child eligible, services start from a written plan you help design. If it doesn't, you've traded a phone call for a professional look at your child. That trade is always worth it.",
  ],
  fallback: {
    label: "Find your state's early intervention contact (ECTA Center directory)",
    url: "https://ectacenter.org/contact/ptccoord.asp",
  },
};

export const PART_B_BLOCK = {
  title: "After age three: free evaluation through your school district",
  body: [
    "From the third birthday, free developmental evaluations come from your local school district's preschool special education program instead of early intervention.",
    "You can request one yourself, in writing, addressed to the district's special education office. Keep a copy; the request starts a legal clock for the district to respond.",
    "Your pediatrician can add a referral in parallel, but you do not need one to ask.",
  ],
};

export const EVALUATION_BLOCK = {
  title: "What an evaluation actually looks like",
  body: [
    "It's play, mostly. A specialist (or a small team) sits with your child and structured toys and games, watches how they communicate, and asks you a lot of questions. You stay in the room.",
    "Expect it to take an hour or two, sometimes across two visits. You'll get a written summary of where your child is across several areas, not just the one you asked about.",
    "Timelines vary by state, but from first call to evaluation is typically a few weeks to a couple of months. Asking sooner is how you keep the calendar on your side.",
  ],
};

export const SEEK_CARE_BLOCK = {
  title: "Separate from all of this",
  body: "If your child ever has trouble breathing, becomes unresponsive, or has seizure-like movements, that's emergency care right now, not a developmental conversation.",
};

export const DISCLAIMER =
  "This guide is educational. It describes what's typical and how to reach the right professionals. It is not medical advice, and it never diagnoses. Your pediatrician and your own judgment come first.";
