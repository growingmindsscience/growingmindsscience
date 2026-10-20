import type { SupabaseClient } from "@supabase/supabase-js";
import { applyGrants } from "@/lib/entitlement-writes";
import type { Grant } from "@/lib/grants";
import { CLASS_COURSES } from "@/lib/classes";
import { makeGiftCode } from "@/lib/gift";

/**
 * Class gift codes: codes an admin makes and gives away. Each one unlocks
 * every class, plus Growing Minds AI (the toddler class includes it), for the
 * account that redeems it, for life. Unlike Number Path gift codes they are
 * not tied to a payment. The flows take the database client as an argument so
 * they are unit-testable; callers pass the service-role client (the table has
 * RLS on and no policies).
 */

const CODE_SHAPE = /^GM-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;
const UNIQUE_VIOLATION = "23505";

/** The most codes one click on the admin page makes. */
export const MAX_CLASS_GIFT_BATCH = 20;

/** Where a recipient redeems a code, relative to the /nsc base path. */
export const CLASS_GIFT_REDEEM_PATH = "/app/classes/redeem";

/** Every scope a class gift code unlocks. */
export const CLASS_GIFT_SCOPES: string[] = [
  ...Object.values(CLASS_COURSES).map((course) => course.scope),
  "ai:unlimited",
];

export function makeClassGiftCode(rand?: () => number): string {
  return makeGiftCode(rand, "GM");
}

/** Forgives case, spaces, a missing GM- prefix and missing dashes. */
export function normalizeClassGiftCode(input: string): string {
  const alnum = input.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  const core =
    alnum.length === 10 && alnum.startsWith("GM") ? alnum.slice(2)
      : alnum.length === 8 ? alnum
        : null;
  return core ? `GM-${core.slice(0, 4)}-${core.slice(4)}` : alnum;
}

export function grantsForClassGift(giftId: string): Grant[] {
  return CLASS_GIFT_SCOPES.map((scope) => ({
    product_scope: scope,
    source: "gift",
    source_ref: `class-gift:${giftId}`,
    expires_at: null,
  }));
}

type Db = Pick<SupabaseClient, "from">;

/**
 * Make `count` new codes (1 to MAX_CLASS_GIFT_BATCH). A code that collides
 * with an existing one is replaced by a fresh draw. Throws on any other
 * database error.
 */
export async function mintClassGiftCodesWith(
  db: Db,
  opts: { count: number; note: string; createdBy: string },
  makeCode: () => string = makeClassGiftCode,
): Promise<string[]> {
  const count = Math.min(Math.max(Math.trunc(opts.count) || 1, 1), MAX_CLASS_GIFT_BATCH);
  const note = opts.note.trim().slice(0, 120);
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let made: string | null = null;
    for (let attempt = 0; attempt < 5 && !made; attempt++) {
      const code = makeCode();
      const { error } = await db.from("class_gift_codes").insert({ code, note, created_by: opts.createdBy });
      if (!error) made = code;
      else if (error.code !== UNIQUE_VIOLATION) throw new Error(`class gift insert failed: ${error.message}`);
    }
    if (!made) throw new Error("class gift codes kept colliding");
    codes.push(made);
  }
  return codes;
}

/**
 * The codes a batch just made, read back from the list (newest first): the
 * newest `count` unused codes this admin made. The redirect after minting
 * carries only the count, since a code in a URL ends up in request logs and
 * browser history.
 */
export function newestUnusedCodes<T extends { created_by: string | null; redeemed_at: string | null }>(
  rows: readonly T[],
  createdBy: string,
  count: number,
): T[] {
  const n = Math.min(Math.max(Math.trunc(count) || 0, 0), MAX_CLASS_GIFT_BATCH);
  return rows.filter((row) => row.created_by === createdBy && !row.redeemed_at).slice(0, n);
}

export type ClassGiftRedeemResult =
  | { ok: true }
  | { ok: false; reason: "unknown" | "already_redeemed" | "error" };

/**
 * Redeem a code for `userId`. The claim is a conditional update (redeemed_by
 * is null), so two people can't both win the same code. If the grants fail to
 * store, the claim is rolled back so the code still works on a retry.
 */
export async function redeemClassGiftCodeWith(
  db: Db,
  code: string,
  userId: string,
): Promise<ClassGiftRedeemResult> {
  const normalized = normalizeClassGiftCode(code);
  if (!CODE_SHAPE.test(normalized)) return { ok: false, reason: "unknown" };

  const { data: gift, error: findErr } = await db
    .from("class_gift_codes")
    .select("id, redeemed_by")
    .eq("code", normalized)
    .maybeSingle();
  if (findErr) return { ok: false, reason: "error" };
  if (!gift) return { ok: false, reason: "unknown" };
  // Entering your own code twice is not an error.
  if (gift.redeemed_by) return gift.redeemed_by === userId ? { ok: true } : { ok: false, reason: "already_redeemed" };

  const { data: claimed, error: claimErr } = await db
    .from("class_gift_codes")
    .update({ redeemed_by: userId, redeemed_at: new Date().toISOString() })
    .eq("id", gift.id)
    .is("redeemed_by", null)
    .select("id");
  if (claimErr) return { ok: false, reason: "error" };
  if (!claimed || claimed.length === 0) return { ok: false, reason: "already_redeemed" };

  try {
    await applyGrants(db, userId, grantsForClassGift(String(gift.id)));
  } catch (err) {
    console.error(`[class-gift] grant failed for ${gift.id}: ${(err as Error).message}`);
    const { error: rollbackErr } = await db
      .from("class_gift_codes")
      .update({ redeemed_by: null, redeemed_at: null })
      .eq("id", gift.id)
      .eq("redeemed_by", userId);
    if (rollbackErr) console.error(`[class-gift] rollback failed for ${gift.id}: ${rollbackErr.message}`);
    return { ok: false, reason: "error" };
  }
  return { ok: true };
}
