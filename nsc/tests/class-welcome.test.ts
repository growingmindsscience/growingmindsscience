import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BundleWelcome, ClassWelcome, welcomeState } from "@/components/class-welcome";

// The waiter is a client component; outside the app router it needs a stand-in.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("welcomeState", () => {
  it("treats an owner as ready with or without a checkout reference", () => {
    expect(welcomeState(true, true)).toBe("ready");
    expect(welcomeState(true, false)).toBe("ready");
  });

  it("checks only when there is a reference, and otherwise has nothing to confirm", () => {
    expect(welcomeState(false, true)).toBe("checking");
    expect(welcomeState(false, false)).toBe("no-reference");
  });
});

describe("ClassWelcome", () => {
  it("leads a new owner to the first lesson, with the note from Matthew", () => {
    const html = renderToStaticMarkup(createElement(ClassWelcome, { state: "ready", courseSlug: "toddlerhood", firstLessonSlug: "inside-a-tantrum" }));
    expect(text(html)).toContain("Toddler years is yours to keep");
    expect(html).toContain('href="/app/classes/toddlerhood/lessons/inside-a-tantrum"');
    expect(text(html)).toContain("Start the first lesson");
    expect(html).toContain('href="/app/classes/toddlerhood"');
    expect(text(html)).toContain("A note from Matthew");
    expect(html).toContain("/contact/");
    expect(html).toContain('href="/app/classes"');
    expect(html).not.toContain('role="status"');
  });

  it("falls back to the classroom when no lesson is published", () => {
    const html = renderToStaticMarkup(createElement(ClassWelcome, { state: "ready", courseSlug: "preschool" }));
    expect(text(html)).toContain("Open class");
    expect(html).toContain('href="/app/classes/preschool"');
  });

  it("with a reference but no access, checks neutrally and offers a reload that keeps the URL", () => {
    const html = renderToStaticMarkup(createElement(ClassWelcome, { state: "checking", courseSlug: "infant" }));
    const t = text(html);
    expect(t).toContain("Checking your class access");
    expect(t).toContain("Birth to 12 months");
    expect(html).toContain('role="status"');
    // An empty href reloads this exact URL, session_id included, with no JavaScript.
    expect(html).toMatch(/<a href="" [^>]*>Check again<\/a>/);
    expect(html).toContain("<noscript>");
    expect(html).toContain('href="/app/classes"');
    expect(html).toContain("/contact/");
    expect(t).toContain("no need to pay again");
    // Never claims a purchase, and offers no way to buy.
    expect(t).not.toMatch(/thank you|enrolled|payment (is )?confirm|is yours|ready/i);
    expect(html).not.toMatch(/checkout\?|\/buy|cs_/);
    expect(t).not.toContain("A note from Matthew");
  });

  it("with no reference and no access, points to My classes without checking or thanking", () => {
    const html = renderToStaticMarkup(createElement(ClassWelcome, { state: "no-reference", courseSlug: "family" }));
    const t = text(html);
    expect(t).toContain("Find your class in My classes");
    expect(html).toContain('href="/app/classes"');
    expect(t).toContain("Have a receipt");
    expect(html).toContain("/contact/");
    expect(html).not.toContain('role="status"');
    expect(t).not.toContain("Check again");
    expect(t).not.toMatch(/thank you|enrolled|checking|is yours/i);
  });
});

describe("BundleWelcome", () => {
  it("offers each class's first lesson so the parent starts at their child's age", () => {
    const html = renderToStaticMarkup(createElement(BundleWelcome, {
      state: "ready",
      starts: [
        { courseSlug: "infant", firstLessonSlug: "a" },
        { courseSlug: "toddlerhood", firstLessonSlug: "b" },
        { courseSlug: "preschool" },
      ],
    }));
    expect(text(html)).toContain("All three classes are ready");
    expect(html).toContain('href="/app/classes/infant/lessons/a"');
    expect(html).toContain('href="/app/classes/toddlerhood/lessons/b"');
    expect(html).toContain('href="/app/classes/preschool"');
    expect((text(html).match(/Start lesson 1/g) ?? []).length).toBe(2);
    expect(text(html)).toContain("A note from Matthew");
  });

  it("checks the bundle without listing classes as owned", () => {
    const html = renderToStaticMarkup(createElement(BundleWelcome, {
      state: "checking",
      starts: [{ courseSlug: "infant" }, { courseSlug: "toddlerhood" }, { courseSlug: "preschool" }],
    }));
    const t = text(html);
    expect(t).toContain("Checking your class access");
    expect(t).toContain("Check again");
    expect(t).not.toMatch(/Start lesson 1|Open class|are ready|thank you/i);
  });

  it("with no reference, sends the parent to My classes", () => {
    const html = renderToStaticMarkup(createElement(BundleWelcome, { state: "no-reference", starts: [] }));
    expect(text(html)).toContain("Find your classes in My classes");
    expect(html).not.toContain('role="status"');
  });
});
