import { safeNextPath } from "@/lib/safe-next";

export const CLASS_HOME = "/app/classes";

/** Paths that belong to the Classes product, relative to the /nsc base path. */
export function isClassPath(path: string): boolean {
  return ["/app/classes", "/admin/classes"].some((prefix) =>
    path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}

/**
 * Where a class sign-in or sign-up lands. Anything that is not a class
 * path, including the Number Path dashboard at /app, becomes My classes.
 */
export function classDestination(raw: unknown): string {
  const next = safeNextPath(raw, CLASS_HOME);
  return isClassPath(next) ? next : CLASS_HOME;
}
