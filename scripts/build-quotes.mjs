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
// Rules, enforced here because a testimonial must be real: every quote records where the
// parent said yes (consent), carries a label saying how the family worked with Matthew,
// uses at most a first name, and stays short. Never Review/Rating structured data: these
// are not reviews of a product.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const MAX_PER_PAGE = 4;

// Page keys, as in the <!-- quotes:<key>:start --> markers. A quote lists the pages it appears on.
const PAGES = {
  home: "index.html",
  pricing: "pricing.html",
  infant: "classes/birth-to-12-months.html",
  toddlerhood: "classes/toddlerhood.html",
  preschool: "classes/preschool.html",
  family: "classes/family-systems.html",
};
// Matthew's families so far worked with him in person, so the section says so: no reader should
// take these for reviews of the video classes.
const HEADING = "From families Matthew has worked with";
const INTRO = "Shared with the families’ written permission. Each one worked with Matthew in person.";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const data = JSON.parse(readFileSync(join(ROOT, "marketing/parent-quotes.json"), "utf8"));
const quotes = Array.isArray(data.quotes) ? data.quotes : [];
const problems = [];
const seen = new Set();
quotes.forEach((q, i) => {
  const at = `quote ${i + 1}`;
  if (!q || typeof q.text !== "string" || !q.text.trim()) problems.push(`${at}: no text`);
  else if (q.text.length > 480) problems.push(`${at}: text over 480 characters; trim it with an ellipsis, never reword`);
  if (q.name != null && (typeof q.name !== "string" || !/^[\p{L}][\p{L}'’-]{0,29}$/u.test(q.name.trim()))) problems.push(`${at}: name, if given, must be a first name only, one word`);
  if (typeof q.label !== "string" || !q.label.trim() || q.label.length > 80) problems.push(`${at}: label must say who this is and how they worked with Matthew, in under 80 characters`);
  if (typeof q.consent !== "string" || q.consent.trim().length < 4) problems.push(`${at}: consent must say where and when the parent said yes`);
  if (!Array.isArray(q.pages) || !q.pages.length || q.pages.some((k) => !PAGES[k])) problems.push(`${at}: pages must list one or more of ${Object.keys(PAGES).join(", ")}`);
  const key = (q.text || "").trim().toLowerCase();
  if (seen.has(key)) problems.push(`${at}: duplicate text`);
  seen.add(key);
});
if (problems.length) {
  console.error("marketing/parent-quotes.json:\n  " + problems.join("\n  "));
  process.exit(1);
}

function render(key) {
  const list = quotes.filter((q) => q.pages.includes(key)).slice(0, MAX_PER_PAGE);
  if (!list.length) return "\n";
  const items = list.map((q, i) => {
    const paras = q.text.trim().split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("");
    // "Parent of a toddler, in-home coaching" reads as who, then how they worked with Matthew.
    const label = q.label.trim();
    const cut = label.indexOf(", ");
    const role = (q.name ? q.name.trim() + ", " : "") + (cut === -1 ? label : label.slice(0, cut));
    const ctx = cut === -1 ? "" : label.slice(cut + 2).replace(/^./, (c) => c.toUpperCase());
    const who = `<span class="pq__role">${esc(role)}</span>` + (ctx ? `<span class="pq__ctx">${esc(ctx)}</span>` : "");
    const cls = i === 0 ? "pq__li pq__li--lead" : "pq__li";
    return `          <li class="${cls}"><figure class="pq__item"><blockquote class="pq__text">${paras}</blockquote><figcaption class="pq__who">${who}</figcaption></figure></li>`;
  });
  return `
    <section class="hb-section pq" aria-labelledby="pq-heading">
      <div class="hb-container">
        <h2 class="hb-display hb-display--m" id="pq-heading">${esc(HEADING)}</h2>
        <p class="pq__intro">${esc(INTRO)}</p>
        <ul class="pq__list">
${items.join("\n")}
        </ul>
      </div>
    </section>
`;
}

const stale = [];
for (const [key, file] of Object.entries(PAGES)) {
  const path = join(ROOT, file);
  const html = readFileSync(path, "utf8");
  const re = new RegExp(`(<!-- quotes:${key}:start -->)[\\s\\S]*?(<!-- quotes:${key}:end -->)`);
  if (!re.test(html)) { console.error(`${file}: no quotes:${key} markers`); process.exit(1); }
  const out = html.replace(re, (_, a, b) => a + render(key) + "    " + b);
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
