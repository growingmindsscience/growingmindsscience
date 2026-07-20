import { NextResponse } from "next/server";
import { getEntitlementSummary } from "@/lib/entitlements.server";

/**
 * Current user's live entitlements, as JSON. The parent marketing site's
 * Growing Minds AI tool calls this to decide whether to unlock unlimited
 * access from the shared Supabase session — same-origin because /nsc/* is
 * proxied under growingmindsscience.com, so the session cookie rides along.
 *
 * Public route (added to middleware allowlist): it gates itself by returning
 * `authenticated: false` for signed-out callers rather than redirecting, so a
 * cross-surface fetch gets a clean answer instead of an HTML login page.
 *
 * Never cached — entitlements change the moment a webhook lands.
 */
export async function GET() {
  const summary = await getEntitlementSummary();
  return NextResponse.json(summary, {
    headers: { "Cache-Control": "no-store" },
  });
}
