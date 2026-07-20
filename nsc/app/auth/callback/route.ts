import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { backfillEntitlementsForUser } from "@/lib/backfill.server";

/**
 * Auth code exchange for email links (password recovery, and any future
 * confirmation flows). Supabase redirects here with ?code=…; we exchange it
 * for a session cookie, then continue to `next`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/app";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app";

  // Behind the multi-zone rewrite the request's own origin can be the
  // internal deployment host while the session cookie belongs to the public
  // site — always bounce back through the configured origin.
  let origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (origin && !/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
  origin = origin.replace(/\/+$/, "") || url.origin;

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
  return NextResponse.redirect(
    new URL(
      `/nsc/login?error=${encodeURIComponent("That link expired — request a fresh one.")}`,
      origin,
    ),
  );
}
