#!/usr/bin/env node
// Writes the families' words into the homepage's founder section and the About page from
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

// Page keys, as in the <!-- quotes:<key>:start --> markers. A quote lists the pages it appears on.
// Quotes stand beside Matthew's experience, never beside an Enroll button: no class or pricing page
// (decision 2026-11-25). "inline" sets them inside the homepage's "person behind the classes"
// section as equal columns; "section" is a section of its own with a lead quote.
const PAGES = {
  home: { file: "index.html", variant: "inline", max: 2 },
  about: { file: "about/index.html", variant: "section", max: 4 },
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
  if (typeof q.pull !== "string" || !q.pull.trim() || q.pull.length > 70) problems.push(`${at}: pull must be a short line (under 70 characters) taken from the quote`);
  else if (typeof q.text === "string" && !q.text.includes(q.pull)) problems.push(`${at}: pull must appear word for word in the quote's text`);
  const key = (q.text || "").trim().toLowerCase();
  if (seen.has(key)) problems.push(`${at}: duplicate text`);
  seen.add(key);
});
if (problems.length) {
  console.error("marketing/parent-quotes.json:\n  " + problems.join("\n  "));
  process.exit(1);
}

function render(key) {
  const { variant, max } = PAGES[key];
  const list = quotes.filter((q) => q.pages.includes(key)).slice(0, max);
  if (!list.length) return "\n";
  const items = list.map((q) => {
    // The pull line is the parent's own words, lifted from the quote; in the full quote the same
    // words carry a sage marker (drawn on by home.js as the quote comes into view). The large line
    // only capitalizes its first letter, as a quoted fragment opening a line does.
    let marked = false;
    const paras = q.text.trim().split(/\n\s*\n/).map((p) => {
      const at = marked ? -1 : p.indexOf(q.pull);
      if (at === -1) return `<p>${esc(p.trim())}</p>`;
      marked = true;
      return `<p>${esc(p.slice(0, at)).trimStart()}<span class="pq__mark">${esc(q.pull)}</span>${esc(p.slice(at + q.pull.length)).trimEnd()}</p>`;
    }).join("");
    // "Parent of a toddler, in-home coaching" reads as who, then how they worked with Matthew.
    const label = q.label.trim();
    const cut = label.indexOf(", ");
    const role = (q.name ? q.name.trim() + ", " : "") + (cut === -1 ? label : label.slice(0, cut));
    const ctx = cut === -1 ? "" : label.slice(cut + 2).replace(/^./, (c) => c.toUpperCase());
    const who = `<span class="pq__role">${esc(role)}</span>` + (ctx ? `<span class="pq__ctx">${esc(ctx)}</span>` : "");
    return `          <li class="pq__li"><figure class="pq__item"><p class="pq__pull" aria-hidden="true">${esc(q.pull.charAt(0).toUpperCase() + q.pull.slice(1))}</p><blockquote class="pq__text">${paras}</blockquote><figcaption class="pq__who">${who}</figcaption></figure></li>`;
  });
  if (variant === "inline") {
    return `
      <div class="hb-container pq pq--inline">
        <h3 class="pq__heading" id="pq-heading">${esc(HEADING)}</h3>
        <p class="pq__intro">${esc(INTRO)}</p>
        <ul class="pq__list pq__list--even" aria-labelledby="pq-heading">
${items.join("\n")}
        </ul>
      </div>
`;
  }
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
for (const [key, { file }] of Object.entries(PAGES)) {
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
