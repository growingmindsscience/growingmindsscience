#!/usr/bin/env node
/**
 * Import a verified Thinkific paid-purchase export into existing, confirmed
 * Supabase accounts. Input JSON:
 * [{"email":"buyer@example.com","purchaseId":"thinkific-order-123","status":"paid"}]
 *
 * Dry run is the default. --apply writes idempotent class and AI grants.
 * Unmatched buyers are printed for support follow-up and can be re-run later.
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

let matched = 0;
let unmatched = 0;
for (const row of rows) {
  const user = usersByEmail.get(row.email.trim().toLowerCase());
  if (!user) {
    unmatched += 1;
    console.log(`UNMATCHED ${row.email} (${row.purchaseId})`);
    continue;
  }
  matched += 1;
  if (apply) {
    const now = new Date().toISOString();
    const sourceRef = `thinkific:${row.purchaseId.trim()}`;
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
  }
  console.log(`${apply ? "GRANTED" : "MATCHED"} ${row.email} (${row.purchaseId})`);
}
console.log(`${apply ? "Applied" : "Dry run"}: ${matched} matched, ${unmatched} unmatched`);
