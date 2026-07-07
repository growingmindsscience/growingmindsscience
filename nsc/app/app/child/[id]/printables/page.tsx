import Link from "next/link";
import { requirePaid } from "@/lib/entitlements.server";
import { Card } from "@/components/ui";

const SHEETS = [
  { slug: "board", title: "Number Path board game", blurb: "The linear 1–20 board. The one game with a replicated trial behind it." },
  { slug: "dot-cards", title: "Dot cards 1–6", blurb: "Peek-and-count cards for quick subitizing play." },
  { slug: "ladder", title: "The counting ladder poster", blurb: "Every rung, for the fridge. A map of where the counting is headed." },
  { slug: "prompts", title: "Number-talk cards", blurb: "This month's prompts, cut into pocket-sized cards." },
];

export default async function PrintablesIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePaid();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
      <header>
        <Link href={`/app/child/${id}/plan`} className="text-sm text-teal-soft underline">
          ← This week
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink-deep">Printable pack</h1>
        <p className="text-sm text-teal-soft">
          Open a sheet, then use Print / Save as PDF.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {SHEETS.map((s) => (
          <Link key={s.slug} href={`/app/child/${id}/printables/${s.slug}`}>
            <Card className="transition-colors hover:bg-sea-glass/30">
              <h2 className="text-lg font-semibold text-ink-deep">{s.title}</h2>
              <p className="mt-1 text-sm text-ink">{s.blurb}</p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
