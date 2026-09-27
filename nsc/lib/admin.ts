import "server-only";
import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

/**
 * Admin gate for the review queue (plan 5.1). Allowlist via ADMIN_EMAILS
 * (comma-separated). Non-admins get a 404, not a 403 — the surface should
 * not advertise its existence.
 */
export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  const email = user.email?.toLowerCase() ?? "";
  if (!email || !adminEmails().has(email)) notFound();
  return user;
}

/** Class media and publishing require an exact Supabase user ID as well. */
export function isClassAdmin(user: User | null): boolean {
  if (!user || !user.email || !adminEmails().has(user.email.toLowerCase())) return false;
  const ids = (process.env.CLASS_ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim());
  return ids.includes(user.id);
}

export async function requireClassAdmin(): Promise<User> {
  const user = await requireAuth();
  if (!isClassAdmin(user)) notFound();
  return user;
}
