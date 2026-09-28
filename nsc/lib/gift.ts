import type { SupabaseClient } from "@supabase/supabase-js";
import { applyGrants } from "@/lib/entitlement-writes";
import { grantForGiftRedemption } from "@/lib/grants";

/**
 * Gift-code logic. Pure helpers plus the mint/redeem flows with the database
 * client injected, so the flows are unit-testable. lib/gift.server.ts binds
 * them to the service-role client (RLS on nsc_gift_codes has no policies:
 * codes are never queried from the browser).
 */

// Unambiguous alphabet (no 0/O/1/I) for codes a grandparent reads off a card.
// 32 symbols, so a 32-bit random value maps onto it with no modulo bias.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const CODE_SHAPE = /^NP-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

/** A uniform float in [0, 1) from the platform CSPRNG (Web Crypto). */
export function secureRandom(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 0x1_0000_0000;
}

/**
 * A code is a bearer credential worth a full purchase, so it must come from a
 * cryptographic source. `rand` is injectable only so tests can be
 * deterministic.
 */
export function makeGiftCode(rand: () => number = secureRandom): string {
  const block = () =>
    Array.from({ length: 4 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join("");
  return `NP-${block()}-${block()}`;
}

/**
 * Normalize user input: case, spaces, and the NP- prefix. Also forgives a
 * missing or misplaced dash ("NP 7Q4K 2M8P", "7q4k2m8p").
 */
export function normalizeGiftCode(input: string): string {
  const s = input.trim().toUpperCase().replace(/\s+/g, "");
  const alnum = s.replace(/[^0-9A-Z]/g, "");
  const core =
    alnum.length === 10 && alnum.startsWith("NP")
      ? alnum.slice(2)
      : alnum.length === 8
        ? alnum
        : null;
  if (core) return `NP-${core.slice(0, 4)}-${core.slice(4)}`;
  return s.startsWith("NP-") ? s : s ? `NP-${s.replace(/^NP-?/, "")}` : s;
}

type Db = Pick<SupabaseClient, "from">;

const UNIQUE_VIOLATION = "23505";

/**
 * Mint a code for a paid gift checkout. Idempotent on the Stripe session id
 * (a webhook retry returns the code already minted). Throws on any database
 * error so the webhook answers 500 and Stripe retries; returns null only if
 * five fresh codes all collided, which the caller also treats as a retry.
 */
export async function mintGiftCodeWith(
  db: Db,
  opts: { sessionId: string; purchaserEmail: string | null; amountCents: number | null; product: string },
  makeCode: () => string = makeGiftCode,
): Promise<string | null> {
  const lookup = () =>
    db
      .from("nsc_gift_codes")
      .select("code")
      .eq("stripe_checkout_session_id", opts.sessionId)
      .maybeSingle();

  const existing = await lookup();
  if (existing.error) throw new Error(`gift lookup failed: ${existing.error.message}`);
  if (existing.data?.code) return existing.data.code as string;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const { error } = await db.from("nsc_gift_codes").insert({
      code,
      product: opts.product,
      stripe_checkout_session_id: opts.sessionId,
      purchaser_email: opts.purchaserEmail,
      amount_cents: opts.amountCents,
    });
    if (!error) return code;
    if (error.code !== UNIQUE_VIOLATION) {
      throw new Error(`gift insert failed: ${error.message}`);
    }
    // Unique violation: a concurrent delivery minted this session's code, or
    // the fresh code collided with an existing one. Check which.
    const race = await lookup();
    if (race.error) throw new Error(`gift lookup failed: ${race.error.message}`);
    if (race.data?.code) return race.data.code as string;
  }
  return null;
}

/** The code minted for a Stripe session, if the webhook has run yet. */
export async function giftCodeForSessionWith(db: Db, sessionId: string): Promise<string | null> {
  const { data } = await db
    .from("nsc_gift_codes")
    .select("code")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  return (data?.code as string | undefined) ?? null;
}

export type RedeemResult =
  | { ok: true }
  | { ok: false; reason: "unknown" | "already_redeemed" | "error" };

/**
 * Redeem a code for `ownerId`. The claim is a conditional update
 * (redeemed_by is null) so two simultaneous redeems can't both win. The
 * grant is an nsc_purchases row reusing the gift's Stripe session id (unique,
 * tied to the real payment), mirrored into the entitlements spine.
 */
export async function redeemGiftCodeWith(
  db: Db,
  code: string,
  ownerId: string,
): Promise<RedeemResult> {
  const normalized = normalizeGiftCode(code);
  if (!CODE_SHAPE.test(normalized)) return { ok: false, reason: "unknown" };

  const { data: gift, error: findErr } = await db
    .from("nsc_gift_codes")
    .select("id, product, stripe_checkout_session_id, redeemed_by")
    .eq("code", normalized)
    .maybeSingle();
  if (findErr) return { ok: false, reason: "error" };
  if (!gift) return { ok: false, reason: "unknown" };
  if (gift.redeemed_by) return { ok: false, reason: "already_redeemed" };

  const { data: claimed, error: claimErr } = await db
    .from("nsc_gift_codes")
    .update({ redeemed_by: ownerId, redeemed_at: new Date().toISOString() })
    .eq("id", gift.id)
    .is("redeemed_by", null)
    .select("id");
  if (claimErr) return { ok: false, reason: "error" };
  if (!claimed || claimed.length === 0) return { ok: false, reason: "already_redeemed" };

  const { error: grantErr } = await db.from("nsc_purchases").upsert(
    {
      owner_id: ownerId,
      product: gift.product,
      stripe_checkout_session_id: gift.stripe_checkout_session_id,
    },
    { onConflict: "stripe_checkout_session_id" },
  );
  if (grantErr) {
    // Roll the claim back so the recipient can retry rather than lose the gift.
    const { error: rollbackErr } = await db
      .from("nsc_gift_codes")
      .update({ redeemed_by: null, redeemed_at: null })
      .eq("id", gift.id)
      .eq("redeemed_by", ownerId);
    if (rollbackErr) console.error(`[gift] rollback failed for ${gift.id}: ${rollbackErr.message}`);
    return { ok: false, reason: "error" };
  }

  // Mirror into the entitlements spine (plan 2.2: gift redemption grants
  // numberpath_full from source "gift"). nsc_purchases stays authoritative
  // for access, so a missing spine table must not fail a redemption.
  try {
    await applyGrants(db, ownerId, [grantForGiftRedemption({ giftCodeId: String(gift.id) })]);
  } catch (err) {
    console.error(`[gift] entitlement mirror failed: ${(err as Error).message}`);
  }
  return { ok: true };
}
