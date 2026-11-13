import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BundleWelcome, ClassWelcome } from "@/components/class-welcome";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("ClassWelcome", () => {
  it("leads a new owner to the first lesson, with the note from Matthew", () => {
    const html = renderToStaticMarkup(createElement(ClassWelcome, { ready: true, courseSlug: "toddlerhood", firstLessonSlug: "inside-a-tantrum" }));
    expect(text(html)).toContain("Toddler years is yours to keep");
    expect(html).toContain('href="/app/classes/toddlerhood/lessons/inside-a-tantrum"');
    expect(text(html)).toContain("Start the first lesson");
    expect(text(html)).toContain("A note from Matthew");
    expect(html).toContain("/contact/");
  });

  it("falls back to the classroom when no lesson is published", () => {
    const html = renderToStaticMarkup(createElement(ClassWelcome, { ready: true, courseSlug: "preschool" }));
    expect(text(html)).toContain("Open class");
    expect(html).toContain('href="/app/classes/preschool"');
  });
});

describe("BundleWelcome", () => {
  it("offers each class's first lesson so the parent starts at their child's age", () => {
    const html = renderToStaticMarkup(createElement(BundleWelcome, {
      ready: true,
      starts: [
        { courseSlug: "infant", firstLessonSlug: "a" },
        { courseSlug: "toddlerhood", firstLessonSlug: "b" },
        { courseSlug: "preschool" },
        { courseSlug: "family", firstLessonSlug: "d" },
      ],
    }));
    expect(text(html)).toContain("All four classes are ready");
    expect(html).toContain('href="/app/classes/infant/lessons/a"');
    expect(html).toContain('href="/app/classes/toddlerhood/lessons/b"');
    expect(html).toContain('href="/app/classes/preschool"');
    expect(html).toContain('href="/app/classes/family/lessons/d"');
    expect((text(html).match(/Start lesson 1/g) ?? []).length).toBe(3);
  });
});
