import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { hasClassAccess, progressForUser, publishedLessons } from "@/lib/classes.server";
import { TODDLER_COURSE, lessonPath } from "@/lib/classes";
import { Card, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "My classes" };

export default async function MyClassesPage() {
  const user = await requireAuth();
  const owned = await hasClassAccess(user.id);
  const [lessons, progress] = owned
    ? await Promise.all([publishedLessons(), progressForUser(user.id)])
    : [[], []];
  const done = new Set(progress.filter((row) => row.completed_at).map((row) => row.lesson_id));
  const next = lessons.find((lesson) => !done.has(lesson.id)) ?? lessons[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="/app/account" className="text-sm text-teal-soft underline">← Your account</Link>
        <h1 className="mt-5 text-3xl font-semibold text-ink-deep">My classes</h1>
        <p className="mt-2 text-ink">Your classes and where you left off.</p>
      </header>
      {owned ? (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal">Lifetime access</p>
          <h2 className="mt-2 text-xl font-semibold text-ink-deep">{TODDLER_COURSE.title}</h2>
          <p className="mt-2 text-sm text-teal-soft">
            {lessons.length ? `${done.size} of ${lessons.length} lessons complete` : "Lessons are being prepared for on-site viewing."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkButton href={next ? lessonPath(next.slug) : "/app/classes/toddlerhood"}>
              {next ? "Continue class" : "Open class"}
            </LinkButton>
            <LinkButton href="/app/classes/toddlerhood" variant="ghost">See all lessons</LinkButton>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="text-xl font-semibold text-ink-deep">No classes linked yet</h2>
          <p className="mt-2 text-sm text-ink">
            A class appears here after an on-site purchase or after your previous purchase has been verified and migrated.
          </p>
          <LinkButton href="/app/classes/toddlerhood" className="mt-5">Explore Toddler years</LinkButton>
        </Card>
      )}
    </main>
  );
}
