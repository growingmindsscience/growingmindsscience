import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActivity } from "@/lib/activities.server";
import { hasMembership } from "@/lib/entitlements.server";
import type { ActivityMaterial } from "@/lib/activity-types";
import { Card, LinkButton } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await getActivity(slug);
  if (!a) return { title: "Activity — Growing Minds Science" };
  return {
    title: `${a.title} (${a.months_min}–${a.months_max} months) — Growing Minds Science`,
    description: a.intention,
  };
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await getActivity(slug);
  if (!a) notFound();

  const unlocked = a.is_free || (await hasMembership());
  const materials = a.materials as unknown as ActivityMaterial[];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="print:hidden">
        <Link href="/activities" className="text-sm text-teal-soft underline">
          ← All activities
        </Link>
      </header>

      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {a.months_min}–{a.months_max} months · {a.duration_min} min · mess{" "}
          {a.mess_level}/3
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">{a.title}</h1>
        <p className="mt-3 text-lg text-ink">{a.intention}</p>
      </header>

      {unlocked ? (
        <>
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
              You need
            </h2>
            <ul className="mt-2 flex flex-col gap-1 text-ink">
              {materials.map((m) => (
                <li key={m.item} className="flex gap-2">
                  <span aria-hidden className="text-teal">
                    •
                  </span>
                  <span>
                    {m.item}
                    {m.note ? (
                      <span className="text-teal-soft"> — {m.note}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
              How it goes
            </h2>
            <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-ink">
              {(a.steps as unknown as string[]).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="bg-sea-glass/30">
              <h2 className="font-semibold text-ink-deep">Make it easier</h2>
              <p className="mt-1 text-sm text-ink">{a.adapt_down}</p>
            </Card>
            <Card className="bg-sea-glass/30">
              <h2 className="font-semibold text-ink-deep">Make it harder</h2>
              <p className="mt-1 text-sm text-ink">{a.adapt_up}</p>
            </Card>
          </div>

          {a.safety_notes && (
            <p className="rounded-xl bg-rung-glow/60 px-4 py-3 text-sm text-ink-deep">
              <span className="font-semibold">Keep it safe:</span>{" "}
              {a.safety_notes}
            </p>
          )}

          <p className="text-sm text-teal-soft">{a.evidence_note}</p>

          <div className="print:hidden">
            <PrintButton />
          </div>
        </>
      ) : (
        <Card className="bg-sea-glass/30 print:hidden">
          <h2 className="font-semibold text-ink-deep">
            The full steps are part of membership
          </h2>
          <p className="mt-2 text-sm text-ink">
            Every activity comes with step-by-step wording, easier and harder
            versions, and the science behind it in one plain sentence. Twenty
            activities are free — this one is in the full library.
          </p>
          <LinkButton href="/activities?band=&domain=" className="mt-4">
            See the free activities
          </LinkButton>
        </Card>
      )}
    </main>
  );
}
