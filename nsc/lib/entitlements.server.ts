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
