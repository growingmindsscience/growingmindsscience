import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { backfillEntitlementsForUser } from "@/lib/backfill.server";
import { safeNextPath } from "@/lib/safe-next";
import { siteOrigin } from "@/lib/site";

/**
 * Auth code exchange for email links (password recovery, and any future
 * confirmation flows). Supabase redirects here with ?code=…; we exchange it
 * for a session cookie, then continue to `next`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  // Behind the multi-zone rewrite the request's own origin can be the
  // internal deployment host while the session cookie belongs to the public
  // site — always bounce back through the configured origin.
  const origin = siteOrigin(url.origin);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Link any pre-existing Stripe purchases to this account (idempotent,
      // best-effort — never block the redirect on it).
      try {
        const u = data.user;
        if (u?.id && u.email) await backfillEntitlementsForUser(u.id, u.email);
      } catch {}
      return NextResponse.redirect(new URL(`/nsc${next}`, origin));
    }
  }
  const classFlow = next.startsWith("/reset/update?class=1") ||
    next.startsWith("/app/classes") || next.startsWith("/admin/classes");
  const loginPath = classFlow ? "/nsc/class-login" : "/nsc/login";
  return NextResponse.redirect(new URL(
    `${loginPath}?error=${encodeURIComponent("That link expired. Please request a fresh one.")}`,
    origin,
  ));
}
