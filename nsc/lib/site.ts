/**
 * The public origin every absolute link is built from (Stripe return URLs,
 * auth email links, gift and unsubscribe links in emails). One helper so a
 * misconfigured NEXT_PUBLIC_SITE_URL (missing scheme, stray whitespace, a
 * trailing slash) is repaired the same way everywhere.
 */

export const DEFAULT_SITE_ORIGIN = "https://growingmindsscience.com";

/** Coerce a configured origin into `https://host` form; "" when blank. */
export function normalizeOrigin(raw: string | null | undefined): string {
  let origin = (raw ?? "").trim();
  if (!origin) return "";
  if (!/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
  return origin.replace(/\/+$/, "");
}

/**
 * NEXT_PUBLIC_SITE_URL, normalized; otherwise `fallback` (normalized);
 * otherwise the production origin.
 */
export function siteOrigin(fallback: string = DEFAULT_SITE_ORIGIN): string {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeOrigin(fallback) ||
    DEFAULT_SITE_ORIGIN
  );
}

/**
 * Absolute link to a page on the static site (the class catalog, the AI
 * tool). Built from the configured origin so preview deployments are not
 * sent to production by a hard-coded host. Not for in-app routes: those
 * are relative and Next adds the /nsc base path.
 */
export function sitePath(path: string): string {
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
