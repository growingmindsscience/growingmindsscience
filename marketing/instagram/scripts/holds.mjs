#!/usr/bin/env node
// Applies Matthew's Hold ticks from the batch issues to calendar.json.
//
//   node marketing/instagram/scripts/holds.mjs          # needs the gh CLI (GH_TOKEN in CI)
//
// The drafter opens one GitHub issue per batch, labeled instagram-batch, with a
// "- [ ] Hold `<post-id>`" line per post. Ticking the box (on the phone is fine)
// moves that post from approved to held, so publish.mjs skips it; unticking moves
// it back. Published posts are never touched. An issue whose posts have all gone
// out, or are held or rejected with their slot passed, is closed.

import { execFileSync } from "node:child_process";
import { CALENDAR, readJson, writeJson } from "./_lib.mjs";

const gh = (...a) => execFileSync("gh", a, { encoding: "utf8" });
let issues;
try {
  issues = JSON.parse(gh("issue", "list", "--label", "instagram-batch", "--state", "open", "--json", "number,body", "--limit", "50"));
} catch (e) {
  console.warn(`holds: could not read the batch issues (${e.message.split("\n")[0]}); calendar left as it is`);
  process.exit(0);
}

const calendar = readJson(CALENDAR);
const byId = new Map(calendar.posts.map((p) => [p.id, p]));
let changed = 0;
for (const issue of issues) {
  const marks = [...issue.body.matchAll(/^- \[( |x|X)\] Hold `([^`]+)`/gm)].map((m) => ({ held: m[1] !== " ", id: m[2] }));
  for (const { held, id } of marks) {
    const p = byId.get(id);
    if (!p || p.status === "published") continue;
    if (held && p.status === "approved") { p.status = "held"; p.held_by = `issue #${issue.number}`; changed++; console.log(`holds: ${id} held (issue #${issue.number})`); }
    if (!held && p.status === "held" && p.held_by === `issue #${issue.number}`) { p.status = "approved"; delete p.held_by; changed++; console.log(`holds: ${id} released`); }
  }
  const done = marks.length && marks.every(({ id }) => {
    const p = byId.get(id);
    return !p || p.status === "published" || (["held", "rejected"].includes(p.status) && new Date(p.scheduled_at) < new Date());
  });
  if (done) {
    try { gh("issue", "close", String(issue.number), "--comment", "Every post in this batch has gone out or was held past its slot. Closing."); console.log(`holds: closed issue #${issue.number}`); }
    catch (e) { console.warn(`holds: could not close issue #${issue.number}: ${e.message.split("\n")[0]}`); }
  }
}
if (changed) writeJson(CALENDAR, calendar);
console.log(`holds: ${issues.length} open batch issue(s), ${changed} change(s)`);
