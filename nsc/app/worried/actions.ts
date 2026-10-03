"use server";

import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getTree } from "@/lib/navigator.server";
import { validateWalk } from "@/lib/navigator";

const ANON_COOKIE = "gms_nav_anon";

/**
 * Log one completed Navigator walk. Fire-and-forget from the client; never
 * blocks the action sheet. Privacy by architecture: the walk is replayed
 * against the tree and only its enumerated labels are stored (age in months,
 * the answers tapped, the result), never names or free text. Walks for a
 * tree that isn't visible (a draft in production) are not logged at all.
 * The on-page copy discloses what is kept.
 */
export async function logNavigatorSession(input: unknown) {
  try {
    const domain = (input as { domain?: unknown } | null)?.domain;
    if (typeof domain !== "string" || domain.length > 32) return;
    const tree = getTree(domain);
    if (!tree) return;
    const checked = validateWalk(tree, input);
    if (!checked.ok) return;
    const walk = checked.value;

    const jar = await cookies();
    let anon = jar.get(ANON_COOKIE)?.value;
    if (!anon || !/^[0-9a-f-]{36}$/i.test(anon)) {
      anon = crypto.randomUUID();
      jar.set(ANON_COOKIE, anon, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const service = createServiceClient();
    const { error } = await service.from("navigator_sessions").insert({
      anon_id: anon,
      user_id: user?.id ?? null,
      domain: walk.domain,
      age_months: walk.ageMonths,
      corrected: walk.corrected,
      path: walk.path,
      terminal_id: walk.terminalId,
      tier: walk.tier,
    });
    if (error) console.error(`[navigator] log failed: ${error.message}`);
  } catch {
    // Analytics must never break the action sheet.
  }
}
