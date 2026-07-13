import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getCitations } from "@/lib/content.server";
import { Card, EnrichmentFooter, LinkButton } from "@/components/ui";
import { Ladder } from "@/components/ladder";
import { brand } from "@/lib/config/brand";

const PRICE = process.env.NEXT_PUBLIC_NSC_PRICE_DISPLAY ?? "$34";

const STEPS = [
  {
    title: "Play the check-in",
    body: "Ten minutes at the kitchen table with a bowl, ten blocks, and any stuffed animal. You read short scripted lines — “Can you feed the bear three?” — and tap what happened. The app adjusts each question to the last answer, so it never drags.",
  },
  {
    title: "See the ladder",
    body: "Your child lands on a rung of the counting ladder — the sequence every child climbs between reciting number words and knowing what they mean. You'll see the rung in plain words, and what usually comes next.",
  },
  {
    title: "Play the week",
    body: "Three household games matched to that exact rung, plus a daily ten-second number-talk prompt. A fresh set arrives every Monday, and every six weeks you re-run the check-in to see where things stand. Rungs take months — a climb and a rung settling in are both the ladder working.",
  },
];

const FAQ = [
  {
    q: "What ages is this for?",
    a: "Roughly 2 to 5 — from first number words to counting any pile. Under about 30 months the check-in automatically switches to Point and Seek, a two-minute watching game with no asking at all.",
  },
  {
    q: "What if the game falls apart halfway?",
    a: "That's toddlers. Pause any time and pick up where you left off within two days. Off days get a gentler read, never a scary one — and a fresh bear usually fixes everything.",
  },
  {
    q: "Do I need to be good at math?",
    a: "No — that's the point. Every line you say is written out for you, word for word. Research on parent-child math suggests structured, low-pressure moments like these are exactly how families who feel shaky about math build a warm number habit anyway.",
  },
  {
    q: "What do I get free?",
    a: `The whole check-in and your child's ladder placement, free. One payment of ${PRICE} unlocks every game, a fresh prompt daily, re-check-ins as they climb, and the printable pack — yours for good, no subscription.`,
  },
];

export default async function Home() {
  const user = await getUser();
  const citations = await getCitations();
  const exclusion = citations.citations.find((c) => c.tag_id === "ev.exclusion.ans");
  const start = user ? "/app" : "/signup";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-20 px-6 py-16">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {brand.parentSite}
        </p>
        <h1 className="text-4xl font-semibold text-ink-deep sm:text-5xl">
          {brand.productName}
        </h1>
        <p className="max-w-md text-lg text-ink">
          {brand.tagline} A ten-minute check-in places your child on the
          counting ladder, then hands you a week of playful, evidence-backed
          games.
        </p>
        <p className="text-sm text-teal-soft">Ten minutes. A bowl. A bear.</p>
        <LinkButton href={start}>Start the game</LinkButton>
        <p className="text-sm text-teal-soft">
          The check-in is free.{" "}
          {!user && (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-teal underline">
                Sign in
              </Link>
            </>
          )}
        </p>
        <Ladder className="mt-4 w-full" />
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-4">
        <h2 className="text-center text-2xl font-semibold text-ink-deep">
          How it works
        </h2>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card key={s.title}>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-teal">
                {i + 1} · {s.title}
              </p>
              <p className="text-sm leading-relaxed text-ink">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* The ladder, explained */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-ink-deep">
          What the counting ladder is
        </h2>
        <p className="text-ink">
          Somewhere between two and five, every child makes the same climb.
          First the number words are a song. Then &ldquo;one&rdquo; snaps onto
          meaning — hand a one-knower one block and they&rsquo;re right every
          time, ask for three and you get a fistful. Then &ldquo;two&rdquo;
          clicks. Then &ldquo;three,&rdquo; then &ldquo;four&rdquo; — and then
          the big discovery: counting itself tells you how many, for any
          number. Developmental scientists have mapped this staircase for over
          thirty years using a deceptively simple game called Give-N —
          &ldquo;can you give me three?&rdquo;
        </p>
        <p className="text-ink">
          The Feed-the-Bear check-in is that same game, scripted for your
          kitchen. The question engine behind it adjusts to each answer and was
          tested against tens of thousands of simulated children before it was
          allowed near a real one — tuned so that on a noisy day, its rare
          misses land a rung <em>low</em>, never high. A rung too low means a
          bored week. A rung too high means a frustrated two-year-old. We chose
          bored.
        </p>
      </section>

      {/* Why the rung matters */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-ink-deep">
          Why the rung changes everything
        </h2>
        <p className="text-ink">
          A child who&rsquo;s just cracked &ldquo;two&rdquo; needs completely
          different number talk than one who counts every stuffed animal in the
          house. In a randomized trial of parent number talk, which numbers
          helped depended on where the child stood — small numbers for most,
          bigger ones once a child was further along the climb. Generic
          counting apps send every family the same drills. Number Path
          routes every game and every prompt to the rung your child is actually
          on, and re-routes as they climb.
        </p>
        <Card className="bg-sea-glass/30">
          <p className="text-sm text-ink">
            <span className="font-semibold text-ink-deep">
              Nervous about math yourself?
            </span>{" "}
            You&rsquo;re the parent we wrote every script for. Each game is
            spelled out word for word — what to grab, what to say, when to
            stop. Structured moments like that are how research suggests
            math-anxious parents share numbers warmly, without passing the
            nerves along.
          </p>
        </Card>
      </section>

      {/* Honesty */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-ink-deep">
          Honest by construction
        </h2>
        <Card className="bg-sea-glass/30">
          <h3 className="mb-2 text-lg font-semibold text-ink-deep">
            What we deliberately left out
          </h3>
          <p className="text-ink">
            We don&rsquo;t sell brain-training or flash-card drills, and we
            don&rsquo;t train the &ldquo;number sense&rdquo; some apps promise.{" "}
            {exclusion
              ? "The evidence that it transfers to real math is genuinely contested, so we won't charge you for it."
              : ""}{" "}
            Number Path only does what the research actually supports: everyday
            counting, together.
          </p>
        </Card>
        <Card>
          <h3 className="mb-2 text-lg font-semibold text-ink-deep">
            No red flags, ever
          </h3>
          <p className="text-ink">
            Number Path never compares your child to other children, and the
            words it will never use are enforced by a mechanical check on every
            line of content — not an editor&rsquo;s good intentions. Every rung
            is a real stage of a climb every child makes; the readout tells you
            where the climb is, and what makes a good next week.
          </p>
        </Card>
        <p className="text-sm text-teal-soft">
          Every claim above has a citation behind it.{" "}
          <Link href="/evidence" className="font-semibold text-teal underline">
            Read the evidence table →
          </Link>
        </p>
      </section>

      {/* Price */}
      <section className="flex flex-col gap-4">
        <h2 className="text-center text-2xl font-semibold text-ink-deep">
          One price, no subscription
        </h2>
        <Card className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal">
            Free
          </p>
          <p className="mt-1 text-ink">
            The full Feed-the-Bear check-in, your child&rsquo;s place on the
            ladder, one matched game, and a number-talk prompt.
          </p>
          <div className="mx-auto my-5 h-px w-24 bg-sea-glass" />
          <p className="text-sm font-semibold uppercase tracking-wide text-teal">
            The whole thing · {PRICE} once
          </p>
          <p className="mt-1 text-ink">
            Every game matched to the exact rung, a fresh prompt every day,
            re-check-ins as they climb, and the printable pack. Yours for good.
          </p>
          <LinkButton href={start} className="mt-6">
            Start the free check-in
          </LinkButton>
        </Card>
      </section>

      {/* FAQ */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-ink-deep">
          Questions parents ask
        </h2>
        <div className="flex flex-col gap-3">
          {FAQ.map((f) => (
            <Card key={f.q}>
              <h3 className="font-semibold text-ink-deep">{f.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink">{f.a}</p>
            </Card>
          ))}
        </div>
      </section>

      <EnrichmentFooter text={brand.enrichmentFooter} />
    </main>
  );
}
