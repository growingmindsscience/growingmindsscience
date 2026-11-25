import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, ownedClassSlugs, progressForUser, publishedLessons } from "@/lib/classes.server";
import { CLASS_AI_FAIR_USE_PER_DAY, CLASS_BUNDLE, CLASS_BUNDLE_FOUR, CLASS_COURSES, lessonPath, type ClassCourseSlug } from "@/lib/classes";
import { getEntitlementSummary } from "@/lib/entitlements.server";
import { sitePath } from "@/lib/site";
import { Card, LinkButton, buttonClasses } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Eyebrow } from "@/components/class-chrome";
import { startInfantClassCheckout } from "./infant/actions";
import { startPreschoolClassCheckout } from "./preschool/actions";
import { startFamilyClassCheckout } from "./family/actions";
import { startClassCheckout } from "./toddlerhood/actions";
import { startAllFourCheckout, startBundleCheckout } from "./bundle/actions";
import { CLASS_REFUND_POLICY } from "@/lib/refund-policy";
import { bundleOffered, classJourney, journeyActionLabel, splitCatalog } from "@/lib/class-journey";

export const dynamic = "force-dynamic";
export const metadata = { title: "My classes" };

const CHECKOUT = {
  infant: startInfantClassCheckout, toddlerhood: startClassCheckout, preschool: startPreschoolClassCheckout,
  family: startFamilyClassCheckout,
} as const;
/** Mirrors FREE_DAILY_LIMIT in the static site's api/_ai-chat.js. */
const FREE_AI_QUESTIONS_PER_DAY = 5;

export default async function MyClassesPage({ searchParams }: {
  searchParams: Promise<{ gift?: string; error?: string }>;
}) {
  const user = await requireClassAuth("/app/classes");
  const { gift, error } = await searchParams;
  const [owned, progress, summary] = await Promise.all([
    ownedClassSlugs(user.id), progressForUser(user.id), getEntitlementSummary(),
  ]);
  const { ownedCourses: catalogOwned, otherCourses: unowned } = splitCatalog(owned);
  const [lessonGroups, salesFlags] = await Promise.all([
    Promise.all(catalogOwned.map((slug) => publishedLessons(slug))),
    Promise.all(unowned.map((slug) => classSalesOpen(slug, user.id).catch(() => false))),
  ]);
  const salesOpen = Object.fromEntries(unowned.map((slug, index) => [slug, salesFlags[index]])) as Partial<Record<ClassCourseSlug, boolean>>;
  // Same rule as the bundle checkout: none of a bundle's classes owned, all of them on sale.
  // Family Systems is outside the three-class bundle, so owning it never hides that one.
  const bundleOpen = bundleOffered(owned, salesOpen);
  const allFourOpen = bundleOffered(owned, salesOpen, CLASS_BUNDLE_FOUR);
  // The class touched most recently comes first, so a parent back from an
  // interruption lands on their lesson; untouched classes keep catalog order.
  const ownedClasses = catalogOwned
    .map((slug, index) => ({ slug, lessons: lessonGroups[index], journey: classJourney(lessonGroups[index], progress) }))
    .sort((a, b) => (b.journey.lastActivity > a.journey.lastActivity ? 1 : b.journey.lastActivity < a.journey.lastActivity ? -1 : 0));
  // The three age classes always show (with "not open yet" when closed);
  // Family Systems is listed once its sales gate opens.
  const otherCourses = unowned.filter((slug) => slug !== "family" || salesOpen.family);
  const ownedCourses = ownedClasses.map(({ slug }) => slug);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-8 sm:gap-12 sm:py-10">
      <header>
        <h1 className="text-3xl text-ink-deep sm:text-4xl">My classes</h1>
        <p className="mt-2 text-ink-soft">Everything you own, and where you left off.</p>
        {gift === "ok" ? (
          <p role="status" className="mt-4 rounded-card bg-tint px-5 py-4 text-ink">
            Gift code accepted. Your unlocked classes are ready below, with Ask the research included.
          </p>
        ) : !ownedCourses.length && (
          <Link href="/app/classes/redeem" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal underline underline-offset-4">
            Have a gift code?
          </Link>
        )}
        {error === "not-open" && <p role="alert" className="mt-3 text-sm text-coral-deep">Enrollment is not open for this account yet.</p>}
        {error === "checkout-unavailable" && <p role="alert" className="mt-3 text-sm text-coral-deep">Checkout is unavailable right now. Please try again later.</p>}
        {error === "bundle-owned" && <p role="alert" className="mt-3 text-sm text-coral-deep">You already own one of these classes, so the bundle would charge you twice. Enroll in the others one at a time below.</p>}
      </header>

      <section aria-labelledby="owned-heading" className="flex flex-col gap-4">
        <h2 id="owned-heading" className="text-xl text-ink-deep">Your classes</h2>
        {ownedCourses.length ? (
          <div className={`grid gap-4 ${ownedCourses.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {ownedClasses.map(({ slug, lessons, journey }) => {
              const course = CLASS_COURSES[slug];
              const { next, complete, total } = journey;
              const percent = total ? Math.round((complete / total) * 100) : 0;
              const lead = journey.watchedSeconds > 0 ? "Pick up where you left off" : journey.status === "not-started" ? "Start here" : "Up next";
              return (
                <Card key={slug} className="flex flex-col">
                  <Eyebrow>{course.ages} · Lifetime access</Eyebrow>
                  <h3 className="mt-1 text-xl text-ink-deep">{course.shortTitle}</h3>
                  {next ? (
                    <p className="mt-3 text-ink">
                      <span className="block text-sm text-ink-muted">{lead}</span>
                      <span className="block font-semibold leading-snug">{next.title}</span>
                      {journey.minutesLeft && (
                        <span className="block text-sm text-ink-muted">
                          {journey.watchedSeconds > 0 ? `About ${journey.minutesLeft} min left` : `${journey.minutesLeft} min`}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-ink-soft">
                      {lessons.length ? "You have finished every lesson. They all stay here for you." : "Lessons are being prepared for on-site viewing."}
                    </p>
                  )}
                  {total > 0 && (
                    <div className="mt-4 flex items-center gap-3">
                      <div
                        role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={complete}
                        aria-label={`${course.shortTitle} progress`}
                        className="h-1.5 flex-1 overflow-hidden rounded-sm bg-sea-glass"
                      >
                        <div className="h-full rounded-sm bg-teal" style={{ width: `${percent}%` }} />
                      </div>
                      <p className="shrink-0 text-sm text-ink-muted">{complete} of {total} done</p>
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5">
                    <LinkButton href={next ? lessonPath(next.slug, slug) : `/app/classes/${slug}`} className="w-full sm:w-auto">
                      {journeyActionLabel(journey)}<span className="sr-only">, {course.shortTitle}</span>
                    </LinkButton>
                    {next && (
                      <Link href={`/app/classes/${slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline underline-offset-4">
                        All lessons<span className="sr-only"> in {course.shortTitle}</span>
                      </Link>
                    )}
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
          </Card>
        )}
      </section>

      {otherCourses.length > 0 && (
        <section aria-labelledby="more-heading" className="flex flex-col gap-4">
          <h2 id="more-heading" className="text-xl text-ink-deep">
            {ownedCourses.length ? "More classes" : "Available classes"}
          </h2>
          {bundleOpen && (
            <Card className="flex flex-col gap-1 border-2 border-teal sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1">
                <Eyebrow>Our pick · Birth to age 5, without the family class</Eyebrow>
                <h3 className="mt-2 text-xl text-ink-deep">{CLASS_BUNDLE.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  Birth to 12 months, Toddler years, and Preschool years, ready as your child grows.
                  Ask the research is included, with a fair-use limit of {CLASS_AI_FAIR_USE_PER_DAY} questions a day.
                </p>
                <p className="mt-4 text-ink">
                  <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink-deep">{CLASS_BUNDLE.priceDisplay}</span>
                  <span className="ml-2 text-sm text-ink-muted">
                    <s>{CLASS_BUNDLE.separateDisplay}</s> separately, so you save {CLASS_BUNDLE.savingsDisplay}. One payment, lifetime access. {CLASS_REFUND_POLICY}
                  </span>
                </p>
              </div>
              <form action={startBundleCheckout} className="pt-4 sm:pt-0">
                <SubmitButton pendingLabel="Opening checkout…">Enroll in all three</SubmitButton>
              </form>
            </Card>
          )}
          {allFourOpen && (
            <Card className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1">
                <Eyebrow>Birth to age 5, plus the family class</Eyebrow>
                <h3 className="mt-2 text-xl text-ink-deep">{CLASS_BUNDLE_FOUR.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  The three age classes plus Family systems and stress, ready as your child grows.
                  Ask the research is included, with a fair-use limit of {CLASS_AI_FAIR_USE_PER_DAY} questions a day.
                </p>
                <p className="mt-4 text-ink">
                  <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink-deep">{CLASS_BUNDLE_FOUR.priceDisplay}</span>
                  <span className="ml-2 text-sm text-ink-muted">
                    <s>{CLASS_BUNDLE_FOUR.separateDisplay}</s> separately, so you save {CLASS_BUNDLE_FOUR.savingsDisplay}. One payment, lifetime access. {CLASS_REFUND_POLICY}
                  </span>
                </p>
              </div>
              <form action={startAllFourCheckout} className="pt-4 sm:pt-0">
                <SubmitButton pendingLabel="Opening checkout…">Enroll in all four</SubmitButton>
              </form>
            </Card>
          )}
          <div className={`grid gap-4 ${otherCourses.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {otherCourses.map((slug) => {
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
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    {salesOpen[slug] ? (
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
            <Eyebrow>Ask the research</Eyebrow>
            <h3 className="mt-2 text-lg text-ink-deep">
              {summary.unlimitedAi ? "Included with your class" : `${FREE_AI_QUESTIONS_PER_DAY} free questions a day`}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              {summary.unlimitedAi
                ? `Ask the research, the AI tool, is included with your class, with a fair-use limit of ${CLASS_AI_FAIR_USE_PER_DAY} questions a day. Stay signed in to use it.`
                : "Ask about your child's development any time. The free allowance resets each day."}
            </p>
            <div className="mt-auto pt-5">
              <a href={sitePath("/tools/ask-the-research")} className={buttonClasses("ghost", "sm", "border border-line")}>
                Open Ask the research
              </a>
            </div>
          </Card>
          {summary.membership && (
            <Card className="flex flex-col">
              <Eyebrow>Membership</Eyebrow>
              <h3 className="mt-2 text-lg text-ink-deep">Active</h3>
              <p className="mt-1 text-sm text-ink-soft">Includes unlimited Ask the research and Tallykin.</p>
              <div className="mt-auto pt-5">
                <LinkButton href="/app/classes/account" variant="ghost" size="sm" className="border border-line">Manage in Account</LinkButton>
              </div>
            </Card>
          )}
          {summary.numberPath && (
            <Card className="flex flex-col">
              <Eyebrow>Tallykin</Eyebrow>
              <h3 className="mt-2 text-lg text-ink-deep">Full access</h3>
              <p className="mt-1 text-sm text-ink-soft">The early-math check-in, games, and weekly plans.</p>
              <div className="mt-auto pt-5">
                <LinkButton href="/app" variant="ghost" size="sm" className="border border-line">Open Tallykin</LinkButton>
              </div>
            </Card>
          )}
        </div>
        <p className="text-sm text-ink-muted">
          Receipts, password, and sign-in details are in{" "}
          <Link href="/app/classes/account" className="underline">Account</Link>.
          {ownedCourses.length > 0 && gift !== "ok" && (
            <>
              {" "}Have a gift code?{" "}
              <Link href="/app/classes/redeem" className="underline">Redeem it</Link>.
            </>
          )}
        </p>
      </section>
    </main>
  );
}
