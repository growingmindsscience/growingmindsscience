import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { backfillEntitlementsForUser } from "@/lib/backfill.server";
import { safeNextPath } from "@/lib/safe-next";
import { siteOrigin } from "@/lib/site";
import { classDestination, isClassPath } from "@/lib/class-paths";

const RESET_UPDATE_PATH = "/reset/update";

/**
 * The class destination carried inside a class password-reset `next`
 * (`/reset/update?class=1&next=<class path>`, parameters in any order), or
 * null when `next` is not a class reset. The pathname must match exactly and
 * the nested `next` is revalidated as a class path, so a hand-edited link
 * can only ever land on My classes.
 */
function classResetDestination(next: string): string | null {
  const [beforeHash] = next.split("#", 1);
  const q = beforeHash.indexOf("?");
  if (q < 0 || beforeHash.slice(0, q) !== RESET_UPDATE_PATH) return null;
  const params = new URLSearchParams(beforeHash.slice(q + 1));
  if (params.get("class") !== "1") return null;
  return classDestination(params.get("next"));
}

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
  const resetDestination = classResetDestination(next);
  const classFlow = resetDestination !== null || isClassPath(next);
  const loginPath = classFlow ? "/nsc/class-login" : "/nsc/login";
  // A class link that fails (opened in another browser, or expired) still
  // knows where the parent was headed, including through a class reset.
  const destination = isClassPath(next) ? next : resetDestination;
  const keepNext = destination ? `&next=${encodeURIComponent(destination)}` : "";
  return NextResponse.redirect(new URL(
    `${loginPath}?error=${encodeURIComponent(isClassPath(next)
      ? "That link did not work here. Sign in below, or open the link on the device where you signed up."
      : "That link expired. Please request a fresh one.")}${keepNext}`,
    origin,
  ));
}
