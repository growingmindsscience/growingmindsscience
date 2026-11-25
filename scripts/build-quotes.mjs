#!/usr/bin/env node
// Writes "What parents say" into the homepage, the pricing page and each class page from
// marketing/parent-quotes.json (not deployed: it holds consent notes), as plain HTML between markers:
//   <!-- quotes:<key>:start -->  ...  <!-- quotes:<key>:end -->
// With no quotes (or none for a page) the markers stay empty and the page shows nothing.
// The quotes are static HTML so search engines and readers without script see them.
//
//   node scripts/build-quotes.mjs          # rewrite the pages
//   node scripts/build-quotes.mjs --check  # exit 1 if a page and the data disagree, or a quote breaks a rule
//
// Rules, enforced here because a testimonial must be real: every quote names where the
// parent said yes (consent), uses a first name only, and stays short.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const MAX_PER_PAGE = 3;

const CLASSES = {
  infant: "Birth to 12 months class",
  toddlerhood: "Toddler class",
  preschool: "Preschool class",
  family: "Whole-family class",
};
// key -> [file, which quotes]. "any" pages show quotes from every class.
const PAGES = {
  home: ["index.html", "any"],
  pricing: ["pricing.html", "any"],
  infant: ["classes/birth-to-12-months.html", "infant"],
  toddlerhood: ["classes/toddlerhood.html", "toddlerhood"],
  preschool: ["classes/preschool.html", "preschool"],
  family: ["classes/family-systems.html", "family"],
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const data = JSON.parse(readFileSync(join(ROOT, "marketing/parent-quotes.json"), "utf8"));
const quotes = Array.isArray(data.quotes) ? data.quotes : [];
const problems = [];
const seen = new Set();
quotes.forEach((q, i) => {
  const at = `quote ${i + 1}`;
  if (!q || typeof q.text !== "string" || !q.text.trim()) problems.push(`${at}: no text`);
  else if (q.text.length > 420) problems.push(`${at}: text over 420 characters; trim it with an ellipsis, never reword`);
  if (typeof q.name !== "string" || !/^[\p{L}][\p{L}'’-]{0,29}$/u.test(q.name.trim())) problems.push(`${at}: name must be a first name only, one word`);
  if (typeof q.consent !== "string" || q.consent.trim().length < 4) problems.push(`${at}: consent must say where and when the parent said yes`);
  if (q.detail != null && (typeof q.detail !== "string" || q.detail.length > 60)) problems.push(`${at}: detail must be a short string`);
  if (!Array.isArray(q.classes) || !q.classes.length || q.classes.some((c) => !CLASSES[c])) problems.push(`${at}: classes must list one or more of ${Object.keys(CLASSES).join(", ")}`);
  const key = (q.text || "").trim().toLowerCase();
  if (seen.has(key)) problems.push(`${at}: duplicate text`);
  seen.add(key);
});
if (problems.length) {
  console.error("marketing/parent-quotes.json:\n  " + problems.join("\n  "));
  process.exit(1);
}

function render(key, which) {
  const list = quotes.filter((q) => which === "any" || q.classes.includes(which)).slice(0, MAX_PER_PAGE);
  if (!list.length) return "\n";
  const items = list.map((q) => {
    const paras = q.text.trim().split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("");
    const cls = which === "any" ? CLASSES[q.classes[0]] : "";
    const who = [q.detail ? esc(q.detail.trim()) : "", cls].filter(Boolean).join(" &middot; ");
    return `          <li><figure class="pq__item"><blockquote class="pq__text">${paras}</blockquote><figcaption class="pq__who"><b>${esc(q.name.trim())}</b>${who ? ", " + who : ""}</figcaption></figure></li>`;
  });
  return `
    <section class="hb-section hb-section--tight pq" aria-labelledby="pq-heading">
      <div class="hb-container">
        <h2 class="hb-display hb-display--m" id="pq-heading">What parents say</h2>
        <ul class="pq__list">
${items.join("\n")}
        </ul>
      </div>
    </section>
`;
}

const stale = [];
for (const [key, [file, which]] of Object.entries(PAGES)) {
  const path = join(ROOT, file);
  const html = readFileSync(path, "utf8");
  const re = new RegExp(`(<!-- quotes:${key}:start -->)[\\s\\S]*?(<!-- quotes:${key}:end -->)`);
  if (!re.test(html)) { console.error(`${file}: no quotes:${key} markers`); process.exit(1); }
  const out = html.replace(re, (_, a, b) => a + render(key, which) + "    " + b);
  if (out !== html) {
    if (CHECK) stale.push(file);
    else writeFileSync(path, out);
  }
}
if (CHECK && stale.length) {
  console.error("Parent quotes out of date in: " + stale.join(", ") + ". Run: node scripts/build-quotes.mjs");
  process.exit(1);
}
console.log(CHECK ? `quotes: ${quotes.length} quote(s), pages match` : `quotes: wrote ${quotes.length} quote(s) into ${Object.keys(PAGES).length} pages`);
