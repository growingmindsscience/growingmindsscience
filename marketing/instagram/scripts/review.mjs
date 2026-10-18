#!/usr/bin/env node
// Builds the weekly review page: every rendered post as the feed will show it,
// slides swipeable at feed width, the caption with the 125-character fold
// marked, the destination, the sources and the rule checks.
//
//   node marketing/instagram/scripts/review.mjs        -> marketing/instagram/review.html
//
// The page is local and gitignored. Open it in a browser.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const IG = resolve(HERE, "..");
const POSTS = join(IG, "posts");
const OUT = join(IG, "review.html");
const FOLD = 125;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const SERIES = { "field-notes": "Field notes", "one-study": "One study, plainly", "is-this-normal": "Is this normal?", "what-we-got-wrong": "What we got wrong" };

const posts = readdirSync(POSTS)
  .map((d) => join(POSTS, d))
  .filter((d) => statSync(d).isDirectory() && existsSync(join(d, "spec.json")))
  .sort();

function captionParts(md) {
  // caption.md: the caption text, then a "## Hashtags" section.
  const [body, tags = ""] = md.split(/\n## Hashtags\s*\n/);
  const caption = body.replace(/^#.*\n+/, "").trim();
  return { caption, tags: tags.trim() };
}

const cards = posts.map((folder) => {
  const spec = JSON.parse(readFileSync(join(folder, "spec.json"), "utf8"));
  const out = join(folder, "out");
  const slides = existsSync(out) ? readdirSync(out).filter((f) => /^slide-\d+\.jpg$/.test(f)).sort() : [];
  const check = existsSync(join(out, "check.json")) ? JSON.parse(readFileSync(join(out, "check.json"), "utf8")) : null;
  const capFile = join(folder, "caption.md");
  const { caption, tags } = existsSync(capFile) ? captionParts(readFileSync(capFile, "utf8")) : { caption: "", tags: "" };
  const fold = caption.slice(0, FOLD), rest = caption.slice(FOLD);
  const rel = (f) => relative(IG, join(out, f)).split("\\").join("/");
  const imgs = slides.map((f, i) => `<figure><img src="${rel(f)}" alt="slide ${i + 1}" loading="lazy"><figcaption>${i + 1} / ${slides.length}</figcaption></figure>`).join("");
  const problems = check?.problems?.length ? `<ul class="problems">${check.problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : `<p class="ok">All slide rules pass.</p>`;
  const sources = (spec.sources || []).map((s) => `<li>${esc(s)}</li>`).join("");
  const music = spec.music?.brief ? `<p class="meta"><b>Music (add in the app, or none):</b> ${esc(spec.music.brief)}</p>` : "";
  return `
  <section class="post" id="${esc(spec.id)}">
    <header>
      <span class="series">${esc(SERIES[spec.series] || spec.series)}</span>
      <h2>${esc(spec.id)}</h2>
      <p class="meta">${esc(spec.age)} · ${esc(spec.row || "")} · scheduled ${esc(spec.date || spec.id.slice(0, 10))}</p>
    </header>
    <div class="feed">
      <div class="strip">${imgs || "<p class='meta'>Not rendered yet. Run render-carousel.mjs.</p>"}</div>
      <div class="caption">
        <p><span class="fold">${esc(fold)}</span><span class="rest">${esc(rest)}</span></p>
        <p class="tags">${esc(tags)}</p>
        <p class="meta"><b>Destination:</b> ${esc(spec.link?.label || "")} → <code>${esc(spec.link?.page || "")}</code></p>
        ${music}
        <details><summary>Sources</summary><ul>${sources}</ul></details>
        ${problems}
        <p class="actions"><button data-decide="approve">Approve</button><button data-decide="edit">Needs edits</button><button data-decide="reject">Reject</button><span class="decision"></span></p>
      </div>
    </div>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Instagram review</title>
<style>
  :root { --paper:#F7F4EC; --ink:#193C39; --muted:#546965; --forest:#245F58; --sage:#E0EBE5; --clay:#C46C4D; --blue:#426B91; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.5 Inter, "Helvetica Neue", Arial, sans-serif; padding:32px 24px 80px; }
  h1 { font-family: Newsreader, Georgia, serif; font-weight:500; font-size:34px; margin:0 0 6px; }
  .intro { color:var(--muted); margin:0 0 32px; max-width:70ch; }
  .post { border-top:1px solid #CDD3CB; padding:28px 0 12px; }
  .post header h2 { font-family: Newsreader, Georgia, serif; font-weight:500; font-size:24px; margin:4px 0; }
  .series { font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:var(--forest); }
  .meta { color:var(--muted); font-size:14px; margin:4px 0; }
  .feed { display:grid; grid-template-columns: 470px 1fr; gap:28px; align-items:start; margin-top:14px; }
  .strip { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:0; width:470px; border-radius:6px; background:#fff; }
  .strip figure { margin:0; flex:0 0 470px; scroll-snap-align:start; position:relative; }
  .strip img { display:block; width:470px; height:auto; }
  .strip figcaption { position:absolute; top:10px; right:12px; background:rgba(0,0,0,.45); color:#fff; font-size:12px; padding:2px 8px; border-radius:10px; }
  .caption p { margin:0 0 10px; white-space:pre-wrap; }
  .fold { background: var(--sage); }
  .rest { color:#35504C; }
  .tags { color:var(--blue); font-size:14px; }
  .problems { color:var(--clay); padding-left:20px; }
  .ok { color:var(--forest); font-size:14px; }
  details summary { cursor:pointer; color:var(--blue); font-size:14px; }
  details li { font-size:13px; color:var(--blue); }
  .actions button { font:inherit; padding:6px 14px; border:1px solid var(--forest); background:#fff; color:var(--forest); border-radius:6px; margin-right:8px; cursor:pointer; }
  .actions button.on { background:var(--forest); color:#fff; }
  .decision { font-size:14px; color:var(--muted); }
  @media (max-width: 900px) { .feed { grid-template-columns: 1fr; } .strip, .strip figure, .strip img { width:100%; flex-basis:100%; } }
  .export { position:fixed; right:24px; bottom:24px; background:var(--forest); color:#fff; border:0; border-radius:8px; padding:10px 16px; font:inherit; cursor:pointer; }
</style></head>
<body>
<h1>Instagram review</h1>
<p class="intro">Each post as the feed shows it. The shaded part of the caption is what shows before "more". Decide per post; "Copy decisions" puts a summary on the clipboard to paste back.</p>
${cards}
<button class="export" type="button">Copy decisions</button>
<script>
  const decisions = {};
  document.querySelectorAll('.post').forEach(post => {
    post.querySelectorAll('[data-decide]').forEach(btn => btn.addEventListener('click', () => {
      post.querySelectorAll('[data-decide]').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      decisions[post.id] = btn.dataset.decide;
      post.querySelector('.decision').textContent = btn.dataset.decide;
    }));
  });
  document.querySelector('.export').addEventListener('click', async () => {
    const lines = Object.entries(decisions).map(([id, d]) => id + ': ' + d);
    const text = lines.length ? lines.join('\\n') : 'No decisions yet.';
    try { await navigator.clipboard.writeText(text); alert('Copied:\\n' + text); } catch { prompt('Copy this:', text); }
  });
</script>
</body></html>`;

writeFileSync(OUT, html);
console.log(`review page: ${OUT} (${posts.length} posts)`);
