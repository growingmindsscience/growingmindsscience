import "server-only";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Entitlements. Pricing is a one-time SKU (option B): buying `numberpath_full`
 * unlocks the whole product forever. Free tier is the top-of-funnel taste —
 * pre-screen + one sample game + a single prompt (spec §10 free-tier row).
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
  return Boolean(data);
}

/** Gate for paid-only pages (printables). Redirects to /app/upgrade if not entitled. */
export async function requirePaid(): Promise<void> {
  await requireAuth();
  if (!(await hasFullAccess())) redirect("/app/upgrade");
}
