/**
 * Navigator tree grader (plan 3.3 build rules). Mechanical, zero tolerance:
 * a tree renders publicly only when status is "published", and this grader
 * refuses to certify a published tree unless every check is green INCLUDING
 * G1-verified citations. Draft trees must pass everything except the
 * verification gate, so Matthew's review is the only step between draft and
 * live (plus the D3 attorney read).
 */
import { lintBanned } from "../nsc-compiler/banned";
import { fleschKincaidGrade } from "../nsc-compiler/readability";
import { maxQuestionDepth, reachableIds } from "../../lib/navigator";
import {
  TIERS,
  type NavigatorTree,
  type QuestionNode,
  type TerminalNode,
} from "../../lib/navigator-types";

export interface NavCheck {
  name: string;
  status: "pass" | "fail" | "skip";
  details: string;
}

export interface NavReport {
  domain: string;
  version: string;
  status: string;
  pass: boolean;
  checks: NavCheck[];
}

const MAX_FK_GRADE = 7; // stricter than activities: worried parents at 2am
const MAX_QUESTIONS = 8;
const NOT_SURE = "I'm not sure";

function check(name: string, ok: boolean, details: string): NavCheck {
  return { name, status: ok ? "pass" : "fail", details };
}

/** Resolve router chains to the first non-router node id, age-agnostic:
 * returns every possible landing id. */
function resolveAll(tree: NavigatorTree, id: string, seen = new Set<string>()): string[] {
  const node = tree.nodes[id];
  if (!node || seen.has(id)) return [id];
  if (node.kind !== "router") return [id];
  seen.add(id);
  return node.routes.flatMap((r) => resolveAll(tree, r.next, seen));
}

function structure(tree: NavigatorTree): NavCheck {
  const problems: string[] = [];
  if (!tree.nodes[tree.entry]) problems.push(`entry ${tree.entry} missing`);
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (node.id !== id) problems.push(`${id}: id mismatch`);
    if (node.kind === "router") {
      if (node.routes.length === 0) problems.push(`${id}: no routes`);
      if (!node.routes.some((r) => r.age_lt === undefined))
        problems.push(`${id}: no catch-all route`);
      for (const r of node.routes)
        if (!tree.nodes[r.next]) problems.push(`${id}: dangling route → ${r.next}`);
    } else if (node.kind === "question") {
      if (node.options.length < 2) problems.push(`${id}: fewer than 2 options`);
      for (const o of node.options)
        if (!tree.nodes[o.next]) problems.push(`${id}: dangling option → ${o.next}`);
    } else if (node.kind === "terminal") {
      if (!TIERS.includes(node.tier)) problems.push(`${id}: bad tier ${node.tier}`);
      if (!node.headline?.trim()) problems.push(`${id}: no headline`);
      if ((node.body ?? []).length < 2) problems.push(`${id}: body under 2 paragraphs`);
    }
  }
  return check("structure", problems.length === 0, problems.slice(0, 8).join("; ") || "sound");
}

function reachability(tree: NavigatorTree): NavCheck {
  const reachable = reachableIds(tree);
  const orphans = Object.keys(tree.nodes).filter((id) => !reachable.has(id));
  return check(
    "reachability",
    orphans.length === 0,
    orphans.length ? `orphan nodes: ${orphans.join(", ")}` : `${reachable.size} nodes, all reachable`,
  );
}

function boundedDepth(tree: NavigatorTree): NavCheck {
  const depth = maxQuestionDepth(tree);
  return check(
    "bounded-depth",
    depth > 0 && depth <= MAX_QUESTIONS,
    `longest path asks ${depth} questions (limit ${MAX_QUESTIONS})`,
  );
}

/** Every path that asks any question must ask a loss-of-skills question
 * first; and every loss question's "Yes" must land on act_now. */
function lossOfSkills(tree: NavigatorTree): NavCheck {
  const problems: string[] = [];
  // First-question rule: every question reachable as a path's FIRST question
  // must be loss-tagged. First questions = resolve(entry) question landings.
  for (const id of resolveAll(tree, tree.entry)) {
    const node = tree.nodes[id];
    if (node?.kind === "question" && node.tag !== "loss_of_skills") {
      problems.push(`first question ${id} is not loss-tagged`);
    }
  }
  for (const node of Object.values(tree.nodes)) {
    if (node.kind !== "question" || node.tag !== "loss_of_skills") continue;
    const yes = node.options.find((o) => o.label === "Yes");
    if (!yes) {
      problems.push(`${node.id}: loss question has no "Yes" option`);
      continue;
    }
    for (const landing of resolveAll(tree, yes.next)) {
      const t = tree.nodes[landing];
      if (!t || t.kind !== "terminal" || t.tier !== "act_now") {
        problems.push(`${node.id}: "Yes" reaches ${landing}, not an act_now terminal`);
      }
    }
  }
  return check("loss-of-skills", problems.length === 0, problems.join("; ") || "short-circuit everywhere");
}

function notSure(tree: NavigatorTree): NavCheck {
  const problems: string[] = [];
  for (const node of Object.values(tree.nodes)) {
    if (node.kind !== "question") continue;
    const ns = node.options.filter((o) => o.label === NOT_SURE);
    if (ns.length !== 1) {
      problems.push(`${node.id}: needs exactly one "${NOT_SURE}" option`);
      continue;
    }
    for (const landing of resolveAll(tree, ns[0].next)) {
      const t = tree.nodes[landing];
      if (t?.kind === "terminal" && t.tier === "typical_range") {
        problems.push(`${node.id}: "${NOT_SURE}" reaches a typical_range terminal`);
      }
    }
  }
  return check(
    "not-sure-conservative",
    problems.length === 0,
    problems.join("; ") || "every question offers not-sure, never resolving to pure reassurance",
  );
}

function lexicon(tree: NavigatorTree): NavCheck {
  const hits = lintBanned(tree.nodes);
  return check(
    "lexicon",
    hits.length === 0,
    hits.length
      ? hits.slice(0, 6).map((h) => `[${h.pattern}] at ${h.path}: "…${h.excerpt}…"`).join("; ")
      : "never-diagnostic lexicon clean",
  );
}

function noNames(tree: NavigatorTree): NavCheck {
  const raw = JSON.stringify(tree.nodes);
  const hasPlaceholder = raw.includes("{name}") || raw.includes("{child}");
  return check(
    "no-identifiers",
    !hasPlaceholder,
    hasPlaceholder ? "found a name placeholder; the Navigator is anonymous by architecture" : "anonymous copy only",
  );
}

function readability(tree: NavigatorTree): NavCheck {
  const texts: string[] = [];
  for (const node of Object.values(tree.nodes)) {
    if (node.kind === "question") {
      texts.push(node.text);
      if (node.help) texts.push(node.help);
    } else if (node.kind === "terminal") {
      texts.push(node.headline, ...node.body);
      if (node.script_addon) texts.push(node.script_addon);
    }
  }
  const r = fleschKincaidGrade(texts);
  return check(
    "readability",
    r.grade <= MAX_FK_GRADE,
    `FK grade ${r.grade} over ${r.pooledStrings} strings (limit ${MAX_FK_GRADE})`,
  );
}

function citations(tree: NavigatorTree): NavCheck {
  const table = new Set(tree.citations.map((c) => c.id));
  const problems: string[] = [];
  for (const node of Object.values(tree.nodes)) {
    if (node.kind === "router") continue;
    const cites = (node as QuestionNode | TerminalNode).citations ?? [];
    if (cites.length === 0) problems.push(`${node.id}: uncited`);
    for (const c of cites) if (!table.has(c)) problems.push(`${node.id}: dangling citation ${c}`);
  }
  return check(
    "citations",
    problems.length === 0,
    problems.slice(0, 8).join("; ") || "every node cited, all ids resolve",
  );
}

function publishGate(tree: NavigatorTree): NavCheck {
  if (tree.status !== "published") {
    return {
      name: "publish-gate",
      status: "skip",
      details: "draft — G1 citation verification enforced at publish",
    };
  }
  const unverified = tree.citations.filter((c) => !c.verified).map((c) => c.id);
  return check(
    "publish-gate",
    unverified.length === 0,
    unverified.length ? `published with unverified citations: ${unverified.join(", ")}` : "all citations G1-verified",
  );
}

export function gradeNavigatorTree(tree: NavigatorTree): NavReport {
  const checks = [
    structure(tree),
    reachability(tree),
    boundedDepth(tree),
    lossOfSkills(tree),
    notSure(tree),
    lexicon(tree),
    noNames(tree),
    readability(tree),
    citations(tree),
    publishGate(tree),
  ];
  return {
    domain: tree.domain,
    version: tree.version,
    status: tree.status,
    pass: checks.every((c) => c.status !== "fail"),
    checks,
  };
}
