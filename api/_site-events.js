// Counts form submissions for Matthew's operating system (matthew-os,
// From Little Onward module). One row per submission in the matthew-os
// Supabase table site_events: the kind of form and a short label, never a
// name, an email address, or message text. Uses the project's publishable
// key, which can only insert here. Never blocks or fails the visitor's
// request: unset config, a slow database, or an error all just skip the row.

const KINDS = new Set(["contact", "program_inquiry", "signup", "newsletter"]);

export async function logSiteEvent(kind, detail) {
  const url = process.env.MATTHEW_OS_SUPABASE_URL;
  const key = process.env.MATTHEW_OS_PUBLISHABLE_KEY;
  if (!url || !key || !KINDS.has(kind)) return false;
  const body = { kind };
  if (detail) body.detail = String(detail).slice(0, 120);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/site_events`, {
      method: "POST",
      headers: {
        // A publishable key (sb_publishable_...) goes in apikey only; the
        // gateway maps it to the anon role.
        apikey: key,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res.ok;
  } catch (_) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** The waitlist form's notification subject, as a short label and a kind. */
export function waitlistEvent(subject) {
  const label = String(subject || "").replace(/, From Little Onward$/, "");
  return { kind: /^Articles/.test(label) ? "newsletter" : "signup", detail: label || "Waitlist" };
}
