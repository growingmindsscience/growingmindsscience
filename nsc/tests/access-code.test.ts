import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_CODE_DAILY_ATTEMPTS,
  accessCodeAttemptKey,
  takeAccessCodeAttemptWith,
} from "../lib/access-code";
import { FakeDb } from "./fake-supabase";

// The legacy access-code action's surroundings, replaced so the test can
// read where it redirects. redirect() throws in Next; the fake does the same.
const env = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/auth", () => ({ requireAuth: async () => ({ id: "user-1" }) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => env.db,
  createServiceClient: () => env.db,
}));

const { redeemAccessCode } = await import("../app/app/account/actions");

/** ai_take_free_question as migration 0021 defines it: true while under the limit. */
function fakeCounter() {
  const counts = new Map<string, number>();
  const calls: { name: string; args: { p_key_hash: string; p_limit: number } }[] = [];
  const state = { down: false };
  const rpc = async (name: string, args: { p_key_hash: string; p_limit: number }) => {
    calls.push({ name, args });
    if (state.down) return { data: null, error: { message: "down" } };
    const n = counts.get(args.p_key_hash) ?? 0;
    if (n >= args.p_limit) return { data: false, error: null };
    counts.set(args.p_key_hash, n + 1);
    return { data: true, error: null };
  };
  return { rpc, calls, state };
}
const asRpc = (c: ReturnType<typeof fakeCounter>) => c as unknown as Pick<SupabaseClient, "rpc">;

const day1 = new Date("2026-10-19T08:00:00Z");

describe("access-code attempt limit", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keys the shared counter by account and UTC day, apart from the AI endpoint's keys", () => {
    const key = accessCodeAttemptKey("user-1", day1);
    expect(key).toBe(createHash("sha256").update("access-code|user-1|2026-10-19").digest("hex"));
    // ai_free_usage.key_hash must be 16 to 128 characters.
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(accessCodeAttemptKey("user-2", day1)).not.toBe(key);
    expect(accessCodeAttemptKey("user-1", new Date("2026-10-20T00:00:00Z"))).not.toBe(key);
    // Same UTC day, any hour.
    expect(accessCodeAttemptKey("user-1", new Date("2026-10-19T23:59:59Z"))).toBe(key);
  });

  it("allows eight tries a day, then locks until the next UTC day", async () => {
    const counter = fakeCounter();
    const results = [];
    for (let i = 0; i < ACCESS_CODE_DAILY_ATTEMPTS + 2; i++) {
      results.push(await takeAccessCodeAttemptWith(asRpc(counter), "user-1", day1));
    }
    expect(ACCESS_CODE_DAILY_ATTEMPTS).toBe(8);
    expect(results).toEqual([...Array(8).fill("ok"), "locked", "locked"]);
    expect(counter.calls[0]).toEqual({
      name: "ai_take_free_question",
      args: { p_key_hash: accessCodeAttemptKey("user-1", day1), p_limit: 8 },
    });
    expect(await takeAccessCodeAttemptWith(asRpc(counter), "user-2", day1)).toBe("ok");
    expect(await takeAccessCodeAttemptWith(asRpc(counter), "user-1", new Date("2026-10-20T01:00:00Z"))).toBe("ok");
  });

  it("fails closed when the counter errors or throws", async () => {
    const counter = fakeCounter();
    counter.state.down = true;
    expect(await takeAccessCodeAttemptWith(asRpc(counter), "user-1", day1)).toBe("unavailable");
    const throwing = { rpc: async () => { throw new Error("network"); } } as unknown as Pick<SupabaseClient, "rpc">;
    expect(await takeAccessCodeAttemptWith(throwing, "user-1", day1)).toBe("unavailable");
    const odd = { rpc: async () => ({ data: null, error: null }) } as unknown as Pick<SupabaseClient, "rpc">;
    expect(await takeAccessCodeAttemptWith(odd, "user-1", day1)).toBe("unavailable");
  });
});

describe("redeemAccessCode (account form)", () => {
  let counter: ReturnType<typeof fakeCounter>;
  let db: FakeDb;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("GMS_AI_ACCESS_CODE", "the-right-code");
    counter = fakeCounter();
    db = new FakeDb({ uniques: { entitlements: [["user_id", "product_scope", "source", "source_ref"]] } });
    env.db = Object.assign(db, { rpc: counter.rpc });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const submit = (code: string) => {
    const form = new FormData();
    form.set("code", code);
    return redeemAccessCode(form).then(
      () => "",
      (err: Error) => err.message.replace(/^REDIRECT /, ""),
    );
  };
  const granted = () => db.rows("entitlements").length > 0;

  it("links AI for the right code while under the limit", async () => {
    expect(await submit("the-right-code")).toBe("/app/account?code=ok");
    expect(granted()).toBe(true);
    expect(counter.calls).toHaveLength(1);
  });

  it("counts wrong tries, then refuses even the right code for the rest of the day", async () => {
    for (let i = 0; i < 8; i++) expect(await submit(`guess-${i}`)).toBe("/app/account?code=invalid");
    expect(await submit("the-right-code")).toBe("/app/account?code=locked");
    expect(granted()).toBe(false);
  });

  it("asks to try later, and grants nothing, when the counter is down", async () => {
    counter.state.down = true;
    expect(await submit("the-right-code")).toBe("/app/account?code=unavailable");
    expect(granted()).toBe(false);
  });

  it("does not spend a try on an empty form", async () => {
    expect(await submit("   ")).toBe("/app/account?code=empty");
    expect(counter.calls).toHaveLength(0);
  });
});
