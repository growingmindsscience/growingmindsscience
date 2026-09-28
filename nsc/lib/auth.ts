import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** Returns the signed-in user or redirects to /login. Use in protected server components/actions. */
export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/** Keep class visitors in the class-branded sign-in flow. */
export async function requireClassAuth(next: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/class-login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Returns the signed-in user or null (no redirect) — for pages that render differently when logged out. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
