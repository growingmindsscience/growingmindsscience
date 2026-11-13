import { CLASS_BUNDLE, CLASS_BUNDLE_FOUR, FAMILY_COURSE, INFANT_COURSE, PRESCHOOL_COURSE } from "@/lib/classes";
import { safeNextPath } from "@/lib/safe-next";

export const CLASS_HOME = "/app/classes";

/** Paths that belong to the Classes product, relative to the /nsc base path. */
export function isClassPath(path: string): boolean {
  return ["/app/classes", "/admin/classes"].some((prefix) =>
    path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}

/**
 * Where a class sign-in or sign-up lands. Anything that is not a class
 * path, including the Tallykin dashboard at /app, becomes My classes.
 */
export function classDestination(raw: unknown): string {
  const next = safeNextPath(raw, CLASS_HOME);
  return isClassPath(next) ? next : CLASS_HOME;
}

/** Sends a signed-in parent straight to Stripe Checkout for the infant class. */
export const INFANT_ENROLL_PATH = "/app/classes/infant/enroll";
/** The same for the preschool class. */
export const PRESCHOOL_ENROLL_PATH = "/app/classes/preschool/enroll";
/** The same for the toddler class. */
export const TODDLER_ENROLL_PATH = "/app/classes/toddlerhood/enroll";
/** The same for the family systems class. */
export const FAMILY_ENROLL_PATH = "/app/classes/family/enroll";
/** The same for the three age classes bundle ($119). */
export const BUNDLE_ENROLL_PATH = "/app/classes/bundle/enroll";
/** The same for the all four classes bundle ($159). */
export const ALL_FOUR_ENROLL_PATH = "/app/classes/all-four/enroll";

/**
 * The class a sign-in or sign-up is on the way to buying, when its
 * destination is an enroll path; null for an ordinary class sign-in.
 */
export function enrollingCourse(destination: string) {
  if (destination === INFANT_ENROLL_PATH) return INFANT_COURSE;
  if (destination === BUNDLE_ENROLL_PATH) return CLASS_BUNDLE;
  if (destination === ALL_FOUR_ENROLL_PATH) return CLASS_BUNDLE_FOUR;
  if (destination === FAMILY_ENROLL_PATH) return FAMILY_COURSE;
  return destination === PRESCHOOL_ENROLL_PATH ? PRESCHOOL_COURSE : null;
}
