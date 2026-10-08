import Link from "next/link";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listActivities } from "@/lib/activities.server";
import { hasMembership } from "@/lib/entitlements.server";
import { todaysThree, type CompletionLite } from "@/lib/todays-three";
import { ageInMonths } from "@/lib/age";
import { addDaysISO, localDateISO } from "@/lib/tz";
import { getTimeZone } from "@/lib/tz.server";
import { Card, Field, Input, LinkButton } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { BirthMonthField } from "@/components/birth-month-field";
import { markDone, createLibraryChild } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today's 3 — Growing Minds Science",
  description:
    "Three developmental activities picked for your child today, balanced across areas of development.",
};

const DOMAIN_LABEL: Record<string, string> = {
  language: "Language",
  fine_motor: "Fine motor",
  gross_motor: "Gross motor",
  cognitive: "Thinking",
  social_emotional: "Social & feelings",
  sensory: "Senses",
};

interface ChildRow {
  id: string;
  nickname: string;
  birth_month: string;
}

export default async function TodaysThreePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getUser();
  if (!user) {
    // Publicly linked surface: a calm sign-in prompt beats a bare redirect,
    // and the next param brings the parent straight back here.
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink-deep">
            Today&rsquo;s 3
          </h1>
          <p className="mt-2 text-ink">
            Three activity picks a day, matched to your child&rsquo;s age and
            balanced across areas of development. Sign in and add a child to
            see today&rsquo;s.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <LinkButton href="/login?next=/activities/today">Sign in</LinkButton>
          <Link
            href="/signup?next=/activities/today"
            className="inline-flex min-h-11 items-center text-sm text-ink-muted underline"
          >
            New here? Create a free account
          </Link>
        </div>
      </main>
    );
  }
  const { error } = await searchParams;
  const supabase = await createClient();
  const now = new Date();
  // The parent's calendar day: "today" and "done today" follow their clock.
  const isoDate = localDateISO(now, await getTimeZone());

  const [{ data: childRows }, activities, member] = await Promise.all([
    supabase
      .from("nsc_children")
      .select("id, nickname, birth_month")
      .order("created_at", { ascending: true }),
    listActivities({}),
    hasMembership(),
  ]);
  const children = (childRows ?? []) as ChildRow[];

  const cutoff = addDaysISO(isoDate, -28);
  const { data: completionRows } = children.length
    ? await supabase
        .from("activity_completions")
        .select("child_id, activity_id, completed_on, activities(domains)")
        .in(
          "child_id",
          children.map((c) => c.id),
        )
        .gte("completed_on", cutoff)
    : { data: [] };

  const completionsByChild = new Map<string, CompletionLite[]>();
  const doneToday = new Set<string>(); // `${child_id}:${activity_id}`
  for (const row of (completionRows ?? []) as unknown as {
    child_id: string;
    activity_id: string;
    completed_on: string;
    // Without generated DB types the client can't tell this many-to-one
    // relation from a list; runtime gives an object, so accept both.
    activities: { domains: string[] } | { domains: string[] }[] | null;
  }[]) {
    const rel = row.activities;
    const domains = Array.isArray(rel)
      ? (rel[0]?.domains ?? [])
      : (rel?.domains ?? []);
    const list = completionsByChild.get(row.child_id) ?? [];
    list.push({
      activity_id: row.activity_id,
      completed_on: row.completed_on,
      domains,
    });
    completionsByChild.set(row.child_id, list);
    if (row.completed_on === isoDate) {
      doneToday.add(`${row.child_id}:${row.activity_id}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <header>
        <Link href="/activities" className="text-sm text-ink-muted underline">
          ← Activity Library
        </Link>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          Today&rsquo;s 3
        </h1>
        <p className="mt-2 text-ink">
          Three picks for today, balanced across areas of development. Even one
          is a real day — no need to do them all.
        </p>
        <p className="mt-2">
          <Link
            href="/activities/week"
            className="text-sm font-semibold text-teal underline"
          >
            Plan the whole week instead →
          </Link>
        </p>
      </header>

      {error && (
        <Card className="bg-rung-glow">
          <p className="text-ink-deep">{error}</p>
        </Card>
      )}

      {children.length === 0 && (
        <Card>
          <h2 className="font-semibold text-ink-deep">Add a child</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Just a nickname and a birth month. We keep nothing else.
          </p>
          <form action={createLibraryChild} className="mt-4 flex flex-col gap-4">
            <Field label="Nickname" htmlFor="nickname">
              <Input id="nickname" name="nickname" maxLength={30} required />
            </Field>
            <BirthMonthField idPrefix="bm1" todayISO={isoDate} />
            <SubmitButton className="self-start">Save</SubmitButton>
          </form>
        </Card>
      )}

      {children.map((child) => {
        const months = ageInMonths(String(child.birth_month).slice(0, 7), now);
        const picks = todaysThree({
          activities,
          ageMonths: months,
          completions: completionsByChild.get(child.id) ?? [],
          childId: child.id,
          isoDate,
        });
        return (
          <section key={child.id} className="flex flex-col gap-4">
            <div>
              <h2 className="text-[0.9375rem] font-semibold text-amber-deep">
                For {child.nickname} · {months} months
              </h2>
            </div>
            {picks.length === 0 ? (
              <Card className="bg-sea-glass/30">
                <p className="text-ink">
                  {activities.length === 0
                    ? "The library is still filling — picks appear as soon as activities are published."
                    : months >= 36
                      ? `The Activity Library covers 0–36 months for now. For ${child.nickname}'s age, Number Path has a full week of counting games.`
                      : "No age-matched activities yet — new batches are on the way."}
                </p>
                {months >= 36 && activities.length > 0 && (
                  <Link href="/" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-teal underline">
                    Meet Number Path →
                  </Link>
                )}
              </Card>
            ) : (
              picks.map((a) => {
                const done = doneToday.has(`${child.id}:${a.id}`);
                const unlocked = a.is_free || member;
                return (
                  <Card key={a.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-ink-deep">
                          <Link href={`/activities/${a.slug}`} className="hover:underline">
                            {a.title}
                          </Link>
                        </h3>
                        <p className="mt-1 text-sm text-ink">{a.intention}</p>
                        <p className="mt-2 text-xs text-ink-muted">
                          {a.domains.map((d) => DOMAIN_LABEL[d] ?? d).join(", ")} ·{" "}
                          {a.duration_min} min · mess {a.mess_level}/3
                          {!unlocked && " · full steps with membership"}
                        </p>
                      </div>
                      {a.is_free && (
                        <span className="shrink-0 rounded-sm bg-rung-glow px-3 py-1 text-xs font-medium text-ink-deep">
                          Free
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Link
                        href={`/activities/${a.slug}`}
                        className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline"
                      >
                        How it goes →
                      </Link>
                      {done ? (
                        <span className="text-sm text-ink-muted">Done today ✓</span>
                      ) : (
                        <form action={markDone.bind(null, child.id, a.id)}>
                          <SubmitButton variant="ghost" size="sm" className="border border-line">
                            We did this
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </section>
        );
      })}

      {children.length > 0 && (
        <details className="rounded-2xl border border-line bg-surface px-5 py-4">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-teal">
            Add another child
          </summary>
          <form action={createLibraryChild} className="mt-4 flex flex-col gap-4">
            <Field label="Nickname" htmlFor="nickname2">
              <Input id="nickname2" name="nickname" maxLength={30} required />
            </Field>
            <BirthMonthField idPrefix="bm2" todayISO={isoDate} />
            <SubmitButton className="self-start">Save</SubmitButton>
          </form>
        </details>
      )}
    </main>
  );
}
