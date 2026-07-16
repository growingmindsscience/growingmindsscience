import Link from "next/link";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listActivities } from "@/lib/activities.server";
import { weeklyActivityPlan } from "@/lib/weekly-activity-plan";
import { weekSeed } from "@/lib/isoweek";
import { ageInMonths } from "@/lib/age";
import { Card, LinkButton } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "This Week's Plan — Growing Minds Science",
  description:
    "A printable week of developmental activities, one anchor and one backup per day, inside your mess and time budget.",
};

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface ChildRow {
  id: string;
  nickname: string;
  birth_month: string;
}

function mondayOf(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

export default async function WeeklyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ mess?: string; time?: string }>;
}) {
  const user = await getUser();
  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink-deep">
            This week&rsquo;s plan
          </h1>
          <p className="mt-2 text-ink">
            A printable week: one anchor activity a day plus a backup, matched
            to your child&rsquo;s age and your mess-and-time budget.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <LinkButton href="/login?next=/activities/week">Sign in</LinkButton>
          <Link href="/signup" className="text-sm text-teal-soft underline">
            New here? Create a free account
          </Link>
        </div>
      </main>
    );
  }

  const sp = await searchParams;
  const maxMess = sp.mess ? Number(sp.mess) : undefined;
  const maxDuration = sp.time ? Number(sp.time) : undefined;

  const supabase = await createClient();
  const now = new Date();
  const monday = mondayOf(now);
  const weekLabel = monday.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const [{ data: childRows }, activities] = await Promise.all([
    supabase
      .from("nsc_children")
      .select("id, nickname, birth_month")
      .order("created_at", { ascending: true }),
    listActivities({}),
  ]);
  const children = (childRows ?? []) as ChildRow[];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="print:hidden">
        <Link href="/activities" className="text-sm text-teal-soft underline">
          ← Activity Library
        </Link>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          Week of {weekLabel}
        </h1>
        <p className="mt-2 text-ink">
          One anchor a day, one backup for when the anchor flops. The week
          stays the same every time you look — print it and stick it on the
          fridge.
        </p>
      </header>
      <h1 className="hidden text-2xl font-semibold text-ink-deep print:block">
        Week of {weekLabel}
      </h1>

      <form method="get" className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          <label htmlFor="mess" className="text-xs font-medium text-teal-soft">
            Mess budget
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
            Time budget
          </label>
          <select
            id="time"
            name="time"
            defaultValue={sp.time ?? ""}
            className="rounded-xl border border-sea-glass bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">Any length</option>
            <option value="5">5 minutes a day</option>
            <option value="10">10 minutes a day</option>
            <option value="15">15 minutes a day</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-full bg-teal px-5 py-2 text-sm font-semibold text-white hover:bg-teal-soft"
        >
          Rebuild the week
        </button>
        <PrintButton label="Print the week" />
      </form>

      {children.length === 0 && (
        <Card className="bg-sea-glass/30 print:hidden">
          <p className="text-ink">
            Add a child on the{" "}
            <Link href="/activities/today" className="font-semibold text-teal underline">
              Today&rsquo;s 3
            </Link>{" "}
            page first — the planner builds around their age.
          </p>
        </Card>
      )}

      {children.map((child) => {
        const months = ageInMonths(String(child.birth_month).slice(0, 7), now);
        const plan = weeklyActivityPlan({
          activities,
          ageMonths: months,
          seed: weekSeed(child.id, now),
          maxMess,
          maxDuration,
        });
        return (
          <section key={child.id} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
              {child.nickname} · {months} months
            </h2>
            {plan.days.length === 0 ? (
              <Card className="bg-sea-glass/30 print:hidden">
                <p className="text-ink">
                  {activities.length === 0
                    ? "The library is still filling — the planner lights up as soon as activities are published."
                    : months >= 36
                      ? `The Activity Library covers 0–36 months for now. For ${child.nickname}, Number Path plans the week instead.`
                      : "Nothing fits that budget yet. Loosen the mess or time filter and rebuild."}
                </p>
              </Card>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-sea-glass/60 bg-surface">
                {plan.days.map((day, i) => (
                  <div
                    key={i}
                    className={[
                      "flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:gap-4",
                      i > 0 ? "border-t border-sea-glass/40" : "",
                    ].join(" ")}
                  >
                    <span className="w-24 shrink-0 text-sm font-semibold text-teal">
                      {DAY_NAMES[i]}
                    </span>
                    <span className="text-ink">
                      <Link
                        href={`/activities/${day.anchor.slug}`}
                        className="font-medium hover:underline"
                      >
                        {day.anchor.title}
                      </Link>
                      <span className="text-xs text-teal-soft">
                        {" "}
                        · {day.anchor.duration_min} min
                      </span>
                      {day.backup && (
                        <span className="block text-sm text-teal-soft">
                          backup:{" "}
                          <Link
                            href={`/activities/${day.backup.slug}`}
                            className="underline"
                          >
                            {day.backup.title}
                          </Link>
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <p className="text-sm text-teal-soft print:hidden">
        Missing a day costs nothing — the backup exists for flops, not for
        doing both.
      </p>
    </main>
  );
}
