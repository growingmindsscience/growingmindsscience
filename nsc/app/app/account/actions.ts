"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { applyGrants } from "@/lib/entitlement-writes";
import { takeAccessCodeAttemptWith, type AccessCodeAttempt } from "@/lib/access-code";
import { siteOrigin } from "@/lib/site";
import type { Grant } from "@/lib/grants";

/**
 * Open the Stripe billing portal so a subscriber can update or cancel their
 * plan. Requires a stored Stripe customer id — only subscription buyers have
 * one (one-time Tallykin purchases don't). Redirects back to the account
 * page with a flag if there's nothing to manage.
 */
async function billingPortal(returnPath: string) {
  const user = await requireAuth();

  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const customer = data?.stripe_customer_id;
  if (!customer) redirect(`${returnPath}?billing=none`);

  let url: string;
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer,
      return_url: `${siteOrigin()}/nsc${returnPath}`,
    });
    url = session.url;
  } catch {
    redirect(`${returnPath}?billing=error`);
  }
  redirect(url);
}

export async function openBillingPortal() {
  await billingPortal("/app/account");
}

/** Same portal, returning to the class account page. */
export async function openClassBillingPortal() {
  await billingPortal("/app/classes/account");
}

/** Constant-time string compare that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Legacy shared code can unlock AI, but cannot prove a class purchase. */
export async function redeemAccessCode(formData: FormData) {
  const user = await requireAuth();
  const submitted = String(formData.get("code") ?? "").trim();
  if (!submitted) redirect("/app/account?code=empty");

  // Counted before the comparison, right or wrong (lib/access-code), so the
  // shared code can't be found by guessing.
  let attempt: AccessCodeAttempt = "unavailable";
  try {
    attempt = await takeAccessCodeAttemptWith(createServiceClient(), user.id);
  } catch (err) {
    console.error(`[account] access-code counter unavailable: ${(err as Error).message}`);
  }
  if (attempt === "locked") redirect("/app/account?code=locked");
  if (attempt !== "ok") redirect("/app/account?code=unavailable");

  const configured = String(process.env.GMS_AI_ACCESS_CODE ?? "").trim();
  if (!configured || !safeEqual(submitted, configured)) {
    redirect("/app/account?code=invalid");
  }

  const grants: Grant[] = [
    { product_scope: "ai:unlimited", source: "comp", source_ref: "class-access-code", expires_at: null },
  ];
  // applyGrants throws when the write fails, so "accepted" below is only
  // shown once the grants are actually stored.
  let stored = false;
  try {
    await applyGrants(createServiceClient(), user.id, grants);
    stored = true;
  } catch (err) {
    console.error(`[account] access-code grant failed: ${(err as Error).message}`);
  }
  if (!stored) redirect("/app/account?code=error");
  revalidatePath("/app/account");
  redirect("/app/account?code=ok");
}
