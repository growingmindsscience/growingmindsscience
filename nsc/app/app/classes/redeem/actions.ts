"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClassAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { CLASS_GIFT_REDEEM_PATH, redeemClassGiftCodeWith } from "@/lib/class-gift";

export async function redeemClassGift(formData: FormData) {
  const user = await requireClassAuth(CLASS_GIFT_REDEEM_PATH);
  const code = String(formData.get("code") ?? "");
  const result = await redeemClassGiftCodeWith(createServiceClient(), code, user.id);
  if (!result.ok) redirect(`${CLASS_GIFT_REDEEM_PATH}?error=${result.reason}`);
  revalidatePath("/app/classes");
  redirect("/app/classes?gift=ok");
}
