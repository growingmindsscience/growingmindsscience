import { describe, expect, it } from "vitest";
import { gradeNavigatorTree } from "../tools/navigator/grader";
import type { NavigatorTree, TreeNode } from "../lib/navigator-types";
import talking from "../content/navigator/talking.v1.json";

/** Minimal valid tree; each planted violation mutates one thing. */
function validTree(): NavigatorTree {
  const nodes: Record<string, TreeNode> = {
    "r.age": {
      kind: "router",
      id: "r.age",
      routes: [{ age_lt: 99, next: "q.loss" }, { next: "t.over" }],
    },
    "q.loss": {
      kind: "question",
      id: "q.loss",
      tag: "loss_of_skills",
      text: "Has your child lost skills they used to have?",
      options: [
        { label: "No", next: "q.main" },
        { label: "Yes", next: "t.act" },
        { label: "I'm not sure", next: "q.main" },
      ],
      citations: ["c1"],
    },
    "q.main": {
      kind: "question",
      id: "q.main",
      text: "Does your child wave to say hello and goodbye?",
      options: [
        { label: "Often", next: "t.typical" },
        { label: "Rarely", next: "t.discuss" },
        { label: "I'm not sure", next: "t.monitor" },
      ],
      citations: ["c1"],
    },
    "t.typical": {
      kind: "terminal",
      id: "t.typical",
      tier: "typical_range",
      headline: "Right in the typical range",
      body: ["That waving is a lovely sign.", "Keep answering every wave with one back."],
      citations: ["c1"],
    },
    "t.monitor": {
      kind: "terminal",
      id: "t.monitor",
      tier: "monitor",
      headline: "Worth watching",
      body: ["Waves come and go at this age.", "Watch for a month and mention it at your next visit."],
      citations: ["c1"],
    },
    "t.discuss": {
      kind: "terminal",
      id: "t.discuss",
      tier: "discuss",
      headline: "Worth a conversation",
      body: ["Few gestures are worth a real look.", "Ask your pediatrician for a screening."],
      citations: ["c1"],
    },
    "t.act": {
      kind: "terminal",
      id: "t.act",
      tier: "act_now",
      headline: "Act on this today",
      body: ["Lost skills mean call today.", "Ask for a full evaluation, not monitoring."],
      citations: ["c1"],
    },
    "t.over": {
      kind: "terminal",
      id: "t.over",
      tier: "discuss",
      headline: "Past this guide's range",
      body: ["This guide covers younger ages.", "Your pediatrician is still the right first call."],
      citations: ["c1"],
    },
  };
  return {
    artifact: "navigator.tree",
    domain: "talking",
    version: "v-test",
    status: "draft",
    age_min: 6,
    age_max: 42,
    entry: "r.age",
    nodes,
    citations: [
      { id: "c1", label: "CDC checklist", url: "https://example.gov", source: "CDC", verified: false },
    ],
  };
}

function failNames(tree: NavigatorTree): string[] {
  return gradeNavigatorTree(tree)
    .checks.filter((c) => c.status === "fail")
    .map((c) => c.name);
}

describe("navigator grader planted violations (each rejected on the intended check)", () => {
  it("valid base tree passes", () => {
    expect(failNames(validTree())).toEqual([]);
  });

  const cases: [string, (t: NavigatorTree) => void, string][] = [
    [
      "dangling option target",
      (t) => {
        (t.nodes["q.main"] as { options: { next: string }[] }).options[0].next = "t.ghost";
      },
      "structure",
    ],
    [
      "router without catch-all",
      (t) => {
        (t.nodes["r.age"] as { routes: unknown[] }).routes = [
          { age_lt: 99, next: "q.loss" },
        ];
      },
      "structure",
    ],
    [
      "terminal with a one-paragraph body",
      (t) => {
        (t.nodes["t.typical"] as { body: string[] }).body = ["Too thin."];
      },
      "structure",
    ],
    [
      "orphan node",
      (t) => {
        t.nodes["t.island"] = {
          kind: "terminal",
          id: "t.island",
          tier: "monitor",
          headline: "Unreachable",
          body: ["Nobody can get here.", "Which is the problem."],
          citations: ["c1"],
        };
      },
      "reachability",
    ],
    [
      "first question not loss-tagged",
      (t) => {
        delete (t.nodes["q.loss"] as { tag?: string }).tag;
      },
      "loss-of-skills",
    ],
    [
      "loss 'Yes' routes somewhere weaker than act_now",
      (t) => {
        (t.nodes["q.loss"] as { options: { label: string; next: string }[] }).options[1].next =
          "t.monitor";
      },
      "loss-of-skills",
    ],
    [
      "question missing the not-sure option",
      (t) => {
        (t.nodes["q.main"] as { options: unknown[] }).options = (
          t.nodes["q.main"] as { options: { label: string }[] }
        ).options.filter((o) => o.label !== "I'm not sure");
      },
      "not-sure-conservative",
    ],
    [
      "not-sure resolving to pure reassurance",
      (t) => {
        (t.nodes["q.main"] as { options: { label: string; next: string }[] }).options[2].next =
          "t.typical";
      },
      "not-sure-conservative",
    ],
    [
      "banned deficit language",
      (t) => {
        (t.nodes["t.monitor"] as { body: string[] }).body[0] =
          "Your child seems delayed in waving.";
      },
      "lexicon",
    ],
    [
      "name placeholder in anonymous copy",
      (t) => {
        (t.nodes["t.monitor"] as { body: string[] }).body[0] = "Watch {name} wave this month.";
      },
      "no-identifiers",
    ],
    [
      "uncited terminal",
      (t) => {
        (t.nodes["t.discuss"] as { citations: string[] }).citations = [];
      },
      "citations",
    ],
    [
      "published with unverified citations",
      (t) => {
        t.status = "published";
      },
      "publish-gate",
    ],
  ];

  it("rejects all 12 planted violations", () => {
    let rejected = 0;
    for (const [name, mutate, expectCheck] of cases) {
      const tree = validTree();
      mutate(tree);
      const failed = failNames(tree);
      expect(failed, `"${name}" should fail ${expectCheck}`).toContain(expectCheck);
      rejected++;
    }
    expect(rejected).toBe(12);
  });
});

describe("the real Talking tree certifies", () => {
  it("passes every grader check as a draft", () => {
    const report = gradeNavigatorTree(talking as unknown as NavigatorTree);
    expect(report.checks.filter((c) => c.status === "fail")).toEqual([]);
    expect(report.pass).toBe(true);
  });

  it("would NOT certify as published until citations are G1-verified", () => {
    const tree = JSON.parse(JSON.stringify(talking)) as NavigatorTree;
    tree.status = "published";
    const report = gradeNavigatorTree(tree);
    expect(report.pass).toBe(false);
    expect(
      report.checks.find((c) => c.name === "publish-gate")?.status,
    ).toBe("fail");
  });
});
