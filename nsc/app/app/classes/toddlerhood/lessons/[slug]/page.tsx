import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireClassAuth } from "@/lib/auth";
import { hasClassAccess, progressForUser, publishedLessonTitle, publishedLessons } from "@/lib/classes.server";
import { ClassLessonView } from "@/components/class-lesson-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const title = await publishedLessonTitle("toddlerhood", (await params).slug);
  return title ? { title } : {};
}

export default async function ClassLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireClassAuth(`/app/classes/toddlerhood/lessons/${slug}`);
  if (!(await hasClassAccess(user.id))) redirect("/app/classes/toddlerhood");
  const [lessons, progress] = await Promise.all([publishedLessons(), progressForUser(user.id)]);
  const index = lessons.findIndex((item) => item.slug === slug);
  if (index < 0) notFound();
  const place = progress.find((row) => row.lesson_id === lessons[index].id);
  return <ClassLessonView courseSlug="toddlerhood" lessons={lessons} index={index} place={place} />;
}
