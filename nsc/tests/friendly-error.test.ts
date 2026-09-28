import { describe, expect, it } from "vitest";
import { friendlyAuthError, SAVE_FAILED } from "../lib/friendly-error";

describe("friendly error copy (N20)", () => {
  it("maps the common Supabase auth messages to calm wording", () => {
    expect(friendlyAuthError("Invalid login credentials")).toMatch(/don't match/);
    expect(friendlyAuthError("User already registered")).toMatch(/already an account/);
    expect(friendlyAuthError("Email not confirmed")).toMatch(/confirm your email/);
    expect(friendlyAuthError("Password should be at least 12 characters.")).toMatch(/longer password/);
    expect(friendlyAuthError("email rate limit exceeded")).toMatch(/wait a minute/);
    expect(friendlyAuthError("TypeError: fetch failed")).toMatch(/connection/);
  });

  it("never echoes an unknown raw message", () => {
    const raw = 'duplicate key value violates unique constraint "nsc_children_pkey"';
    const out = friendlyAuthError(raw);
    expect(out).not.toContain("constraint");
    expect(out).toBe("Something went wrong. Please try again.");
    expect(friendlyAuthError(undefined)).toBe("Something went wrong. Please try again.");
  });

  it("uses calm, deficit-free copy with no em dashes", () => {
    for (const s of [SAVE_FAILED, friendlyAuthError("Invalid login credentials")]) {
      expect(s).not.toContain("—");
    }
  });
});
