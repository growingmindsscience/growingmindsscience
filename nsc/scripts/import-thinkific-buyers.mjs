#!/usr/bin/env node
/**
 * Import a verified Thinkific paid-purchase export into existing, confirmed
 * Supabase accounts. Input JSON:
 * [{"email":"buyer@example.com","purchaseId":"thinkific-order-123","status":"paid"}]
 *
 * Dry run is the default. --apply records every order in
 * class_legacy_purchases (migration 0016) and writes idempotent class and AI
 * grants for buyers who already have a confirmed account. Everyone else is
 * granted automatically the first time they sign in with that confirmed
 * email (lib/legacy-class-claims.ts), so no re-run is needed for them.
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const path = process.argv[2];
const apply = process.argv.includes("--apply");
if (!path) {
  console.error("Usage: node scripts/import-thinkific-buyers.mjs verified-paid-buyers.json [--apply]");
  process.exit(2);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(2);
}
const rows = JSON.parse(await readFile(path, "utf8"));
if (!Array.isArray(rows) || rows.some((row) =>
  typeof row.email !== "string" || typeof row.purchaseId !== "string" || row.status !== "paid" ||
  !row.email.includes("@") || !row.purchaseId.trim()
)) {
  throw new Error("Input must be an array of verified paid purchases with email and purchaseId");
}
const purchaseIds = rows.map((row) => row.purchaseId.trim());
if (new Set(purchaseIds).size !== purchaseIds.length) {
  throw new Error("Each purchaseId must appear once; remove duplicate orders before importing");
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const usersByEmail = new Map();
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const user of data.users) {
    if (user.email && user.email_confirmed_at) usersByEmail.set(user.email.toLowerCase(), user);
  }
  if (data.users.length < 1000) break;
}

// Orders already claimed (here or at sign-in) are left alone, so a re-run
// never moves an order to another account or restores a grant expired by hand.
const claimedRefs = new Set();
{
  const { data, error } = await supabase.from("class_legacy_purchases")
    .select("source_ref").not("claimed_by", "is", null);
  if (error && apply) throw error;
  if (error) console.warn(`Could not read class_legacy_purchases (is migration 0016 applied?): ${error.message}`);
  for (const row of data ?? []) claimedRefs.add(row.source_ref);
}

let matched = 0;
let pending = 0;
let skipped = 0;
for (const row of rows) {
  const email = row.email.trim().toLowerCase();
  const sourceRef = `thinkific:${row.purchaseId.trim()}`;
  if (claimedRefs.has(sourceRef)) {
    skipped += 1;
    console.log(`CLAIMED ${row.email} (${row.purchaseId}): already linked, skipped`);
    continue;
  }
  const user = usersByEmail.get(email);
  if (apply) {
    // Recorded for everyone; an existing row (and who claimed it) is kept.
    const { error: recordError } = await supabase.from("class_legacy_purchases")
      .upsert({ source_ref: sourceRef, email, course_slug: "toddlerhood" },
        { onConflict: "source_ref", ignoreDuplicates: true });
    if (recordError) throw recordError;
  }
  if (!user) {
    pending += 1;
    console.log(`${apply ? "PENDING" : "UNMATCHED"} ${row.email} (${row.purchaseId}): granted at first confirmed sign-in`);
    continue;
  }
  matched += 1;
  if (apply) {
    const now = new Date().toISOString();
    const grants = ["class:toddlerhood", "ai:unlimited"].map((productScope) => ({
      user_id: user.id,
      product_scope: productScope,
      source: "comp",
      source_ref: sourceRef,
      expires_at: null,
      updated_at: now,
    }));
    const { error } = await supabase.from("entitlements")
      .upsert(grants, { onConflict: "user_id,product_scope,source,source_ref" });
    if (error) throw error;
    const { error: claimError } = await supabase.from("class_legacy_purchases")
      .update({ claimed_by: user.id, claimed_at: now })
      .eq("source_ref", sourceRef)
      .is("claimed_by", null);
    if (claimError) throw claimError;
  }
  console.log(`${apply ? "GRANTED" : "MATCHED"} ${row.email} (${row.purchaseId})`);
}
console.log(`${apply ? "Applied" : "Dry run"}: ${matched} matched, ${pending} without a confirmed account yet, ${skipped} already claimed`);
