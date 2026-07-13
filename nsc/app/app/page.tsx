import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/auth/actions";
import { Card, LinkButton } from "@/components/ui";
import { brand } from "@/lib/config/brand";
import { RUNG_LABEL } from "@/lib/labels";
import { nextCheckin, shortDate } from "@/lib/checkin";

/** Mirrors RESUME_WINDOW_MS in app/app/assess/actions.ts. */
const RESUME_WINDOW_MS = 48 * 60 * 60 * 1000;

export default async function AppHome() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: children } = await supabase
    .from("nsc_children")
    .select("id, nickname, birth_month")
    .order("created_at", { ascending: true });

  const { data: assessments } = await supabase
    .from("nsc_assessments")
    .select("id, child_id, status, placement, near_cp, started_at, completed_at, confidence")
    .order("started_at", { ascending: false });

  const latestByChild = new Map<
    string,
    {
      id: string;
      status: string;
      placement: string | null;
      near_cp: boolean;
      started_at: string;
    }
  >();
  const latestCompleteByChild = new Map<
    string,
    { completed_at: string; confidence: string | null }
  >();
  for (const a of assessments ?? []) {
    if (!latestByChild.has(a.child_id)) latestByChild.set(a.child_id, a);
    if (
      a.status === "complete" &&
      a.completed_at &&
      !latestCompleteByChild.has(a.child_id)
    ) {
      latestCompleteByChild.set(a.child_id, {
        completed_at: a.completed_at,
        confidence: a.confidence ?? null,
      });
    }
  }
  const now = new Date();

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
          const lastComplete = latestCompleteByChild.get(c.id);
          const checkin = lastComplete
            ? nextCheckin(lastComplete.completed_at, now, lastComplete.confidence)
            : null;
          const inFlight =
            latest?.status === "in_progress" || latest?.status === "paused";
          // Inside the 48h window "Continue" drops straight back into the
          // game; after it, the prescreen starts a fresh session.
          const resumable =
            inFlight &&
            now.getTime() - new Date(latest.started_at).getTime() <
              RESUME_WINDOW_MS;
          return (
            <Card key={c.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink-deep">{c.nickname}</h2>
                  {latest?.status === "complete" && rung ? (
                    <>
                      <p className="text-sm text-teal-soft">On the ladder: {rung}</p>
                      {checkin?.ready ? (
                        <p className="mt-1 text-sm font-semibold text-teal">
                          Time for the next check-in — see where things stand.{" "}
                          <Link
                            href={`/app/child/${c.id}/plan`}
                            className="font-normal text-teal-soft underline"
                          >
                            This week&rsquo;s plan →
                          </Link>
                        </p>
                      ) : checkin ? (
                        <p className="mt-1 text-sm text-teal-soft">
                          Next check-in around {shortDate(checkin.due)}
                        </p>
                      ) : null}
                    </>
                  ) : inFlight ? (
                    <p className="text-sm text-teal-soft">
                      Check-in in progress — the bear is napping
                    </p>
                  ) : (
                    <p className="text-sm text-teal-soft">No check-in yet</p>
                  )}
                </div>
                {latest?.status === "complete" ? (
                  checkin?.ready ? (
                    <LinkButton href={`/app/child/${c.id}/prescreen`}>
                      Re-run check-in
                    </LinkButton>
                  ) : (
                    <LinkButton href={`/app/child/${c.id}/plan`}>This week</LinkButton>
                  )
                ) : inFlight ? (
                  <LinkButton
                    href={
                      resumable
                        ? `/app/assess/${latest.id}`
                        : `/app/child/${c.id}/prescreen`
                    }
                  >
                    Continue
                  </LinkButton>
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
