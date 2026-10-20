#!/usr/bin/env node
// Pulls Instagram's own numbers for every post on the account and writes them
// where the drafter can learn from them.
//
//   node marketing/instagram/scripts/insights.mjs              # refresh insights.json
//   node marketing/instagram/scripts/insights.mjs --readout    # also write readouts/<date>.md
//
// insights.json holds one record per post (reach, saves, shares, views, profile
// visits, follows, and for reels the average watch time), joined to calendar.json
// so each record carries its series, row, age band and hook, plus per-series and
// per-row averages. Saves per reach is the number to move (README, "Measurement").
// The readout is the same data as a short weekly memo for Matthew.
//
// Environment: IG_ACCESS_TOKEN and IG_USER_ID (repository secrets in CI,
// ~/.config/growingminds/instagram.env locally). Read-only against the API.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { IG, CALENDAR, INSIGHTS, POSTS, loadEnv, readJson, writeJson, graph, args } from "./_lib.mjs";

loadEnv();
const a = args();
if (!process.env.IG_ACCESS_TOKEN || !process.env.IG_USER_ID) { console.error("insights: IG_ACCESS_TOKEN and IG_USER_ID are required"); process.exit(1); }

// Instagram Login media metrics (v22). Not every metric exists for every product
// type, so each is asked for on its own and a refusal is recorded as null.
const FEED_METRICS = ["reach", "saved", "shares", "likes", "comments", "total_interactions", "views", "profile_visits", "follows"];
const REEL_METRICS = ["reach", "saved", "shares", "likes", "comments", "total_interactions", "views", "ig_reels_avg_watch_time"];

async function metric(id, name) {
  try {
    const r = await graph(`${id}/insights`, { metric: name });
    return r.data?.[0]?.values?.[0]?.value ?? r.data?.[0]?.total_value?.value ?? null;
  } catch { return null; }
}

async function allMedia() {
  const out = [];
  let page = await graph(`${process.env.IG_USER_ID}/media`, { fields: "id,caption,media_type,media_product_type,timestamp,permalink", limit: "50" });
  for (;;) {
    out.push(...(page.data || []));
    if (!page.paging?.next) break;
    page = await (await fetch(page.paging.next)).json();
  }
  return out;
}

const calendar = readJson(CALENDAR);
const byMedia = new Map(calendar.posts.filter((p) => p.media_id).map((p) => [p.media_id, p]));
const specOf = (id) => { try { return readJson(join(POSTS, id, "spec.json")); } catch { return null; } };
const opener = (s) => s?.slides?.[0] ?? s?.beats?.[0] ?? {};

const me = await graph("me", { fields: "username,followers_count,media_count" });
const media = await allMedia();
const posts = [];
for (const m of media) {
  const reel = m.media_product_type === "REELS";
  const values = {};
  for (const name of reel ? REEL_METRICS : FEED_METRICS) values[name] = await metric(m.id, name);
  const entry = byMedia.get(m.id);
  const spec = entry ? specOf(entry.id) : null;
  const reach = values.reach || 0;
  const rate = (n) => (reach > 0 && n != null ? +(n / reach).toFixed(4) : null);
  posts.push({
    media_id: m.id,
    post: entry?.id ?? null,
    kind: reel ? "reel" : "carousel",
    series: spec?.series ?? (entry ? entry.series : "legacy"),
    row: spec?.row ?? entry?.row ?? null,
    age: spec?.age ?? entry?.age ?? null,
    hook: opener(spec).lead || opener(spec).claim || opener(spec).text || (m.caption || "").split("\n")[0].slice(0, 140),
    published_at: m.timestamp,
    permalink: m.permalink,
    metrics: values,
    rates: { save: rate(values.saved), share: rate(values.shares), profile_visit: rate(values.profile_visits), follow: rate(values.follows) },
  });
}
posts.sort((x, y) => (y.published_at || "").localeCompare(x.published_at || ""));

// Averages per series and per row, over posts at least two days old (younger
// posts are still collecting reach and would drag every rate around).
const settled = posts.filter((p) => Date.now() - new Date(p.published_at) > 2 * 86400000 && (p.metrics.reach || 0) > 0);
function groupBy(key) {
  const g = {};
  for (const p of settled) {
    const k = p[key] || "unknown";
    g[k] ??= { posts: 0, reach: 0, saved: 0, shares: 0 };
    g[k].posts++; g[k].reach += p.metrics.reach || 0; g[k].saved += p.metrics.saved || 0; g[k].shares += p.metrics.shares || 0;
  }
  for (const v of Object.values(g)) {
    v.save_rate = v.reach ? +(v.saved / v.reach).toFixed(4) : null;
    v.share_rate = v.reach ? +(v.shares / v.reach).toFixed(4) : null;
    v.avg_reach = Math.round(v.reach / v.posts);
  }
  return g;
}
const score = (p) => (p.rates.save ?? 0) * 2 + (p.rates.share ?? 0) * 3 + (p.rates.follow ?? 0) * 5;
const ranked = [...settled].filter((p) => score(p) > 0).sort((x, y) => score(y) - score(x));

const out = {
  _schema: "Written by insights.mjs. One record per post on the account, newest first. rates are per reach. top and bottom rank settled posts (two days or older) by saves, shares and follows per reach; the drafter reads them.",
  pulled_at: new Date().toISOString(),
  account: { username: me.username, followers: me.followers_count, media: me.media_count },
  by_series: groupBy("series"),
  by_row: groupBy("row"),
  top: ranked.slice(0, 5).map((p) => ({ post: p.post, series: p.series, row: p.row, hook: p.hook, rates: p.rates, reach: p.metrics.reach })),
  bottom: ranked.length > 5 ? ranked.slice(-3).map((p) => ({ post: p.post, series: p.series, row: p.row, hook: p.hook, rates: p.rates, reach: p.metrics.reach })) : [],
  posts,
};
writeJson(INSIGHTS, out);
console.log(`insights: @${me.username}, ${me.followers_count} followers, ${posts.length} posts (${settled.length} settled) -> insights.json`);

if (a.flag("--readout")) {
  const pct = (v) => (v == null ? "n/a" : `${(v * 100).toFixed(1)}%`);
  const date = new Date().toISOString().slice(0, 10);
  const recent = posts.filter((p) => Date.now() - new Date(p.published_at) < 28 * 86400000);
  const rows = recent.map((p) => `| ${p.published_at.slice(0, 10)} | ${p.post || "(legacy)"} | ${p.series} | ${p.metrics.reach ?? "n/a"} | ${p.metrics.saved ?? "n/a"} | ${p.metrics.shares ?? "n/a"} | ${pct(p.rates.save)} | ${p.metrics.follows ?? "n/a"} |`);
  const series = Object.entries(out.by_series).map(([k, v]) => `| ${k} | ${v.posts} | ${v.avg_reach} | ${pct(v.save_rate)} | ${pct(v.share_rate)} |`);
  const md = `# Instagram readout, ${date}

@${me.username}: ${me.followers_count} followers, ${me.media_count} posts on the account.

## Last four weeks

| Published | Post | Series | Reach | Saves | Shares | Saves per reach | Follows |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n") || "| | nothing published in the last four weeks | | | | | | |"}

## By series (all settled posts)

| Series | Posts | Average reach | Saves per reach | Shares per reach |
| --- | --- | --- | --- | --- |
${series.join("\n") || "| no settled posts yet | | | | |"}

## What the drafter takes from this

${out.top.length ? `Strongest so far: ${out.top.slice(0, 3).map((t) => `"${t.hook}" (${t.series}, ${pct(t.rates.save)} saves per reach)`).join("; ")}.` : "Too few settled posts to rank yet. The drafter keeps an even series mix until there are at least five."}
`;
  const dir = join(IG, "readouts");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${date}.md`), md);
  console.log(`insights: readouts/${date}.md written`);
}
