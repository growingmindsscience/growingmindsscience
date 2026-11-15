import { CLASS_BUNDLE, TODDLER_COURSE, FAMILY_COURSE, INFANT_COURSE, PRESCHOOL_COURSE } from "@/lib/classes";
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

/**
 * Sign-in `next` for a signed-out visit to a protected path. A class path
 * keeps its safe query (Stripe's `?session_id=` on a success page);
 * anything unsafe falls back to the bare path. Other areas keep the path
 * alone, as before.
 */
export function signInNext(pathname: string, search = ""): string {
  if (!isClassPath(pathname)) return pathname;
  return safeNextPath(`${pathname}${search}`, pathname);
}

/** Validate a checkout reference received from an untrusted query. */
export function checkoutSessionId(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.startsWith("cs_") && raw.length < 200 && /^[\w-]+$/.test(raw)
    ? raw
    : undefined;
}

/** The class sign-in URL (path and query) for a given destination. */
export function classLoginUrl(next: string): string {
  return `/class-login?next=${encodeURIComponent(next)}`;
}

/** Sends a signed-in parent straight to Stripe Checkout for the infant class. */
export const INFANT_ENROLL_PATH = "/app/classes/infant/enroll";
/** The same for the preschool class. */
export const PRESCHOOL_ENROLL_PATH = "/app/classes/preschool/enroll";
/** The same for the toddler class. */
export const TODDLER_ENROLL_PATH = "/app/classes/toddlerhood/enroll";
/** The same for the family systems class. */
export const FAMILY_ENROLL_PATH = "/app/classes/family/enroll";
/** The same for the all-classes bundle. */
export const BUNDLE_ENROLL_PATH = "/app/classes/bundle/enroll";

/**
 * The class a sign-in or sign-up is on the way to buying, when its
 * destination is an enroll path; null for an ordinary class sign-in.
 */
export function enrollingCourse(destination: string) {
  if (destination === TODDLER_ENROLL_PATH) return TODDLER_COURSE;
  if (destination === INFANT_ENROLL_PATH) return INFANT_COURSE;
  if (destination === BUNDLE_ENROLL_PATH) return CLASS_BUNDLE;
  if (destination === FAMILY_ENROLL_PATH) return FAMILY_COURSE;
  return destination === PRESCHOOL_ENROLL_PATH ? PRESCHOOL_COURSE : null;
}
