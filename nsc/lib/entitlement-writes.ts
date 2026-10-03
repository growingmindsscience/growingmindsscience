import type { SupabaseClient } from "@supabase/supabase-js";
import type { Grant } from "@/lib/grants";

/**
 * Write a set of grants for a user. Needs the service-role client (the
 * entitlements table has no user write policies). Additive by construction:
 * the upsert on the (user, scope, source, ref) identity only refreshes
 * expires_at, never removes a row.
 *
 * Throws when the write fails. supabase-js reports failures as a returned
 * `{ error }` rather than an exception, so callers that awaited this and
 * moved on used to report success for a grant that was never stored.
 *
 * No "server-only" import on purpose: the client is injected, so this stays
 * unit-testable and is inert without a service-role client.
 */
export async function applyGrants(
  service: Pick<SupabaseClient, "from">,
  userId: string,
  grants: Grant[],
): Promise<void> {
  if (grants.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await service.from("entitlements").upsert(
    grants.map((g) => ({
      user_id: userId,
      product_scope: g.product_scope,
      source: g.source,
      source_ref: g.source_ref,
      expires_at: g.expires_at,
      updated_at: now,
    })),
    { onConflict: "user_id,product_scope,source,source_ref" },
  );
  if (error) {
    throw new Error(`entitlements upsert failed: ${error.message}`);
  }
}
