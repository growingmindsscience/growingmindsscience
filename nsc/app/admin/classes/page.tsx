import Link from "next/link";
import { requireClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { TODDLER_COURSE, type ClassLesson } from "@/lib/classes";
import { Button, Card, Field, Input } from "@/components/ui";
import { createLesson } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage classes" };

export default async function ClassAdminPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireClassAdmin();
  const { data, error } = await createServiceClient().from("class_lessons")
    .select("*")
    .eq("course_slug", TODDLER_COURSE.slug)
    .order("module_number")
    .order("position");
  const lessons = (data ?? []) as ClassLesson[];
  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <Link href="/admin" className="text-sm text-teal-soft underline">← Admin</Link>
        <h1 className="mt-5 text-2xl font-semibold text-ink-deep">Toddler class lessons</h1>
        <p className="mt-2 text-sm text-ink">Create a lesson, upload its MP4, review captions and written text, then publish it.</p>
      </header>
      {(error || params.error) && <p role="alert" className="rounded-xl bg-rung-glow p-4 text-sm text-[#9C4429]">{params.error || `Class tables unavailable: ${error?.message}`}</p>}

      <Card>
        <h2 className="text-lg font-semibold text-ink-deep">Add a lesson</h2>
        <form action={createLesson} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Lesson title" htmlFor="title"><Input id="title" name="title" required maxLength={160} className="w-full" /></Field></div>
          <Field label="Module" htmlFor="module_number">
            <select id="module_number" name="module_number" required className="rounded-xl border border-sea-glass bg-surface px-4 py-3 text-ink">
              {TODDLER_COURSE.modules.map((module, index) => <option key={module} value={index + 1}>{index + 1}. {module}</option>)}
            </select>
          </Field>
          <Field label="Position in module" htmlFor="position"><Input id="position" name="position" type="number" min={1} required defaultValue={1} /></Field>
          <div className="sm:col-span-2"><Field label="URL slug (optional)" htmlFor="slug"><Input id="slug" name="slug" placeholder="Generated from title if blank" className="w-full" /></Field></div>
          <Button type="submit" className="sm:col-span-2">Create draft lesson</Button>
        </form>
      </Card>

      {TODDLER_COURSE.modules.map((module, index) => (
        <section key={module}>
          <h2 className="mb-3 text-lg font-semibold text-ink-deep">{index + 1}. {module}</h2>
          <ul className="flex flex-col gap-2">
            {lessons.filter((lesson) => lesson.module_number === index + 1).map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/admin/classes/${lesson.id}`} className="flex items-center justify-between rounded-xl border border-sea-glass bg-surface px-5 py-4 hover:bg-sea-glass/20">
                  <span className="font-semibold text-ink">{lesson.position}. {lesson.title}</span>
                  <span className="text-sm text-teal-soft">{lesson.status} · {lesson.mux_playback_id ? "video ready" : "needs video"}</span>
                </Link>
              </li>
            ))}
            {!lessons.some((lesson) => lesson.module_number === index + 1) && <li className="text-sm text-teal-soft">No lessons yet.</li>}
          </ul>
        </section>
      ))}
    </main>
  );
}
