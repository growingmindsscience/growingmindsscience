import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "./fake-supabase";

// The admin action's surroundings, replaced so the test can read where it
// redirects. redirect() throws in Next; the fake does the same.
const env = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/admin", () => ({ requireClassAdmin: async () => ({ id: "admin-1" }) }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => env.db }));

const { makeClassGiftCodes } = await import("../app/admin/classes/gift-codes/actions");

const form = (count: number) => {
  const data = new FormData();
  data.set("count", String(count));
  data.set("note", "For Sam");
  return data;
};
const redirectOf = (p: Promise<unknown>) =>
  p.then(
    () => "",
    (err: Error) => err.message.replace(/^REDIRECT /, ""),
  );

describe("making class gift codes (admin action)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("redirects with only the count: no code in the URL", async () => {
    const db = new FakeDb({ uniques: { class_gift_codes: [["code"]] } });
    env.db = db;
    const url = await redirectOf(makeClassGiftCodes(form(3)));
    expect(url).toBe("/admin/classes/gift-codes?made=3");
    expect(db.rows("class_gift_codes")).toHaveLength(3);
    for (const row of db.rows("class_gift_codes")) expect(url).not.toContain(String(row.code));
  });

  it("maps a failure to a fixed message instead of echoing it", async () => {
    env.db = new FakeDb().fail("class_gift_codes", "insert", { code: "08006", message: "connection to 10.0.0.5 refused" });
    const url = await redirectOf(makeClassGiftCodes(form(1)));
    expect(url).toBe("/admin/classes/gift-codes?error=mint");
  });
});
