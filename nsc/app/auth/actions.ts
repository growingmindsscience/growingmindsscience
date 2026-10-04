"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { backfillEntitlementsForUser } from "@/lib/backfill.server";
import { friendlyAuthError } from "@/lib/friendly-error";
import { safeNextPath } from "@/lib/safe-next";
import { siteOrigin } from "@/lib/site";
import { classDestination, isClassPath } from "@/lib/class-paths";

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

/**
 * Classes and Number Path share one account but not one destination. The
 * class forms post `flow=class`, which pins the landing page to a class
 * path even when `next` is missing or points at the Number Path dashboard.
 */
function authTarget(formData: FormData) {
  const classFlow = formData.get("flow") === "class";
  const next = classFlow ? classDestination(formData.get("next")) : safeNextPath(formData.get("next"));
  return { next, classFlow: classFlow || isClassPath(next) };
}

function authPath(classFlow: boolean, page: "login" | "signup") {
  return classFlow ? `/class-${page}` : `/${page}`;
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { next, classFlow } = authTarget(formData);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(
      `${authPath(classFlow, "login")}?error=${encodeURIComponent(friendlyAuthError(error.message))}&next=${encodeURIComponent(next)}`,
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
  const { next, classFlow } = authTarget(formData);

  if (password.length < 12) {
    redirect(
      `${authPath(classFlow, "signup")}?error=${encodeURIComponent("Password must be at least 12 characters.")}&next=${encodeURIComponent(next)}`,
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
      `${authPath(classFlow, "signup")}?error=${encodeURIComponent(friendlyAuthError(error.message))}&next=${encodeURIComponent(next)}`,
    );
  }
  if (!data.session) {
    // Confirmation is on: there is no session yet, so say so instead of
    // bouncing the parent silently to the sign-in page. Class sign-ups go
    // back to the class sign-in, which keeps its destination.
    redirect(`${authPath(classFlow, "login")}?confirm=1&next=${encodeURIComponent(next)}`);
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
  const classFlow = formData.get("class_flow") === "1";
  // Class resets carry their destination through the email link and back.
  const classQuery = classFlow
    ? `&class=1&next=${encodeURIComponent(classDestination(formData.get("next")))}`
    : "";
  if (!email) redirect(`/reset?error=Please+enter+your+email.${classQuery}`);

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/nsc/auth/callback?next=${encodeURIComponent(classFlow ? `/reset/update?${classQuery.slice(1)}` : "/reset/update")}`,
  });
  // Always confirm — never reveal whether an account exists.
  redirect(`/reset?sent=1${classQuery}`);
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");
  const classFlow = formData.get("class_flow") === "1";
  const destination = classDestination(formData.get("next"));
  const classQuery = classFlow ? `&class=1&next=${encodeURIComponent(destination)}` : "";
  if (password.length < 12) {
    redirect(
      `/reset/update?error=${encodeURIComponent("Password must be at least 12 characters.")}${classQuery}`,
    );
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset/update?error=${encodeURIComponent(friendlyAuthError(error.message))}${classQuery}`);
  }
  revalidatePath("/", "layout");
  redirect(classFlow ? destination : "/app");
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
