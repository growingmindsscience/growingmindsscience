import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { unlocksNumberPath, type Grant } from "@/lib/grants";

/**
 * Entitlements. The original one-time SKU (`numberpath_full` in
 * nsc_purchases) stays authoritative for standalone purchases; the Phase 0
 * `entitlements` table layers the portfolio's additive grants on top
 * (membership includes Number Path — plan 2.2). Free tier is the
 * top-of-funnel taste — pre-screen + one sample game + a single prompt.
 */
export async function hasFullAccess(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("nsc_purchases")
    .select("id")
    .eq("owner_id", user.id)
    .eq("product", "numberpath_full")
    .limit(1)
    .maybeSingle();
  if (data) return true;

  // Phase 0 spine: membership or a migrated grant (RLS read-own). Tolerant
  // of the table not existing yet — the purchases check above already ran.
  const { data: ent } = await supabase
    .from("entitlements")
    .select("product_scope, expires_at")
    .eq("user_id", user.id)
    .in("product_scope", ["numberpath_full", "membership"]);
  return Boolean(ent && unlocksNumberPath(ent, new Date()));
}

/**
 * Membership gate (Activity Library, full Claims Library, …). Distinct from
 * hasFullAccess: a standalone Number Path purchase does NOT unlock
 * membership surfaces; membership unlocks Number Path (plan 2.2).
 */
export async function hasMembership(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("entitlements")
    .select("product_scope, expires_at")
    .eq("user_id", user.id)
    .eq("product_scope", "membership");
  const now = new Date();
  return Boolean(
    data?.some((r) => r.expires_at === null || new Date(r.expires_at) > now),
  );
}

/**
 * Write a set of grants for a user (service-role client required — the
 * entitlements table has no user write policies). Additive by construction:
 * upsert on the (user, scope, source, ref) identity only ever refreshes
 * expires_at, never removes a row.
 */
export async function applyGrants(
  service: SupabaseClient,
  userId: string,
  grants: Grant[],
): Promise<void> {
  if (grants.length === 0) return;
  await service.from("entitlements").upsert(
    grants.map((g) => ({
      user_id: userId,
      product_scope: g.product_scope,
      source: g.source,
      source_ref: g.source_ref,
      expires_at: g.expires_at,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,product_scope,source,source_ref" },
  );
}

/** Gate for paid-only pages (printables). Redirects to /app/upgrade if not entitled. */
export async function requirePaid(): Promise<void> {
  await requireAuth();
  if (!(await hasFullAccess())) redirect("/app/upgrade");
}

export interface EntitlementSummary {
  authenticated: boolean;
  /** Active product scopes, deduped. Empty when signed out. */
  scopes: string[];
  /** Convenience flags derived from scopes (union semantics). */
  numberPath: boolean;
  membership: boolean;
  /** Unlimited Growing Minds AI: membership, or the legacy class bundle's
   * `ai:unlimited` grant. This is what the parent AI tool reads. */
  unlimitedAi: boolean;
}

const SIGNED_OUT_SUMMARY: EntitlementSummary = {
  authenticated: false,
  scopes: [],
  numberPath: false,
  membership: false,
  unlimitedAi: false,
};

/**
 * One read of the current user's live entitlements, shaped for cross-surface
 * consumption (the parent site's AI tool calls the /api/entitlements/me route
 * that wraps this). Union semantics, expiry-aware. Never throws on a missing
 * table — degrades to whatever it can read.
 */
export async function getEntitlementSummary(): Promise<EntitlementSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return SIGNED_OUT_SUMMARY;

  const now = new Date();
  const scopes = new Set<string>();

  // Standalone Number Path purchase (authoritative, pre-spine).
  const { data: purchase } = await supabase
    .from("nsc_purchases")
    .select("id")
    .eq("owner_id", user.id)
    .eq("product", "numberpath_full")
    .limit(1)
    .maybeSingle();
  if (purchase) scopes.add("numberpath_full");

  // Spine grants (RLS read-own). Tolerant of the table not existing yet.
  const { data: ent } = await supabase
    .from("entitlements")
    .select("product_scope, expires_at")
    .eq("user_id", user.id);
  for (const row of ent ?? []) {
    if (row.expires_at === null || new Date(row.expires_at) > now) {
      scopes.add(row.product_scope);
    }
  }

  const membership = scopes.has("membership");
  return {
    authenticated: true,
    scopes: [...scopes],
    // Membership includes Number Path (plan 2.2).
    numberPath: scopes.has("numberpath_full") || membership,
    membership,
    unlimitedAi: membership || scopes.has("ai:unlimited"),
  };
}
