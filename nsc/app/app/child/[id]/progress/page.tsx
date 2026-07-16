import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasFullAccess } from "@/lib/entitlements.server";
import { getGamesCatalog } from "@/lib/content.server";
import { Card, EnrichmentFooter } from "@/components/ui";
import { Ladder } from "@/components/ladder";
import { brand } from "@/lib/config/brand";
import { RUNG_LABEL } from "@/lib/labels";
import { ageInMonths } from "@/lib/age";
import { isoWeek } from "@/lib/isoweek";
import { formatAge, NORMS_NOTE, standingSummary } from "@/lib/norms";
import type { Placement } from "@/lib/titration";
import { nextCheckin, shortDate } from "@/lib/checkin";

/** Ladder height per placement — for climb math across the history. */
const RANK: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, CP: 5 };

/** The concrete Give-N meaning of a rung — "can hand you exactly this many." */
const GIVES: Record<string, string> = {
  L0: "—",
  L1: "1",
  L2: "2",
  L3: "3",
  L4: "4",
  CP: "any",
};

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();
  const supabase = await createClient();
  const now = new Date();

  const { data: child } = await supabase
    .from("nsc_children")
    .select("nickname, birth_month")
    .eq("id", id)
    .single();
  if (!child) notFound();

  const [{ data: history }, { data: plays }, full] = await Promise.all([
    supabase
      .from("nsc_assessments")
      .select("placement, near_cp, confidence, completed_at, instrument")
      .eq("child_id", id)
      .eq("status", "complete")
      .order("completed_at", { ascending: true }),
    supabase
      .from("nsc_game_plays")
      .select("game_id, played_at, reaction")
      .eq("child_id", id),
    hasFullAccess(),
  ]);

  const latest = history?.[history.length - 1];
  const months = ageInMonths(String(child.birth_month).slice(0, 7), now);

  // "For their age" — the placement against the published typical range.
  // Give-N reads only: a Point-and-Seek result is a soft routing signal, not
  // a measured rung, and by design it is never named as a knower level.
  const latestGiveN = [...(history ?? [])]
    .reverse()
    .find((h) => h.instrument === "give_n" && h.placement && h.placement !== "CPX");
  const summary = latestGiveN
    ? standingSummary({
        months,
        placement: latestGiveN.placement as Placement,
        name: child.nickname,
        confidence: latestGiveN.confidence,
      })
    : null;

  // Practice rhythm: distinct weeks with at least one logged game, last six.
  // A 42-day window can graze 7 partial ISO weeks, so cap at 6.
  const sixWeeksAgo = now.getTime() - 42 * 86400000;
  const weeksPlayed = Math.min(
    6,
    new Set(
      (plays ?? [])
        .filter((p) => new Date(p.played_at).getTime() >= sixWeeksAgo)
        .map((p) => {
          const { year, week } = isoWeek(new Date(p.played_at));
          return `${year}-W${week}`;
        }),
    ).size,
  );

  // Most-loved game — the reaction log doubles as a "what works" signal.
  const lovedCounts = new Map<string, number>();
  for (const p of plays ?? []) {
    if (p.reaction === "loved")
      lovedCounts.set(p.game_id, (lovedCounts.get(p.game_id) ?? 0) + 1);
  }
  let favorite: { title: string; count: number } | null = null;
  if (full && lovedCounts.size > 0) {
    const catalog = await getGamesCatalog();
    const titles = new Map(catalog.games.map((g) => [g.id, g.title]));
    const [gameId, count] = [...lovedCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];
    const title = titles.get(gameId);
    if (title) favorite = { title, count };
  }

  // Climb summary across the whole history.
  const first = history?.[0];
  const rungsClimbed =
    first?.placement && latest?.placement
      ? (RANK[latest.placement] ?? 0) - (RANK[first.placement] ?? 0)
      : 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <header>
        <Link href={`/app/child/${id}/plan`} className="text-sm text-teal-soft underline">
          ← This week
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink-deep">
          {child.nickname}&rsquo;s climb
        </h1>
        <p className="text-sm text-teal-soft">{formatAge(months)}</p>
      </header>

      {latest?.placement && (
        <Ladder
          current={latest.placement as Placement}
          nearCP={latest.near_cp ?? false}
          className="w-full"
        />
      )}

      {summary &&
        (full ? (
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
              For their age
            </h2>
            <p className="mt-2 text-lg font-semibold text-ink-deep">
              {summary.headline}
            </p>
            <p className="mt-1 text-ink">{summary.detail}</p>
            {summary.caveat && (
              <p className="mt-2 text-sm text-teal-soft">{summary.caveat}</p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-teal-soft">
              {NORMS_NOTE}{" "}
              <Link href="/evidence" className="underline">
                The evidence →
              </Link>
            </p>
          </Card>
        ) : (
          <Card className="bg-rung-glow/40">
            <h2 className="font-semibold text-ink-deep">
              Where does this sit for {child.nickname}&rsquo;s age?
            </h2>
            <p className="mt-1 text-sm text-ink">
              Unlock the full plan to see {child.nickname} against the typical
              range for their age — drawn from the same published studies as
              the check-in — and watch it move as they climb.
            </p>
            <Link
              href="/app/upgrade"
              className="mt-3 inline-block font-semibold text-teal underline"
            >
              Unlock the full plan →
            </Link>
          </Card>
        ))}

      <section className="grid grid-cols-2 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-teal">{history?.length ?? 0}</p>
          <p className="text-sm text-teal-soft">check-ins</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-teal">{plays?.length ?? 0}</p>
          <p className="text-sm text-teal-soft">games played</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-teal">
            {latestGiveN?.placement ? GIVES[latestGiveN.placement] ?? "—" : "—"}
          </p>
          <p className="text-sm text-teal-soft">
            can hand you exactly this many
          </p>
        </Card>
        <Card className="text-center">
          {/* "0 of 6" would read as a failing score to a brand-new family —
              the rhythm stat only appears once there's a rhythm to show. */}
          <p className="text-3xl font-bold text-teal">
            {(plays?.length ?? 0) > 0 ? `${weeksPlayed} of 6` : "—"}
          </p>
          <p className="text-sm text-teal-soft">recent weeks with play</p>
        </Card>
      </section>

      {favorite && (
        <Card className="bg-rung-glow/30">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
            Most loved game
          </h2>
          <p className="mt-1 text-lg font-semibold text-ink-deep">
            {favorite.title}
          </p>
          <p className="text-sm text-teal-soft">
            Marked &ldquo;loved it&rdquo; {favorite.count}{" "}
            {favorite.count === 1 ? "time" : "times"} — a game they love is
            worth three they tolerate.
          </p>
        </Card>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
          Check-in history
        </h2>
        {(history?.length ?? 0) > 1 && first?.completed_at && (
          <p className="text-sm text-teal-soft">
            {rungsClimbed > 0
              ? `${rungsClimbed} ${rungsClimbed === 1 ? "rung" : "rungs"} climbed since ${shortDate(new Date(first.completed_at))}.`
              : `Holding steady since ${shortDate(new Date(first.completed_at))} — rungs move on the scale of months.`}
          </p>
        )}
        {(history ?? []).map((h, i) => {
          const prev = i > 0 ? history![i - 1] : null;
          const delta =
            prev?.placement && h.placement
              ? (RANK[h.placement] ?? 0) - (RANK[prev.placement] ?? 0)
              : null;
          return (
            <Card key={i}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-ink">
                  {RUNG_LABEL(h.placement as string, h.near_cp ?? false)}
                  {delta != null && delta > 0 && (
                    <span className="ml-2 rounded-full bg-rung-glow px-2 py-0.5 text-xs font-semibold text-teal">
                      ↑ climbed
                    </span>
                  )}
                  {delta === 0 && (
                    <span className="ml-2 rounded-full bg-sea-glass/60 px-2 py-0.5 text-xs font-semibold text-teal-soft">
                      steady — rungs take months
                    </span>
                  )}
                  {delta != null && delta < 0 && (
                    <span className="ml-2 rounded-full bg-sea-glass/60 px-2 py-0.5 text-xs font-semibold text-teal-soft">
                      a wiggly read — it happens
                    </span>
                  )}
                </span>
                <span className="text-sm text-teal-soft">
                  {h.completed_at
                    ? shortDate(new Date(h.completed_at))
                    : ""}
                </span>
              </div>
            </Card>
          );
        })}
        {(history?.length ?? 0) === 0 && (
          <p className="text-sm text-teal-soft">No check-ins recorded yet.</p>
        )}
      </section>

      {latest?.completed_at && (
        <Card className="bg-sea-glass/30">
          {(() => {
            const checkin = nextCheckin(
              latest.completed_at,
              new Date(),
              latest.confidence,
            );
            return checkin.ready ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-ink">
                  <span className="font-semibold text-ink-deep">
                    Check-in time.
                  </span>{" "}
                  Re-run it and see where things stand — climbs and settled
                  rungs are both the ladder working.
                </p>
                <Link
                  href={`/app/child/${id}/prescreen`}
                  className="font-semibold text-teal underline"
                >
                  Re-run the check-in →
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-ink">
                  Next check-in around{" "}
                  <span className="font-semibold text-ink-deep">
                    {shortDate(checkin.due)}
                  </span>
                  {latest.confidence === "low"
                    ? " — a sooner look after a playful estimate."
                    : " — the six-week rhythm."}
                </p>
                <a
                  href={`/app/child/${id}/checkin.ics`}
                  className="text-sm font-semibold text-teal underline"
                >
                  Add to calendar
                </a>
              </div>
            );
          })()}
        </Card>
      )}

      <p className="text-center text-sm text-teal-soft">
        Every child climbs at their own pace. Typical ranges are wide — a map
        of the ladder, never a race up it.
      </p>

      <EnrichmentFooter text={brand.enrichmentFooter} />
    </main>
  );
}
