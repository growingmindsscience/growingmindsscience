import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextCheckin } from "@/lib/checkin";

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
    .single();
  if (!child) return new NextResponse("Not found", { status: 404 });

  const { data: assessment } = await supabase
    .from("nsc_assessments")
    .select("completed_at")
    .eq("child_id", id)
    .eq("status", "complete")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assessment?.completed_at) {
    return new NextResponse("No completed check-in yet", { status: 404 });
  }

  const { due } = nextCheckin(assessment.completed_at);
  const day = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
  const dayAfter = new Date(due.getTime() + 24 * 60 * 60 * 1000);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Growing Minds Science//Number Path//EN",
    "BEGIN:VEVENT",
    `UID:nsc-checkin-${id}-${day(due)}@growingmindsscience.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(due)}`,
    `DTEND;VALUE=DATE:${day(dayAfter)}`,
    `SUMMARY:Number Path check-in — ${child.nickname}`,
    "DESCRIPTION:Ten minutes\\, a bowl\\, ten blocks\\, and the bear. Re-run " +
      "the counting-ladder check-in and see if the rung moved: " +
      "https://growingmindsscience.com/nsc/app",
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
