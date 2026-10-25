#!/usr/bin/env node
// Renders a FLO Reel folder's frames.html with headless Chromium.
//
//   node marketing/flo-reels/render.mjs <reel-folder> stills 1.5 5 10 ...   -> frame-<t>.png
//   node marketing/flo-reels/render.mjs <reel-folder> cover                 -> cover.png
//   node marketing/flo-reels/render.mjs <reel-folder> video <narration.mp3> -> final.mp4
//
// frames.html exposes window.renderAt(t) and window.END. Video frames are
// captured at 30 fps and piped into ffmpeg (H.264, yuv420p, AAC 192k), with
// the narration padded with silence to the end of the visuals.

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

// Playwright is installed globally here (and by the CI step elsewhere), so resolve it through require.
const { chromium } = createRequire(import.meta.url)("playwright");

const [folder, mode, ...rest] = process.argv.slice(2);
if (!folder || !mode) { console.error("usage: render.mjs <reel-folder> stills|cover|video ..."); process.exit(1); }
const dir = resolve(folder);
const url = pathToFileURL(join(dir, "frames.html")).href;
const FPS = 30;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });

if (mode === "cover") {
  await page.goto(url + "?cover");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(dir, "cover.png") });
  console.log("cover.png");
} else if (mode === "stills") {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  for (const t of rest.map(Number)) {
    await page.evaluate((t) => window.renderAt(t), t);
    const name = `frame-${String(t).replace(".", "_")}.png`;
    await page.screenshot({ path: join(dir, name) });
    console.log(name);
  }
} else if (mode === "video") {
  const audio = resolve(dir, rest[0] || "narration.mp3");
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const end = await page.evaluate(() => window.END);
  const frames = Math.ceil(end * FPS);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-i", audio, "-af", "apad", "-t", end.toFixed(3),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
    join(dir, "final.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.renderAt(t), i / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 150 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on("close", r));
  if (code !== 0) { console.error("ffmpeg failed"); process.exit(1); }
  console.log(`final.mp4 (${end}s, ${frames} frames)`);
}
await browser.close();
