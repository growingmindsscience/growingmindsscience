import { afterEach, describe, expect, it } from "vitest";
import { infantSalesGate, preschoolSalesGate, toddlerSalesGate } from "@/lib/classes";
import {
  INFANT_ENROLL_PATH, PRESCHOOL_ENROLL_PATH, TODDLER_ENROLL_PATH, classDestination, enrollingCourse, isClassPath,
} from "@/lib/class-paths";
import { sitePath } from "@/lib/site";

const USER = "3f2b8c1e-0d4a-4b6f-9a7e-1c2d3e4f5a6b";
const ready = { salesFlag: "1", vercelEnv: "production", previewUserId: undefined, userId: USER, moduleCounts: [5, 4, 3, 4] };

describe("preschool sales gate", () => {
  const preschoolReady = { ...ready, moduleCounts: [4, 4, 3, 4] };

  it("stays closed until its own flag is on and all 15 lessons are published", () => {
    expect(preschoolSalesGate({ ...preschoolReady, salesFlag: undefined })).toEqual({
      open: false,
      reason: "PRESCHOOL_CLASS_SALES_ENABLED is not set for this deployment; PRESCHOOL_CLASS_TEST_USER_ID is not set",
    });
    expect(preschoolSalesGate({ ...preschoolReady, moduleCounts: [4, 3, 0, 0] })).toEqual({
      open: false,
      reason: "published lesson counts do not match: module 2 has 3, needs 4; module 3 has 0, needs 3; module 4 has 0, needs 4",
    });
    // The infant lesson counts do not satisfy the preschool gate.
    expect(preschoolSalesGate(ready).open).toBe(false);
    expect(preschoolSalesGate(preschoolReady)).toEqual({ open: true });
  });
});

describe("toddler sales gate", () => {
  const toddlerReady = { ...ready, moduleCounts: [6, 6, 6, 6, 5] };

  it("stays closed until its own flag is on and all 29 lessons are published", () => {
    expect(toddlerSalesGate({ ...toddlerReady, salesFlag: undefined })).toEqual({
      open: false,
      reason: "TODDLER_CLASS_SALES_ENABLED is not set for this deployment; TODDLER_CLASS_TEST_USER_ID is not set",
    });
    // The infant flag and lessons do not open the toddler class.
    expect(toddlerSalesGate(ready).open).toBe(false);
    expect(toddlerSalesGate({ ...toddlerReady, moduleCounts: [6, 6, 6, 6, 4] })).toEqual({
      open: false, reason: "published lesson counts do not match: 28 published in all, needs 29",
    });
    expect(toddlerSalesGate(toddlerReady)).toEqual({ open: true });
  });

  it("needs every module, not just the total", () => {
    expect(toddlerSalesGate({ ...toddlerReady, moduleCounts: [8, 8, 8, 5, 0] })).toEqual({
      open: false, reason: "published lesson counts do not match: module 5 has none",
    });
    expect(toddlerSalesGate({ ...toddlerReady, moduleCounts: [29] })).toEqual({
      open: false,
      reason: "published lesson counts do not match: module 2 has none; module 3 has none; module 4 has none; module 5 has none",
    });
  });

  it("follows the same preview, test-account, and pasted-value rules as the other classes", () => {
    expect(toddlerSalesGate({ ...toddlerReady, salesFlag: " 1\n" })).toEqual({ open: true });
    expect(toddlerSalesGate({ ...toddlerReady, vercelEnv: "preview" }).open).toBe(false);
    expect(toddlerSalesGate({ ...toddlerReady, vercelEnv: "preview", previewUserId: USER })).toEqual({ open: true });
    const tester = { ...toddlerReady, salesFlag: undefined, testUserId: USER };
    expect(toddlerSalesGate(tester)).toEqual({ open: true });
    expect(toddlerSalesGate({ ...tester, userId: "someone-else" }).open).toBe(false);
  });
});

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

  it("lets only the test account buy while sales are closed", () => {
    const closed = { ...ready, salesFlag: undefined, testUserId: `${USER}\n` };
    expect(infantSalesGate(closed)).toEqual({ open: true });
    expect(infantSalesGate({ ...closed, userId: "someone-else" }).open).toBe(false);
    expect(infantSalesGate({ ...closed, userId: undefined }).open).toBe(false);
    expect(infantSalesGate({ ...closed, testUserId: "" , userId: "" }).open).toBe(false);
    // The test account still waits for every lesson to be published.
    expect(infantSalesGate({ ...closed, moduleCounts: [5, 4, 3, 0] }).open).toBe(false);
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

describe("enroll intent", () => {
  it("survives sign-in as a class destination", () => {
    expect(classDestination(INFANT_ENROLL_PATH)).toBe(INFANT_ENROLL_PATH);
    expect(classDestination(TODDLER_ENROLL_PATH)).toBe(TODDLER_ENROLL_PATH);
  });

  it("names the class only for an enroll destination", () => {
    expect(enrollingCourse(INFANT_ENROLL_PATH)?.slug).toBe("infant");
    expect(enrollingCourse("/app/classes/infant")).toBeNull();
    expect(enrollingCourse(PRESCHOOL_ENROLL_PATH)?.slug).toBe("preschool");
    expect(enrollingCourse("/app/classes/preschool")).toBeNull();
    expect(enrollingCourse(TODDLER_ENROLL_PATH)?.slug).toBe("toddlerhood");
    expect(enrollingCourse("/app/classes/toddlerhood")).toBeNull();
    expect(enrollingCourse("/app/classes")).toBeNull();
  });
});
