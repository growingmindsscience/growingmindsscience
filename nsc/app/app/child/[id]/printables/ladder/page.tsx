import { notFound } from "next/navigation";
import { requirePaid } from "@/lib/entitlements.server";
import { createClient } from "@/lib/supabase/server";
import { Ladder } from "@/components/ladder";
import { PrintButton } from "@/components/print-button";
import type { Placement } from "@/lib/titration";

/** The counting-ladder poster, with the child's current rung marked if known. */
export default async function LadderSheet({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePaid();
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("nsc_children")
    .select("nickname")
    .eq("id", id)
    .single();
  if (!child) notFound();

  const { data: latest } = await supabase
    .from("nsc_assessments")
    .select("placement, near_cp")
    .eq("child_id", id)
    .eq("status", "complete")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-white p-8 text-ink-deep">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-semibold">The counting ladder</h1>
          <PrintButton />
        </div>
        <p className="mb-6 text-center text-lg font-semibold">
          {child.nickname}&rsquo;s climb
        </p>
        <Ladder
          current={(latest?.placement as Placement) ?? undefined}
          nearCP={latest?.near_cp ?? false}
          className="w-full"
        />
        <p className="mt-8 text-center text-sm text-ink">
          Every child climbs one rung at a time, at their own pace.
        </p>
      </div>
    </main>
  );
}
