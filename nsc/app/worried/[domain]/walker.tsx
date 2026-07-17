"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import {
  correctedAgeMonths,
  entryNode,
  stepNode,
} from "@/lib/navigator";
import type {
  NavigatorTree,
  QuestionNode,
  TerminalNode,
  Tier,
} from "@/lib/navigator-types";
import {
  DISCLAIMER,
  EVALUATION_BLOCK,
  PART_B_BLOCK,
  PART_C_BLOCK,
  SEEK_CARE_BLOCK,
  TIER_LABEL,
  scriptFor,
} from "@/lib/navigator-blocks";
import { logNavigatorSession } from "../actions";

export interface PartCRow {
  state: string;
  state_name: string;
  agency_name: string;
  phone: string;
  url: string;
  last_verified: string;
}

interface FreeActivity {
  slug: string;
  title: string;
  intention: string;
}

interface Step {
  node: string;
  question: string;
  answer: string;
}

const TIER_BADGE: Record<Tier, string> = {
  typical_range: "bg-sea-glass/60 text-ink-deep",
  monitor: "bg-sea-glass/60 text-ink-deep",
  discuss: "bg-rung-glow text-ink-deep",
  act_now: "bg-rung-glow text-ink-deep",
};

export function NavigatorWalker({
  tree,
  domainLabel,
  freeActivities,
  partC,
}: {
  tree: NavigatorTree;
  domainLabel: string;
  freeActivities: FreeActivity[];
  partC: PartCRow[];
}) {
  const [phase, setPhase] = useState<"age" | "walk">("age");
  const [years, setYears] = useState(1);
  const [months, setMonths] = useState(6);
  const [early, setEarly] = useState(false);
  const [weeksEarly, setWeeksEarly] = useState(6);
  const [age, setAge] = useState(0);
  const [corrected, setCorrected] = useState(false);
  const [node, setNode] = useState<QuestionNode | TerminalNode | null>(null);
  const [path, setPath] = useState<Step[]>([]);
  const [history, setHistory] = useState<(QuestionNode | TerminalNode)[]>([]);

  function begin() {
    const chrono = years * 12 + months;
    const effective = early
      ? correctedAgeMonths(chrono, weeksEarly)
      : chrono;
    const wasCorrected = effective !== chrono;
    const start = entryNode(tree, effective) as QuestionNode | TerminalNode;
    setAge(effective);
    setCorrected(wasCorrected);
    setNode(start);
    setPath([]);
    setHistory([]);
    setPhase("walk");
    if (start.kind === "terminal") {
      void logNavigatorSession({
        domain: tree.domain,
        ageMonths: effective,
        corrected: wasCorrected,
        path: [],
        terminalId: start.id,
        tier: start.tier,
      });
    }
  }

  function answer(optionIndex: number) {
    if (!node || node.kind !== "question") return;
    const option = node.options[optionIndex];
    const next = stepNode(tree, node, optionIndex, age) as
      | QuestionNode
      | TerminalNode;
    const step = { node: node.id, question: node.text, answer: option.label };
    setHistory((h) => [...h, node]);
    setPath((p) => [...p, step]);
    setNode(next);
    if (next.kind === "terminal") {
      void logNavigatorSession({
        domain: tree.domain,
        ageMonths: age,
        corrected,
        path: [...path, step],
        terminalId: next.id,
        tier: next.tier,
      });
    }
  }

  function back() {
    if (history.length === 0) {
      setPhase("age");
      setNode(null);
      return;
    }
    setNode(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setPath((p) => p.slice(0, -1));
  }

  if (phase === "age") {
    return (
      <Card>
        <h2 className="font-semibold text-ink-deep">How old is your child?</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Years
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="rounded-xl border border-sea-glass bg-surface px-3 py-2"
            >
              {[0, 1, 2, 3].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink">
            Months
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="rounded-xl border border-sea-glass bg-surface px-3 py-2"
            >
              {Array.from({ length: 12 }, (_, m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={early}
            onChange={(e) => setEarly(e.target.checked)}
            className="h-4 w-4 accent-teal"
          />
          Born more than 3 weeks early
        </label>
        {early && (
          <label className="mt-3 flex flex-col gap-1 text-sm text-ink">
            About how many weeks early?
            <select
              value={weeksEarly}
              onChange={(e) => setWeeksEarly(Number(e.target.value))}
              className="w-32 rounded-xl border border-sea-glass bg-surface px-3 py-2"
            >
              {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((w) => (
                <option key={w} value={w}>
                  {w} weeks
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="mt-3 text-xs text-teal-soft">
          For babies born early, we compare against their due-date age until
          age two. The result will say so plainly if that applies.
        </p>
        <Button onClick={begin} className="mt-5">
          Start
        </Button>
      </Card>
    );
  }

  if (!node) return null;

  if (node.kind === "question") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          Question {path.length + 1}
        </p>
        <Card>
          <h2 className="text-xl font-semibold text-ink-deep">{node.text}</h2>
          {node.help && <p className="mt-2 text-sm text-teal-soft">{node.help}</p>}
          <div className="mt-5 flex flex-col gap-2">
            {node.options.map((o, i) => (
              <button
                key={i}
                onClick={() => answer(i)}
                className="rounded-xl border border-sea-glass bg-surface px-4 py-3 text-left text-ink transition-colors hover:border-teal hover:bg-sea-glass/20"
              >
                {o.label}
              </button>
            ))}
          </div>
        </Card>
        <button onClick={back} className="self-start text-sm text-teal-soft underline">
          ← Back
        </button>
      </div>
    );
  }

  // Terminal: the action sheet.
  const t = node;
  const cites = tree.citations.filter((c) =>
    t.citations.includes(c.id),
  );
  const script = scriptFor(t.tier, t.script_addon);
  const underThree = age < 36;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${TIER_BADGE[t.tier]}`}
        >
          {TIER_LABEL[t.tier]}
        </span>
        <h2 className="mt-2 text-2xl font-semibold text-ink-deep">{t.headline}</h2>
        {corrected && (
          <p className="mt-1 text-sm text-teal-soft">
            Because your child was born early, this compares against their
            corrected age of {age} months.
          </p>
        )}
      </div>

      {path.length > 0 && (
        <Card className="bg-sea-glass/20">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-teal">
            What you told us
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink">
            {path.map((s, i) => (
              <li key={i}>
                {s.question} <span className="font-semibold">{s.answer}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-teal">
          What&rsquo;s typical, and what this means
        </h3>
        <div className="mt-2 flex flex-col gap-3 text-ink">
          {t.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {cites.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1 text-xs text-teal-soft">
            {cites.map((c) => (
              <li key={c.id}>
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-teal">
          What to say to your pediatrician
        </h3>
        <p className="mt-1 text-sm text-teal-soft">
          Literal sentences. Bring them written down; visits go fast.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {script.map((line, i) => (
            <li
              key={i}
              className="rounded-xl bg-sea-glass/25 px-4 py-2.5 text-ink"
            >
              &ldquo;{line}&rdquo;
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-teal">
          {underThree ? PART_C_BLOCK.title : PART_B_BLOCK.title}
        </h3>
        <div className="mt-2 flex flex-col gap-3 text-ink">
          {(underThree ? PART_C_BLOCK.body : PART_B_BLOCK.body).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {underThree && (
          <div className="mt-4">
            {partC.length > 0 ? (
              <StatePicker rows={partC} />
            ) : (
              <a
                href={PART_C_BLOCK.fallback.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-teal underline"
              >
                {PART_C_BLOCK.fallback.label} →
              </a>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-teal">
          {EVALUATION_BLOCK.title}
        </h3>
        <div className="mt-2 flex flex-col gap-3 text-ink">
          {EVALUATION_BLOCK.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Card>

      {freeActivities.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-teal">
            While you wait: things that genuinely help
          </h3>
          <ul className="mt-2 flex flex-col gap-2 text-ink">
            {freeActivities.map((a) => (
              <li key={a.slug}>
                <Link href={`/activities/${a.slug}`} className="font-semibold text-teal underline">
                  {a.title}
                </Link>{" "}
                <span className="text-sm text-teal-soft">{a.intention}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="bg-sea-glass/20">
        <h3 className="text-sm font-semibold text-ink-deep">
          {SEEK_CARE_BLOCK.title}
        </h3>
        <p className="mt-1 text-sm text-ink">{SEEK_CARE_BLOCK.body}</p>
      </Card>

      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <PrintButton label="Print / save this plan" />
        <button
          onClick={() => {
            setPhase("age");
            setNode(null);
            setPath([]);
            setHistory([]);
          }}
          className="text-sm text-teal-soft underline"
        >
          Start over
        </button>
        <Link href="/worried" className="text-sm text-teal-soft underline">
          Other guides
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-teal-soft">{DISCLAIMER}</p>
    </div>
  );
}

function StatePicker({ rows }: { rows: PartCRow[] }) {
  const [state, setState] = useState("");
  const row = rows.find((r) => r.state === state);
  const stale =
    row &&
    Date.now() - new Date(row.last_verified).getTime() >
      182 * 24 * 60 * 60 * 1000;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm text-ink">
        Your state&rsquo;s early intervention contact
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-64 rounded-xl border border-sea-glass bg-surface px-3 py-2"
        >
          <option value="">Choose a state</option>
          {rows.map((r) => (
            <option key={r.state} value={r.state}>
              {r.state_name}
            </option>
          ))}
        </select>
      </label>
      {row && (
        <div className="rounded-xl bg-sea-glass/25 px-4 py-3 text-sm text-ink">
          <p className="font-semibold">{row.agency_name}</p>
          {row.phone && <p>{row.phone}</p>}
          {row.url && (
            <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-teal underline">
              {row.url}
            </a>
          )}
          {stale && (
            <p className="mt-1 text-xs text-teal-soft">
              Last checked {row.last_verified} — confirm on the ECTA directory
              if anything looks off.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
