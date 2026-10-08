import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { CLASS_COURSES, isClassCourseSlug, type ClassLesson } from "@/lib/classes";
import { Button, Card, Field, Input } from "@/components/ui";
import { ClassUpload } from "@/components/class-upload";
import { saveLesson } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditClassLesson({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireClassAdmin();
  const { id } = await params;
  const { data } = await createServiceClient().from("class_lessons")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const courseSlug: string | undefined = data?.course_slug;
  if (!data || !courseSlug || !isClassCourseSlug(courseSlug)) notFound();
  const lesson = data as ClassLesson;
  const course = CLASS_COURSES[courseSlug];
  const { error, saved } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href={`/admin/classes?course=${course.slug}`} className="text-sm text-ink-muted underline">← All lessons</Link>
        <h1 className="mt-5 text-2xl font-semibold text-ink-deep">{lesson.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{course.shortTitle} · {lesson.status} · /{lesson.slug}</p>
      </header>
      {error && <p role="alert" className="rounded-xl bg-rung-glow p-4 text-sm text-danger">{error}</p>}
      {saved && <p role="status" className="rounded-xl bg-sea-glass/40 p-4 text-sm text-ink">Lesson saved.</p>}

      <Card>
        <h2 className="text-lg font-semibold text-ink-deep">Video</h2>
        <p className="mt-2 text-sm text-ink">MP4s upload directly to a private Mux asset. Keep this page open until the upload reaches 100%.</p>
        <div className="mt-5"><ClassUpload lessonId={lesson.id} /></div>
        <p className="mt-4 text-xs text-ink-muted">{lesson.mux_playback_id ? `Signed video ready · ${lesson.duration_seconds ?? "?"} seconds` : "No ready video attached yet."}</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-deep">Lesson content and publishing</h2>
        <form action={saveLesson.bind(null, lesson.id)} className="mt-5 flex flex-col gap-5">
          <Field label="Title" htmlFor="title"><Input id="title" name="title" defaultValue={lesson.title} required maxLength={160} /></Field>
          <Field label="Short summary" htmlFor="summary">
            <textarea id="summary" name="summary" defaultValue={lesson.summary} rows={3} maxLength={1000} className="rounded-xl border border-line bg-surface px-4 py-3 text-ink" />
          </Field>
          <Field label="Full written lesson / transcript" htmlFor="transcript" hint="Required before publishing. Plain text with blank lines between paragraphs.">
            <textarea id="transcript" name="transcript" defaultValue={lesson.transcript} rows={18} maxLength={100000} className="rounded-xl border border-line bg-surface px-4 py-3 text-ink" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Module" htmlFor="module_number">
              <select id="module_number" name="module_number" defaultValue={lesson.module_number} className="rounded-xl border border-line bg-surface px-4 py-3 text-ink">
                {course.modules.map((module, index) => <option key={module} value={index + 1}>{index + 1}. {module}</option>)}
              </select>
            </Field>
            <Field label="Position in module" htmlFor="position"><Input id="position" name="position" type="number" min={1} defaultValue={lesson.position} required /></Field>
          </div>
          <label className="flex items-start gap-3 text-sm text-ink">
            <input type="checkbox" name="captions_ready" defaultChecked={lesson.captions_ready} className="mt-1" />
            I reviewed the English captions in Mux and they are ready for students.
          </label>
          <Field label="Visibility" htmlFor="status">
            <select id="status" name="status" defaultValue={lesson.status} className="rounded-xl border border-line bg-surface px-4 py-3 text-ink">
              <option value="draft">Draft — hidden from customers</option>
              <option value="published">Published — paid customers can view</option>
            </select>
          </Field>
          <p className="text-xs text-ink-muted">Publishing requires a ready signed video, reviewed captions, and a written lesson.</p>
          <Button type="submit" className="self-start">Save lesson</Button>
        </form>
      </Card>
    </main>
  );
}
