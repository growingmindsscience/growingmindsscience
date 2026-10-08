import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getPlanContext } from "@/lib/plan.server";
import { hasFullAccess } from "@/lib/entitlements.server";
import { dayIndex } from "@/lib/isoweek";
import { getTimeZone } from "@/lib/tz.server";
import { teaserGame } from "@/lib/routing";
import { Card, EnrichmentFooter, LinkButton } from "@/components/ui";
import { Ladder } from "@/components/ladder";
import { GameCard } from "@/components/game-card";
import { brand } from "@/lib/config/brand";
import { RUNG_LABEL } from "@/lib/labels";
import { nextCheckin, shortDate } from "@/lib/checkin";
import { getAudioIds } from "@/lib/audio.server";

const NAV_LINK = "inline-flex min-h-11 items-center";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();
  const now = new Date();
  const tz = await getTimeZone();
  const ctx = await getPlanContext(id, now, tz);
  if (!ctx) {
    // No completed assessment yet — send them to start one.
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold text-ink-deep">No check-in yet</h1>
        <p className="text-ink">
          Play the check-in first, and this week&rsquo;s games will be waiting
          here.
        </p>
        <LinkButton href={`/app/child/${id}/prescreen`}>Start the game</LinkButton>
      </main>
    );
  }

  const full = await hasFullAccess();
  const playedThisWeek = new Map(
    ctx.recentPlays.map((p) => [p.game_id, p.reaction]),
  );
  const today = dayIndex(now, tz);
  const todayPrompt = ctx.plan.prompts[today] ?? ctx.plan.prompts[0];
  // Point and Seek is a soft signal: it routes the games but never names a
  // rung (amendment A5).
  const pointAndSeek = ctx.instrument === "point_and_seek";
  const rung = RUNG_LABEL(ctx.placement, ctx.nearCP);
  const checkin = nextCheckin(ctx.assessedAt, now, ctx.confidence);
  const audioIds = await getAudioIds();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link href="/app" className={`${NAV_LINK} text-sm text-ink-muted underline`}>
            ← All children
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-ink-deep">
            {ctx.child.nickname}&rsquo;s week
          </h1>
          <p className="text-sm text-ink-muted">
            {pointAndSeek
              ? "Starting gently, from Point and Seek"
              : `On the ladder: ${rung}`}
          </p>
        </div>
        <Ladder
          current={pointAndSeek ? undefined : ctx.placement}
          nearCP={!pointAndSeek && ctx.nearCP}
          className="hidden w-28 sm:block"
        />
      </header>

      <section>
        <h2 className="mb-1 text-[0.9375rem] font-semibold text-amber-deep">
          Today&rsquo;s number talk
        </h2>
        <Card className="bg-rung-glow/50">
          <p className="text-lg text-ink-deep">{todayPrompt}</p>
          {!full && (
            <p className="mt-2 text-xs text-ink-muted">
              A taste. Unlock the plan to see the whole week of prompts.
            </p>
          )}
        </Card>
        {full && (
          <details className="mt-3 rounded-2xl border border-line bg-surface px-5 py-4">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-teal">
              See the whole week
            </summary>
            <p className="mt-1 text-xs text-ink-muted">
              Read ahead and pick whichever fits your day — there&rsquo;s
              nothing to check off.
            </p>
            <ol className="mt-3 flex flex-col gap-2">
              {ctx.plan.prompts.map((p, i) => (
                <li
                  key={i}
                  className={
                    i === today
                      ? "text-ink-deep"
                      : "text-ink-deep/70"
                  }
                >
                  <span className="mr-2 text-xs text-ink-muted">
                    {i === today ? "Today" : `Day ${i + 1}`}
                  </span>
                  {p}
                </li>
              ))}
            </ol>
          </details>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-[0.9375rem] font-semibold text-amber-deep">
            This week&rsquo;s games
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {pointAndSeek
              ? "Three to choose from, picked for where "
              : "Three to choose from, matched to "}
            {pointAndSeek ? (
              <>{ctx.child.nickname} is right now.</>
            ) : (
              <>{ctx.child.nickname}&rsquo;s rung.</>
            )}{" "}
            Even one, played a couple of times, is a real week — no need to do
            them all.
          </p>
        </div>
        {ctx.plan.games.map((game, i) => {
          const locked = !full && i > 0;
          return (
            <GameCard
              key={game.id}
              // Locked cards get only what they show; the script, materials
              // and adaptations never leave the server.
              game={locked ? teaserGame(game) : game}
              childId={id}
              childName={ctx.child.nickname}
              playedReaction={playedThisWeek.get(game.id)}
              locked={locked}
              audioIds={locked ? [] : audioIds}
            />
          );
        })}
      </section>

      {!full && (
        <Card className="ink-band bg-ink-deep text-center text-surface">
          <h2 className="text-lg font-semibold text-white">Unlock the full plan</h2>
          <p className="mt-2 text-sm text-sea-glass">
            Every game each week, the whole week of prompts to read ahead,
            where {ctx.child.nickname} sits in the typical range for their age,
            and the printable pack. One payment, yours for good.
          </p>
          <LinkButton href="/app/upgrade" variant="amber" className="mt-4">
            See the price
          </LinkButton>
        </Card>
      )}

      <Card className="bg-sea-glass/30">
        {checkin.ready ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-ink-deep">Check-in time</h2>
              <p className="mt-1 text-sm text-ink">
                See where {ctx.child.nickname} stands. Rungs take months —
                a climb and a rung settling in are both the ladder working.
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
                {ctx.confidence === "low"
                  ? "A sooner look, because today's read was a playful estimate."
                  : "The six-week rhythm. Rungs take months to move — the check-in is how you watch the climb without rushing it."}
              </p>
            </div>
            <a
              href={`/nsc/app/child/${id}/checkin.ics`}
              className={`${NAV_LINK} text-sm font-semibold text-teal underline`}
            >
              Add to calendar
            </a>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
        <Link href={`/app/child/${id}/progress`} className={`${NAV_LINK} font-semibold text-teal underline`}>
          Progress &amp; where they stand →
        </Link>
        {full && (
          <Link href={`/app/child/${id}/printables`} className={`${NAV_LINK} font-semibold text-teal underline`}>
            Printable pack →
          </Link>
        )}
        <Link href={`/app/child/${id}/prescreen`} className={`${NAV_LINK} text-ink-muted underline`}>
          Play the check-in again
        </Link>
        <Link href="/evidence" className={`${NAV_LINK} text-ink-muted underline`}>
          The evidence →
        </Link>
      </div>

      <EnrichmentFooter text={brand.enrichmentFooter} />
    </main>
  );
}
