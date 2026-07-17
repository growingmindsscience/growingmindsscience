/**
 * "Should I Be Worried?" Navigator — frozen decision-tree types (plan 3.3).
 *
 * Design rules baked into the shape:
 * - Enumerated options only. There is no free-text input anywhere in a tree.
 * - No child names or identifiers. Copy says "your child", never {name}.
 * - Terminals never diagnose. They describe observations and route to
 *   professionals, with a tier that only ever errs toward "worth discussing".
 * - Trees ship as draft and are invisible in production until flipped to
 *   published — which the grader only certifies with G1-verified citations
 *   (Matthew's review + the D3 attorney read stand between draft and live).
 */

export const NAVIGATOR_DOMAINS = [
  { slug: "talking", label: "Talking" },
  { slug: "understanding", label: "Understanding" },
  { slug: "movement", label: "Walking & Movement" },
  { slug: "hands", label: "Hands & Fine Motor" },
  { slug: "play", label: "Play" },
  { slug: "social", label: "Social & Eye Contact" },
  { slug: "hearing", label: "Hearing & Responding" },
  { slug: "regulation", label: "Behavior & Regulation" },
] as const;
export type NavigatorDomain = (typeof NAVIGATOR_DOMAINS)[number]["slug"];

/** Concern tiers, weakest to strongest. The failure mode must always be
 * over-referral to a conversation, never false reassurance. */
export const TIERS = ["typical_range", "monitor", "discuss", "act_now"] as const;
export type Tier = (typeof TIERS)[number];

export interface TreeCitation {
  id: string;
  label: string; // e.g. "CDC milestone checklist, 18 months"
  url: string;
  source: "CDC" | "AAP" | "peer_reviewed" | "gov";
  /** G1 human verification — publishing requires every citation verified. */
  verified: boolean;
}

export interface RouterNode {
  kind: "router";
  id: string;
  /** First matching age_lt wins; the final route omits age_lt as catch-all. */
  routes: { age_lt?: number; next: string }[];
}

export interface QuestionOption {
  label: string;
  next: string;
}

export interface QuestionNode {
  kind: "question";
  id: string;
  text: string; // concrete and observable, second person
  help?: string;
  options: QuestionOption[]; // must include an "I'm not sure" option
  citations: string[]; // citation ids
  /** Loss-of-skills questions short-circuit to the strongest routing. */
  tag?: "loss_of_skills";
}

export interface TerminalNode {
  kind: "terminal";
  id: string;
  tier: Tier;
  headline: string;
  /** 2-4 short paragraphs: what's typical at this age, what you saw. */
  body: string[];
  citations: string[];
  /** Extra note rendered with the pediatrician script (e.g. hearing check). */
  script_addon?: string;
}

export type TreeNode = RouterNode | QuestionNode | TerminalNode;

export interface NavigatorTree {
  artifact: "navigator.tree";
  domain: NavigatorDomain;
  version: string;
  status: "draft" | "published";
  /** Ages (in months) this tree covers; the entry router handles the edges. */
  age_min: number;
  age_max: number;
  entry: string; // node id, usually a router
  nodes: Record<string, TreeNode>;
  citations: TreeCitation[];
}

/** One answered step, for the "what you told us" restatement. */
export interface WalkStep {
  nodeId: string;
  question: string;
  answer: string;
}
