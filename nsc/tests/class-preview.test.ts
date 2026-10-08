import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { INFANT_PREVIEW_PATH, classLessonNumber, freePreviewLessonWith } from "../lib/class-preview";
import { INFANT_MODULE_LESSON_COUNTS } from "../lib/classes";
import { isPublicPath } from "../lib/supabase/middleware";
import { FakeDb, type Row } from "./fake-supabase";

const asDb = (db: FakeDb) => db as unknown as SupabaseClient;
const root = join(__dirname, "..");

function lesson(overrides: Row): Row {
  return {
    course_slug: "infant", module_number: 1, summary: "", transcript: "Words.", duration_seconds: 600,
    mux_playback_id: `playback-${overrides.slug}`, status: "published", is_free_preview: false, ...overrides,
  };
}

describe("free preview lesson", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns only the flagged, published lesson of the class asked for", async () => {
    const db = new FakeDb().seed("class_lessons", [
      lesson({ id: "a", slug: "born-ready-to-connect", position: 1 }),
      lesson({ id: "b", slug: "serve-and-return", position: 3, is_free_preview: true }),
      lesson({ id: "c", slug: "a-brain-built-by-experience", position: 2 }),
      lesson({ id: "t", slug: "toddler-sample", course_slug: "toddlerhood", is_free_preview: true }),
    ]);
    const found = await freePreviewLessonWith(asDb(db), "infant");
    expect(found?.id).toBe("b");
    expect(found?.position).toBe(3);
    expect(found?.mux_playback_id).toBe("playback-serve-and-return");
    expect(await freePreviewLessonWith(asDb(db), "preschool")).toBeNull();
  });

  it("has no preview while the flagged lesson is a draft or has no video", async () => {
    const draft = new FakeDb().seed("class_lessons", [
      lesson({ id: "b", slug: "serve-and-return", is_free_preview: true, status: "draft" }),
    ]);
    expect(await freePreviewLessonWith(asDb(draft), "infant")).toBeNull();
    const noVideo = new FakeDb().seed("class_lessons", [
      lesson({ id: "b", slug: "serve-and-return", is_free_preview: true, mux_playback_id: null }),
    ]);
    expect(await freePreviewLessonWith(asDb(noVideo), "infant")).toBeNull();
  });

  it("treats a failed read, such as the column before its migration, as no preview", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const db = new FakeDb().fail("class_lessons", "select", { code: "42703", message: "column class_lessons.is_free_preview does not exist" });
    expect(await freePreviewLessonWith(asDb(db), "infant")).toBeNull();
    expect(warn).toHaveBeenCalledWith("[class-preview] infant preview unavailable: 42703");
  });

  it("numbers a lesson across the whole class for the end card", () => {
    expect(classLessonNumber(INFANT_MODULE_LESSON_COUNTS, 1, 3)).toBe(3);
    expect(classLessonNumber(INFANT_MODULE_LESSON_COUNTS, 2, 1)).toBe(6);
    expect(classLessonNumber(INFANT_MODULE_LESSON_COUNTS, 4, 4)).toBe(16);
  });
});

describe("free preview access", () => {
  it("opens the preview page to signed-out visitors and nothing else in the class", () => {
    expect(isPublicPath(INFANT_PREVIEW_PATH)).toBe(true);
    expect(isPublicPath("/classes")).toBe(false);
    expect(isPublicPath("/classes/infant")).toBe(false);
    expect(isPublicPath(`${INFANT_PREVIEW_PATH}/other`)).toBe(false);
    expect(isPublicPath("/app/classes/infant")).toBe(false);
    expect(isPublicPath("/app/classes/infant/lessons/serve-and-return")).toBe(false);
  });

  it("signs playback without reading anything from the request", () => {
    const src = readFileSync(join(root, "app/api/classes/infant/preview/playback/route.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(src).toMatch(/export async function GET\(\)/);
    expect(src).not.toMatch(/params|searchParams|request|cookies|headers\(\)/);
    expect(src).toMatch(/export const dynamic = "force-dynamic"/);
  });

  it("flags one lesson and adds no policy that would expose lessons to the API", () => {
    const sql = readFileSync(join(root, "supabase/migrations/0017_free_preview_lesson.sql"), "utf8")
      .replace(/--.*$/gm, "");
    expect(sql).not.toMatch(/create policy|grant /i);
    expect(sql).toMatch(/unique index[\s\S]*\(course_slug\) where is_free_preview/);
    const updates = sql.match(/update[\s\S]*?;/gi) ?? [];
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatch(/where course_slug = 'infant' and slug = 'serve-and-return'/);
  });
});
