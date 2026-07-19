"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { backfillEntitlementsForUser } from "@/lib/backfill.server";

/**
 * Link any pre-existing Stripe purchases (legacy AI Pro subs, bought before
 * this account existed) to the just-authenticated user. Idempotent and
 * best-effort, so running it on every sign-in is safe and self-healing — a
 * grant that appears later (a renewal) gets picked up on the next login.
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

function cleanNext(next: FormDataEntryValue | null): string {
  const v = typeof next === "string" ? next : "";
  // Only allow same-app relative paths.
  return v.startsWith("/") && !v.startsWith("//") ? v : "/app";
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = cleanNext(formData.get("next"));

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
  await safeBackfill(data.user);
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = cleanNext(formData.get("next"));

  if (password.length < 12) {
    redirect(
      `/signup?error=${encodeURIComponent("Password must be at least 12 characters.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
  // Only backfill when signup produced a real session (email-confirmation off,
  // so this IS the verified entry). When confirmation is on, data.session is
  // null and the email isn't proven yet — backfilling here would let anyone
  // claim a victim's subscription by signing up with their email. The
  // post-confirmation auth/callback route handles that case safely instead.
  await safeBackfill(data.session ? data.user : null);
  revalidatePath("/", "layout");
  redirect(next);
}

function siteOrigin(): string {
  let origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (origin && !/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
  return origin.replace(/\/+$/, "") || "https://growingmindsscience.com";
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
    redirect(`/reset/update?error=${encodeURIComponent(error.message)}`);
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
