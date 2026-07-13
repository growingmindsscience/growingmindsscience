import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request and guards the app.
 * Unauthenticated users hitting anything other than the public marketing/auth
 * routes are redirected to /login. Paths here are relative to basePath (/nsc).
 */
// Exact-match public routes plus prefix-match public sections.
const PUBLIC_EXACT = new Set(["/", "/evidence"]);
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/reset",
  "/gift", // gifting needs no account; buy + printable card are public
  "/redeem", // renders its own sign-in prompt; the action gates with requireAuth
  "/api/stripe-webhook",
  "/api/cron", // guarded by its own CRON_SECRET bearer check
  "/api/email/unsubscribe", // token-authenticated, clicked from mail clients
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_EXACT.has(path) ||
    PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
