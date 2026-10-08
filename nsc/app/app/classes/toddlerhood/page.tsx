import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, hasClassAccess, progressForUser, publishedLessons } from "@/lib/classes.server";
import { TODDLER_COURSE } from "@/lib/classes";
import { Eyebrow } from "@/components/class-chrome";
import { ClassOutline, ClassResume } from "@/components/class-outline";
import { Card, buttonClasses } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { sitePath } from "@/lib/site";
import { startToddlerClassCheckout } from "./actions";
import { CLASS_REFUND_POLICY } from "@/lib/refund-policy";

export const dynamic = "force-dynamic";
export const metadata = { title: "Toddler years class" };

export default async function ToddlerClassPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/toddlerhood");
  const owned = await hasClassAccess(user.id, TODDLER_COURSE.slug);
  const [lessons, progress] = await Promise.all([
    publishedLessons(TODDLER_COURSE.slug), owned ? progressForUser(user.id) : [],
  ]);
  const salesOpen = owned ? false : await classSalesOpen(TODDLER_COURSE.slug, user.id);
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="/app/classes" className="inline-flex min-h-11 items-center text-sm text-teal-soft underline">← My classes</Link>
        <Eyebrow className="mt-2">Self-paced class · ages 1–3</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold text-ink-deep">{TODDLER_COURSE.title}</h1>
        <p className="mt-3 text-ink">{TODDLER_COURSE.blurb}</p>
      </header>
      {!owned ? (
        <Card>
          <h2 className="text-xl font-semibold text-ink-deep">Get lifetime access</h2>
          <p className="mt-2 text-sm text-ink">One payment of {TODDLER_COURSE.priceDisplay} includes {lessons.length ? `all ${lessons.length} lessons` : "every lesson"}, unlimited Growing Minds AI, and lifetime access. {CLASS_REFUND_POLICY}</p>
          {error === "not-open" && <p role="alert" className="mt-3 text-sm text-coral-deep">Enrollment is not open for this account yet.</p>}
          {error === "checkout-unavailable" && <p role="alert" className="mt-3 text-sm text-coral-deep">Checkout is unavailable right now. Please try again later.</p>}
          {salesOpen ? <form action={startToddlerClassCheckout} className="mt-5"><SubmitButton pendingLabel="Opening checkout…">Enroll now</SubmitButton></form> : (
            error !== "not-open" && <p className="mt-4 text-sm text-ink-muted">On-site enrollment is not open yet. You can still enroll from the class details page.</p>
          )}
          <a href={sitePath(TODDLER_COURSE.detailsPath)} className={buttonClasses("ghost", "md", "mt-4 border border-line")}>View class details</a>
          <p className="mt-4 text-xs text-teal-soft">{salesOpen
            ? "Bought this class on Thinkific? It appears in My classes when you sign in with the email you used there."
            : "Already bought this on Thinkific? Your purchase will be linked when the class moves here."}</p>
        </Card>
      ) : (
        <ClassResume lessons={lessons} progress={progress} courseSlug="toddlerhood" modules={TODDLER_COURSE.modules} />
      )}
      {!owned && lessons.length > 0 && <p className="-mb-3 text-sm font-semibold text-ink-muted">What is inside</p>}
      {(owned || lessons.length > 0) && (
        <ClassOutline modules={TODDLER_COURSE.modules} lessons={lessons} progress={progress} courseSlug="toddlerhood" locked={!owned} />
      )}
    </main>
  );
}
