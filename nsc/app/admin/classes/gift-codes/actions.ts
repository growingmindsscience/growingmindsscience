"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { mintClassGiftCodesWith } from "@/lib/class-gift";

/** Make a batch of class gift codes and show them on the page. */
export async function makeClassGiftCodes(formData: FormData) {
  const admin = await requireClassAdmin();
  const count = Number(formData.get("count") ?? 1);
  const note = String(formData.get("note") ?? "");
  let codes: string[] = [];
  try {
    codes = await mintClassGiftCodesWith(createServiceClient(), { count, note, createdBy: admin.id });
  } catch (err) {
    redirect(`/admin/classes/gift-codes?error=${encodeURIComponent((err as Error).message)}`);
  }
  revalidatePath("/admin/classes/gift-codes");
  redirect(`/admin/classes/gift-codes?made=${encodeURIComponent(codes.join(","))}`);
}
