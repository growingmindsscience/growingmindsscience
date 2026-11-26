import { afterEach, describe, expect, it } from "vitest";
import { classOfferForProduct, familySalesGate, infantSalesGate, preschoolSalesGate } from "@/lib/classes";
import { BUNDLE_ENROLL_PATH, FAMILY_ENROLL_PATH, TODDLER_ENROLL_PATH, INFANT_ENROLL_PATH, PRESCHOOL_ENROLL_PATH, classDestination, classLoginUrl, enrollingCourse, isClassPath, signInNext, checkoutSessionId } from "@/lib/class-paths";
import { sitePath } from "@/lib/site";

const USER = "3f2b8c1e-0d4a-4b6f-9a7e-1c2d3e4f5a6b";
const ready = { salesFlag: "1", vercelEnv: "production", previewUserId: undefined, userId: USER, moduleCounts: [5, 4, 3, 4] };

describe("preschool sales gate", () => {
  const preschoolReady = { ...ready, moduleCounts: [8, 8, 6, 8] };

  it("stays closed until its own flag is on and all 30 lesson parts are published", () => {
    expect(preschoolSalesGate({ ...preschoolReady, salesFlag: undefined })).toEqual({
      open: false,
      reason: "PRESCHOOL_CLASS_SALES_ENABLED is not set for this deployment; PRESCHOOL_CLASS_TEST_USER_ID is not set",
    });
    expect(preschoolSalesGate({ ...preschoolReady, moduleCounts: [8, 3, 0, 0] })).toEqual({
      open: false,
      reason: "published lesson counts do not match: module 2 has 3, needs 8; module 3 has 0, needs 6; module 4 has 0, needs 8",
    });
    // The infant lesson counts do not satisfy the preschool gate.
    expect(preschoolSalesGate(ready).open).toBe(false);
    expect(preschoolSalesGate(preschoolReady)).toEqual({ open: true });
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

describe("family sales gate", () => {
  const familyReady = { ...ready, moduleCounts: [6, 6, 6, 8] };

  it("opens only with its own flag and exactly 6/6/6/8 published lessons", () => {
    expect(familySalesGate(familyReady)).toEqual({ open: true });
    expect(familySalesGate({ ...familyReady, salesFlag: undefined })).toEqual({
      open: false,
      reason: "FAMILY_CLASS_SALES_ENABLED is not set for this deployment; FAMILY_CLASS_TEST_USER_ID is not set",
    });
    // One lesson unpublished, and one extra lesson added, both close it.
    expect(familySalesGate({ ...familyReady, moduleCounts: [6, 6, 6, 7] })).toEqual({
      open: false, reason: "published lesson counts do not match: module 4 has 7, needs 8",
    });
    expect(familySalesGate({ ...familyReady, moduleCounts: [6, 7, 6, 8] }).open).toBe(false);
    // The infant counts (5/4/3/4) do not satisfy it.
    expect(familySalesGate(ready).open).toBe(false);
  });

  it("opens on preview only for the allowed user", () => {
    const preview = { ...familyReady, vercelEnv: "preview", previewUserId: USER };
    expect(familySalesGate(preview)).toEqual({ open: true });
    expect(familySalesGate({ ...preview, userId: "someone-else" }).open).toBe(false);
    expect(familySalesGate({ ...preview, userId: undefined }).open).toBe(false);
  });
});

describe("family checkout intent", () => {
  it("maps the enroll path to the $49 family class and the family product", () => {
    expect(classDestination(FAMILY_ENROLL_PATH)).toBe(FAMILY_ENROLL_PATH);
    expect(enrollingCourse(FAMILY_ENROLL_PATH)).toMatchObject({ slug: "family", priceDisplay: "$49", product: "class_family" });
    expect(enrollingCourse("/app/classes/family")).toBeNull();
    expect(classOfferForProduct("class_family")).toMatchObject({ slug: "family" });
  });
});

describe("signed-out redirect keeps the class destination", () => {
  const successPaths = [
    "/app/classes/toddlerhood/success",
    "/app/classes/infant/success",
    "/app/classes/preschool/success",
    "/app/classes/family/success",
    "/app/classes/bundle/success",
  ];

  it("keeps Stripe's session_id on every class and bundle success page", () => {
    for (const path of successPaths) {
      const next = signInNext(path, "?session_id=cs_test_a1B2");
      expect(next).toBe(`${path}?session_id=cs_test_a1B2`);
      // The sign-in link carries it encoded, and sign-in decodes it back unchanged.
      const url = new URL(classLoginUrl(next), "https://x.example");
      expect(url.searchParams.get("next")).toBe(next);
      expect(classDestination(url.searchParams.get("next"))).toBe(next);
      expect(checkoutSessionId("cs_test_a1B2")).toBe("cs_test_a1B2");
    }
  });

  it("drops a malformed session id instead of forwarding it", () => {
    for (const bad of ["x", "cs_a b", "cs_a&next=//evil.example", `cs_${"a".repeat(200)}`, undefined]) {
      expect(checkoutSessionId(bad)).toBeUndefined();
    }
  });

  it("rejects off-site and malformed query variants, and leaves other areas alone", () => {
    expect(signInNext("/app/classes/family", "?a=\\evil")).toBe("/app/classes/family");
    expect(signInNext("/app/classes/family", "?a=b c")).toBe("/app/classes/family");
    expect(checkoutSessionId(["cs_test_one", "cs_test_two"])).toBeUndefined();
    expect(signInNext("/app", "?x=1")).toBe("/app");
    expect(signInNext("/app/classes/family", "")).toBe("/app/classes/family");
    // requireClassAuth's sanitizer: external or non-class targets become My classes.
    expect(classDestination("https://evil.example/")).toBe("/app/classes");
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
    expect(sitePath("classes/")).toBe("https://www.fromlittleonward.com/classes/");
  });
});

describe("enroll intent", () => {
  it("survives sign-in as a class destination", () => {
    expect(classDestination(INFANT_ENROLL_PATH)).toBe(INFANT_ENROLL_PATH);
  });

  it("names the class only for an enroll destination", () => {
    expect(enrollingCourse(TODDLER_ENROLL_PATH)).toMatchObject({ slug: "toddlerhood", priceDisplay: "$49", ages: "Ages 1 to 3" });
    expect(enrollingCourse(INFANT_ENROLL_PATH)?.slug).toBe("infant");
    expect(enrollingCourse("/app/classes/infant")).toBeNull();
    expect(enrollingCourse(BUNDLE_ENROLL_PATH)).toMatchObject({ slug: "bundle", priceDisplay: "$119" });
    expect(enrollingCourse(PRESCHOOL_ENROLL_PATH)?.slug).toBe("preschool");
    expect(enrollingCourse("/app/classes/preschool")).toBeNull();
    expect(enrollingCourse("/app/classes")).toBeNull();
  });

  it("keeps the chosen enroll path through sanitizing, and nothing else", () => {
    for (const path of [INFANT_ENROLL_PATH, TODDLER_ENROLL_PATH, PRESCHOOL_ENROLL_PATH, BUNDLE_ENROLL_PATH]) {
      expect(enrollingCourse(classDestination(path))).not.toBeNull();
    }
    // Untrusted, off-site, Tallykin and query variants fall back to the generic state.
    for (const raw of [
      undefined,
      "",
      "https://evil.example/app/classes/infant/enroll",
      "//evil.example/app/classes/infant/enroll",
      "/app/child/new",
      "/app/classes/infant/enroll/../../../app",
      "/app/classes/unknown/enroll",
    ]) {
      expect(enrollingCourse(classDestination(raw))).toBeNull();
    }
    // A query on an enroll path is not claimed as that class.
    expect(enrollingCourse(classDestination(`${INFANT_ENROLL_PATH}?x=1`))).toBeNull();
  });
});
