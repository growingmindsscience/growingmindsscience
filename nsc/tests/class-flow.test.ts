import { afterEach, describe, expect, it } from "vitest";
import { infantSalesGate } from "@/lib/classes";
import { classDestination, isClassPath } from "@/lib/class-paths";
import { sitePath } from "@/lib/site";

const USER = "3f2b8c1e-0d4a-4b6f-9a7e-1c2d3e4f5a6b";
const ready = { salesFlag: "1", vercelEnv: "production", previewUserId: undefined, userId: USER, moduleCounts: [5, 4, 3, 4] };

describe("infant sales gate", () => {
  it("opens in production once the flag is on and every lesson is published", () => {
    expect(infantSalesGate(ready)).toEqual({ open: true });
  });

  it("opens on preview only for the allowed user", () => {
    expect(infantSalesGate({ ...ready, vercelEnv: "preview", previewUserId: USER })).toEqual({ open: true });
    expect(infantSalesGate({ ...ready, vercelEnv: "preview", previewUserId: USER, userId: "someone-else" }).open).toBe(false);
    expect(infantSalesGate({ ...ready, vercelEnv: "preview", previewUserId: undefined }).open).toBe(false);
    expect(infantSalesGate({ ...ready, vercelEnv: "preview", previewUserId: USER, userId: undefined }).open).toBe(false);
  });

  it("tolerates whitespace and case in pasted env values", () => {
    expect(infantSalesGate({ ...ready, salesFlag: "1\n" })).toEqual({ open: true });
    expect(infantSalesGate({ ...ready, vercelEnv: "preview", previewUserId: ` ${USER.toUpperCase()}\n` })).toEqual({ open: true });
  });

  it("stays closed without the flag or with lessons missing", () => {
    expect(infantSalesGate({ ...ready, salesFlag: undefined }).open).toBe(false);
    expect(infantSalesGate({ ...ready, salesFlag: "0" }).open).toBe(false);
    expect(infantSalesGate({ ...ready, moduleCounts: [5, 4, 3, 3] })).toEqual({
      open: false, reason: "published lesson counts do not match: module 4 has 3, needs 4",
    });
  });

  it("never writes a configured value into the logged reason", () => {
    const secret = "9a8b7c6d-1111-2222-3333-444455556666";
    for (const input of [
      { ...ready, salesFlag: "sekrit-flag" },
      { ...ready, vercelEnv: "preview", previewUserId: secret },
      { ...ready, vercelEnv: "preview", previewUserId: secret, userId: undefined },
    ]) {
      const gate = infantSalesGate(input);
      expect(gate.open).toBe(false);
      const reason = gate.open ? "" : gate.reason;
      expect(reason).not.toContain(secret);
      expect(reason).not.toContain("sekrit-flag");
      expect(reason).not.toContain(USER);
    }
  });
});

describe("class sign-in destination", () => {
  it("never lands a class sign-in on the Number Path dashboard", () => {
    expect(classDestination(undefined)).toBe("/app/classes");
    expect(classDestination("/app")).toBe("/app/classes");
    expect(classDestination("/app/child/new")).toBe("/app/classes");
    expect(classDestination("/app/classesX")).toBe("/app/classes");
    expect(classDestination("//evil.example/app/classes")).toBe("/app/classes");
  });

  it("keeps a class destination", () => {
    expect(classDestination("/app/classes/infant")).toBe("/app/classes/infant");
    expect(classDestination("/app/classes/infant/success?session_id=cs_1")).toBe("/app/classes/infant/success?session_id=cs_1");
    expect(isClassPath("/admin/classes")).toBe(true);
    expect(isClassPath("/app")).toBe(false);
  });
});

describe("static-site links", () => {
  const saved = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = saved;
  });

  it("follows the configured origin instead of a hard-coded host", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example/";
    expect(sitePath("/classes/")).toBe("https://preview.example/classes/");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(sitePath("classes/")).toBe("https://growingmindsscience.com/classes/");
  });
});
