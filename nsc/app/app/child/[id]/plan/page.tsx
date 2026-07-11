import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getPlanContext } from "@/lib/plan.server";
import { hasFullAccess } from "@/lib/entitlements.server";
import { dayIndex } from "@/lib/isoweek";
import { Card, EnrichmentFooter, LinkButton } from "@/components/ui";
import { Ladder } from "@/components/ladder";
import { GameCard } from "@/components/game-card";
import { brand } from "@/lib/config/brand";
import { RUNG_LABEL } from "@/lib/labels";
import { nextCheckin, shortDate } from "@/lib/checkin";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();
  const now = new Date();
  const ctx = await getPlanContext(id, now);
  if (!ctx) {
    // No completed assessment yet — send them to start one.
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 text-center">
        <p className="text-ink">No check-in yet for this child.</p>
        <LinkButton href={`/app/child/${id}/prescreen`}>Start the game</LinkButton>
      </main>
    );
  }

  const full = await hasFullAccess();
  const playedThisWeek = new Map(
    ctx.recentPlays.map((p) => [p.game_id, p.reaction]),
  );
  const todayPrompt = ctx.plan.prompts[dayIndex(now)] ?? ctx.plan.prompts[0];
  const rung = RUNG_LABEL(ctx.placement, ctx.nearCP);
  const checkin = nextCheckin(ctx.assessedAt, now);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link href="/app" className="text-sm text-teal-soft underline">
            ← All children
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-ink-deep">
            {ctx.child.nickname}&rsquo;s week
          </h1>
          <p className="text-sm text-teal-soft">On the ladder: {rung}</p>
        </div>
        <Ladder
          current={ctx.placement}
          nearCP={ctx.nearCP}
          className="hidden w-28 sm:block"
        />
      </header>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-teal">
          Today&rsquo;s number talk
        </h2>
        <Card className="bg-rung-glow/50">
          <p className="text-lg text-ink-deep">{todayPrompt}</p>
          {!full && (
            <p className="mt-2 text-xs text-teal-soft">
              A taste. Unlock the plan for a fresh prompt every day.
            </p>
          )}
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
            This week&rsquo;s games
          </h2>
          <p className="mt-1 text-sm text-teal-soft">
            A fresh three arrive every Monday, matched to {ctx.child.nickname}
            &rsquo;s rung.
          </p>
        </div>
        {ctx.plan.games.map((game, i) => (
          <GameCard
            key={game.id}
            game={game}
            childId={id}
            playedReaction={playedThisWeek.get(game.id)}
            locked={!full && i > 0}
          />
        ))}
      </section>

      {!full && (
        <Card className="bg-ink-deep text-center text-surface">
          <h2 className="text-lg font-semibold text-white">Unlock the full plan</h2>
          <p className="mt-2 text-sm text-sea-glass">
            Every game, every daily prompt, re-check-ins as {ctx.child.nickname}{" "}
            climbs, and the printable pack. One payment, yours for good.
          </p>
          <LinkButton href="/app/upgrade" className="mt-4 bg-white text-ink-deep hover:bg-sea-glass">
            See the price
          </LinkButton>
        </Card>
      )}

      <Card className="bg-sea-glass/30">
        {checkin.ready ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-ink-deep">
                Six weeks are up
              </h2>
              <p className="mt-1 text-sm text-ink">
                Rungs move on the scale of weeks and months. Re-run the
                check-in and see where {ctx.child.nickname} stands now.
              </p>
            </div>
            <LinkButton href={`/app/child/${id}/prescreen`}>
              Re-run the check-in
            </LinkButton>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-ink-deep">
                Next check-in around {shortDate(checkin.due)}
              </h2>
              <p className="mt-1 text-sm text-ink">
                That&rsquo;s the six-week rhythm — long enough for a rung to
                move, short enough to catch it moving.
              </p>
            </div>
            <a
              href={`/app/child/${id}/checkin.ics`}
              className="text-sm font-semibold text-teal underline"
            >
              Add to calendar
            </a>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href={`/app/child/${id}/progress`} className="font-semibold text-teal underline">
          See progress →
        </Link>
        {full && (
          <Link href={`/app/child/${id}/printables`} className="font-semibold text-teal underline">
            Printable pack →
          </Link>
        )}
        <Link href={`/app/child/${id}/prescreen`} className="text-teal-soft underline">
          Play the check-in again
        </Link>
        <Link href="/evidence" className="text-teal-soft underline">
          The evidence →
        </Link>
      </div>

      <EnrichmentFooter text={brand.enrichmentFooter} />
    </main>
  );
}
