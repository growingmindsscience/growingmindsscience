#!/usr/bin/env node
/* Emits every user-visible string in the Milestone Navigator artifact as
   markdown, grouped by domain, for the attorney review packet.
   Usage: node keel/scripts/copy-inventory.mjs > keel/ATTORNEY-REVIEW-copy.md */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const trees = JSON.parse(readFileSync(join(HERE, "..", "artifacts", "navigator", "trees.v1.json"), "utf8"));

const out = [];
out.push("# Milestone Navigator — complete copy inventory (generated)");
out.push("");
out.push("Generated from `keel/artifacts/navigator/trees.v1.json` by");
out.push("`keel/scripts/copy-inventory.mjs`. Regenerate after any artifact edit;");
out.push("do not edit by hand. Static page copy (hero, disclaimers, how-it-works)");
out.push("lives in `tools/milestone-navigator.html` and is reviewed there.");
out.push("");
out.push(`Artifact version: ${trees.version} · status: ${trees.status}`);
out.push("");
out.push("## Standing invitation (appears on every typical-range result)");
out.push("");
out.push(`> ${trees.required_copy.parent_gut_invitation}`);

for (const [key, d] of Object.entries(trees.domains)) {
  out.push("");
  out.push(`## ${d.title} (${key})`);
  out.push("");
  out.push(`Entry description: "${d.entry}"`);
  out.push("");
  out.push("### Questions");
  for (const q of d.questions) {
    const window = q.always_asked
      ? "always asked"
      : `asked ${q.asked_from_months ?? 0}m${q.asked_until_months != null ? ` to ${q.asked_until_months}m` : "+"}`;
    out.push("");
    out.push(`**${q.prompt}** (${q.id}; ${window}; answers: ${trees.answer_sets[q.answers].map((a) => a.label).join(" / ")})`);
    if (q.help) out.push(`- Help text: ${q.help}`);
    for (const f of q.flags || []) {
      const w = [
        f.age_gte != null ? `from ${f.age_gte}m` : null,
        f.age_lt != null ? `before ${f.age_lt}m` : null,
      ].filter(Boolean).join(", ") || "any age";
      out.push(`- Flag on "${f.on}" (${w}) → **${f.class}**${f.floor_id ? ` [floor: ${f.floor_id}]` : " [no floor: judgment flag]"} — recap label: "${f.label}"`);
    }
    if (q.recheck) out.push(`- Recheck note (on "${q.recheck.on}" before ${q.recheck.age_lt}m): ${q.recheck.note}`);
  }
  out.push("");
  out.push("### Results");
  for (const [cls, t] of Object.entries(d.terminals)) {
    out.push("");
    out.push(`**${cls}** — "${t.title}"`);
    out.push("");
    out.push(`> ${t.body}`);
    if (t.includes_invitation) out.push("> (followed by the standing invitation above)");
    (t.actions || []).forEach((a, i) => out.push(`${i + 1}. ${a}`));
    if (t.script) out.push(`- Call script prefix: "${t.script}" (followed by the recap labels of triggered flags)`);
  }
}
out.push("");
console.log(out.join("\n"));
