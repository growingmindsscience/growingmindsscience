import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClassCourseSlug, ClassLesson } from "@/lib/classes";

// The player is a client component with its own tests; here only its props matter.
const playerProps: Record<string, unknown>[] = [];
vi.mock("@/components/class-player", () => ({
  ClassPlayer: (props: Record<string, unknown>) => {
    playerProps.push(props);
    return createElement("div", { "data-player": props.lessonId });
  },
}));
// class-chrome also holds the header, whose sign-out server action cannot load under vitest.
vi.mock("@/components/class-chrome", () => ({
  Eyebrow: ({ children }: { children: unknown }) => createElement("p", null, children as never),
}));

const { ClassLessonView, LONG_LESSON_PARAGRAPHS } = await import("@/components/class-lesson-view");

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

function lesson(slug: string, module_number: number, transcript = "", extra: Partial<ClassLesson> = {}): ClassLesson {
  return {
    id: `id-${slug}`, course_slug: "infant", module_number, position: 1, slug, title: `Title ${slug}`, summary: "",
    transcript, mux_upload_id: null, mux_asset_id: null, mux_playback_id: null, duration_seconds: 300,
    captions_ready: true, status: "published", ...extra,
  };
}

const longText = Array.from({ length: LONG_LESSON_PARAGRAPHS }, (_, i) => `Paragraph ${i + 1} sentence.`).join("\n\n");
const lessons = [lesson("one", 1, longText), lesson("two", 1, "Short."), lesson("three", 2, longText)];

function render(courseSlug: ClassCourseSlug, list: ClassLesson[], index: number, place?: { position_seconds: number | null; completed_at: string | null }) {
  playerProps.length = 0;
  return renderToStaticMarkup(createElement(ClassLessonView, { courseSlug, lessons: list, index, place }));
}

/** The markup of one landmark, by its aria-label. */
function nav(html: string, label: string): string {
  const start = html.indexOf(`<nav aria-label="${label}"`);
  return start < 0 ? "" : html.slice(start, html.indexOf("</nav>", start));
}

describe("ClassLessonView", () => {
  it("names both neighbours by title, with course-aware links, near the player", () => {
    const html = render("infant", lessons, 1);
    const pager = nav(html, "Previous and next lessons");
    expect(text(pager)).toContain("Previous lesson Title one");
    expect(text(pager)).toContain("Next lesson · Module 2 → Title three");
    expect(pager).toContain('href="/app/classes/infant/lessons/one"');
    expect(pager).toContain('href="/app/classes/infant/lessons/three"');
    expect(html.indexOf("data-player")).toBeLessThan(html.indexOf('aria-label="Previous and next lessons"'));
  });

  it("first lesson has no previous link; last lesson leads back to My classes", () => {
    const first = nav(render("preschool", lessons, 0), "Previous and next lessons");
    expect(first).not.toContain("Previous lesson");
    expect(text(first)).toContain("Title two");
    const last = nav(render("preschool", lessons, 2), "Previous and next lessons");
    expect(text(last)).toContain("Last lesson of the class");
    expect(last).toContain('href="/app/classes"');
    expect(last).not.toContain("Next lesson");
  });

  it("has Watch and Read shortcuts for every class, and Practice only with a companion", () => {
    for (const course of ["infant", "toddlerhood", "preschool", "family"] as const) {
      const shortcuts = nav(render(course, lessons, 0), "On this page");
      expect(shortcuts).toContain('href="#watch"');
      expect(shortcuts).toContain('href="#read"');
      expect(shortcuts).not.toContain('href="#practice"');
    }
    const toddler = [lesson("inside-a-tantrum", 1, longText, { course_slug: "toddlerhood" }), lessons[1]];
    const html = render("toddlerhood", toddler, 0);
    expect(nav(html, "On this page")).toContain('href="#practice"');
    expect(html).toContain('id="practice"');
  });

  it("links the class outline to this lesson's module", () => {
    expect(render("family", lessons, 2)).toContain('href="/app/classes/family#module-2"');
  });

  it("gives every navigation landmark a distinct label", () => {
    const labels = [...render("infant", lessons, 0).matchAll(/<nav aria-label="([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(["On this page", "Previous and next lessons", "After reading"]);
  });

  it("ends a long read with a way back up and on, and skips it for short or missing text", () => {
    const end = nav(render("infant", lessons, 0), "After reading");
    expect(end).toContain('href="#watch"');
    expect(text(end)).toContain("Next: Title two");
    expect(nav(render("infant", lessons, 2), "After reading")).toContain('href="/app/classes"');
    expect(render("infant", lessons, 1)).not.toContain('aria-label="After reading"');
    const missing = render("infant", [lesson("empty", 1, "")], 0);
    expect(missing).toContain('id="read"');
    expect(text(missing)).toContain("The written version of this lesson is not ready yet.");
    expect(missing).not.toContain('aria-label="After reading"');
  });

  it("passes the paid player its course, resume point, completion and next lesson", () => {
    render("toddlerhood", lessons, 0, { position_seconds: 42, completed_at: null });
    expect(playerProps[0]).toMatchObject({
      lessonId: "id-one", title: "Title one", courseSlug: "toddlerhood", startTime: 42, completed: false,
      posterLabel: "Module 1 · Lesson 1 of 3", posterMinutes: 5,
      next: { href: "/app/classes/toddlerhood/lessons/two", title: "Title two", minutes: 5 },
    });
    expect(playerProps[0]).not.toHaveProperty("preview");
    render("infant", lessons, 2, { position_seconds: 42, completed_at: "2026-11-01T00:00:00Z" });
    expect(playerProps[0]).toMatchObject({ startTime: 0, completed: true, next: undefined });
  });
});
