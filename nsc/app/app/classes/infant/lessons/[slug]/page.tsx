import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClassAuth } from "@/lib/auth";
import { hasClassAccess, progressForUser, publishedLessonTitle, publishedLessons } from "@/lib/classes.server";
import { INFANT_COURSE, lessonPath, transcriptParagraphs } from "@/lib/classes";
import { Eyebrow } from "@/components/class-chrome";
import { ClassPlayer } from "@/components/class-player";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const title = await publishedLessonTitle("infant", (await params).slug);
  return title ? { title } : {};
}

export default async function InfantLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireClassAuth(`/app/classes/infant/lessons/${slug}`);
  if (!(await hasClassAccess(user.id, "infant"))) redirect("/app/classes/infant");
  const [lessons, progress] = await Promise.all([publishedLessons("infant"), progressForUser(user.id)]);
  const index = lessons.findIndex((item) => item.slug === slug);
  if (index < 0) notFound();
  const lesson = lessons[index];
  const place = progress.find((row) => row.lesson_id === lesson.id);
  const previous = index > 0 ? lessons[index - 1] : null;
  const upcoming = index + 1 < lessons.length ? lessons[index + 1] : null;
  const navLink = "inline-flex min-h-11 items-center font-semibold text-teal underline";
  // Rendered above and below the written lesson, so the next step never sits
  // under a couple of thousand words.
  const lessonNav = (label: string, className: string) => (
    <nav aria-label={label} className={`flex flex-wrap justify-between gap-x-4 text-sm ${className}`}>
      {previous ? <Link href={lessonPath(previous.slug, "infant")} className={navLink}>← Previous lesson</Link> : <span />}
      {upcoming ? <Link href={lessonPath(upcoming.slug, "infant")} className={navLink}>Next lesson →</Link> : <Link href="/app/classes" className={navLink}>My classes →</Link>}
    </nav>
  );

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="/app/classes/infant" className="inline-flex min-h-11 items-center text-sm text-ink-muted underline">← All lessons</Link>
        <Eyebrow className="mt-2">
          Module {lesson.module_number}: {INFANT_COURSE.modules[lesson.module_number - 1]} · Lesson {index + 1} of {lessons.length}
        </Eyebrow>
        <h1 className="mt-2 text-3xl text-ink-deep sm:text-4xl">{lesson.title}</h1>
        {lesson.summary && <p className="mt-3 text-ink">{lesson.summary}</p>}
      </header>
      <ClassPlayer lessonId={lesson.id} title={lesson.title} posterLabel={`Module ${lesson.module_number} · Lesson ${index + 1} of ${lessons.length}`} posterMinutes={lesson.duration_seconds ? Math.max(1, Math.round(lesson.duration_seconds / 60)) : null} startTime={place?.completed_at ? 0 : (place?.position_seconds ?? 0)} completed={Boolean(place?.completed_at)} next={upcoming ? { href: lessonPath(upcoming.slug, "infant"), title: upcoming.title, minutes: upcoming.duration_seconds ? Math.max(1, Math.round(upcoming.duration_seconds / 60)) : null } : undefined} courseSlug="infant" />
      {lessonNav("Lesson navigation", "-my-3")}
      <section aria-labelledby="read-heading" className="border-t border-line pt-8">
        <h2 id="read-heading" className="text-2xl text-ink-deep">Read this lesson</h2>
        <div className="mt-5 flex max-w-[62ch] flex-col gap-4 text-base leading-relaxed text-ink [text-wrap:pretty]">
          {transcriptParagraphs(lesson.transcript).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </div>
      </section>
      {lessonNav("Lesson navigation, end of page", "border-t border-line pt-3")}
    </main>
  );
}
