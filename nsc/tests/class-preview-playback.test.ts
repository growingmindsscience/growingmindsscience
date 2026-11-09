import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ lesson: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/classes.server", () => ({ freePreviewLesson: deps.lesson }));
vi.mock("@/lib/mux.server", () => ({ signedPlaybackToken: deps.sign }));

const infant = await import("../app/api/classes/infant/preview/playback/route");
const toddler = await import("../app/api/classes/toddlerhood/preview/playback/route");
const preschool = await import("../app/api/classes/preschool/preview/playback/route");

describe.each([
  ["infant", infant], ["toddlerhood", toddler], ["preschool", preschool],
] as const)("%s sample playback", (slug, route) => {
  beforeEach(() => {
    vi.resetAllMocks();
    deps.lesson.mockResolvedValue({ mux_playback_id: `sample-${slug}`, duration_seconds: 600 });
    deps.sign.mockReturnValue({ token: "signed-sample", expiresAt: 12345 });
  });

  it("signs only the published sample for its fixed course and disables caching", async () => {
    const response = await route.GET();
    expect(deps.lesson).toHaveBeenCalledExactlyOnceWith(slug);
    expect(deps.sign).toHaveBeenCalledExactlyOnceWith(`sample-${slug}`, 600);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ playbackId: `sample-${slug}`, token: "signed-sample", expiresAt: 12345 });
  });

  it("does not sign anything when a preview is unavailable", async () => {
    deps.lesson.mockResolvedValue(null);
    expect((await route.GET()).status).toBe(404);
    expect(deps.sign).not.toHaveBeenCalled();
  });

  it("returns a recoverable response when video signing is not configured", async () => {
    deps.sign.mockImplementation(() => { throw new Error("private signing detail"); });
    const response = await route.GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Video is not configured" });
  });
});
