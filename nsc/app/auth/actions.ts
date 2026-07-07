"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
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

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
