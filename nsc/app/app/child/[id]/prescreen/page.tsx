import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { beginAssessment } from "@/app/app/assess/actions";
import { ageInMonths, MAX_ASSESSMENT_MONTHS, MIN_ASSESSMENT_MONTHS } from "@/lib/age";
import { CHECKUP_LINKS } from "@/lib/norms";
import { sitePath } from "@/lib/site";
import { brand } from "@/lib/config/brand";
import { Card, EnrichmentFooter, LinkButton } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

interface Q {
  name: string;
  question: string;
  options: { value: string; label: string }[];
}

export default async function PrescreenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  await requireAuth();
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("nsc_children")
    .select("id, nickname, birth_month")
    .eq("id", id)
    .maybeSingle();
  if (!child) notFound();

  // Under ~2 there's no check-in: the best number input at this age is
  // plain talk, and neither instrument reads meaningfully yet.
  const months = ageInMonths(String(child.birth_month).slice(0, 7), new Date());
  if (months < MIN_ASSESSMENT_MONTHS) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink-deep">
            No check-in needed yet
          </h1>
        </div>
        <Card>
          <p className="text-ink">
            Before about two, the best number input is simply talk: counting
            stairs out loud, naming &ldquo;two socks,&rdquo; handing over
            crackers &ldquo;one&rdquo; at a time. {child.nickname} is soaking
            it all up.
          </p>
          <p className="mt-3 text-ink">
            The Feed-the-Bear check-in opens at two. We&rsquo;ll be ready when
            {" "}{child.nickname} is, and the counting words you share now are
            exactly what the ladder is built on.
          </p>
        </Card>
        <LinkButton href="/app">Back to your children</LinkButton>
        <EnrichmentFooter text={brand.enrichmentFooter} />
      </main>
    );
  }

  // From six there's no check-in either: the game, its plans and the
  // published ranges are built for about two to five.
  if (months >= MAX_ASSESSMENT_MONTHS) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink-deep">
            Built for ages two to five
          </h1>
        </div>
        <Card>
          <p className="text-ink">
            {child.nickname} is older than the Feed-the-Bear check-in is built
            for. It reads the counting steps children usually take between
            about two and five, and its games are written for those years.
          </p>
          <p className="mt-3 text-ink">
            If counting out two or three things on request is still hard for{" "}
            {child.nickname}, mention it to {child.nickname}&rsquo;s
            pediatrician or teacher. Asking early is always welcome, and they
            can look at the whole picture.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <a
              href={sitePath(CHECKUP_LINKS.prepPath)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline underline-offset-2"
            >
              Get ready for a checkup conversation
            </a>
            <a
              href={CHECKUP_LINKS.cdcConcerned}
              className="inline-flex min-h-11 items-center text-xs text-research underline underline-offset-2"
              rel="noopener"
            >
              Source: CDC, Learn the Signs. Act Early.
            </a>
          </p>
        </Card>
        <LinkButton href="/app">Back to your children</LinkButton>
        <EnrichmentFooter text={brand.enrichmentFooter} />
      </main>
    );
  }

  // One question, and it is used: the script runs in the child's counting
  // language. Three earlier questions (count range, gives one, points while
  // counting) were stored but never read, so they are gone (audit NSC-10).
  const questions: Q[] = [
    {
      // Children learn each language's small number words separately, so the
      // check-in should run in the child's counting language.
      name: "number_language",
      question: `Which language does ${child.nickname} hear numbers in most?`,
      options: [
        { value: "english", label: "English" },
        { value: "spanish", label: "Spanish" },
        { value: "other", label: "Another language" },
      ],
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-ink-deep">One quick question</h1>
        <p className="mt-2 text-sm text-ink-muted">
          So the game uses the number words {child.nickname} knows best.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-rung-glow px-4 py-3 text-sm text-ink-deep">
          {error}
        </p>
      )}
      <form action={beginAssessment.bind(null, id)} className="flex flex-col gap-5">
        {questions.map((q) => (
          <Card key={q.name}>
            <fieldset>
              <legend className="mb-3 font-medium text-ink">{q.question}</legend>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o, i) => (
                  <label
                    key={o.value}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-control border border-line px-4 py-2 text-sm text-ink has-[:checked]:border-teal has-[:checked]:bg-rung-glow has-[:checked]:font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-ground"
                  >
                    <input
                      type="radio"
                      name={q.name}
                      value={o.value}
                      required
                      className="sr-only"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
        ))}
        <SubmitButton>Start the game</SubmitButton>
      </form>
    </main>
  );
}
