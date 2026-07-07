import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client (RSC + route handlers + server actions). Reads/writes
 * the session cookies. The setAll try/catch is the documented no-op for the
 * RSC render phase, where cookies are read-only; middleware refreshes them.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component; safe to ignore when middleware
            // is refreshing sessions.
          }
        },
      },
    },
  );
}

/** Service-role client for trusted server code (e.g. the Stripe webhook). Never expose to the browser. */
export function createServiceClient() {
  const { createClient: createSbClient } =
    require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
