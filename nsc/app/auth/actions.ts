"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { backfillEntitlementsForUser } from "@/lib/backfill.server";
import { friendlyAuthError } from "@/lib/friendly-error";
import { safeNextPath } from "@/lib/safe-next";
import { siteOrigin } from "@/lib/site";

/**
 * Link any pre-existing Stripe purchases (legacy AI Pro subs, bought before
 * this account existed) to the just-authenticated user. Idempotent and
 * best-effort, so running it on every sign-in is safe and self-healing — a
 * grant that appears later (a renewal) gets picked up on the next login.
 *
 * The link is keyed on the account email, so it relies on Supabase "Confirm
 * email" being ON (see the README's auth notes).
 */
async function safeBackfill(user: { id: string; email?: string | null } | null): Promise<void> {
  try {
    if (user?.id && user.email) {
      await backfillEntitlementsForUser(user.id, user.email);
    }
  } catch {
    // never block auth on a backfill failure
  }
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(friendlyAuthError(error.message))}&next=${encodeURIComponent(next)}`,
    );
  }
  await safeBackfill(data.user);
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (password.length < 12) {
    redirect(
      `/signup?error=${encodeURIComponent("Password must be at least 12 characters.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Used only when Supabase "Confirm email" is ON: the link lands on the
    // code exchange, then continues to `next`.
    options: {
      emailRedirectTo: `${siteOrigin()}/nsc/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    redirect(
      `/signup?error=${encodeURIComponent(friendlyAuthError(error.message))}&next=${encodeURIComponent(next)}`,
    );
  }
  if (!data.session) {
    // Confirmation is on: there is no session yet, so say so instead of
    // bouncing the parent silently to the sign-in page.
    redirect("/login?confirm=1");
  }
  // Supabase returned a session straight away; link any earlier purchases
  // (see the note on safeBackfill).
  await safeBackfill(data.user);
  revalidatePath("/", "layout");
  redirect(next);
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/reset?error=Please+enter+your+email.");

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/nsc/auth/callback?next=${encodeURIComponent("/reset/update")}`,
  });
  // Always confirm — never reveal whether an account exists.
  redirect("/reset?sent=1");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");
  if (password.length < 12) {
    redirect(
      `/reset/update?error=${encodeURIComponent("Password must be at least 12 characters.")}`,
    );
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset/update?error=${encodeURIComponent(friendlyAuthError(error.message))}`);
  }
  revalidatePath("/", "layout");
  redirect("/app");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
