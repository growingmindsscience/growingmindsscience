import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { hasClassAccess, progressForUser, publishedLessons } from "@/lib/classes.server";
import { INFANT_COURSE, TODDLER_COURSE, lessonPath, type ClassCourseSlug } from "@/lib/classes";
import { Card, LinkButton } from "@/components/ui";
import { signoutClasses } from "@/app/auth/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "My classes" };

export default async function MyClassesPage() {
  const user = await requireAuth();
  const [ownsToddler, ownsInfant] = await Promise.all([
    hasClassAccess(user.id, "toddlerhood"), hasClassAccess(user.id, "infant"),
  ]);
  const ownedCourses: ClassCourseSlug[] = [
    ...(ownsInfant ? ["infant" as const] : []),
    ...(ownsToddler ? ["toddlerhood" as const] : []),
  ];
  const [lessonGroups, progress] = ownedCourses.length
    ? await Promise.all([Promise.all(ownedCourses.map((slug) => publishedLessons(slug))), progressForUser(user.id)])
    : [[], []];
  const done = new Set(progress.filter((row) => row.completed_at).map((row) => row.lesson_id));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="https://growingmindsscience.com/classes/" className="text-sm text-teal-soft underline">← Classes</Link>
        <h1 className="mt-5 text-3xl font-semibold text-ink-deep">My classes</h1>
        <p className="mt-2 text-ink">Your classes and where you left off.</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-teal-soft">
          <span>{user.email}</span>
          <form action={signoutClasses}><button type="submit" className="underline">Sign out</button></form>
        </div>
      </header>
      {ownedCourses.length ? ownedCourses.map((courseSlug, index) => {
        const course = courseSlug === "infant" ? INFANT_COURSE : TODDLER_COURSE;
        const lessons = lessonGroups[index];
        const complete = lessons.filter((lesson) => done.has(lesson.id)).length;
        const next = lessons.find((lesson) => !done.has(lesson.id)) ?? lessons[0];
        return <Card key={courseSlug}>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal">Lifetime access</p>
          <h2 className="mt-2 text-xl font-semibold text-ink-deep">{course.title}</h2>
          <p className="mt-2 text-sm text-teal-soft">
            {lessons.length ? `${complete} of ${lessons.length} lessons complete` : "Lessons are being prepared for on-site viewing."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkButton href={next ? lessonPath(next.slug, courseSlug) : `/app/classes/${courseSlug}`}>
              {next ? "Continue class" : "Open class"}
            </LinkButton>
            <LinkButton href={`/app/classes/${courseSlug}`} variant="ghost">See all lessons</LinkButton>
          </div>
        </Card>;
      }) : (
        <Card>
          <h2 className="text-xl font-semibold text-ink-deep">No classes linked yet</h2>
          <p className="mt-2 text-sm text-ink">
            A class appears here after an on-site purchase or after your previous purchase has been verified and migrated.
          </p>
          <LinkButton href="/app/classes/infant" className="mt-5">Explore Birth to 12 months</LinkButton>
        </Card>
      )}
    </main>
  );
}
