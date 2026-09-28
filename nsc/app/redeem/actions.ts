"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { hasFullAccess } from "@/lib/entitlements.server";
import { redeemGiftCode } from "@/lib/gift.server";

/**
 * Redeem a gift code for the signed-in recipient. Requires auth (the grant is
 * tied to their account). Already-owning accounts are told so rather than
 * burning the code.
 */
export async function redeemGift(formData: FormData) {
  const user = await requireAuth();
  const code = String(formData.get("code") ?? "").slice(0, 64);
  if (!code.trim()) redirect("/redeem?error=Enter+your+code.");

  if (await hasFullAccess()) {
    redirect("/redeem?error=This+account+already+has+full+access.");
  }

  const result = await redeemGiftCode(code, user.id);
  if (!result.ok) {
    const msg =
      result.reason === "unknown"
        ? "We couldn't find that code. Check it and try again."
        : result.reason === "already_redeemed"
          ? "That code has already been redeemed."
          : "Something went wrong on our side, and the code is still unused. Please try again in a moment.";
    redirect(`/redeem?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/", "layout");
  redirect("/app?redeemed=1");
}
