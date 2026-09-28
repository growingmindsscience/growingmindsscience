import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SITE_ORIGIN, normalizeOrigin, siteOrigin } from "../lib/site";
import { safeNextPath } from "../lib/safe-next";

describe("site origin (one helper for every absolute link)", () => {
  const saved = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = saved;
  });

  it("repairs a missing scheme, whitespace and trailing slashes", () => {
    expect(normalizeOrigin(" growingmindsscience.com/ ")).toBe("https://growingmindsscience.com");
    expect(normalizeOrigin("http://localhost:3000//")).toBe("http://localhost:3000");
    expect(normalizeOrigin("")).toBe("");
    expect(normalizeOrigin(undefined)).toBe("");
  });

  it("prefers the configured origin, then the fallback, then production", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "example.org/";
    expect(siteOrigin("https://other.test")).toBe("https://example.org");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteOrigin("preview.vercel.app")).toBe("https://preview.vercel.app");
    expect(siteOrigin("")).toBe(DEFAULT_SITE_ORIGIN);
  });
});

describe("safeNextPath (post-auth redirect target)", () => {
  it("keeps same-app relative paths", () => {
    expect(safeNextPath("/app")).toBe("/app");
    expect(safeNextPath("/redeem?x=1")).toBe("/redeem?x=1");
  });

  it("rejects anything a browser could read as another host", () => {
    for (const bad of [
      "//evil.com",
      "/\\evil.com",
      "/\\/evil.com",
      "https://evil.com",
      "/ /evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "evil.com",
      "",
    ]) {
      expect(safeNextPath(bad)).toBe("/app");
    }
    expect(safeNextPath(undefined)).toBe("/app");
    expect(safeNextPath(42, "/reset/update")).toBe("/reset/update");
  });
});
