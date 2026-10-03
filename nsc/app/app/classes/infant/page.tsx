import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, hasClassAccess, progressForUser, publishedLessons } from "@/lib/classes.server";
import { INFANT_COURSE, lessonPath } from "@/lib/classes";
import { Button, Card, LinkButton } from "@/components/ui";
import { startInfantClassCheckout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Birth to 12 months class" };

export default async function InfantClassPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/infant");
  const owned = await hasClassAccess(user.id, "infant");
  const [lessons, progress] = owned
    ? await Promise.all([publishedLessons("infant"), progressForUser(user.id)])
    : [[], []];
  const salesOpen = owned ? false : await classSalesOpen("infant");
  const complete = new Set(progress.filter((row) => row.completed_at).map((row) => row.lesson_id));
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="/app/classes" className="text-sm text-teal-soft underline">← My classes</Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-teal">Self-paced class · birth to 12 months</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink-deep">{INFANT_COURSE.title}</h1>
        <p className="mt-3 text-ink">Four modules on the first year of development and everyday connection.</p>
      </header>
      {!owned ? (
        <Card>
          <h2 className="text-xl font-semibold text-ink-deep">Get lifetime access</h2>
          <p className="mt-2 text-sm text-ink">One payment of {INFANT_COURSE.priceDisplay} includes all 16 lessons and lifetime access.</p>
          {error === "checkout-unavailable" && <p role="alert" className="mt-3 text-sm text-[#9C4429]">Checkout is unavailable right now. Please try again later.</p>}
          {salesOpen ? <form action={startInfantClassCheckout} className="mt-5"><Button type="submit">Enroll now</Button></form> : (
            <p className="mt-4 text-sm text-teal-soft">Enrollment opens after all 16 lessons and captions are ready.</p>
          )}
          <LinkButton href="/classes/birth-to-12-months.html" className="mt-5">View class details</LinkButton>
        </Card>
      ) : (
        <p className="text-sm text-teal-soft">{complete.size} of {lessons.length} available lessons complete · lifetime access</p>
      )}
      {owned && INFANT_COURSE.modules.map((title, index) => {
        const moduleLessons = lessons.filter((lesson) => lesson.module_number === index + 1);
        return (
          <section key={title} aria-labelledby={`module-${index + 1}`}>
            <h2 id={`module-${index + 1}`} className="mb-3 text-xl font-semibold text-ink-deep">
              <span className="mr-2 text-sm text-teal">{String(index + 1).padStart(2, "0")}</span>{title}
            </h2>
            {moduleLessons.length ? (
              <ol className="flex flex-col gap-2">
                {moduleLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link href={lessonPath(lesson.slug, "infant")} className="flex items-center justify-between gap-4 rounded-xl border border-sea-glass/60 bg-surface px-5 py-4 text-ink hover:bg-sea-glass/20">
                      <span><strong className="block font-semibold">{lesson.title}</strong>{lesson.summary && <span className="block text-sm text-teal-soft">{lesson.summary}</span>}</span>
                      <span className="shrink-0 text-sm text-teal">{complete.has(lesson.id) ? "✓ Done" : "Open →"}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-teal-soft">Lessons are being prepared.</p>}
          </section>
        );
      })}
      <LinkButton href="/app/classes" variant="ghost" className="self-start">Back to My classes</LinkButton>
    </main>
  );
}
