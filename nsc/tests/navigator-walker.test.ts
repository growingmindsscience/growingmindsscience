import { describe, expect, it } from "vitest";
import {
  correctedAgeMonths,
  entryNode,
  stepNode,
  validateWalk,
} from "../lib/navigator";
import type {
  NavigatorTree,
  QuestionNode,
  TerminalNode,
} from "../lib/navigator-types";
import talkingRaw from "../content/navigator/talking.v1.json";

const talking = talkingRaw as unknown as NavigatorTree;

describe("corrected age", () => {
  it("applies only when born more than 3 weeks early and under 24 months", () => {
    expect(correctedAgeMonths(18, 0)).toBe(18);
    expect(correctedAgeMonths(18, 3)).toBe(18);
    expect(correctedAgeMonths(18, 8)).toBe(16); // 8 weeks ≈ 1.84 months
    expect(correctedAgeMonths(30, 8)).toBe(30); // 24m+ uses chronological
    expect(correctedAgeMonths(1, 12)).toBe(0); // floors at zero
  });
});

describe("Talking tree walk", () => {
  it("routes each age to a loss-of-skills question first (or the over-range terminal)", () => {
    for (const age of [8, 13, 16, 20, 26, 29, 33]) {
      const node = entryNode(talking, age);
      expect(node.kind, `age ${age}`).toBe("question");
      expect((node as QuestionNode).tag, `age ${age}`).toBe("loss_of_skills");
    }
    const over = entryNode(talking, 40);
    expect(over.kind).toBe("terminal");
    expect((over as TerminalNode).tier).toBe("discuss");
  });

  it("answering Yes to loss reaches the strongest routing at every age", () => {
    for (const age of [8, 13, 20, 26, 33]) {
      const entry = entryNode(talking, age) as QuestionNode;
      const yes = entry.options.findIndex((o) => o.label === "Yes");
      const next = stepNode(talking, entry, yes, age);
      expect(next.kind, `age ${age}`).toBe("terminal");
      expect((next as TerminalNode).tier, `age ${age}`).toBe("act_now");
    }
  });

  it("every full walk terminates in a complete terminal (exhaustive over ages and answers)", () => {
    let walks = 0;
    for (const age of [8, 12, 13, 15, 16, 17, 18, 20, 23, 24, 26, 27, 30, 31, 33, 36, 40]) {
      // Breadth-first over every option sequence from the entry.
      const frontier: { node: ReturnType<typeof entryNode>; depth: number }[] = [
        { node: entryNode(talking, age), depth: 0 },
      ];
      while (frontier.length) {
        const { node, depth } = frontier.pop()!;
        expect(depth, `age ${age}: runaway depth`).toBeLessThanOrEqual(8);
        if (node.kind === "terminal") {
          walks++;
          const t = node as TerminalNode;
          expect(t.headline.length).toBeGreaterThan(0);
          expect(t.body.length).toBeGreaterThanOrEqual(2);
          expect(t.citations.length).toBeGreaterThan(0);
          continue;
        }
        expect(node.kind, `age ${age}`).toBe("question");
        const q = node as QuestionNode;
        for (let i = 0; i < q.options.length; i++) {
          frontier.push({ node: stepNode(talking, q, i, age), depth: depth + 1 });
        }
      }
    }
    expect(walks).toBeGreaterThan(100); // exhaustive coverage really ran
  });

  it("age changes the destination of the same answers (routers work mid-tree)", () => {
    // "No words yet" with strong gestures: monitor before 16 months, discuss after.
    const walk = (age: number) => {
      const loss = entryNode(talking, age) as QuestionNode;
      const g = stepNode(talking, loss, 0, age) as QuestionNode; // No
      const words = stepNode(talking, g, 0, age) as QuestionNode; // points and waves
      const none = words.options.findIndex((o) => o.label === "No words yet");
      return stepNode(talking, words, none, age) as TerminalNode;
    };
    expect(walk(13).tier).toBe("monitor");
    expect(walk(17).tier).toBe("discuss");
  });
});

describe("walk log validation (N16: only enumerated answers from a real walk)", () => {
  // Walk the tree by always taking the first answer.
  function firstAnswerWalk(age: number) {
    let node = entryNode(talking, age);
    const path: { node: string; answer: string }[] = [];
    while (node.kind === "question") {
      const q = node as QuestionNode;
      path.push({ node: q.id, answer: q.options[0].label });
      node = stepNode(talking, q, 0, age);
    }
    const t = node as TerminalNode;
    return { domain: "talking", ageMonths: age, corrected: false, path, terminalId: t.id, tier: t.tier };
  }

  it("accepts a genuine walk and returns it normalized", () => {
    for (const age of [8, 13, 20, 26, 33, 40]) {
      const walk = firstAnswerWalk(age);
      const r = validateWalk(talking, walk);
      expect(r.ok, `age ${age}`).toBe(true);
      if (r.ok) expect(r.value).toEqual(walk);
    }
  });

  it("refuses free text, invented nodes, and mismatched endings", () => {
    const walk = firstAnswerWalk(20);
    const bad = [
      { ...walk, domain: "hearing" },
      { ...walk, ageMonths: 20.5 },
      { ...walk, ageMonths: 999 },
      { ...walk, corrected: "no" },
      { ...walk, path: [{ node: walk.path[0].node, answer: "my child's name is Sam" }, ...walk.path.slice(1)] },
      { ...walk, path: [{ node: "q.invented", answer: "Yes" }, ...walk.path.slice(1)] },
      { ...walk, tier: "typical_range", terminalId: walk.terminalId },
      { ...walk, terminalId: "t.somewhere.else" },
      { ...walk, path: Array.from({ length: 40 }, () => walk.path[0]) },
      null,
      "walk",
    ].filter((w) => JSON.stringify(w) !== JSON.stringify(walk));
    for (const w of bad) {
      expect(validateWalk(talking, w).ok, JSON.stringify(w).slice(0, 80)).toBe(false);
    }
  });
});
