"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { mintClassGiftCodesWith } from "@/lib/class-gift";

/**
 * Make a batch of class gift codes and show them on the page. Each code is
 * worth every class for life, so the redirect carries only how many were
 * made; the page reads the codes themselves from the database.
 */
export async function makeClassGiftCodes(formData: FormData) {
  const admin = await requireClassAdmin();
  const count = Number(formData.get("count") ?? 1);
  const note = String(formData.get("note") ?? "");
  let codes: string[] = [];
  try {
    codes = await mintClassGiftCodesWith(createServiceClient(), { count, note, createdBy: admin.id });
  } catch (err) {
    console.error(`[class-gift] minting failed: ${(err as Error).message}`);
    redirect("/admin/classes/gift-codes?error=mint");
  }
  revalidatePath("/admin/classes/gift-codes");
  redirect(`/admin/classes/gift-codes?made=${codes.length}`);
}
