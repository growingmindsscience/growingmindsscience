import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { classSalesOpen, hasClassAccess, progressForUser, publishedLessons } from "@/lib/classes.server";
import { TODDLER_COURSE, lessonPath } from "@/lib/classes";
import { Card, Button, LinkButton } from "@/components/ui";
import { startClassCheckout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Toddler years class" };

export default async function ToddlerClassPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/toddlerhood");
  const owned = await hasClassAccess(user.id);
  const [lessons, progress] = owned
    ? await Promise.all([publishedLessons(), progressForUser(user.id)])
    : [[], []];
  const salesOpen = owned ? false : await classSalesOpen();
  const complete = new Set(progress.filter((row) => row.completed_at).map((row) => row.lesson_id));
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="/app/classes" className="text-sm text-teal-soft underline">← My classes</Link>
        <p className="mt-5 font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] text-coral-deep">Self-paced class · ages 1–3</p>
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
        <p className="text-sm text-teal-soft">{complete.size} of {lessons.length} available lessons complete · lifetime access</p>
      )}
      {owned && TODDLER_COURSE.modules.map((title, index) => {
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
                    <Link href={lessonPath(lesson.slug)} className="flex items-center justify-between gap-4 rounded-xl border border-sea-glass/60 bg-surface px-5 py-4 text-ink hover:bg-sea-glass/20">
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
