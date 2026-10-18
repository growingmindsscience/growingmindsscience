#!/usr/bin/env node
// Renders a carousel post's slides to JPEG.
//
//   node marketing/instagram/scripts/render-carousel.mjs <post-folder> [...more]
//   node marketing/instagram/scripts/render-carousel.mjs --all
//
// Reads <post>/spec.json, picks the template for spec.series, injects the spec
// and a slide index into a temporary copy of the template (written beside it so
// the relative font and token paths keep working), and screenshots each slide at
// 1080 x 1350 with the Chrome that the global playwright-cli bundles, the same
// way scripts/brand-mark/render.mjs does. Output: <post>/out/slide-01.jpg ...
// plus <post>/out/check.json with the rule checks the page reports.
//
// Falls back to Chrome's own --screenshot (PNG, converted with sips) when the
// bundled Playwright is not installed.

import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const IG = resolve(HERE, "..");
const TEMPLATES = join(IG, "templates", "carousel");
const W = 1080, H = 1350;
const MAX_WORDS = 55, MAX_LEAD = 12;

const args = process.argv.slice(2);
let folders = args.filter((a) => !a.startsWith("-"));
if (args.includes("--all") || folders.length === 0) {
  const postsDir = join(IG, "posts");
  folders = readdirSync(postsDir)
    .map((d) => join(postsDir, d))
    .filter((d) => statSync(d).isDirectory() && existsSync(join(d, "spec.json")));
}

// Playwright, from the nearest node_modules (CI installs it there) or from the
// global playwright-cli this Mac already has. Neither is required: see the fallback.
function loadPlaywright() {
  try { return createRequire(import.meta.url)("playwright"); } catch {}
  try {
    const root = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
    const require = createRequire(join(root, "@playwright/cli/node_modules/playwright", "package.json"));
    return require("playwright");
  } catch {
    return null;
  }
}

const CHROME = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean).find((p) => existsSync(p));

function stageHtml(spec, i) {
  const tpl = join(TEMPLATES, `${spec.series}.html`);
  if (!existsSync(tpl)) throw new Error(`No template for series "${spec.series}" (${tpl})`);
  const html = readFileSync(tpl, "utf8").replace(
    "<script src=\"_render.js\"></script>",
    `<script>window.SPEC=${JSON.stringify(spec)};window.SLIDE=${i};</script>\n<script src="_render.js"></script>`,
  );
  const tmp = join(TEMPLATES, `.stage-${spec.id}-${i}.html`);
  writeFileSync(tmp, html);
  return tmp;
}

async function renderWithPlaywright(pw, jobs) {
  // Prefer the installed Chrome; fall back to Playwright's own Chromium (CI).
  let browser;
  try { browser = await pw.chromium.launch({ channel: "chrome" }); } catch { browser = await pw.chromium.launch(); }
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const checks = [];
  for (const j of jobs) {
    await page.goto(pathToFileURL(j.html).href);
    await page.waitForFunction(() => window.__READY === true, null, { timeout: 15000 });
    const check = await page.evaluate(() => window.__CHECK);
    await page.screenshot({ path: j.out, type: "jpeg", quality: 90, clip: { x: 0, y: 0, width: W, height: H } });
    checks.push({ slide: j.i + 1, ...check });
  }
  await browser.close();
  return checks;
}

function renderWithChrome(jobs) {
  if (!CHROME) throw new Error("Neither the bundled Playwright nor Chrome was found. Set CHROME_BIN.");
  const checks = [];
  for (const j of jobs) {
    const png = j.out.replace(/\.jpg$/, ".png");
    execFileSync(CHROME, [
      "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      `--window-size=${W},${H}`, "--virtual-time-budget=3000", `--screenshot=${png}`, pathToFileURL(j.html).href,
    ], { stdio: "ignore" });
    // PNG to JPEG: sips on macOS, ImageMagick elsewhere.
    if (process.platform === "darwin") execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "90", png, "--out", j.out], { stdio: "ignore" });
    else execFileSync("convert", [png, "-quality", "90", j.out], { stdio: "ignore" });
    rmSync(png, { force: true });
    checks.push({ slide: j.i + 1, note: "rendered with plain Chrome; no in-page checks" });
  }
  return checks;
}

const pw = loadPlaywright();
let failures = 0;
for (const folder of folders) {
  const spec = JSON.parse(readFileSync(join(folder, "spec.json"), "utf8"));
  if (!spec.id) spec.id = basename(folder);
  const out = join(folder, "out");
  mkdirSync(out, { recursive: true });
  const jobs = spec.slides.map((_, i) => ({ i, html: stageHtml(spec, i), out: join(out, `slide-${String(i + 1).padStart(2, "0")}.jpg`) }));
  let checks;
  try {
    checks = pw ? await renderWithPlaywright(pw, jobs) : renderWithChrome(jobs);
  } finally {
    for (const j of jobs) rmSync(j.html, { force: true });
  }
  const problems = [];
  for (const c of checks) {
    if (c.overflow) problems.push(`slide ${c.slide}: content overflows the slide`);
    if (c.words > MAX_WORDS && c.type !== "sources") problems.push(`slide ${c.slide}: ${c.words} words (max ${MAX_WORDS})`);
    if (c.leadWords != null && c.leadWords > MAX_LEAD) problems.push(`slide ${c.slide}: lead sentence has ${c.leadWords} words (max ${MAX_LEAD})`);
  }
  writeFileSync(join(out, "check.json"), JSON.stringify({ id: spec.id, series: spec.series, slides: checks, problems }, null, 2));
  const tag = problems.length ? "!" : "✓";
  console.log(`${tag} ${spec.id}: ${jobs.length} slides (${spec.series})`);
  for (const p of problems) console.log(`    ${p}`);
  if (problems.length) failures++;
}
if (failures) {
  console.log(`\n${failures} post(s) break a slide rule. See each out/check.json.`);
  process.exitCode = 1;
}
