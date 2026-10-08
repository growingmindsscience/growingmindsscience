import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, ownedClassSlugs, progressForUser, publishedLessons } from "@/lib/classes.server";
import { CLASS_COURSES, lessonPath, type ClassCourseSlug } from "@/lib/classes";
import { getEntitlementSummary } from "@/lib/entitlements.server";
import { sitePath } from "@/lib/site";
import { Card, LinkButton, buttonClasses } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Eyebrow } from "@/components/class-chrome";
import { startInfantClassCheckout } from "./infant/actions";
import { startPreschoolClassCheckout } from "./preschool/actions";
import { startToddlerClassCheckout } from "./toddlerhood/actions";
import { CLASS_REFUND_POLICY } from "@/lib/refund-policy";

export const dynamic = "force-dynamic";
export const metadata = { title: "My classes" };

/** Catalog order: youngest age first. */
const COURSE_ORDER: ClassCourseSlug[] = ["infant", "toddlerhood", "preschool"];
const CHECKOUT = {
  infant: startInfantClassCheckout, toddlerhood: startToddlerClassCheckout, preschool: startPreschoolClassCheckout,
} as const;
/** Mirrors FREE_DAILY_LIMIT in the static site's api/_ai-chat.js. */
const FREE_AI_QUESTIONS_PER_DAY = 5;
const THINKIFIC_SIGN_IN = "https://matthew-s-site-de0b.thinkific.com/users/sign_in";

/**
 * Until the Thinkific import covers every toddler buyer, a buyer whose
 * purchase is not linked yet needs a way back to their lessons. Remove with
 * the marketing switch to on-site toddler checkout.
 */
function ThinkificNote({ lead }: { lead: string }) {
  return (
    <p className="mt-3 text-sm text-ink-muted">
      {lead} Your lessons are there for now:{" "}
      <a href={THINKIFIC_SIGN_IN} target="_blank" rel="noopener" className="font-semibold text-teal underline">
        Log in on Thinkific<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}

export default async function MyClassesPage() {
  const user = await requireClassAuth("/app/classes");
  const [owned, progress, summary] = await Promise.all([
    ownedClassSlugs(user.id), progressForUser(user.id), getEntitlementSummary(),
  ]);
  const ownedCourses = COURSE_ORDER.filter((slug) => owned.includes(slug));
  const otherCourses = COURSE_ORDER.filter((slug) => !owned.includes(slug));
  const [lessonGroups, salesOpen] = await Promise.all([
    Promise.all(ownedCourses.map((slug) => publishedLessons(slug))),
    Promise.all(otherCourses.map((slug) => classSalesOpen(slug, user.id))),
  ]);
  const done = new Set(progress.filter((row) => row.completed_at).map((row) => row.lesson_id));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-10">
      <header>
        <h1 className="text-4xl text-ink-deep">My classes</h1>
        <p className="mt-2 text-ink-soft">Everything you own, and where you left off.</p>
      </header>

      <section aria-labelledby="owned-heading" className="flex flex-col gap-4">
        <h2 id="owned-heading" className="text-xl text-ink-deep">Your classes</h2>
        {ownedCourses.length ? (
          <div className={`grid gap-4 ${ownedCourses.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {ownedCourses.map((slug, index) => {
              const course = CLASS_COURSES[slug];
              const lessons = lessonGroups[index];
              const complete = lessons.filter((lesson) => done.has(lesson.id)).length;
              const next = lessons.find((lesson) => !done.has(lesson.id));
              const started = complete > 0 || progress.some((row) => lessons.some((lesson) => lesson.id === row.lesson_id));
              const percent = lessons.length ? Math.round((complete / lessons.length) * 100) : 0;
              return (
                <Card key={slug} className="flex flex-col">
                  <Eyebrow>{course.ages} · Lifetime access</Eyebrow>
                  <h3 className="mt-2 text-xl text-ink-deep">{course.shortTitle}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{course.blurb}</p>
                  {lessons.length ? (
                    <div className="mt-5">
                      <div
                        role="progressbar" aria-valuemin={0} aria-valuemax={lessons.length} aria-valuenow={complete}
                        aria-label={`${course.shortTitle} progress`}
                        className="h-2 overflow-hidden rounded-sm bg-sea-glass"
                      >
                        <div className="h-full rounded-sm bg-teal" style={{ width: `${percent}%` }} />
                      </div>
                      <p className="mt-2 text-sm text-ink-muted">
                        {complete} of {lessons.length} lessons complete
                        {next && started ? ` · Next: ${next.title}` : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-ink-muted">Lessons are being prepared for on-site viewing.</p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <LinkButton href={next ? lessonPath(next.slug, slug) : `/app/classes/${slug}`}>
                      {!lessons.length ? "Open class" : !next ? "Review class" : started ? "Continue" : "Start class"}
                    </LinkButton>
                    {next && <LinkButton href={`/app/classes/${slug}`} variant="ghost">All lessons</LinkButton>}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <h3 className="text-lg text-ink-deep">No classes yet</h3>
            <p className="mt-2 text-sm text-ink-soft">
              A class appears here as soon as you enroll. If you bought a class before and do not
              see it, it will be added once that purchase has been verified and moved over.
            </p>
            <ThinkificNote lead="Bought the Toddler years class on Thinkific?" />
          </Card>
        )}
      </section>

      {otherCourses.length > 0 && (
        <section aria-labelledby="more-heading" className="flex flex-col gap-4">
          <h2 id="more-heading" className="text-xl text-ink-deep">
            {ownedCourses.length ? "More classes" : "Available classes"}
          </h2>
          <div className={`grid gap-4 ${otherCourses.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {otherCourses.map((slug, index) => {
              const course = CLASS_COURSES[slug];
              return (
                <Card key={slug} className="flex flex-col">
                  <Eyebrow>{course.ages}</Eyebrow>
                  <h3 className="mt-2 text-xl text-ink-deep">{course.shortTitle}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{course.blurb}</p>
                  <p className="mt-4 text-ink">
                    <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink-deep">{course.priceDisplay}</span>
                    <span className="ml-2 text-sm text-ink-muted">one payment, lifetime access. {CLASS_REFUND_POLICY}</span>
                  </p>
                  {slug === "toddlerhood" && <ThinkificNote lead="Bought this class on Thinkific?" />}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    {salesOpen[index] ? (
                      <form action={CHECKOUT[slug]}>
                        <SubmitButton pendingLabel="Opening checkout…">Enroll</SubmitButton>
                      </form>
                    ) : (
                      <p className="w-full text-sm text-ink-muted">Enrollment is not open yet.</p>
                    )}
                    <LinkButton href={`/app/classes/${slug}`} variant="ghost">See what is inside</LinkButton>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="also-heading" className="flex flex-col gap-4">
        <h2 id="also-heading" className="text-xl text-ink-deep">Also in your account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex flex-col">
            <Eyebrow>Growing Minds AI</Eyebrow>
            <h3 className="mt-2 text-lg text-ink-deep">
              {summary.unlimitedAi ? "Unlimited questions" : `${FREE_AI_QUESTIONS_PER_DAY} free questions a day`}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              {summary.unlimitedAi
                ? "Your account has unlimited access. Stay signed in and ask as much as you need."
                : "Ask about your child's development any time. The free allowance resets each day."}
            </p>
            <div className="mt-auto pt-5">
              <a href={sitePath("/tools/growing-minds-ai")} className={buttonClasses("ghost", "sm", "border border-line")}>
                Open Growing Minds AI
              </a>
            </div>
          </Card>
          {summary.membership && (
            <Card className="flex flex-col">
              <Eyebrow>Membership</Eyebrow>
              <h3 className="mt-2 text-lg text-ink-deep">Active</h3>
              <p className="mt-1 text-sm text-ink-soft">Includes unlimited Growing Minds AI and Number Path.</p>
              <div className="mt-auto pt-5">
                <LinkButton href="/app/classes/account" variant="ghost" size="sm" className="border border-line">Manage in Account</LinkButton>
              </div>
            </Card>
          )}
          {summary.numberPath && (
            <Card className="flex flex-col">
              <Eyebrow>Number Path</Eyebrow>
              <h3 className="mt-2 text-lg text-ink-deep">Full access</h3>
              <p className="mt-1 text-sm text-ink-soft">The early-math check-in, games, and weekly plans.</p>
              <div className="mt-auto pt-5">
                <LinkButton href="/app" variant="ghost" size="sm" className="border border-line">Open Number Path</LinkButton>
              </div>
            </Card>
          )}
        </div>
        <p className="text-sm text-ink-muted">
          Receipts, password, and sign-in details are in{" "}
          <Link href="/app/classes/account" className="underline">Account</Link>.
        </p>
      </section>
    </main>
  );
}
