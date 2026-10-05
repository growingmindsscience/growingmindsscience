import { INFANT_COURSE, PRESCHOOL_COURSE } from "@/lib/classes";
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

/** Sends a signed-in parent straight to Stripe Checkout for the infant class. */
export const INFANT_ENROLL_PATH = "/app/classes/infant/enroll";
/** The same for the preschool class. */
export const PRESCHOOL_ENROLL_PATH = "/app/classes/preschool/enroll";

/**
 * The class a sign-in or sign-up is on the way to buying, when its
 * destination is an enroll path; null for an ordinary class sign-in.
 */
export function enrollingCourse(destination: string) {
  if (destination === INFANT_ENROLL_PATH) return INFANT_COURSE;
  return destination === PRESCHOOL_ENROLL_PATH ? PRESCHOOL_COURSE : null;
}
