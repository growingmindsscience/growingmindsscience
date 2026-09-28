import { shortDate } from "@/lib/checkin";

/**
 * Engagement-email building blocks (the daily cron in
 * app/api/cron/engagement). Pure or dependency-injected so each piece is
 * unit-tested; the route only wires them to Supabase and Resend.
 *
 * Tone: an email is a note that something new is ready. Never urgency,
 * never comparison, never a rung name for a Point and Seek read.
 */

/** Split a list into chunks (keeps PostgREST `in.(…)` filters short). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new Error("chunk size must be positive");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Map with at most `limit` promises in flight, preserving input order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export interface CompletedCheckin {
  id: string;
  child_id: string;
  owner_id: string;
  placement: string | null;
  near_cp: boolean | null;
  completed_at: string | null;
  confidence: string | null;
  instrument?: string | null;
}

/** Latest completed check-in per child, whatever order the rows arrive in. */
export function latestCompletedByChild<T extends CompletedCheckin>(rows: readonly T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const r of rows) {
    if (!r.completed_at) continue;
    const seen = latest.get(r.child_id);
    if (!seen || (seen.completed_at ?? "") < r.completed_at) latest.set(r.child_id, r);
  }
  return latest;
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** "Mia", "Mia and Leo", "Mia, Leo and Ava". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Shared shell: brand header, body paragraphs, unsubscribe footer. Every
 * string is plain text and HTML-escaped here (nicknames are parent-typed).
 */
export function renderEmail(opts: {
  subject: string;
  heading: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  unsubUrl: string;
}): RenderedEmail {
  const ps = opts.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;color:#15393C;font-size:16px;line-height:1.55">${escapeHtml(p)}</p>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F0F5F3;font-family:Georgia,'Times New Roman',serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <p style="margin:0 0 20px;color:#1E5F62;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif">Number Path</p>
    <div style="background:#FFFFFF;border:1px solid #CFE3DE;border-radius:16px;padding:28px 24px">
      <h1 style="margin:0 0 16px;color:#0E2A2D;font-size:22px;line-height:1.3">${escapeHtml(opts.heading)}</h1>
      ${ps}
      <a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;margin-top:6px;background:#1E5F62;color:#FFFFFF;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;padding:12px 24px;border-radius:999px">${escapeHtml(opts.ctaLabel)}</a>
    </div>
    <p style="margin:20px 0 0;color:#3D5A5A;font-size:12px;line-height:1.5;font-family:Helvetica,Arial,sans-serif">
      This is an enrichment tool, not a medical or developmental screening.
      <a href="${escapeHtml(opts.unsubUrl)}" style="color:#1E5F62">Stop these emails</a>
    </p>
  </div>
</body></html>`;
  const text =
    `${opts.heading}\n\n` +
    opts.paragraphs.join("\n\n") +
    `\n\n${opts.ctaLabel}: ${opts.ctaUrl}\n\nStop these emails: ${opts.unsubUrl}\n`;
  return { subject: opts.subject, html, text };
}

export interface EmailLinks {
  ctaUrl: string;
  unsubUrl: string;
}

/**
 * Monday note, one per account. `rung` is null for a Point and Seek read,
 * which is a soft signal and is never named as a rung (amendment A5).
 */
export function weeklyEmail(
  kids: readonly { nickname: string; rung: string | null }[],
  links: EmailLinks,
): RenderedEmail {
  const names = joinNames(kids.map((k) => k.nickname));
  const match =
    kids.length > 1
      ? "where each child is right now"
      : kids[0]?.rung
        ? `the ${kids[0].rung} rung`
        : "where they are right now";
  return renderEmail({
    subject: `New games for ${names} this week`,
    heading: "A fresh week of games is ready",
    paragraphs: [
      `Three new games are ready for ${names} this morning, matched to ${match}, plus a fresh number-talk prompt for every day.`,
      "Ten relaxed minutes here and there is the whole assignment.",
    ],
    ctaLabel: "See this week's plan",
    ...links,
  });
}

/** One-time "time for the next check-in" note per completed placement. */
export function checkinEmail(
  child: { nickname: string },
  last: { completedAt: string; rung: string | null },
  links: EmailLinks,
): RenderedEmail {
  const date = shortDate(new Date(last.completedAt));
  const first = last.rung
    ? `The last check-in was ${date} (${last.rung}). Rungs move on the scale of months. Some check-ins show a climb, many show a rung settling in, and both are the ladder working.`
    : `The last check-in was ${date}. Early number words take months to settle, and every check-in is a fresh, playful look.`;
  const second = last.rung
    ? "Ten minutes, a bowl, ten blocks, and the bear. Run it again and this week's games follow whatever you find."
    : "It takes a few relaxed minutes, and this week's games follow whatever you find.";
  return renderEmail({
    subject: `${child.nickname}'s next check-in is ready`,
    heading: `Time for ${child.nickname}'s next check-in`,
    paragraphs: [first, second],
    ctaLabel: `Re-run ${child.nickname}'s check-in`,
    ...links,
  });
}

export type ClaimOutcome = "sent" | "already" | "failed";

/**
 * Send at most once per ledger key, without burning the key on a failure.
 * The ledger row is inserted first as a claim (its unique index keeps
 * overlapping cron runs from both sending), the email goes out, and a failed
 * or thrown send deletes the claim so tomorrow's run tries again.
 */
export async function claimSendRelease<Id>(ops: {
  claim: () => Promise<{ id: Id } | "exists" | "error">;
  send: () => Promise<{ ok: boolean }>;
  release: (id: Id) => Promise<void>;
}): Promise<ClaimOutcome> {
  const claim = await ops.claim();
  if (claim === "exists") return "already";
  if (claim === "error") return "failed";
  let ok = false;
  try {
    ok = (await ops.send()).ok;
  } catch {
    ok = false;
  }
  if (ok) return "sent";
  try {
    await ops.release(claim.id);
  } catch {
    // The claim stays; worst case this one reminder is skipped.
  }
  return "failed";
}
