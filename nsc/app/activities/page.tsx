import Link from "next/link";
import type { Metadata } from "next";
import { listActivities } from "@/lib/activities.server";
import {
  ACTIVITY_BANDS,
  ACTIVITY_DOMAINS,
  ACTIVITY_SETTINGS,
} from "@/lib/activity-types";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity Library — Growing Minds Science",
  description:
    "Developmental activities for ages 0–36 months, each with an explicit why, household materials, and easier/harder adaptations.",
};

const DOMAIN_LABEL: Record<string, string> = {
  language: "Language",
  fine_motor: "Fine motor",
  gross_motor: "Gross motor",
  cognitive: "Thinking",
  social_emotional: "Social & feelings",
  sensory: "Senses",
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    band?: string;
    domain?: string;
    mess?: string;
    time?: string;
    setting?: string;
  }>;
}) {
  const sp = await searchParams;
  const band = ACTIVITY_BANDS.find((b) => b.slug === sp.band);
  const activities = await listActivities({
    band: band ? { min: band.min, max: band.max } : undefined,
    domain: sp.domain,
    maxMess: sp.mess ? Number(sp.mess) : undefined,
    maxDuration: sp.time ? Number(sp.time) : undefined,
    setting: sp.setting,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          Growing Minds Science
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          Activity Library
        </h1>
        <p className="mt-2 max-w-xl text-ink">
          Simple things to do together, each with the developmental why spelled
          out, household materials, and a way to make it easier or harder.
        </p>
        <p className="mt-3 flex flex-wrap gap-4">
          <Link
            href="/activities/today"
            className="text-sm font-semibold text-teal underline"
          >
            Today&rsquo;s 3 for your child →
          </Link>
          <Link
            href="/activities/week"
            className="text-sm font-semibold text-teal underline"
          >
            This week&rsquo;s plan →
          </Link>
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="band" className="text-xs font-medium text-teal-soft">
            Age
          </label>
          <select
            id="band"
            name="band"
            defaultValue={sp.band ?? ""}
            className="rounded-xl border border-sea-glass bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">Any age</option>
            {ACTIVITY_BANDS.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="domain" className="text-xs font-medium text-teal-soft">
            Area
          </label>
          <select
            id="domain"
            name="domain"
            defaultValue={sp.domain ?? ""}
            className="rounded-xl border border-sea-glass bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">Any area</option>
            {ACTIVITY_DOMAINS.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABEL[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="mess" className="text-xs font-medium text-teal-soft">
            Mess
          </label>
          <select
            id="mess"
            name="mess"
            defaultValue={sp.mess ?? ""}
            className="rounded-xl border border-sea-glass bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">Any mess</option>
            <option value="1">Tidy only</option>
            <option value="2">A little mess</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="time" className="text-xs font-medium text-teal-soft">
            Time
          </label>
          <select
            id="time"
            name="time"
            defaultValue={sp.time ?? ""}
            className="rounded-xl border border-sea-glass bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">Any length</option>
            <option value="5">5 minutes or less</option>
            <option value="10">10 minutes or less</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="setting" className="text-xs font-medium text-teal-soft">
            Where
          </label>
          <select
            id="setting"
            name="setting"
            defaultValue={sp.setting ?? ""}
            className="rounded-xl border border-sea-glass bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">Anywhere</option>
            {ACTIVITY_SETTINGS.map((s) => (
              <option key={s} value={s}>
                {s === "on_the_go" ? "On the go" : s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-full bg-teal px-5 py-2 text-sm font-semibold text-white hover:bg-teal-soft"
        >
          Filter
        </button>
      </form>

      {activities.length === 0 ? (
        <Card className="bg-sea-glass/30">
          <p className="text-ink">
            Nothing here yet{sp.band || sp.domain ? " for those filters" : ""}.
            The library is filling up batch by batch — every activity gets a
            human review before it appears.
          </p>
        </Card>
      ) : (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-teal-soft">
            {activities.length}{" "}
            {activities.length === 1 ? "activity" : "activities"}
          </p>
          {activities.map((a) => (
            <Link key={a.id} href={`/activities/${a.slug}`}>
              <Card className="transition-colors hover:bg-sea-glass/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink-deep">
                      {a.title}
                    </h2>
                    <p className="mt-1 text-sm text-ink">{a.intention}</p>
                    <p className="mt-2 text-xs text-teal-soft">
                      {a.months_min}–{a.months_max} months ·{" "}
                      {a.domains.map((d) => DOMAIN_LABEL[d]).join(", ")} ·{" "}
                      {a.duration_min} min
                    </p>
                  </div>
                  {a.is_free && (
                    <span className="shrink-0 rounded-full bg-rung-glow px-3 py-1 text-xs font-medium text-ink-deep">
                      Free
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
