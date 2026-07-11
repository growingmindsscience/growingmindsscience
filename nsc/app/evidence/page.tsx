import Link from "next/link";
import { getCitations } from "@/lib/content.server";
import { Card, EnrichmentFooter } from "@/components/ui";
import { brand } from "@/lib/config/brand";
import type { Citation } from "@/lib/content-types";

export const metadata = {
  title: "The evidence — Number Path",
  description:
    "Every study behind Number Path: the counting-ladder research, the trials behind each game, and what we deliberately left out.",
};

/** Display order + headings for citation groups, keyed by tag_id prefix. */
const GROUPS: { prefix: string[]; title: string; blurb: string }[] = [
  {
    prefix: ["ev.given.", "ev.knower."],
    title: "The ladder and the check-in",
    blurb:
      "The counting ladder is the knower-level framework, and Feed-the-Bear is a home adaptation of the titrated Give-N task these labs built and refined.",
  },
  {
    prefix: ["ev.numbertalk."],
    title: "Number talk",
    blurb:
      "Why a daily ten-second prompt is on the plan: how much parents talk about number — and which numbers — tracks and causally shifts what children learn.",
  },
  {
    prefix: ["ev.boardgame.", "ev.spatial."],
    title: "The games",
    blurb:
      "The linear board game in your printable pack is the single most-replicated activity in this literature; spatial-language play earns its slot too.",
  },
  {
    prefix: ["ev.protocol."],
    title: "Running it at home",
    blurb:
      "Evidence that parent-run and remote assessment holds up, and the protocol adaptations for the youngest children.",
  },
  {
    prefix: ["ev.mathanx."],
    title: "For math-anxious parents",
    blurb:
      "Why every line is scripted: unstructured help from a math-anxious parent can pass the anxiety on, while structured, low-pressure formats buffer it.",
  },
  {
    prefix: ["ev.exclusion."],
    title: "What we deliberately left out",
    blurb:
      "The claims we examined and chose not to build on — listed with the same care as the ones we did.",
  },
];

function groupOf(c: Citation): number {
  return GROUPS.findIndex((g) => g.prefix.some((p) => c.tag_id.startsWith(p)));
}

export default async function EvidencePage() {
  const { citations } = await getCitations();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-14 px-6 py-16">
      <header className="flex flex-col gap-4">
        <Link href="/" className="text-sm text-teal-soft underline">
          ← {brand.productName}
        </Link>
        <h1 className="text-3xl font-semibold text-ink-deep sm:text-4xl">
          The evidence
        </h1>
        <p className="max-w-xl text-lg text-ink">
          Number Path makes narrow claims on purpose. This page is the full
          receipt: every study the product leans on, what each one actually
          shows, and the one popular idea we examined and left out. Every entry
          below was verified by a human against the published record before it
          shipped.
        </p>
      </header>

      {/* How to read the chips */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-ink-deep">
          How we label evidence in the app
        </h2>
        <p className="text-ink">
          Each game card carries two labels: how strong the evidence is —{" "}
          <em>randomized trial</em>, <em>replicated trial</em>,{" "}
          <em>strong correlation</em>, or <em>theory-based</em> — and how much
          the field agrees: <em>high consensus</em>, <em>moderate consensus</em>,
          or <em>emerging</em>. Most early-math products stop at
          &ldquo;research-based.&rdquo; We&rsquo;d rather you see which kind of
          research, per game.
        </p>
      </section>

      {/* The engine */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-ink-deep">
          The question engine, certified
        </h2>
        <Card>
          <p className="text-ink">
            The check-in&rsquo;s question engine is a deterministic state
            machine, and every release must pass an automated certification
            suite before the app will even load its content. In the certified
            acceptance tiers it runs against 31,500 simulated children across
            every rung and three levels of toddler-style noise — and thousands
            more sessions of stress tests on top. It must finish within 18
            questions (typically about a dozen), and when noise does push it
            off the true rung, its errors are required to land <em>low</em>{" "}
            more often than high. An over-placed toddler gets frustrating games
            for a week; an under-placed one gets slightly easy ones. We tuned
            for the second, and the test suite enforces it.
          </p>
        </Card>
      </section>

      {/* Citation groups */}
      {GROUPS.map((g, gi) => {
        const rows = citations
          .filter((c) => groupOf(c) === gi)
          .sort((a, b) => a.anchor.localeCompare(b.anchor));
        if (rows.length === 0) return null;
        return (
          <section key={g.title} className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-ink-deep">{g.title}</h2>
            <p className="text-sm text-teal-soft">{g.blurb}</p>
            <div className="flex flex-col gap-3">
              {rows.map((c) => (
                <Card key={c.tag_id}>
                  <p className="font-semibold text-ink-deep">{c.anchor}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink">
                    {c.claim_scope}
                  </p>
                  {c.full_cite && (
                    <p className="mt-2 text-xs leading-relaxed text-teal-soft">
                      {c.full_cite}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-ink-deep">
          What the effects look like
        </h2>
        <p className="text-ink">
          Honest answer: real and modest. Nothing here turns a two-year-old
          into a prodigy, and anyone promising that is selling something else.
          What the research supports is steady, level-matched number talk and
          play compounding over months — which is exactly the shape of the
          product: a few relaxed minutes a day, a ladder that moves every
          couple of months.
        </p>
      </section>

      <EnrichmentFooter text={brand.enrichmentFooter} />
    </main>
  );
}
