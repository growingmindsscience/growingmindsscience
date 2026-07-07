import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EnrichmentFooter } from "@/components/ui";
import { Ladder } from "@/components/ladder";
import { brand } from "@/lib/config/brand";
import { RUNG_LABEL } from "@/lib/labels";
import type { Placement } from "@/lib/titration";

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("nsc_children")
    .select("nickname")
    .eq("id", id)
    .single();
  if (!child) notFound();

  const { data: history } = await supabase
    .from("nsc_assessments")
    .select("placement, near_cp, confidence, completed_at")
    .eq("child_id", id)
    .eq("status", "complete")
    .order("completed_at", { ascending: true });

  const { count: playsCount } = await supabase
    .from("nsc_game_plays")
    .select("id", { count: "exact", head: true })
    .eq("child_id", id);

  const latest = history?.[history.length - 1];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <header>
        <Link href={`/app/child/${id}/plan`} className="text-sm text-teal-soft underline">
          ← This week
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink-deep">
          {child.nickname}&rsquo;s climb
        </h1>
      </header>

      {latest?.placement && (
        <Ladder
          current={latest.placement as Placement}
          nearCP={latest.near_cp ?? false}
          className="w-full"
        />
      )}

      <section className="grid grid-cols-2 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-teal">{history?.length ?? 0}</p>
          <p className="text-sm text-teal-soft">check-ins</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-teal">{playsCount ?? 0}</p>
          <p className="text-sm text-teal-soft">games played</p>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
          Check-in history
        </h2>
        {(history ?? []).map((h, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">
                {RUNG_LABEL(h.placement as string, h.near_cp ?? false)}
              </span>
              <span className="text-sm text-teal-soft">
                {h.completed_at
                  ? new Date(h.completed_at).toLocaleDateString()
                  : ""}
              </span>
            </div>
          </Card>
        ))}
        {(history?.length ?? 0) === 0 && (
          <p className="text-sm text-teal-soft">No check-ins recorded yet.</p>
        )}
      </section>

      <p className="text-center text-sm text-teal-soft">
        Every child climbs at their own pace. This is {child.nickname} against
        the ladder, never against other children.
      </p>

      <EnrichmentFooter text={brand.enrichmentFooter} />
    </main>
  );
}
