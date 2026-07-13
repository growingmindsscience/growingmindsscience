import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { beginAssessment } from "@/app/app/assess/actions";
import { getAssessmentCopy } from "@/lib/content.server";
import { ageInMonths, MIN_ASSESSMENT_MONTHS } from "@/lib/age";
import { brand } from "@/lib/config/brand";
import { Button, Card, EnrichmentFooter, LinkButton } from "@/components/ui";

interface Q {
  name: string;
  question: string;
  options: { value: string; label: string }[];
}

export default async function PrescreenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("nsc_children")
    .select("id, nickname, birth_month")
    .eq("id", id)
    .single();
  if (!child) notFound();

  // Under ~2 there's no check-in — the best number input at this age is
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
            Before about two, the best number input is simply talk — counting
            stairs out loud, naming &ldquo;two socks,&rdquo; handing over
            crackers &ldquo;one&rdquo; at a time. {child.nickname} is soaking
            it all up.
          </p>
          <p className="mt-3 text-ink">
            The Feed-the-Bear check-in opens at two. We&rsquo;ll be ready when
            {" "}{child.nickname} is — and the counting words you share now are
            exactly what the ladder is built on.
          </p>
        </Card>
        <LinkButton href="/app">Back to your children</LinkButton>
        <EnrichmentFooter text={brand.enrichmentFooter} />
      </main>
    );
  }

  const copy = await getAssessmentCopy();
  const line = (k: string, f: string) =>
    (copy.states[k]?.lines ?? [f])[0].replaceAll("{name}", child.nickname);
  const opts = (k: string, fallback: string[]) =>
    copy.states[k]?.lines ?? fallback;

  const questions: Q[] = [
    {
      name: "count_band",
      question: line("prescreen:q2", "How high can they count without help?"),
      options: opts("prescreen:q2:opts", [
        "Not yet counting",
        "Up to 4",
        "5 to 9",
        "10 to 19",
        "20 or higher",
      ]).map((label, i) => ({
        value: ["none", "lt5", "5-9", "10-19", "20plus"][i] ?? String(i),
        label,
      })),
    },
    {
      name: "gives_one",
      question: line("prescreen:q3", "If you ask for one, do they hand you exactly one?"),
      options: opts("prescreen:q3:opts", ["Yes", "Sometimes", "No", "Never tried"]).map(
        (label, i) => ({ value: ["yes", "sometimes", "no", "untried"][i] ?? String(i), label }),
      ),
    },
    {
      name: "points_counts",
      question: line("prescreen:q4", "Do they count objects by pointing or touching?"),
      options: opts("prescreen:q4:opts", ["Yes", "Sometimes", "No"]).map((label, i) => ({
        value: ["yes", "sometimes", "no"][i] ?? String(i),
        label,
      })),
    },
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
        <h1 className="text-2xl font-semibold text-ink-deep">A few quick taps</h1>
        <p className="mt-2 text-sm text-teal-soft">
          {line("prescreen:intro", "This helps us read today's play. Nothing more.")}
        </p>
      </div>
      <form action={beginAssessment.bind(null, id)} className="flex flex-col gap-5">
        {questions.map((q) => (
          <Card key={q.name}>
            <fieldset>
              <legend className="mb-3 font-medium text-ink">{q.question}</legend>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o, i) => (
                  <label
                    key={o.value}
                    className="cursor-pointer rounded-full border border-sea-glass px-4 py-2 text-sm text-ink has-[:checked]:border-teal has-[:checked]:bg-rung-glow has-[:checked]:font-semibold"
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
        <Button type="submit">Start the game</Button>
      </form>
    </main>
  );
}
