import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClassAuth } from "@/lib/auth";
import { hasClassAccess, progressForUser, publishedLessonTitle, publishedLessons } from "@/lib/classes.server";
import { PRESCHOOL_COURSE, lessonPath, transcriptParagraphs } from "@/lib/classes";
import { Eyebrow } from "@/components/class-chrome";
import { ClassPlayer } from "@/components/class-player";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const title = await publishedLessonTitle("preschool", (await params).slug);
  return title ? { title } : {};
}

export default async function PreschoolLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireClassAuth(`/app/classes/preschool/lessons/${slug}`);
  if (!(await hasClassAccess(user.id, "preschool"))) redirect("/app/classes/preschool");
  const [lessons, progress] = await Promise.all([publishedLessons("preschool"), progressForUser(user.id)]);
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
      {previous ? <Link href={lessonPath(previous.slug, "preschool")} className={navLink}>← Previous lesson</Link> : <span />}
      {upcoming ? <Link href={lessonPath(upcoming.slug, "preschool")} className={navLink}>Next lesson →</Link> : <Link href="/app/classes" className={navLink}>My classes →</Link>}
    </nav>
  );

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="/app/classes/preschool" className="inline-flex min-h-11 items-center text-sm text-teal-soft underline">← All lessons</Link>
        <Eyebrow className="mt-2">
          Module {lesson.module_number}: {PRESCHOOL_COURSE.modules[lesson.module_number - 1]} · Lesson {index + 1} of {lessons.length}
        </Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold text-ink-deep">{lesson.title}</h1>
        {lesson.summary && <p className="mt-3 text-ink">{lesson.summary}</p>}
      </header>
      <ClassPlayer lessonId={lesson.id} title={lesson.title} startTime={place?.completed_at ? 0 : (place?.position_seconds ?? 0)} completed={Boolean(place?.completed_at)} next={upcoming ? { href: lessonPath(upcoming.slug, "preschool"), title: upcoming.title, minutes: upcoming.duration_seconds ? Math.max(1, Math.round(upcoming.duration_seconds / 60)) : null } : undefined} courseSlug="preschool" />
      {lessonNav("Lesson navigation", "-my-3")}
      <Card>
        <h2 className="text-xl font-semibold text-ink-deep">Read this lesson</h2>
        <div className="mt-4 flex max-w-[68ch] flex-col gap-4 text-base leading-relaxed text-ink [text-wrap:pretty]">
          {transcriptParagraphs(lesson.transcript).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </div>
      </Card>
      {lessonNav("Lesson navigation, end of page", "border-t border-sea-glass pt-3")}
    </main>
  );
}
