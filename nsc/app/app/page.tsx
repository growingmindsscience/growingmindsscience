import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/auth/actions";
import { Card, LinkButton } from "@/components/ui";
import { brand } from "@/lib/config/brand";
import { RUNG_LABEL } from "@/lib/labels";

export default async function AppHome() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: children } = await supabase
    .from("nsc_children")
    .select("id, nickname, birth_month")
    .order("created_at", { ascending: true });

  const { data: assessments } = await supabase
    .from("nsc_assessments")
    .select("child_id, status, placement, near_cp, started_at")
    .order("started_at", { ascending: false });

  const latestByChild = new Map<
    string,
    { status: string; placement: string | null; near_cp: boolean }
  >();
  for (const a of assessments ?? []) {
    if (!latestByChild.has(a.child_id)) latestByChild.set(a.child_id, a);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-teal">
            {brand.productName}
          </p>
          <h1 className="text-2xl font-semibold text-ink-deep">Your children</h1>
        </div>
        <form action={signout}>
          <button className="text-sm text-teal-soft underline">Sign out</button>
        </form>
      </header>

      <div className="flex flex-col gap-4">
        {(children ?? []).map((c) => {
          const latest = latestByChild.get(c.id);
          const rung =
            latest?.placement &&
            RUNG_LABEL(latest.placement, latest.near_cp ?? false);
          return (
            <Card key={c.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink-deep">{c.nickname}</h2>
                  {latest?.status === "complete" && rung ? (
                    <p className="text-sm text-teal-soft">On the ladder: {rung}</p>
                  ) : latest?.status === "in_progress" || latest?.status === "paused" ? (
                    <p className="text-sm text-teal-soft">Check-in in progress</p>
                  ) : (
                    <p className="text-sm text-teal-soft">No check-in yet</p>
                  )}
                </div>
                {latest?.status === "complete" ? (
                  <LinkButton href={`/app/child/${c.id}/plan`}>This week</LinkButton>
                ) : latest?.status === "in_progress" || latest?.status === "paused" ? (
                  <LinkButton href={`/app/child/${c.id}/prescreen`}>Continue</LinkButton>
                ) : (
                  <LinkButton href={`/app/child/${c.id}/prescreen`}>
                    Start the game
                  </LinkButton>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Link
        href="/app/child/new"
        className="rounded-2xl border border-dashed border-teal/40 px-6 py-5 text-center font-semibold text-teal hover:bg-sea-glass/30"
      >
        + Add a child
      </Link>
    </main>
  );
}
