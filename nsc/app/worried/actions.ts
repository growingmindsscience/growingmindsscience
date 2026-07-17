"use server";

import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const ANON_COOKIE = "gms_nav_anon";

/**
 * Log one completed Navigator walk. Fire-and-forget from the client; never
 * blocks the action sheet. Privacy by architecture: enumerated answers only,
 * no names, no free text. Anonymous sessions key on a first-party cookie.
 */
export async function logNavigatorSession(input: {
  domain: string;
  ageMonths: number;
  corrected: boolean;
  path: { node: string; answer: string }[];
  terminalId: string;
  tier: string;
}) {
  try {
    const jar = await cookies();
    let anon = jar.get(ANON_COOKIE)?.value;
    if (!anon) {
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
    await service.from("navigator_sessions").insert({
      anon_id: anon,
      user_id: user?.id ?? null,
      domain: input.domain,
      age_months: Math.max(0, Math.min(120, Math.round(input.ageMonths))),
      corrected: input.corrected,
      // Enumerated labels only; defensive length caps.
      path: input.path.slice(0, 16).map((p) => ({
        node: String(p.node).slice(0, 64),
        answer: String(p.answer).slice(0, 64),
      })),
      terminal_id: String(input.terminalId).slice(0, 64),
      tier: String(input.tier).slice(0, 32),
    });
  } catch {
    // Analytics must never break the action sheet.
  }
}
