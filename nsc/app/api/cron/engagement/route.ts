import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { emailEnabled, renderEmail, sendEmail } from "@/lib/email.server";
import { nextCheckin, shortDate } from "@/lib/checkin";
import { RUNG_LABEL } from "@/lib/labels";

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
 * Tone: an invitation that something new is ready. Never urgency, never
 * comparison — same rules as the certified content.
 */

export const dynamic = "force-dynamic";

const SITE =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://growingmindsscience.com").replace(/\/+$/, "");

function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const results = { weekly: 0, checkin: 0, skipped: !emailEnabled() };

  // Latest completed assessment per child, with owner + nickname.
  const { data: rows, error } = await supabase
    .from("nsc_assessments")
    .select("id, child_id, owner_id, placement, near_cp, completed_at, confidence")
    .eq("status", "complete")
    .order("completed_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const latestByChild = new Map<string, (typeof rows)[number]>();
  for (const r of rows ?? []) {
    if (r.completed_at && !latestByChild.has(r.child_id)) {
      latestByChild.set(r.child_id, r);
    }
  }
  if (latestByChild.size === 0) return NextResponse.json(results);

  const childIds = [...latestByChild.keys()];
  const { data: children } = await supabase
    .from("nsc_children")
    .select("id, owner_id, nickname")
    .in("id", childIds);
  const childById = new Map((children ?? []).map((c) => [c.id, c]));

  // Owner emails + prefs (prefs row may not exist yet → defaults on).
  const ownerIds = [...new Set([...latestByChild.values()].map((r) => r.owner_id))];
  const { data: prefsRows } = await supabase
    .from("nsc_email_prefs")
    .select("owner_id, weekly_plan_emails, checkin_emails, unsub_token")
    .in("owner_id", ownerIds);
  const prefsByOwner = new Map((prefsRows ?? []).map((p) => [p.owner_id, p]));

  async function ownerPrefs(ownerId: string) {
    const existing = prefsByOwner.get(ownerId);
    if (existing) return existing;
    const { data: created } = await supabase
      .from("nsc_email_prefs")
      .upsert({ owner_id: ownerId }, { onConflict: "owner_id" })
      .select("owner_id, weekly_plan_emails, checkin_emails, unsub_token")
      .single();
    if (created) prefsByOwner.set(ownerId, created);
    return created;
  }

  const emailByOwner = new Map<string, string>();
  for (const ownerId of ownerIds) {
    const { data } = await supabase.auth.admin.getUserById(ownerId);
    if (data?.user?.email) emailByOwner.set(ownerId, data.user.email);
  }

  const unsubUrl = (token: string) =>
    `${SITE}/nsc/api/email/unsubscribe?token=${token}`;

  // --- Job 1: Monday weekly-plan note (one per owner) ---
  if (now.getUTCDay() === 1) {
    const week = isoWeekKey(now);
    const byOwner = new Map<string, { nickname: string; rung: string }[]>();
    for (const [childId, a] of latestByChild) {
      const c = childById.get(childId);
      if (!c) continue;
      const list = byOwner.get(c.owner_id) ?? [];
      list.push({
        nickname: c.nickname,
        rung: RUNG_LABEL(a.placement as string, a.near_cp ?? false),
      });
      byOwner.set(c.owner_id, list);
    }

    for (const [ownerId, kids] of byOwner) {
      const to = emailByOwner.get(ownerId);
      const prefs = await ownerPrefs(ownerId);
      if (!to || !prefs?.weekly_plan_emails) continue;

      const { error: logErr } = await supabase.from("nsc_email_log").insert({
        owner_id: ownerId,
        child_id: null,
        kind: "weekly_plan",
        period_key: week,
      });
      if (logErr) continue; // already sent this week

      const names = kids.map((k) => k.nickname).join(" and ");
      const { html, text } = renderEmail({
        heading: `A fresh week of games is ready`,
        paragraphs: [
          `Three new games landed for ${names} this morning — picked for ${
            kids.length > 1 ? "each child's rung" : `the ${kids[0].rung} rung`
          }, plus a fresh number-talk prompt for every day.`,
          `Ten relaxed minutes here and there is the whole assignment.`,
        ],
        ctaLabel: "See this week's plan",
        ctaUrl: `${SITE}/nsc/app`,
        unsubUrl: unsubUrl(prefs.unsub_token),
      });
      const sent = await sendEmail({ to, subject: `New games for ${names} this week`, html, text });
      if (sent.ok && !sent.skipped) results.weekly++;
    }
  }

  // --- Job 2: six-week check-in reminders (one per placement, ever) ---
  for (const [childId, a] of latestByChild) {
    const c = childById.get(childId);
    const to = c && emailByOwner.get(c.owner_id);
    if (!c || !to) continue;
    const { ready } = nextCheckin(a.completed_at!, now, a.confidence);
    if (!ready) continue;

    const prefs = await ownerPrefs(c.owner_id);
    if (!prefs?.checkin_emails) continue;

    const { error: logErr } = await supabase.from("nsc_email_log").insert({
      owner_id: c.owner_id,
      child_id: childId,
      kind: "checkin_ready",
      period_key: a.id,
    });
    if (logErr) continue; // already reminded for this assessment

    const rung = RUNG_LABEL(a.placement as string, a.near_cp ?? false);
    const { html, text } = renderEmail({
      heading: `Time for ${c.nickname}'s next check-in`,
      paragraphs: [
        `The last check-in was ${shortDate(new Date(a.completed_at!))} (${rung}). Rungs move on the scale of months — some check-ins show a climb, many show a rung settling in, and both are the ladder working.`,
        `Ten minutes, a bowl, ten blocks, and the bear — run it again and this week's games follow whatever you find.`,
      ],
      ctaLabel: `Re-run ${c.nickname}'s check-in`,
      ctaUrl: `${SITE}/nsc/app`,
      unsubUrl: unsubUrl(prefs.unsub_token),
    });
    const sent = await sendEmail({
      to,
      subject: `${c.nickname}'s next check-in is ready`,
      html,
      text,
    });
    if (sent.ok && !sent.skipped) results.checkin++;
  }

  return NextResponse.json(results);
}
