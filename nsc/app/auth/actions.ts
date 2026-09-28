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

function classAuthPath(next: string, page: "login" | "signup") {
  const forClasses = next.startsWith("/app/classes") || next.startsWith("/admin/classes");
  return forClasses ? `/class-${page}` : `/${page}`;
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = cleanNext(formData.get("next"));

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`${classAuthPath(next, "login")}?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
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
      `${classAuthPath(next, "signup")}?error=${encodeURIComponent("Password must be at least 12 characters.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`${classAuthPath(next, "signup")}?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
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
  const classFlow = formData.get("class_flow") === "1";
  const classQuery = classFlow ? "&class=1" : "";
  if (!email) redirect(`/reset?error=Please+enter+your+email.${classQuery}`);

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/nsc/auth/callback?next=${encodeURIComponent(classFlow ? "/reset/update?class=1" : "/reset/update")}`,
  });
  // Always confirm — never reveal whether an account exists.
  redirect(`/reset?sent=1${classQuery}`);
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");
  const classFlow = formData.get("class_flow") === "1";
  const classQuery = classFlow ? "&class=1" : "";
  if (password.length < 12) {
    redirect(
      `/reset/update?error=${encodeURIComponent("Password must be at least 12 characters.")}${classQuery}`,
    );
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset/update?error=${encodeURIComponent(error.message)}${classQuery}`);
  }
  revalidatePath("/", "layout");
  redirect(classFlow ? "/app/classes" : "/app");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signoutClasses() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/class-login");
}
