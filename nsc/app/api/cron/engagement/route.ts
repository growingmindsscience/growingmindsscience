import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { emailEnabled, sendEmail } from "@/lib/email.server";
import { nextCheckin } from "@/lib/checkin";
import { rungLabelFor } from "@/lib/labels";
import { isoWeekKey } from "@/lib/isoweek";
import { siteOrigin } from "@/lib/site";
import {
  checkinEmail,
  chunk,
  claimSendRelease,
  latestCompletedByChild,
  mapLimit,
  weeklyEmail,
  type CompletedCheckin,
  type RenderedEmail,
} from "@/lib/engagement";

/**
 * Daily engagement cron (vercel.json). Two jobs, both idempotent via
 * nsc_email_log's unique (owner, child, kind, period_key):
 *
 *  - Mondays: "the new week is ready" — one email per owner covering every
 *    child with a completed check-in (period_key = ISO week).
 *  - Every day: "six weeks are up" — one email per child when the latest
 *    completed check-in crosses the re-check interval (period_key = the
 *    assessment id, so each placement triggers at most one reminder ever).
 *
 * A ledger row is claimed before sending and released if the send fails, so
 * a failed or skipped send never uses up a one-time reminder. With email
 * unconfigured the cron exits before touching the ledger at all.
 *
 * Tone: an invitation that something new is ready. Never urgency, never
 * comparison — same rules as the certified content.
 */

export const dynamic = "force-dynamic";
/** Safe on every Vercel plan (Hobby caps non-fluid functions at 60s). */
export const maxDuration = 60;

/** Rows per page; PostgREST caps a single response at max_rows (1000). */
const PAGE = 1000;
/** Ids per `in.(…)` filter, well under URL length limits. */
const IN_CHUNK = 100;
/** Parallel auth-admin lookups. */
const LOOKUP_CONCURRENCY = 8;

interface ChildRow {
  id: string;
  owner_id: string;
  nickname: string;
}
interface PrefsRow {
  owner_id: string;
  weekly_plan_emails: boolean;
  checkin_emails: boolean;
  unsub_token: string;
}

const failure = (msg: string) => NextResponse.json({ error: msg }, { status: 500 });

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const results = { weekly: 0, checkin: 0, failed: 0, skipped: false };
  if (!emailEnabled()) {
    // Nothing can be sent. Exit before claiming any ledger row, so no
    // one-time reminder is used up while email isn't configured.
    return NextResponse.json({ ...results, skipped: true });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const site = siteOrigin();

  // --- Every completed check-in, paged ---
  const rows: CompletedCheckin[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("nsc_assessments")
      .select("id, child_id, owner_id, placement, near_cp, completed_at, confidence, instrument")
      .eq("status", "complete")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return failure(error.message);
    rows.push(...((data ?? []) as CompletedCheckin[]));
    if (!data || data.length < PAGE) break;
  }
  const latestByChild = latestCompletedByChild(rows);
  if (latestByChild.size === 0) return NextResponse.json(results);

  // --- Children (for nicknames), chunked ---
  const childById = new Map<string, ChildRow>();
  for (const ids of chunk([...latestByChild.keys()], IN_CHUNK)) {
    const { data, error } = await supabase
      .from("nsc_children")
      .select("id, owner_id, nickname")
      .in("id", ids);
    if (error) return failure(error.message);
    for (const c of (data ?? []) as ChildRow[]) childById.set(c.id, c);
  }

  // --- Prefs (a missing row means defaults on), chunked ---
  const ownerIds = [...new Set([...latestByChild.values()].map((r) => r.owner_id))];
  const prefsByOwner = new Map<string, PrefsRow>();
  for (const ids of chunk(ownerIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("nsc_email_prefs")
      .select("owner_id, weekly_plan_emails, checkin_emails, unsub_token")
      .in("owner_id", ids);
    if (error) return failure(error.message);
    for (const p of (data ?? []) as PrefsRow[]) prefsByOwner.set(p.owner_id, p);
  }

  async function ownerPrefs(ownerId: string): Promise<PrefsRow | null> {
    const existing = prefsByOwner.get(ownerId);
    if (existing) return existing;
    const { data: created, error } = await supabase
      .from("nsc_email_prefs")
      .upsert({ owner_id: ownerId }, { onConflict: "owner_id" })
      .select("owner_id, weekly_plan_emails, checkin_emails, unsub_token")
      .single();
    if (error || !created) return null;
    prefsByOwner.set(ownerId, created as PrefsRow);
    return created as PrefsRow;
  }

  // --- Owner emails, bounded concurrency ---
  const emailByOwner = new Map<string, string>();
  await mapLimit(ownerIds, LOOKUP_CONCURRENCY, async (ownerId) => {
    const { data } = await supabase.auth.admin.getUserById(ownerId);
    if (data?.user?.email) emailByOwner.set(ownerId, data.user.email);
  });

  const unsubUrl = (token: string) => `${site}/nsc/api/email/unsubscribe?token=${token}`;
  const ctaUrl = `${site}/nsc/app`;

  /** Claim the ledger key, send, and release the claim if the send fails. */
  const sendOnce = (
    key: { owner_id: string; child_id: string | null; kind: string; period_key: string },
    to: string,
    mail: RenderedEmail,
    unsub: string,
  ) =>
    claimSendRelease<number | string>({
      claim: async () => {
        const { data, error } = await supabase
          .from("nsc_email_log")
          .insert(key)
          .select("id")
          .single();
        if (error) return error.code === "23505" ? "exists" : "error";
        return { id: (data as { id: number | string }).id };
      },
      send: () =>
        sendEmail({
          to,
          ...mail,
          // RFC 8058 one-click unsubscribe (the endpoint accepts POST).
          headers: {
            "List-Unsubscribe": `<${unsub}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      release: async (id) => {
        await supabase.from("nsc_email_log").delete().eq("id", id);
      },
    });

  // --- Job 1: Monday weekly-plan note (one per owner) ---
  if (now.getUTCDay() === 1) {
    const week = isoWeekKey(now);
    const byOwner = new Map<string, { nickname: string; rung: string | null }[]>();
    for (const [childId, a] of latestByChild) {
      const c = childById.get(childId);
      if (!c) continue;
      const list = byOwner.get(c.owner_id) ?? [];
      list.push({ nickname: c.nickname, rung: rungLabelFor(a) });
      byOwner.set(c.owner_id, list);
    }

    for (const [ownerId, kids] of byOwner) {
      const to = emailByOwner.get(ownerId);
      const prefs = await ownerPrefs(ownerId);
      if (!to || !prefs?.weekly_plan_emails) continue;
      const unsub = unsubUrl(prefs.unsub_token);
      const outcome = await sendOnce(
        { owner_id: ownerId, child_id: null, kind: "weekly_plan", period_key: week },
        to,
        weeklyEmail(kids, { ctaUrl, unsubUrl: unsub }),
        unsub,
      );
      if (outcome === "sent") results.weekly++;
      else if (outcome === "failed") results.failed++;
    }
  }

  // --- Job 2: six-week check-in reminders (one per placement, ever) ---
  for (const [childId, a] of latestByChild) {
    const c = childById.get(childId);
    const to = c && emailByOwner.get(c.owner_id);
    if (!c || !to || !a.completed_at) continue;
    const { ready } = nextCheckin(a.completed_at, now, a.confidence);
    if (!ready) continue;

    const prefs = await ownerPrefs(c.owner_id);
    if (!prefs?.checkin_emails) continue;
    const unsub = unsubUrl(prefs.unsub_token);
    const outcome = await sendOnce(
      { owner_id: c.owner_id, child_id: childId, kind: "checkin_ready", period_key: a.id },
      to,
      checkinEmail(c, { completedAt: a.completed_at, rung: rungLabelFor(a) }, { ctaUrl, unsubUrl: unsub }),
      unsub,
    );
    if (outcome === "sent") results.checkin++;
    else if (outcome === "failed") results.failed++;
  }

  return NextResponse.json(results);
}
