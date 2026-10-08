import Link from "next/link";
import { requireClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { CLASS_COURSES, isClassCourseSlug, type ClassCourseSlug, type ClassLesson } from "@/lib/classes";
import { Button, Card, Field, Input } from "@/components/ui";
import { createLesson } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage classes" };

export default async function ClassAdminPage({ searchParams }: {
  searchParams: Promise<{ error?: string; course?: string }>;
}) {
  await requireClassAdmin();
  const params = await searchParams;
  const requestedCourse = params.course ?? "";
  const courseSlug: ClassCourseSlug = isClassCourseSlug(requestedCourse) ? requestedCourse : "infant";
  const course = CLASS_COURSES[courseSlug];
  const { data, error } = await createServiceClient().from("class_lessons")
    .select("*")
    .eq("course_slug", courseSlug)
    .order("module_number")
    .order("position");
  const lessons = (data ?? []) as ClassLesson[];
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <Link href="/admin" className="text-sm text-ink-muted underline">← Admin</Link>
        <h1 className="mt-5 text-2xl font-semibold text-ink-deep">{course.shortTitle} lessons</h1>
        <p className="mt-2 text-sm text-ink">Create a lesson, upload its MP4, review captions and written text, then publish it.</p>
        <nav aria-label="Choose class" className="mt-4 flex gap-4 text-sm">
          <Link href="/admin/classes?course=infant" className="text-teal underline">Infant course</Link>
          <Link href="/admin/classes?course=toddlerhood" className="text-teal underline">Toddler course</Link>
          <Link href="/admin/classes?course=preschool" className="text-teal underline">Preschool course</Link>
        </nav>
      </header>
      {(error || params.error) && <p role="alert" className="rounded-xl bg-rung-glow p-4 text-sm text-danger">{params.error || `Class tables unavailable: ${error?.message}`}</p>}

      <Card>
        <h2 className="text-lg font-semibold text-ink-deep">Add a lesson</h2>
        <form action={createLesson} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="course_slug" value={courseSlug} />
          <div className="sm:col-span-2"><Field label="Lesson title" htmlFor="title"><Input id="title" name="title" required maxLength={160} className="w-full" /></Field></div>
          <Field label="Module" htmlFor="module_number">
            <select id="module_number" name="module_number" required className="rounded-xl border border-line bg-surface px-4 py-3 text-ink">
              {course.modules.map((module, index) => <option key={module} value={index + 1}>{index + 1}. {module}</option>)}
            </select>
          </Field>
          <Field label="Position in module" htmlFor="position"><Input id="position" name="position" type="number" min={1} required defaultValue={1} /></Field>
          <div className="sm:col-span-2"><Field label="URL slug (optional)" htmlFor="slug"><Input id="slug" name="slug" placeholder="Generated from title if blank" className="w-full" /></Field></div>
          <Button type="submit" className="sm:col-span-2">Create draft lesson</Button>
        </form>
      </Card>

      {course.modules.map((module, index) => (
        <section key={module}>
          <h2 className="mb-3 text-lg font-semibold text-ink-deep">{index + 1}. {module}</h2>
          <ul className="flex flex-col gap-2">
            {lessons.filter((lesson) => lesson.module_number === index + 1).map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/admin/classes/${lesson.id}`} className="flex items-center justify-between rounded-xl border border-line bg-surface px-5 py-4 hover:bg-sea-glass/20">
                  <span className="font-semibold text-ink">{lesson.position}. {lesson.title}</span>
                  <span className="text-sm text-ink-muted">{lesson.status} · {lesson.mux_playback_id ? "video ready" : "needs video"}</span>
                </Link>
              </li>
            ))}
            {!lessons.some((lesson) => lesson.module_number === index + 1) && <li className="text-sm text-ink-muted">No lessons yet.</li>}
          </ul>
        </section>
      ))}
    </main>
  );
}
