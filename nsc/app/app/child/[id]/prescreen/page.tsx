import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { beginAssessment } from "@/app/app/assess/actions";
import { getAssessmentCopy } from "@/lib/content.server";
import { Button, Card } from "@/components/ui";

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
    .select("id, nickname")
    .eq("id", id)
    .single();
  if (!child) notFound();

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
