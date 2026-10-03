import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClassAuth } from "@/lib/auth";
import { hasClassAccess, progressForUser, publishedLessons } from "@/lib/classes.server";
import { TODDLER_COURSE, lessonPath } from "@/lib/classes";
import { ClassPlayer } from "@/components/class-player";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClassLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireClassAuth(`/app/classes/toddlerhood/lessons/${slug}`);
  if (!(await hasClassAccess(user.id))) redirect("/app/classes/toddlerhood");
  const [lessons, progress] = await Promise.all([publishedLessons(), progressForUser(user.id)]);
  const index = lessons.findIndex((item) => item.slug === slug);
  if (index < 0) notFound();
  const lesson = lessons[index];
  const place = progress.find((row) => row.lesson_id === lesson.id);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="/app/classes/toddlerhood" className="text-sm text-teal-soft underline">← All lessons</Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-teal">
          Module {lesson.module_number}: {TODDLER_COURSE.modules[lesson.module_number - 1]} · Lesson {index + 1} of {lessons.length}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-ink-deep">{lesson.title}</h1>
        {lesson.summary && <p className="mt-3 text-ink">{lesson.summary}</p>}
      </header>

      <ClassPlayer lessonId={lesson.id} title={lesson.title} startTime={place?.completed_at ? 0 : (place?.position_seconds ?? 0)} completed={Boolean(place?.completed_at)} />

      <Card>
        <h2 className="text-xl font-semibold text-ink-deep">Read this lesson</h2>
        <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-ink">{lesson.transcript}</div>
      </Card>

      <nav aria-label="Lesson navigation" className="flex flex-wrap justify-between gap-4 border-t border-sea-glass pt-5 text-sm">
        {index > 0 ? <Link href={lessonPath(lessons[index - 1].slug)} className="font-semibold text-teal underline">← Previous lesson</Link> : <span />}
        {index + 1 < lessons.length ? <Link href={lessonPath(lessons[index + 1].slug)} className="font-semibold text-teal underline">Next lesson →</Link> : <Link href="/app/classes" className="font-semibold text-teal underline">My classes →</Link>}
      </nav>
    </main>
  );
}
