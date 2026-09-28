/**
 * Calm, parent-facing wording for errors that would otherwise surface raw
 * (Supabase auth messages, Postgres errors, "fetch failed"). Raw messages
 * are jargon at best and leak internals at worst; these say what happened
 * and what to do next.
 */

export const SAVE_FAILED =
  "We couldn't save that just now. Please try again in a moment.";

const CONNECTION =
  "We couldn't reach the server. Check your connection and try again.";

/** Map a Supabase auth error message to calm copy. */
export function friendlyAuthError(message: string | null | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email and password don't match. Try again, or reset your password.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("already exists"))
    return "There's already an account with that email. Try signing in instead.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first. The link is in your inbox.";
  if (m.includes("password") && (m.includes("weak") || m.includes("at least") || m.includes("short")))
    return "Please choose a longer password (at least 12 characters).";
  if (m.includes("same") && m.includes("password"))
    return "That's your current password. Please choose a new one.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "Too many tries in a row. Please wait a minute, then try again.";
  if (m.includes("invalid") && m.includes("email"))
    return "That email address doesn't look right. Please check it.";
  if (m.includes("fetch failed") || m.includes("network") || m.includes("timeout"))
    return CONNECTION;
  return "Something went wrong. Please try again.";
}
