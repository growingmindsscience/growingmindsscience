import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Unsubscribe. The token is an unguessable per-account uuid from
 * nsc_email_prefs; no auth session required (parents click this from a mail
 * client, often on a different device).
 *
 * GET only shows a confirm button: mail scanners and link previews follow
 * GET links but don't submit forms, so opening the link never unsubscribes
 * anyone by itself. POST performs it: the confirm button, or a mail client's
 * RFC 8058 one-click request (List-Unsubscribe-Post header on every email).
 */

const TOKEN_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(body: string, status: number): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Number Path emails</title></head>
<body style="margin:0;background:#F0F5F3;font-family:Georgia,serif;color:#15393C;line-height:1.6">
<main style="max-width:480px;margin:15vh auto 0;padding:0 20px;text-align:center">${body}</main>
</body></html>`,
    {
      status,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    },
  );
}

/** A fresh Response per request (a body can only be read once). */
const badLink = () =>
  page(
    "<h1>That link didn&rsquo;t work.</h1><p>The unsubscribe link may be incomplete. Try copying the whole link from the email.</p>",
    400,
  );

function tokenFrom(req: Request): string {
  return new URL(req.url).searchParams.get("token") ?? "";
}

export async function GET(req: Request) {
  const token = tokenFrom(req);
  if (!TOKEN_SHAPE.test(token)) return badLink();
  // No action attribute: the form posts back to this exact URL, token included.
  return page(
    `<h1>Stop Number Path emails?</h1>
<p>You&rsquo;ll stop getting the Monday plan note and the check-in reminders. Your plan keeps refreshing in the app either way.</p>
<form method="post" style="margin-top:24px">
  <button type="submit" style="min-height:48px;padding:12px 28px;border:0;border-radius:999px;background:#1E5F62;color:#fff;font:600 16px Helvetica,Arial,sans-serif;cursor:pointer">Stop the emails</button>
</form>`,
    200,
  );
}

export async function POST(req: Request) {
  const token = tokenFrom(req);
  if (!TOKEN_SHAPE.test(token)) return badLink();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("nsc_email_prefs")
    .update({
      weekly_plan_emails: false,
      checkin_emails: false,
      updated_at: new Date().toISOString(),
    })
    .eq("unsub_token", token)
    .select("owner_id");

  if (error) {
    return page(
      "<h1>That didn&rsquo;t go through.</h1><p>Something went wrong on our side. Please try the link again in a moment.</p>",
      500,
    );
  }
  if (!data || data.length === 0) return badLink();
  return page(
    "<h1>Done.</h1><p>No more emails from Number Path. The weekly plan keeps refreshing in the app either way.</p>",
    200,
  );
}
