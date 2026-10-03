import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, hasClassAccess, progressForUser, publishedLessons } from "@/lib/classes.server";
import { TODDLER_COURSE } from "@/lib/classes";
import { Eyebrow } from "@/components/class-chrome";
import { ClassOutline, ClassResume } from "@/components/class-outline";
import { Card, Button } from "@/components/ui";
import { startClassCheckout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Toddler years class" };

export default async function ToddlerClassPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/toddlerhood");
  const owned = await hasClassAccess(user.id);
  const [lessons, progress] = await Promise.all([
    publishedLessons(), owned ? progressForUser(user.id) : [],
  ]);
  const salesOpen = owned ? false : await classSalesOpen();
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="/app/classes" className="text-sm text-teal-soft underline">← My classes</Link>
        <Eyebrow className="mt-5">Self-paced class · ages 1–3</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold text-ink-deep">{TODDLER_COURSE.title}</h1>
        <p className="mt-3 text-ink">Five modules of developmental science and practical guidance for everyday family life.</p>
      </header>
      {!owned ? (
        <Card>
          <h2 className="text-xl font-semibold text-ink-deep">Get lifetime access</h2>
          <p className="mt-2 text-sm text-ink">One payment of {TODDLER_COURSE.priceDisplay} includes the class and unlimited Growing Minds AI.</p>
          {error === "not-open" && <p role="alert" className="mt-3 text-sm text-coral-deep">Enrollment is not open for this account yet.</p>}
          {error === "checkout-unavailable" && <p role="alert" className="mt-3 text-sm text-coral-deep">Checkout is unavailable right now. Please try again later.</p>}
          {salesOpen ? <form action={startClassCheckout} className="mt-5"><Button type="submit">Enroll now</Button></form> : (
            <p className="mt-4 text-sm text-teal-soft">On-site enrollment opens after all 29 lessons have been prepared. You can still enroll through the current class page.</p>
          )}
          <p className="mt-3 text-xs text-teal-soft">Already bought this on Thinkific? Your purchase will be linked during migration.</p>
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
