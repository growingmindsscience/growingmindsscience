"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { gradeActivity, gradeBatch } from "@/tools/activities/grader";
import type { ActivityDraft } from "@/lib/activity-types";
import batch001 from "@/tools/activities/batches/batch-001.json";

/** Published + pending drafts, as duplicate-check context for re-grading. */
async function duplicateContext(
  service: ReturnType<typeof createServiceClient>,
  excludeItemId: string,
): Promise<ActivityDraft[]> {
  const [{ data: published }, { data: pending }] = await Promise.all([
    service.from("activities").select("*").eq("status", "published"),
    service
      .from("review_items")
      .select("id, payload")
      .eq("content_type", "activity")
      .eq("status", "pending"),
  ]);
  return [
    ...((published ?? []) as unknown as ActivityDraft[]),
    ...((pending ?? [])
      .filter((r) => r.id !== excludeItemId)
      .map((r) => r.payload) as ActivityDraft[]),
  ];
}

/** Re-grade and persist edited payload JSON. Returns to the item view. */
export async function saveItemEdits(itemId: string, formData: FormData) {
  const admin = await requireAdmin();
  const service = createServiceClient();

  let payload: ActivityDraft;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    redirect(`/admin/review/${itemId}?error=bad-json`);
  }

  const context = await duplicateContext(service, itemId);
  const report = gradeActivity(payload, context);
  await service
    .from("review_items")
    .update({ payload, grader_report: report })
    .eq("id", itemId)
    .eq("status", "pending");

  void admin;
  revalidatePath(`/admin/review/${itemId}`);
  redirect(`/admin/review/${itemId}`);
}

/** Approve: re-grade at decision time; only a passing draft publishes. */
export async function approveItem(itemId: string) {
  const admin = await requireAdmin();
  const service = createServiceClient();

  const { data: item } = await service
    .from("review_items")
    .select("*")
    .eq("id", itemId)
    .eq("status", "pending")
    .maybeSingle();
  if (!item) redirect("/admin");
  if (item.content_type !== "activity") redirect(`/admin/review/${itemId}?error=unsupported-type`);

  const draft = item.payload as ActivityDraft;
  const report = gradeActivity(draft, await duplicateContext(service, itemId));
  if (!report.pass) {
    await service
      .from("review_items")
      .update({ grader_report: report })
      .eq("id", itemId);
    redirect(`/admin/review/${itemId}?error=grader-failed`);
  }

  const { data: activity, error } = await service
    .from("activities")
    .insert({
      slug: draft.slug,
      title: draft.title,
      months_min: draft.months_min,
      months_max: draft.months_max,
      themes: draft.themes,
      domains: draft.domains,
      intention: draft.intention,
      mechanism_tags: draft.mechanism_tags,
      materials: draft.materials,
      steps: draft.steps,
      adapt_down: draft.adapt_down,
      adapt_up: draft.adapt_up,
      evidence_note: draft.evidence_note,
      duration_min: draft.duration_min,
      mess_level: draft.mess_level,
      setting: draft.setting,
      safety_notes: draft.safety_notes ?? "",
      is_free: draft.is_free ?? false,
      status: "published",
      review_item_id: itemId,
    })
    .select("id")
    .single();
  if (error) redirect(`/admin/review/${itemId}?error=${encodeURIComponent(error.message)}`);

  await service
    .from("review_items")
    .update({
      status: "approved",
      grader_report: report,
      published_id: activity.id,
      decided_at: new Date().toISOString(),
      decided_by: admin.email,
    })
    .eq("id", itemId);

  revalidatePath("/admin");
  revalidatePath("/activities");
  redirect("/admin");
}

export async function rejectItem(itemId: string, formData: FormData) {
  const admin = await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) redirect(`/admin/review/${itemId}?error=reason-required`);

  const service = createServiceClient();
  await service
    .from("review_items")
    .update({
      status: "rejected",
      reject_reason: reason,
      decided_at: new Date().toISOString(),
      decided_by: admin.email,
    })
    .eq("id", itemId)
    .eq("status", "pending");

  revalidatePath("/admin");
  redirect("/admin");
}

/**
 * Enqueue batch-001 (idempotent: drafts whose slug is already queued or
 * published are skipped). Grader hard-fails never enter the queue — the
 * plan 2.1 pipeline, step 3.
 */
export async function importBatch001() {
  await requireAdmin();
  const service = createServiceClient();
  const drafts = batch001.activities as unknown as ActivityDraft[];

  const [{ data: existingItems }, { data: existingActivities }] =
    await Promise.all([
      service
        .from("review_items")
        .select("payload")
        .eq("content_type", "activity")
        .in("status", ["pending", "approved"]),
      service.from("activities").select("slug"),
    ]);
  const taken = new Set([
    ...((existingItems ?? []) as { payload: { slug?: string } }[]).map(
      (r) => r.payload?.slug,
    ),
    ...((existingActivities ?? []) as { slug: string }[]).map((r) => r.slug),
  ]);

  const fresh = drafts.filter((d) => !taken.has(d.slug));
  const reports = gradeBatch(fresh, drafts);
  const rows = fresh
    .map((draft, i) => ({ draft, report: reports[i] }))
    .filter(({ report }) => report.pass)
    .map(({ draft, report }) => ({
      content_type: "activity",
      batch_id: batch001.batch_id,
      payload: draft,
      grader_report: report,
      status: "pending",
    }));

  if (rows.length > 0) {
    await service.from("review_items").insert(rows);
  }
  revalidatePath("/admin");
  redirect(`/admin?imported=${rows.length}&skipped=${drafts.length - rows.length}`);
}
