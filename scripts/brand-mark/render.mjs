// Rasterise the mark's SVGs to PNG with the Playwright bundled in the global playwright-cli.
// usage: node render.mjs <outdir> <svg>:<png>:<px> ...
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const require = createRequire(join(root, '@playwright/cli/node_modules/playwright', 'package.json'));
const { chromium } = require('playwright');

const [outdir, ...jobs] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
for (const job of jobs) {
  const [svg, png, px] = job.split(':');
  const size = Number(px);
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const src = readFileSync(svg, 'utf8');
  await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: join(outdir, png), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log(png, size);
}
await browser.close();
