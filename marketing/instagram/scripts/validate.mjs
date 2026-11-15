#!/usr/bin/env node
// The deterministic gates every drafted post passes before it can be queued.
//
//   node marketing/instagram/scripts/validate.mjs <post-folder> [...more]
//   import { validatePost } from "./validate.mjs";
//
// These are the README's rules that a script can check without judgment: the
// shape each series needs, slide and script lengths, the caption's fold,
// question, disclaimer and hashtags, a destination that exists on the site and
// is not launch-held, the house style (no em dashes, no emoji, no "studies
// show"), and sources on record. Rendering (overflow) is checked separately by
// render-carousel.mjs; claims against the research are checked by the critic.

import { readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { IG, ROOT, AUTOMATION, readJson, words } from "./_lib.mjs";

export const SERIES = {
  "one-study": { kind: "carousel", ground: "forest", bodyGround: "paper" },
  "is-this-normal": { kind: "carousel", ground: "sage", bodyGround: "paper" },
  "what-we-got-wrong": { kind: "carousel", ground: "paper", bodyGround: "paper" },
  "field-notes": { kind: "carousel", ground: "paper", bodyGround: "paper" },
  "study-in-30": { kind: "reel", ground: "forest", say: [95, 165] },
  "watch-for-this": { kind: "reel", ground: "paper", say: [85, 140] },
};

export function sceneNames() {
  const src = readFileSync(join(IG, "templates", "carousel", "_scenes.js"), "utf8");
  return [...src.matchAll(/^ {2}([a-z][a-z0-9_]*): \{/gm)].map((m) => m[1]);
}
export function sceneAnchors(name) {
  const src = readFileSync(join(IG, "templates", "carousel", "_scenes.js"), "utf8");
  const start = src.indexOf(`  ${name}: {`);
  if (start < 0) return [];
  const block = src.slice(start, src.indexOf("svg:", start));
  return [...block.matchAll(/^\s+([a-z][a-z0-9_]*):\s*\{\s*x:/gm)].map((m) => m[1]);
}

// /claims/talking-to-baby -> claims/talking-to-baby.html or .../index.html.
// /nsc/... is the Number Path app (its own Next.js project behind a rewrite).
export function pageExists(url) {
  const path = String(url || "").split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
  if (/^nsc\/(classes\/infant\/preview|evidence)?$/.test(path) || path === "nsc") return true;
  if (!path) return existsSync(join(ROOT, "index.html"));
  return [`${path}.html`, join(path, "index.html"), path].some((p) => existsSync(join(ROOT, p)) && !p.endsWith("/"));
}

const EM_DASH = /—|\s–\s/;
const EMOJI = /\p{Extended_Pictographic}/u;
const HYPE = /\bstudies (show|prove)\b|\bscience (says|proves)\b|\bproven\b/i;

function textOf(spec) {
  const bits = [];
  const walk = (v) => { if (typeof v === "string") bits.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => { if (!["url", "anchor", "id", "kind", "type", "ground", "bodyGround", "series", "scene", "date", "brief"].includes(k)) walk(x); }); };
  walk({ slides: spec.slides, beats: spec.beats, labels: spec.labels, link: spec.link });
  return bits.join("\n");
}

export function splitCaption(md) {
  const [body, tags = ""] = String(md).split(/\n## Hashtags\s*\n/);
  return { body: body.replace(/^#.*\n+/, "").trim(), tags: tags.trim() };
}

export function validatePost(spec, captionMd, sourcesMd, cfg = readJson(AUTOMATION)) {
  const p = [];
  const s = SERIES[spec.series];
  if (!s) return [`unknown series "${spec.series}"`];
  const isReel = s.kind === "reel";
  if (isReel !== (spec.kind === "reel")) p.push(`series ${spec.series} is a ${s.kind}, but kind is "${spec.kind || "carousel"}"`);
  for (const k of ["id", "date", "series", "age", "row"]) if (!spec[k]) p.push(`spec.${k} is missing`);
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(spec.id || "")) p.push(`id "${spec.id}" is not <yyyy-mm-dd>-<slug>`);
  if (spec.id && spec.date && !spec.id.startsWith(spec.date)) p.push("id does not start with the date");

  // Destination
  const link = spec.link || {};
  if (!link.url || !link.page || !link.label) p.push("link needs url, page and label");
  else {
    if (!pageExists(link.url)) p.push(`link ${link.url} is not a page on the site`);
    if ((cfg.blocked_links || []).some((b) => link.url.startsWith(b))) p.push(`link ${link.url} is launch-held`);
    if (!/in bio/i.test(link.label)) p.push(`link.label "${link.label}" should name where the link is ("..., link in bio")`);
  }
  if (!spec.music?.brief) p.push("music.brief is missing");
  const srcs = spec.sources || spec.slides?.find((x) => x.type === "sources")?.sources || [];
  if (!srcs.length && !isReel) p.push("no sources on the spec");

  // Scenes
  if (["field-notes", "watch-for-this"].includes(spec.series)) {
    if (!sceneNames().includes(spec.scene)) p.push(`scene "${spec.scene}" is not drawn in _scenes.js`);
    else {
      const anchors = sceneAnchors(spec.scene);
      for (const l of spec.labels || []) if (!anchors.includes(l.anchor)) p.push(`label anchor "${l.anchor}" is not on scene ${spec.scene}`);
    }
  }

  if (isReel) {
    const beats = spec.beats || [];
    if (beats[0]?.kind !== "hook") p.push("the first beat must be kind hook");
    if (beats.at(-1)?.kind !== "mark") p.push("the last beat must be kind mark");
    if (beats.at(-2)?.kind !== "close") p.push("the second-to-last beat must be kind close");
    if (!beats.some((b) => /catch/i.test(b.id || ""))) p.push("no beat with id catch (the honest catch)");
    // The template prints the link label and page under the close line itself.
    if (beats.find((b) => b.kind === "close")?.sub) p.push("the close beat has a sub; the template already shows the link label and page there");
    const ids = beats.map((b) => b.id);
    if (new Set(ids).size !== ids.length) p.push("beat ids repeat");
    // One study told as a story has one result worth animating; a second figure is a second topic.
    const figures = beats.filter((b) => b.bars || b.stat).map((b) => b.id);
    if (figures.length > 1) p.push(`${figures.length} beats carry bars or a stat (${figures.join(", ")}); a reel animates one`);
    const say = beats.reduce((n, b) => n + words(b.say), 0);
    if (say < s.say[0] || say > s.say[1]) p.push(`script is ${say} spoken words; ${spec.series} wants ${s.say[0]} to ${s.say[1]}`);
    if (words(beats[0]?.say) < 5) p.push("the hook line is too short to hold the first two seconds (5 words or more)");
    if (words(beats[0]?.text) > 12) p.push(`hook text is ${words(beats[0]?.text)} words (12 at most)`);
    for (const b of beats) {
      if (b.kind === "mark") continue;
      if (!b.say) p.push(`beat ${b.id} has nothing to say`);
      if (words(b.text) > 16) p.push(`beat ${b.id}: on-screen text is ${words(b.text)} words (16 at most)`);
      if (words(b.sub) > 20) p.push(`beat ${b.id}: sub is ${words(b.sub)} words (20 at most)`);
    }
  } else {
    const slides = spec.slides || [];
    if (slides.length < 5 || slides.length > 9) p.push(`${slides.length} slides; carousels here run 5 to 9`);
    if (slides[0]?.type !== "cover") p.push("the first slide must be the cover");
    if (slides.at(-1)?.type !== "sources") p.push("the last slide must be sources");
    if (!slides.some((x) => x.type === "try")) p.push("no try slide (what to do at home is the save)");
    const cover = slides[0] || {};
    const lead = spec.series === "what-we-got-wrong" ? cover.claim : cover.lead;
    if (!lead) p.push(`cover needs ${spec.series === "what-we-got-wrong" ? "claim and now" : "lead"}`);
    else if (words(lead) > 12) p.push(`cover lead is ${words(lead)} words (12 at most)`);
    if (spec.series === "what-we-got-wrong" && !cover.now) p.push("correction cover needs now");
    if (spec.series === "one-study" && !slides.some((x) => /catch/i.test(x.head || ""))) p.push("one-study needs a slide headed with the catch");
    if (spec.series === "is-this-normal" && !slides.some((x) => x.type === "signs")) p.push("is-this-normal needs a signs slide");
    for (const [i, x] of slides.entries()) {
      if (!["cover", "text", "try", "figure", "range", "signs", "plate", "sources"].includes(x.type)) p.push(`slide ${i + 1}: unknown type ${x.type}`);
      if (x.type === "figure" && !x.bars && !x.stat) p.push(`slide ${i + 1}: figure without bars or stat`);
      if (x.type === "range" && !(x.range && Array.isArray(x.range.most))) p.push(`slide ${i + 1}: range needs range.from, to, most`);
    }
  }

  // House style across every on-screen word
  const all = textOf(spec);
  if (EM_DASH.test(all)) p.push("an em dash in the post text (house style: no em dashes)");
  if (EMOJI.test(all)) p.push("emoji in the post text");
  if (HYPE.test(all)) p.push(`"studies show" style claim in the post text; name the study`);

  // Caption
  const { body, tags } = splitCaption(captionMd || "");
  const caption = `${body}\n\n${tags}`;
  if (!body) p.push("caption is empty");
  if (caption.length > 2200) p.push(`caption is ${caption.length} characters (2,200 at most)`);
  if (body.length < 300) p.push("caption is thin (under 300 characters); the caption is where the searchable detail lives");
  if (!/Educational content, not medical advice\./.test(body)) p.push("caption lacks the disclaimer line");
  if (!/in bio/i.test(body)) p.push("caption lacks the link line (name the page, then 'link in bio')");
  const lastPara = body.split(/\n\s*\n/).filter(Boolean).at(-1) || "";
  if (!/\?\s*$/.test(lastPara)) p.push("the caption's last paragraph should be its one question");
  if ((body.match(/\?/g) || []).length > 2) p.push("more than one question in the caption");
  const hashtags = tags.match(/#[\p{L}\p{N}_]+/gu) || [];
  if (hashtags.length < 4 || hashtags.length > 8) p.push(`${hashtags.length} hashtags (4 to 8)`);
  if (/#[\p{L}\p{N}_]+/u.test(body)) p.push("hashtags belong in the Hashtags section, not the body");
  if (EM_DASH.test(body)) p.push("an em dash in the caption");
  if (EMOJI.test(body)) p.push("emoji in the caption");
  if (HYPE.test(body)) p.push(`"studies show" style claim in the caption`);

  // Sources on record
  if (!sourcesMd || !/## Claims traced/.test(sourcesMd)) p.push("sources.md lacks the Claims traced table");
  return p;
}

if (process.argv[1] && basename(process.argv[1]) === "validate.mjs") {
  const folders = process.argv.slice(2);
  let bad = 0;
  for (const f of folders) {
    const spec = readJson(join(f, "spec.json"));
    const cap = existsSync(join(f, "caption.md")) ? readFileSync(join(f, "caption.md"), "utf8") : "";
    const src = existsSync(join(f, "sources.md")) ? readFileSync(join(f, "sources.md"), "utf8") : "";
    const problems = validatePost(spec, cap, src);
    console.log(`${problems.length ? "!" : "✓"} ${spec.id}`);
    for (const x of problems) console.log(`    ${x}`);
    if (problems.length) bad++;
  }
  if (bad) process.exitCode = 1;
}
