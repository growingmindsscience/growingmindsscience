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
