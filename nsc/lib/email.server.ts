import "server-only";

/**
 * Outbound email via the Resend REST API. Deliberately dependency-free and
 * env-gated: with no RESEND_API_KEY every send is a logged no-op, so the
 * cron can ship and run before email is configured.
 *
 * Tone rules carry over from the content pipeline: no urgency, no
 * comparisons, no streak-shaming — an email is a note that something new is
 * ready, never a guilt trip.
 */

const FROM =
  process.env.NSC_EMAIL_FROM ??
  "Number Path <hello@growingmindsscience.com>";

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!emailEnabled()) {
    console.log(`[email] skipped (no RESEND_API_KEY): ${opts.subject} → ${opts.to}`);
    return { ok: true, skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
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
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email] resend ${res.status}: ${body.slice(0, 300)}`);
    return { ok: false, error: `resend ${res.status}` };
  }
  return { ok: true };
}

/** Shared shell: brand header, body paragraphs, unsubscribe footer. */
export function renderEmail(opts: {
  heading: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  unsubUrl: string;
}): { html: string; text: string } {
  const ps = opts.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;color:#15393C;font-size:16px;line-height:1.55">${p}</p>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F0F5F3;font-family:Georgia,'Times New Roman',serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <p style="margin:0 0 20px;color:#1E5F62;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif">Number Path</p>
    <div style="background:#FFFFFF;border:1px solid #CFE3DE;border-radius:16px;padding:28px 24px">
      <h1 style="margin:0 0 16px;color:#0E2A2D;font-size:22px;line-height:1.3">${opts.heading}</h1>
      ${ps}
      <a href="${opts.ctaUrl}" style="display:inline-block;margin-top:6px;background:#1E5F62;color:#FFFFFF;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;padding:12px 24px;border-radius:999px">${opts.ctaLabel}</a>
    </div>
    <p style="margin:20px 0 0;color:#2E7A77;font-size:12px;line-height:1.5;font-family:Helvetica,Arial,sans-serif">
      This is an enrichment tool, not a medical or developmental screening.
      <a href="${opts.unsubUrl}" style="color:#2E7A77">Stop these emails</a>
    </p>
  </div>
</body></html>`;
  const text =
    `${opts.heading}\n\n` +
    opts.paragraphs.map((p) => p.replace(/<[^>]+>/g, "")).join("\n\n") +
    `\n\n${opts.ctaLabel}: ${opts.ctaUrl}\n\nStop these emails: ${opts.unsubUrl}\n`;
  return { html, text };
}
