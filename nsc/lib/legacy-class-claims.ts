import type { SupabaseClient } from "@supabase/supabase-js";
import { applyGrants } from "@/lib/entitlement-writes";
import { grantsForLegacyClassPurchase } from "@/lib/grants";

export interface ClaimingUser {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
}

/**
 * Give a Thinkific buyer the toddler class the first time they sign in here.
 *
 * scripts/import-thinkific-buyers.mjs records each verified paid order in
 * class_legacy_purchases. A buyer who already had a confirmed account was
 * granted at import; everyone else is granted here, keyed on the account's
 * email. The email must be confirmed, so nobody can claim a purchase by
 * signing up with someone else's address even if confirmation is turned off.
 *
 * Only unclaimed orders are granted, and each is marked with the account
 * that claimed it, so one order never unlocks two accounts and a grant that
 * was later expired by hand is not restored on the next sign-in.
 *
 * Throws when a write fails; callers treat it as best-effort. The client is
 * injected (service role) so this stays unit-testable.
 */
export async function claimLegacyClassPurchases(
  service: Pick<SupabaseClient, "from">,
  user: ClaimingUser,
): Promise<number> {
  const email = user.email?.trim().toLowerCase();
  if (!user.id || !email || !user.email_confirmed_at) return 0;
  const { data, error } = await service.from("class_legacy_purchases")
    .select("source_ref")
    .eq("email", email)
    .is("claimed_by", null);
  if (error) throw new Error(`Could not read Thinkific purchases: ${error.message}`);
  let claimed = 0;
  for (const row of (data ?? []) as { source_ref: string }[]) {
    await applyGrants(service, user.id, grantsForLegacyClassPurchase(row.source_ref));
    const { error: markError } = await service.from("class_legacy_purchases")
      .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
      .eq("source_ref", row.source_ref)
      .is("claimed_by", null);
    if (markError) throw new Error(`Could not mark Thinkific purchase claimed: ${markError.message}`);
    claimed += 1;
  }
  return claimed;
}
