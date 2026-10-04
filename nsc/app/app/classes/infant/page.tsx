import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, hasClassAccess, progressForUser, publishedLessons } from "@/lib/classes.server";
import { INFANT_COURSE } from "@/lib/classes";
import { Eyebrow } from "@/components/class-chrome";
import { ClassOutline, ClassResume } from "@/components/class-outline";
import { Card, buttonClasses } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { sitePath } from "@/lib/site";
import { startInfantClassCheckout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Birth to 12 months class" };

export default async function InfantClassPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/infant");
  const owned = await hasClassAccess(user.id, "infant");
  const [lessons, progress] = await Promise.all([
    publishedLessons("infant"), owned ? progressForUser(user.id) : [],
  ]);
  const salesOpen = owned ? false : await classSalesOpen("infant", user.id);
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="/app/classes" className="inline-flex min-h-11 items-center text-sm text-teal-soft underline">← My classes</Link>
        <Eyebrow className="mt-2">Self-paced class · birth to 12 months</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold text-ink-deep">{INFANT_COURSE.title}</h1>
        <p className="mt-3 text-ink">Four modules on the first year of development and everyday connection.</p>
      </header>
      {!owned ? (
        <Card>
          <h2 className="text-xl font-semibold text-ink-deep">Get lifetime access</h2>
          <p className="mt-2 text-sm text-ink">One payment of {INFANT_COURSE.priceDisplay} includes {lessons.length ? `all ${lessons.length} lessons` : "every lesson"} and lifetime access. All sales are final.</p>
          {error === "not-open" && <p role="alert" className="mt-3 text-sm text-coral-deep">Enrollment is not open for this account yet.</p>}
          {error === "checkout-unavailable" && <p role="alert" className="mt-3 text-sm text-coral-deep">Checkout is unavailable right now. Please try again later.</p>}
          {salesOpen ? <form action={startInfantClassCheckout} className="mt-5"><SubmitButton pendingLabel="Opening checkout…">Enroll now</SubmitButton></form> : (
            error !== "not-open" && <p className="mt-4 text-sm text-ink-muted">Enrollment is not open yet.</p>
          )}
          <a href={sitePath(INFANT_COURSE.detailsPath)} className={buttonClasses("ghost", "md", "mt-4 border border-line")}>View class details</a>
        </Card>
      ) : (
        <ClassResume lessons={lessons} progress={progress} courseSlug="infant" modules={INFANT_COURSE.modules} />
      )}
      {!owned && lessons.length > 0 && <p className="-mb-3 text-sm font-semibold text-ink-muted">What is inside</p>}
      {(owned || lessons.length > 0) && (
        <ClassOutline modules={INFANT_COURSE.modules} lessons={lessons} progress={progress} courseSlug="infant" locked={!owned} />
      )}
    </main>
  );
}
