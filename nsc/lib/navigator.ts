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
