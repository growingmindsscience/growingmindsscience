// Shared helpers for the Phase 4 scripts (insights, topics, draft, holds).
// publish.mjs predates this file and keeps its own copies on purpose.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const IG = resolve(HERE, "..");
export const ROOT = resolve(IG, "..", "..");
export const POSTS = join(IG, "posts");
export const CALENDAR = process.env.PUBLISH_CALENDAR || join(IG, "calendar.json");
export const LEDGER = join(IG, "ledger.json");
export const INSIGHTS = join(IG, "insights.json");
export const AUTOMATION = join(IG, "automation.json");
export const GRAPH = "https://graph.instagram.com/v22.0";

// Local runs: values not in the environment come from
// ~/.config/growingminds/instagram.env (KEY=VALUE lines, outside the repo,
// never logged). CI sets them as repository secrets.
export function loadEnv() {
  const envFile = join(process.env.HOME || "", ".config", "growingminds", "instagram.env");
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
export const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;

export function args(argv = process.argv.slice(2)) {
  return {
    list: argv,
    flag: (n) => argv.includes(n),
    opt: (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; },
  };
}

export async function graph(path, params = {}, method = "GET") {
  const url = new URL(`${GRAPH}/${path}`);
  const body = new URLSearchParams({ ...params, access_token: process.env.IG_ACCESS_TOKEN });
  const res = method === "GET"
    ? await fetch(`${url}?${body}`)
    : await fetch(url, { method, body, headers: { "content-type": "application/x-www-form-urlencoded" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`${method} ${path}: ${json.error?.message || res.status}`);
  return json;
}

// Posting slots, read from automation.json: [{ day: "tue", time: "11:00", kind: "carousel" }, ...].
// Times are America/New_York wall-clock; the offset is worked out per date so
// daylight saving changes land on the right UTC instant.
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export function nyOffset(dateStr) {
  // The UTC offset New York keeps at noon on that date, as "-04:00" or "-05:00".
  const d = new Date(`${dateStr}T12:00:00Z`);
  const local = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
  const h = Math.round((local - utc) / 3600000);
  return `${h < 0 ? "-" : "+"}${String(Math.abs(h)).padStart(2, "0")}:00`;
}
export function slotsBetween(slots, from, to) {
  const out = [];
  const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (; day <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    for (const s of slots) {
      if (DAYS[day.getUTCDay()] !== s.day) continue;
      const at = `${date}T${s.time}:00${nyOffset(date)}`;
      const when = new Date(at);
      if (when >= from && when <= to) out.push({ date, at, when, kind: s.kind });
    }
  }
  return out.sort((a, b) => a.when - b.when);
}
