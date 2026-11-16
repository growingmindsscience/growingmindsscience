import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClassOutline } from "@/components/class-outline";
import type { ClassLesson } from "@/lib/classes";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
const modules = ["First module", "Second module", "Third module"] as const;

function lesson(slug: string, module_number: number): ClassLesson {
  return {
    id: slug, course_slug: "infant", module_number, position: 1, slug, title: `Title ${slug}`, summary: "",
    transcript: "", mux_upload_id: null, mux_asset_id: null, mux_playback_id: null, duration_seconds: 300,
    captions_ready: true, status: "published",
  };
}

const lessons = [lesson("a", 1), lesson("b", 1), lesson("c", 2), lesson("d", 3)];

function index(html: string): string {
  const start = html.indexOf('<nav aria-label="Jump to a module"');
  return start < 0 ? "" : html.slice(start, html.indexOf("</nav>", start));
}

describe("ClassOutline module index", () => {
  it("links each populated module to its heading, before the outline", () => {
    const html = renderToStaticMarkup(createElement(ClassOutline, { modules, lessons, courseSlug: "infant" }));
    const nav = index(html);
    for (const n of [1, 2, 3]) {
      expect(nav).toContain(`href="#module-${n}"`);
      expect(html).toContain(`id="module-${n}"`);
    }
    expect(html.indexOf("Jump to a module")).toBeLessThan(html.indexOf('id="module-1"'));
  });

  it("leaves out empty modules, and the index itself when fewer than two have lessons", () => {
    const partial = renderToStaticMarkup(createElement(ClassOutline, { modules, lessons: lessons.slice(0, 3), courseSlug: "infant" }));
    expect(index(partial)).not.toContain('href="#module-3"');
    expect(partial).toContain("Lessons are being prepared.");
    const single = renderToStaticMarkup(createElement(ClassOutline, { modules, lessons: lessons.slice(0, 2), courseSlug: "infant" }));
    expect(single).not.toContain("Jump to a module");
  });

  it("marks nothing before any progress, and nothing for a locked outline", () => {
    for (const locked of [false, true]) {
      const nav = index(renderToStaticMarkup(createElement(ClassOutline, { modules, lessons, courseSlug: "infant", locked })));
      expect(text(nav)).not.toMatch(/Up next|Resume here|Done/);
    }
    const locked = renderToStaticMarkup(createElement(ClassOutline, {
      modules, lessons, courseSlug: "infant", locked: true,
      progress: [{ lesson_id: "a", position_seconds: 300, completed_at: "2026-11-01T00:00:00Z" }],
    }));
    expect(text(index(locked))).not.toMatch(/Up next|Resume here|Done/);
    expect(locked).not.toContain("/app/classes/infant/lessons/");
  });

  it("marks finished modules and the module to resume from real progress", () => {
    const html = renderToStaticMarkup(createElement(ClassOutline, {
      modules, lessons, courseSlug: "infant",
      progress: [
        { lesson_id: "a", position_seconds: 300, completed_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z" },
        { lesson_id: "b", position_seconds: 300, completed_at: "2026-11-02T00:00:00Z", updated_at: "2026-11-02T00:00:00Z" },
        { lesson_id: "c", position_seconds: 90, completed_at: null, updated_at: "2026-11-03T00:00:00Z" },
      ],
    }));
    const nav = text(index(html));
    expect(nav).toContain("Module 1 · ✓ Done First module");
    expect(nav).toContain("Module 2 · Resume here Second module");
    expect(nav).toMatch(/Module 3 Third module/);
    // Every lesson route is still linked from the outline itself.
    for (const slug of ["a", "b", "c", "d"]) expect(html).toContain(`href="/app/classes/infant/lessons/${slug}"`);
  });
});
