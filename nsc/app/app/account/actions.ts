"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { applyGrants } from "@/lib/entitlements.server";
import type { Grant } from "@/lib/grants";

function siteOrigin(): string {
  let origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (origin && !/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
  return origin.replace(/\/+$/, "") || "https://growingmindsscience.com";
}

const ACCOUNT_URL = () => `${siteOrigin()}/nsc/app/account`;

/**
 * Open the Stripe billing portal so a subscriber can update or cancel their
 * plan. Requires a stored Stripe customer id — only subscription buyers have
 * one (one-time Number Path purchases don't). Redirects back to the account
 * page with a flag if there's nothing to manage.
 */
export async function openBillingPortal() {
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
  if (!customer) redirect("/app/account?billing=none");

  let url: string;
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer,
      return_url: ACCOUNT_URL(),
    });
    url = session.url;
  } catch {
    redirect("/app/account?billing=error");
  }
  redirect(url);
}

/** Constant-time string compare that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Redeem a class access code to link lifetime AI + class access to this
 * account. Grandfathers legacy $49 toddler-bundle buyers, whose purchase lives
 * on Thinkific (not Stripe) and so can't be recovered by the email backfill.
 *
 * The shared GMS_AI_ACCESS_CODE is itself the credential (same posture as the
 * parent AI tool's code gate); a correct code grants perpetual `comp` grants.
 * source_ref is a constant so re-redeeming is idempotent (upsert no-op).
 */
export async function redeemAccessCode(formData: FormData) {
  const user = await requireAuth();
  const submitted = String(formData.get("code") ?? "").trim();
  if (!submitted) redirect("/app/account?code=empty");

  const configured = String(process.env.GMS_AI_ACCESS_CODE ?? "").trim();
  if (!configured || !safeEqual(submitted, configured)) {
    redirect("/app/account?code=invalid");
  }

  const grants: Grant[] = [
    { product_scope: "ai:unlimited", source: "comp", source_ref: "class-access-code", expires_at: null },
    { product_scope: "class:toddlerhood", source: "comp", source_ref: "class-access-code", expires_at: null },
  ];
  try {
    await applyGrants(createServiceClient(), user.id, grants);
  } catch {
    redirect("/app/account?code=error");
  }
  revalidatePath("/app/account");
  redirect("/app/account?code=ok");
}
