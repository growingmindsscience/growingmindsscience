import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * One-click unsubscribe. The token is an unguessable per-account uuid from
 * nsc_email_prefs; no auth session required (parents click this from a mail
 * client, often on a different device).
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

  let done = false;
  if (ok) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("nsc_email_prefs")
      .update({
        weekly_plan_emails: false,
        checkin_emails: false,
        updated_at: new Date().toISOString(),
      })
      .eq("unsub_token", token)
      .select("owner_id");
    done = Boolean(data && data.length > 0);
  }

  const body = done
    ? "<h1>Done.</h1><p>No more emails from Number Path. The weekly plan keeps refreshing in the app either way.</p>"
    : "<h1>That link didn't work.</h1><p>The unsubscribe link may be incomplete — try copying the whole URL from the email.</p>";

  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Number Path</title></head>
<body style="margin:0;background:#F0F5F3;font-family:Georgia,serif;color:#15393C">
<div style="max-width:480px;margin:15vh auto 0;padding:0 20px;text-align:center">${body}</div>
</body></html>`,
    { status: done ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
