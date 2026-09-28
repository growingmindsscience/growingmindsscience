import type {
  NavigatorTree,
  QuestionNode,
  TreeNode,
} from "@/lib/navigator-types";

/**
 * Navigator tree walker — pure functions, the same discipline as the
 * titration FSM: the UI renders whatever these return, and every transition
 * is deterministic in (tree, node, option, age).
 */

/** Corrected age (months) for prematurity: applied when born more than
 * 3 weeks early and under 24 months chronological, per the standard
 * convention. Weeks convert at ~4.345 weeks/month; floor, never negative. */
export function correctedAgeMonths(
  chronologicalMonths: number,
  weeksEarly: number,
): number {
  if (weeksEarly <= 3 || chronologicalMonths >= 24) return chronologicalMonths;
  return Math.max(0, Math.floor(chronologicalMonths - weeksEarly / 4.345));
}

function resolveRouters(
  tree: NavigatorTree,
  nodeId: string,
  ageMonths: number,
): string {
  let id = nodeId;
  // Router chains are short; the grader bounds total depth.
  for (let hops = 0; hops < 16; hops++) {
    const node = tree.nodes[id];
    if (!node || node.kind !== "router") return id;
    const route =
      node.routes.find((r) => r.age_lt !== undefined && ageMonths < r.age_lt) ??
      node.routes.find((r) => r.age_lt === undefined);
    if (!route) return id; // grader guarantees a catch-all; fail closed
    id = route.next;
  }
  return id;
}

/** First real (non-router) node for this age. */
export function entryNode(tree: NavigatorTree, ageMonths: number): TreeNode {
  const id = resolveRouters(tree, tree.entry, ageMonths);
  return tree.nodes[id];
}

/** Take one answered step; routers between nodes resolve transparently. */
export function stepNode(
  tree: NavigatorTree,
  from: QuestionNode,
  optionIndex: number,
  ageMonths: number,
): TreeNode {
  const option = from.options[optionIndex];
  const id = resolveRouters(tree, option.next, ageMonths);
  return tree.nodes[id];
}

/** A completed walk as the browser reports it for the anonymous log. */
export interface WalkLog {
  domain: string;
  ageMonths: number;
  corrected: boolean;
  path: { node: string; answer: string }[];
  terminalId: string;
  tier: string;
}

/** Longest path the log accepts (the grader caps real trees at 8 questions). */
export const MAX_WALK_STEPS = 16;

/**
 * Check a reported walk against the tree it claims to come from: replay it
 * from the entry for that age, requiring every step to name the node the
 * walk is actually on and one of that node's enumerated answers, and the
 * walk to end on the reported terminal and tier. Anything else (free text,
 * invented nodes, a mismatched tier) is refused, so the log only ever holds
 * enumerated labels from a real walk.
 */
export function validateWalk(
  tree: NavigatorTree,
  input: unknown,
): { ok: true; value: WalkLog } | { ok: false; reason: string } {
  if (!input || typeof input !== "object") return { ok: false, reason: "not an object" };
  const w = input as Partial<WalkLog>;
  if (w.domain !== tree.domain) return { ok: false, reason: "domain" };
  if (typeof w.ageMonths !== "number" || !Number.isInteger(w.ageMonths) || w.ageMonths < 0 || w.ageMonths > 120) {
    return { ok: false, reason: "age" };
  }
  if (typeof w.corrected !== "boolean") return { ok: false, reason: "corrected" };
  if (!Array.isArray(w.path) || w.path.length > MAX_WALK_STEPS) return { ok: false, reason: "path" };

  let node = entryNode(tree, w.ageMonths);
  const path: WalkLog["path"] = [];
  for (const step of w.path) {
    if (!step || typeof step !== "object" || node?.kind !== "question") {
      return { ok: false, reason: "path" };
    }
    const { node: id, answer } = step as { node: unknown; answer: unknown };
    if (id !== node.id) return { ok: false, reason: "path" };
    const optionIndex = node.options.findIndex((o) => o.label === answer);
    if (optionIndex < 0) return { ok: false, reason: "answer" };
    path.push({ node: node.id, answer: node.options[optionIndex].label });
    node = stepNode(tree, node, optionIndex, w.ageMonths);
  }
  if (node?.kind !== "terminal" || node.id !== w.terminalId || node.tier !== w.tier) {
    return { ok: false, reason: "terminal" };
  }
  return {
    ok: true,
    value: {
      domain: tree.domain,
      ageMonths: w.ageMonths,
      corrected: w.corrected,
      path,
      terminalId: node.id,
      tier: node.tier,
    },
  };
}

/** Every node id reachable from the entry, for grader + tests. */
export function reachableIds(tree: NavigatorTree): Set<string> {
  const seen = new Set<string>();
  const stack = [tree.entry];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    const node = tree.nodes[id];
    if (!node) continue;
    seen.add(id);
    if (node.kind === "router") {
      for (const r of node.routes) stack.push(r.next);
    } else if (node.kind === "question") {
      for (const o of node.options) stack.push(o.next);
    }
  }
  return seen;
}

/** Longest question-count from the entry to any terminal (routers free). */
export function maxQuestionDepth(tree: NavigatorTree): number {
  let max = 0;
  const walk = (id: string, depth: number, path: Set<string>) => {
    const node = tree.nodes[id];
    if (!node || path.has(id)) return; // cycles counted as depth violation elsewhere
    if (node.kind === "terminal") {
      if (depth > max) max = depth;
      return;
    }
    const nextPath = new Set(path).add(id);
    if (node.kind === "router") {
      for (const r of node.routes) walk(r.next, depth, nextPath);
    } else {
      for (const o of node.options) walk(o.next, depth + 1, nextPath);
    }
  };
  walk(tree.entry, 0, new Set());
  return max;
}
