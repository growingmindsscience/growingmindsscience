import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextCheckin } from "@/lib/checkin";
import { siteOrigin } from "@/lib/site";
import { addDaysISO, localDateISO } from "@/lib/tz";
import { getTimeZone } from "@/lib/tz.server";

/** RFC 5545 TEXT escaping (backslash, semicolon, comma, newlines). */
function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * "Add to calendar" for the six-week re-check-in. A plain VEVENT download —
 * the zero-infrastructure reminder that works even if the parent never
 * opens another email from us.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });

  const { data: child } = await supabase
    .from("nsc_children")
    .select("nickname")
    .eq("id", id)
    .maybeSingle();
  if (!child) return new NextResponse("Not found", { status: 404 });

  const { data: assessment } = await supabase
    .from("nsc_assessments")
    .select("completed_at, confidence")
    .eq("child_id", id)
    .eq("status", "complete")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assessment?.completed_at) {
    return new NextResponse("No completed check-in yet", { status: 404 });
  }

  const { due } = nextCheckin(
    assessment.completed_at,
    new Date(),
    assessment.confidence,
  );
  // An all-day event on the parent's calendar day, not the UTC one.
  const dueISO = localDateISO(due, await getTimeZone());
  const day = (iso: string) => iso.replaceAll("-", "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Growing Minds Science//Number Path//EN",
    "BEGIN:VEVENT",
    `UID:nsc-checkin-${id}-${day(dueISO)}@growingmindsscience.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(dueISO)}`,
    `DTEND;VALUE=DATE:${day(addDaysISO(dueISO, 1))}`,
    `SUMMARY:Number Path check-in: ${icsText(child.nickname)}`,
    "DESCRIPTION:Ten minutes\\, a bowl\\, ten blocks\\, and the bear. Re-run " +
      "the counting-ladder check-in and see where things stand: " +
      `${siteOrigin()}/nsc/app`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="number-path-checkin.ics"`,
    },
  });
}
