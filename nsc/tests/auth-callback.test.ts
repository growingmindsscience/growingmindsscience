import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// The route's only outside calls: the code exchange and the purchase backfill.
const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}));
vi.mock("@/lib/backfill.server", () => ({ backfillEntitlementsForUser: vi.fn(async () => {}) }));

vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
const { GET } = await import("@/app/auth/callback/route");

const ENROLL = "/app/classes/infant/enroll";
const SUCCESS = "/app/classes/infant/success?session_id=cs_test_123";

/** The callback URL a reset email carries, with `next` encoded once as the action does. */
function callback(next: string, code: string | null = null): Request {
  const url = new URL("https://internal.test/nsc/auth/callback");
  if (code) url.searchParams.set("code", code);
  url.searchParams.set("next", next);
  return new Request(url);
}

/** The class reset `next` built the way requestPasswordReset builds it. */
function classReset(destination: string): string {
  return `/reset/update?class=1&next=${encodeURIComponent(destination)}`;
}

async function land(req: Request) {
  const res = await GET(req);
  expect(res.status).toBe(307);
  const to = new URL(res.headers.get("location")!);
  return { to, path: to.pathname, next: to.searchParams.get("next"), error: to.searchParams.get("error") ?? "" };
}

beforeEach(() => {
  exchangeCodeForSession.mockReset();
  exchangeCodeForSession.mockResolvedValue({ data: {}, error: { message: "otp_expired" } });
});
afterAll(() => vi.unstubAllEnvs());

describe("auth callback, failed class reset link", () => {
  it("an expired class reset keeps the checkout destination", async () => {
    const r = await land(callback(classReset(ENROLL), "expired-code"));
    expect(r.to.origin).toBe("https://example.test");
    expect(r.path).toBe("/nsc/class-login");
    expect(r.next).toBe(ENROLL);
    expect(r.error).toBe("That link expired. Please request a fresh one.");
  });

  it("a reset link with no code at all also keeps it", async () => {
    const r = await land(callback(classReset(ENROLL)));
    expect(r.path).toBe("/nsc/class-login");
    expect(r.next).toBe(ENROLL);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("keeps a class success session through the reset", async () => {
    const r = await land(callback(classReset(SUCCESS), "expired-code"));
    expect(r.next).toBe(SUCCESS);
  });

  it("reads the class flag and nested next in either order", async () => {
    const r = await land(callback(`/reset/update?next=${encodeURIComponent(ENROLL)}&class=1`, "x"));
    expect(r.path).toBe("/nsc/class-login");
    expect(r.next).toBe(ENROLL);
  });

  it("falls back to My classes for offsite, malformed or double-encoded nested paths", async () => {
    for (const nested of [
      "//evil.example/steal",
      "/\\evil.example",
      "https://evil.example/app/classes",
      encodeURIComponent(ENROLL), // double-encoded: no leading slash once decoded
      "/app/settings", // safe but not a class path
      "",
    ]) {
      const r = await land(callback(classReset(nested), "x"));
      expect(r.to.origin).toBe("https://example.test");
      expect(r.path).toBe("/nsc/class-login");
      expect(r.next).toBe("/app/classes");
    }
  });

  it("never puts the nested path into the message", async () => {
    const r = await land(callback(classReset(SUCCESS), "x"));
    expect(r.error).not.toContain("/app");
    expect(r.error).not.toContain("cs_test");
  });

  it("does not treat lookalike paths or a missing class flag as a class reset", async () => {
    for (const next of [
      `/reset/update-x?class=1&next=${encodeURIComponent(ENROLL)}`,
      `/reset/updatex?class=1&next=${encodeURIComponent(ENROLL)}`,
      `/reset/update?class=2&next=${encodeURIComponent(ENROLL)}`,
      `/reset/update?next=${encodeURIComponent(ENROLL)}`,
    ]) {
      const r = await land(callback(next, "x"));
      expect(r.path).toBe("/nsc/login");
      expect(r.next).toBeNull();
    }
  });
});

describe("auth callback, unchanged paths", () => {
  it("an ordinary reset failure goes to the Tallykin sign-in with no next", async () => {
    const r = await land(callback("/reset/update", "expired-code"));
    expect(r.path).toBe("/nsc/login");
    expect(r.next).toBeNull();
    expect(r.error).toBe("That link expired. Please request a fresh one.");
  });

  it("a failed direct class confirmation keeps its class path and device message", async () => {
    const r = await land(callback(ENROLL, "x"));
    expect(r.path).toBe("/nsc/class-login");
    expect(r.next).toBe(ENROLL);
    expect(r.error).toContain("That link did not work here.");
  });

  it("an offsite outer next falls back to the Tallykin sign-in", async () => {
    const r = await land(callback("//evil.example", "x"));
    expect(r.to.origin).toBe("https://example.test");
    expect(r.path).toBe("/nsc/login");
    expect(r.next).toBeNull();
  });

  it("a successful exchange still continues to the outer next", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(callback(classReset(ENROLL), "good-code"));
    expect(res.headers.get("location")).toBe(
      `https://example.test/nsc/reset/update?class=1&next=${encodeURIComponent(ENROLL)}`,
    );
  });
});
