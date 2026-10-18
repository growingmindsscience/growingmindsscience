#!/usr/bin/env node
// Mobile sweep for the arcade: opens the hub and every game at phone and
// tablet viewports in both orientations with Chrome's phone metrics, starts
// each game, rotates it mid-run, closes it, and reports what a phone would
// show. See scripts/arcade/README.md. The findings it produced are in
// docs/arcade/plan.md, section 11.
//
//   node scripts/arcade/mobile-sweep.mjs [--base URL] [--out DIR] [--games a,b] [--profiles x,y]
//                                        [--no-shots] [--throttle] [--compare DIR]
//
// Needs the global @playwright/cli install (it carries Playwright) and the
// installed Chrome, like scripts/build-listen.mjs. Serve the checkout first:
//   node scripts/fg-gate.mjs --serve 4321
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i === -1 ? def : args[i + 1]; };
const flag = (name) => args.includes(name);
const BASE = opt("--base", "http://127.0.0.1:4321");
const OUT = opt("--out", path.join(os.tmpdir(), "gms-arcade-sweep-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")));
const SHOTS = !flag("--no-shots");
const THROTTLE = flag("--throttle");
const COMPARE = opt("--compare", null);

const ALL_GAMES = ["snake", "pong", "dino", "invaders", "breakout", "asteroids", "hopper", "blocks", "echo", "maze", "five", "groups", "nest", "mini", "six"];
const GAMES = opt("--games", ALL_GAMES.join(",")).split(",");
const PROFILES = {
  "320p": { width: 320, height: 568, dpr: 2 },
  "320l": { width: 568, height: 320, dpr: 2 },
  sep: { width: 375, height: 667, dpr: 2 },
  sel: { width: 667, height: 375, dpr: 2 },
  "15p": { width: 393, height: 852, dpr: 3 },
  "15l": { width: 852, height: 393, dpr: 3 },
  pxp: { width: 412, height: 915, dpr: 2.625 },
  pxl: { width: 915, height: 412, dpr: 2.625 },
  padp: { width: 768, height: 1024, dpr: 2, tablet: true },
  padl: { width: 1024, height: 768, dpr: 2, tablet: true },
};
const PROF = opt("--profiles", Object.keys(PROFILES).join(",")).split(",");

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  let root = "";
  try { root = execSync("npm root -g", { encoding: "utf8" }).trim(); } catch {}
  for (const p of ["@playwright/cli/node_modules/playwright", "playwright", "@playwright/test/node_modules/playwright"]) {
    const dir = path.join(root, p);
    if (existsSync(dir)) return req(dir);
  }
  try { return req("playwright"); } catch {}
  throw new Error("Playwright not found. Install it globally: npm i -g @playwright/cli");
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
const report = [];
mkdirSync(OUT, { recursive: true });

for (const pname of PROF) {
  const p = PROFILES[pname];
  if (!p) { console.error("unknown profile " + pname); continue; }
  const ctx = await browser.newContext({
    viewport: { width: p.width, height: p.height }, deviceScaleFactor: p.dpr, isMobile: !p.tablet, hasTouch: true,
    userAgent: p.tablet ? undefined : "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  if (THROTTLE) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); }
  await page.goto(BASE + "/arcade/", { waitUntil: "load" });
  await page.waitForTimeout(300);
  const dir = path.join(OUT, pname); mkdirSync(dir, { recursive: true });

  const hub = await page.evaluate(() => {
    const small = [];
    document.querySelectorAll("button[data-arcade-game]").forEach((b) => {
      const r = b.getBoundingClientRect();
      if (r.width && r.height && (r.width < 44 || r.height < 44)) small.push({ t: b.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height) });
    });
    return { overflowX: document.documentElement.scrollWidth - window.innerWidth, small };
  });
  if (SHOTS) await page.screenshot({ path: path.join(dir, "hub.png") });
  report.push({ profile: pname, key: "hub", hub, errors: errors.splice(0) });

  for (const key of GAMES) {
    const row = { profile: pname, key };
    try {
      await page.click(`button[data-arcade-game="${key}"]`);
      await page.waitForSelector(".gms-arcade-overlay.is-open", { timeout: 8000 });
      await page.waitForSelector(".gms-arcade-overlay.is-open .gms-arcade-prompt:not([hidden])", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
      row.start = await measure(page, p);
      if (SHOTS) await page.screenshot({ path: path.join(dir, `${key}-start.png`) });
      const startBtn = await page.$(".gms-arcade-overlay.is-open .gms-arcade-prompt:not([hidden]) .btn--primary");
      if (startBtn) { await startBtn.click(); await page.waitForTimeout(700); }
      row.play = await measure(page, p);
      if (THROTTLE) row.fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(Math.round(n / 2)); })(); }));
      if (SHOTS) await page.screenshot({ path: path.join(dir, `${key}-play.png`) });
      await page.setViewportSize({ width: p.height, height: p.width });
      await page.waitForTimeout(400);
      row.flip = await measure(page, p);
      if (SHOTS) await page.screenshot({ path: path.join(dir, `${key}-flip.png`) });
      await page.setViewportSize({ width: p.width, height: p.height });
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await page.waitForSelector(".gms-arcade-overlay.is-open", { state: "detached", timeout: 5000 }).catch(async () => { await page.goto(BASE + "/arcade/"); });
      await page.waitForTimeout(500);
    } catch (e) {
      row.error = e.message.split("\n")[0];
      await page.goto(BASE + "/arcade/", { waitUntil: "load" }).catch(() => {});
      await page.waitForTimeout(300);
    }
    row.errors = errors.splice(0);
    report.push(row);
    const m = row.play || row.start || {};
    process.stdout.write(`${pname} ${key} scale=${m.scale ?? "dom"} small=${m.small ? m.small.length : "-"} off=${m.off ? m.off.length : "-"} flipPaused=${row.flip ? row.flip.promptShown : "-"}${row.fps ? " fps=" + row.fps : ""}${row.error ? " ERR " + row.error : ""}\n`);
  }
  await ctx.close();
}
await browser.close();
writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
console.log("\nwrote " + path.join(OUT, "report.json"));
summarize(report, COMPARE);

async function measure(page, p) {
  return page.evaluate((dpr) => {
    const ov = document.querySelector(".gms-arcade-overlay.is-open");
    if (!ov) return { none: true };
    const cv = ov.querySelector("canvas");
    const vw = window.innerWidth, vh = window.innerHeight;
    const small = [], off = [];
    ov.querySelectorAll("button").forEach((b) => {
      const r = b.getBoundingClientRect();
      if (r.width && r.height && (r.width < 44 || r.height < 44)) small.push({ t: (b.getAttribute("aria-label") || b.textContent.trim()).slice(0, 26), w: Math.round(r.width), h: Math.round(r.height) });
    });
    ov.querySelectorAll("button, canvas, .gms-arcade-board, .gms-arcade-prompt__card").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1)) off.push({ t: String(el.className).slice(0, 30), l: Math.round(r.left), top: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) });
    });
    let canvas = null;
    if (cv) { const r = cv.getBoundingClientRect(); canvas = { cssW: Math.round(r.width), cssH: Math.round(r.height), backW: cv.width, backH: cv.height, dprOk: Math.abs(cv.width - Math.round(r.width * Math.min(3, dpr))) <= 2 }; }
    const board = ov.querySelector(".gms-arcade-board");
    const hint = ov.querySelector(".gms-arcade-rotate");
    return {
      vw, vh, scale: cv ? +cv.getAttribute("data-scale") : null, canvas, small, off,
      boardScroll: board ? board.scrollHeight - board.clientHeight : 0,
      rotateHint: !!(hint && !hint.hidden),
      promptShown: !!ov.querySelector(".gms-arcade-prompt:not([hidden])"),
      docWidth: document.documentElement.scrollWidth,
    };
  }, p.dpr);
}

function summarize(r, compareDir) {
  const bm = {};
  if (compareDir) {
    try { for (const row of JSON.parse(readFileSync(path.join(compareDir, "report.json"), "utf8"))) { const m = row.play || row.start; if (m && m.scale) bm[row.profile + "/" + row.key] = m.scale; } }
    catch (e) { console.log("could not read " + compareDir); }
  }
  const byKey = {};
  for (const row of r) {
    if (row.key === "hub") { if (row.hub.overflowX || row.hub.small.length) console.log(row.profile, "hub: overflowX", row.hub.overflowX, "small Play buttons", JSON.stringify(row.hub.small)); continue; }
    const m = row.play || row.start; if (!m) { console.log(row.profile, row.key, "ERR", row.error); continue; }
    const was = bm[row.profile + "/" + row.key];
    (byKey[row.key] ||= []).push(row.profile + ":" + (m.scale != null ? m.scale + (was ? "(" + was + ")" : "") : "dom") + (m.boardScroll ? "/scroll" : "") + (m.off.length ? "/OFF" : "") + (m.rotateHint ? "/HINT" : "") + (m.small.length ? "/small" + m.small.length : "") + (row.fps ? "/fps" + row.fps : ""));
    if (row.errors.length) console.log(row.profile, row.key, "console:", row.errors.slice(0, 2));
    if (m.docWidth > m.vw) console.log(row.profile, row.key, "document wider than the viewport:", m.docWidth, ">", m.vw);
  }
  console.log("\nscale = CSS px per logical unit (earlier run in parentheses); OFF = something outside the viewport; HINT = rotate hint shown");
  for (const k in byKey) console.log(k.padEnd(10), byKey[k].join("  "));
  const small = {};
  for (const row of r) for (const ph of ["start", "play"]) { const m = row[ph]; if (!m) continue; for (const s of m.small) { const id = s.t + " " + s.w + "x" + s.h; small[id] = (small[id] || 0) + 1; } }
  console.log("\nbuttons under 44px: " + (Object.entries(small).sort((a, b) => b[1] - a[1]).slice(0, 12).map((e) => e[0] + " x" + e[1]).join("; ") || "none"));
  const np = []; for (const row of r) if (row.flip && row.flip.scale != null && !row.flip.promptShown) np.push(row.profile + "/" + row.key);
  console.log("canvas games not paused by a mid-run rotation: " + (np.join(" ") || "none"));
  const bad = []; for (const row of r) for (const ph of ["start", "play", "flip"]) { const m = row[ph]; if (m && m.canvas && !m.canvas.dprOk) bad.push(row.profile + "/" + row.key + "/" + ph); }
  console.log("canvases not at device resolution: " + (bad.join(" ") || "none"));
}
