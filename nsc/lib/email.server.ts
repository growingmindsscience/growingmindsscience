import "server-only";

/**
 * Outbound email via the Resend REST API. Deliberately dependency-free and
 * env-gated: with no RESEND_API_KEY every send is a logged no-op, so the
 * cron can ship and run before email is configured.
 *
 * Tone rules carry over from the content pipeline: no urgency, no
 * comparisons, no streak-shaming — an email is a note that something new is
 * ready, never a guilt trip. Templates live in lib/engagement.ts.
 */

const FROM =
  process.env.NSC_EMAIL_FROM ??
  "Number Path <hello@growingmindsscience.com>";

/** How long one Resend call may take before it counts as a failed send. */
const SEND_TIMEOUT_MS = 15_000;

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface SendEmailResult {
  ok: boolean;
  /** Email is not configured; nothing was sent (and nothing failed). */
  skipped?: boolean;
  error?: string;
  /** Network errors, 429 and 5xx: worth trying again later. */
  retryable?: boolean;
}

/**
 * Send one email. Never throws: a network failure or a Resend error comes
 * back as `{ ok: false }` so callers can decide whether to retry.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}): Promise<SendEmailResult> {
  if (!emailEnabled()) {
    // Subject only: recipient addresses don't belong in logs.
    console.log(`[email] skipped (no RESEND_API_KEY): ${opts.subject}`);
    return { ok: true, skipped: true };
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        ...(opts.headers ? { headers: opts.headers } : {}),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (err) {
    console.error(`[email] resend request failed: ${(err as Error).message}`);
    return { ok: false, error: "network", retryable: true };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email] resend ${res.status}: ${body.slice(0, 300)}`);
    return {
      ok: false,
      error: `resend ${res.status}`,
      retryable: res.status === 429 || res.status >= 500,
    };
  }
  return { ok: true };
}
