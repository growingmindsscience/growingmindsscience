#!/usr/bin/env node
// The Field Guide ship gate (docs/field-guide/plan.md, "The ship gate").
//
//   node scripts/fg-gate.mjs [pages...] [--label NAME] [--base URL] [--css a.css,b.css]
//                            [--skip g1,g2,g3,g6,g8] [--widths 1440,768,390]
//
//   pages    site paths such as / /lens/leaving-the-playground /classes/  (default: / and the Lens)
//   --label  names the report: docs/field-guide/gate-reports/<date>-<label>.md  (default: run)
//   --base   run against a deployed build (a Vercel preview) instead of the local server; G1 and G2
//            still run on the checkout, G3, G6 and G8 run against the URL
//   --serve  [port] only serve the checkout the way the gate does (default port 4173), for screenshots
//   --css    stylesheets for G2; default is every .css changed against origin/main, or, when none
//            changed, every local stylesheet the listed pages load (so a baseline still lints)
//
// Runs the automated gates G1, G2, G3, G6 (its automated half) and G8, writes one markdown report,
// and prints the manual checklist for G4, G5, G7 and G9 at the end. A gate that cannot run says so
// in the report with the reason; nothing is skipped silently. Exit 1 when any automated gate fails.
//
// Tooling, nothing added to the repo:
//   taste lint and inspector  .agents/skills/design-taste-frontend/scripts/ (the worktree's own, else
//                             the main checkout's, else FG_TASTE_SCRIPTS)
//   Playwright                the copy bundled with the global playwright-cli (or FG_PLAYWRIGHT)
//   axe-core, Lighthouse      installed once into .fg-gate/tools (gitignored), pinned below
//
// The local server honors vercel.json rewrites and compresses text like Vercel does. It does not
// apply vercel.json headers (CSP, caching), so local Lighthouse numbers are indicative; the
// definitive G8 numbers come from a --base run against the PR's preview.

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = join(ROOT, '.fg-gate', 'tools');
const PINS = { 'axe-core': '4.10.3', lighthouse: '12.8.2' };
const G8_PAGES = ['/', '/lens/leaving-the-playground', '/classes/'];
const G8_MIN = { performance: 90, cls: 0.1, lcp: 2500 };

// ---------- arguments ----------
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf('--' + name); if (i === -1) return def; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const label = opt('label', 'run').replace(/[^a-z0-9-]+/gi, '-');
const base = opt('base', '');
const cssArg = opt('css', '');
const skip = new Set(opt('skip', '').toLowerCase().split(',').filter(Boolean));
const widths = opt('widths', '1440,768,390').split(',').map(Number).filter(Boolean);
const pages = argv.filter((a) => !a.startsWith('--'));
if (!pages.length) pages.push('/', '/lens/leaving-the-playground');

const today = new Date().toISOString().slice(0, 10);
const reportPath = join(ROOT, 'docs', 'field-guide', 'gate-reports', `${today}-${label}.md`);
const workDir = join(ROOT, '.fg-gate', `${today}-${label}`);
mkdirSync(workDir, { recursive: true });
const slug = (p) => (p.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'home');
const rel = (p) => relative(ROOT, p).split(sep).join('/');
const log = (s) => process.stderr.write(s + '\n');
// The line worth quoting from a passing command: a test count or a check mark, else nothing.
const summaryLine = (out) => { const lines = String(out).replace(/\x1b\[[0-9;]*m/g, '').split('\n').map((l) => l.trim()); return (lines.filter((l) => /^(Tests|Test Files)\s+\d|^✓/.test(l)).join(' · ') || '').slice(0, 200); };
const tail = (s, n = 12) => String(s || '').trim().split('\n').slice(-n).join('\n');

// Every gate result: { id, title, status: 'pass' | 'fail' | 'not run', lines: [markdown] }
const results = [];
const inspectImages = {};
const gate = (id, title) => { const g = { id, title, status: 'pass', lines: [] }; results.push(g); return g; };
const notRun = (g, why) => { g.status = 'not run'; g.lines.push(`Not run: ${why}`); };

// ---------- the local server: vercel.json rewrites, clean URLs, compression ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

function vercelRewrites() {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  return (cfg.rewrites || []).filter((r) => r.destination.startsWith('/')).map((r) => {
    const names = [];
    const re = '^' + r.source.replace(/:(\w+)(\*?)/g, (_, n, star) => { names.push(n); return star ? '(.*)' : '([^/]+)'; }) + '/?$';
    return { re: new RegExp(re), names, destination: r.destination };
  });
}

function resolveFile(pathname) {
  for (const r of REWRITES) {
    const m = pathname.match(r.re);
    if (m) { let d = r.destination; r.names.forEach((n, i) => { d = d.replaceAll(':' + n, m[i + 1]); }); pathname = d; break; }
  }
  const f = resolve(join(ROOT, decodeURIComponent(pathname)));
  if (f !== ROOT && !f.startsWith(ROOT + sep)) return null;
  for (const c of [f, join(f, 'index.html'), f + '.html']) { try { if (statSync(c).isFile()) return c; } catch {} }
  return null;
}

let REWRITES = [];
async function startServer() {
  REWRITES = vercelRewrites();
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://x').pathname;
    const file = resolveFile(pathname);
    if (!file) { const nf = join(ROOT, '404.html'); res.writeHead(404, { 'content-type': MIME['.html'] }); return res.end(existsSync(nf) ? readFileSync(nf) : 'not found'); }
    const ext = extname(file).toLowerCase();
    let body = readFileSync(file);
    const headers = { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' };
    const accept = String(req.headers['accept-encoding'] || '');
    if (COMPRESSIBLE.has(ext)) {
      if (accept.includes('br')) { body = brotliCompressSync(body); headers['content-encoding'] = 'br'; }
      else if (accept.includes('gzip')) { body = gzipSync(body); headers['content-encoding'] = 'gzip'; }
    }
    headers['content-length'] = body.length;
    res.writeHead(200, headers);
    res.end(body);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server;
}

// ---------- tooling ----------
function tasteScripts() {
  const candidates = [process.env.FG_TASTE_SCRIPTS, join(ROOT, '.agents/skills/design-taste-frontend/scripts')];
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim();
    candidates.push(join(dirname(common), '.agents/skills/design-taste-frontend/scripts'));
  } catch {}
  return candidates.find((c) => c && existsSync(join(c, 'inspect.mjs'))) || null;
}

function loadPlaywright() {
  const candidates = [process.env.FG_PLAYWRIGHT];
  try { candidates.push(join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), '@playwright/cli/node_modules/playwright')); } catch {}
  for (const c of candidates) if (c && existsSync(join(c, 'package.json'))) return createRequire(join(c, 'package.json'))(c);
  try { return createRequire(join(ROOT, 'package.json'))('playwright'); } catch { return null; }
}

// The installed Chrome first (the browser the taste inspector drives), then Playwright's own Chromium.
async function launchBrowser(pw) {
  const errors = [];
  for (const o of [{ channel: 'chrome' }, {}]) {
    try { return { browser: await pw.chromium.launch(o) }; } catch (e) { errors.push(String(e.message).split('\n')[0]); }
  }
  return { error: errors.join('; ') };
}

function ensureTools() {
  const missing = Object.entries(PINS).filter(([n, v]) => {
    try { return JSON.parse(readFileSync(join(TOOLS, 'node_modules', n, 'package.json'), 'utf8')).version !== v; } catch { return true; }
  });
  if (!missing.length) return null;
  mkdirSync(TOOLS, { recursive: true });
  if (!existsSync(join(TOOLS, 'package.json'))) writeFileSync(join(TOOLS, 'package.json'), '{"private":true}\n');
  log(`installing ${missing.map(([n, v]) => `${n}@${v}`).join(', ')} into ${rel(TOOLS)}`);
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--silent', ...missing.map(([n, v]) => `${n}@${v}`)], { cwd: TOOLS, encoding: 'utf8' });
  return r.status === 0 ? null : tail(r.stderr || r.stdout);
}

// Asynchronous on purpose: the local server lives in this process, so a blocking child (the inspector,
// Lighthouse) would wait forever on requests the blocked event loop never answers.
const run = (cmd, args, cwd = ROOT, timeoutMs = 600000) => new Promise((done) => {
  const t = Date.now();
  const child = spawn(cmd, args, { cwd });
  let stdout = '', stderr = '', timedOut = false;
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
  child.on('close', (code) => {
    clearTimeout(timer);
    done({ ok: code === 0 && !timedOut, out: stdout + stderr + (timedOut ? `\ntimed out after ${timeoutMs / 1000}s` : ''), stdout, stderr, timedOut, secs: ((Date.now() - t) / 1000).toFixed(1) });
  });
});

// ---------- serve only ----------
// `--serve [port]` runs the same rewrite-aware server and nothing else, for playwright-cli screenshots.
if (process.argv.includes('--serve')) {
  const i = process.argv.indexOf('--serve');
  const port = Number(process.argv[i + 1]) || 4173;
  REWRITES = vercelRewrites();
  const s = await startServer();
  s.close();
  await new Promise((r) => s.once('close', r));
  s.listen(port, '127.0.0.1', () => log(`fg-gate: serving ${rel(ROOT) || '.'} at http://127.0.0.1:${port} (vercel.json rewrites, brotli). Ctrl-C to stop.`));
  await new Promise(() => {});
}

// ---------- main ----------
const server = base ? null : await startServer();
const origin = base ? base.replace(/\/$/, '') : `http://127.0.0.1:${server.address().port}`;
const urlFor = (p) => origin + p;
log(`fg-gate: ${pages.length} page(s) against ${base ? origin : 'the local server (' + origin + ')'}`);

try {
  // G1. Repository gates
  {
    const g = gate('G1', 'Repository gates');
    if (skip.has('g1')) notRun(g, 'skipped with --skip g1.');
    else {
      const steps = [
        ['node scripts/stamp-assets.mjs --check', 'node', ['scripts/stamp-assets.mjs', '--check'], ROOT],
        ['node scripts/check-canonicals.mjs', 'node', ['scripts/check-canonicals.mjs'], ROOT],
        ['node scripts/build-claims.mjs --check', 'node', ['scripts/build-claims.mjs', '--check'], ROOT],
      ];
      const nsc = join(ROOT, 'nsc');
      if (!existsSync(join(nsc, 'node_modules'))) {
        log('G1: nsc/node_modules missing, running npm ci in nsc');
        const r = await run('npm', ['ci', '--no-audit', '--no-fund'], nsc);
        g.lines.push(`- \`cd nsc && npm ci\` (no node_modules in this checkout): ${r.ok ? 'ok' : 'FAILED'} in ${r.secs}s`);
        if (!r.ok) g.lines.push('```\n' + tail(r.out) + '\n```');
      }
      steps.push(['cd nsc && npm test', 'npm', ['test', '--silent'], nsc], ['cd nsc && npm run typecheck', 'npm', ['run', 'typecheck', '--silent'], nsc]);
      for (const [name, cmd, args, cwd] of steps) {
        log(`G1: ${name}`);
        const r = await run(cmd, args, cwd);
        if (!r.ok) g.status = 'fail';
        g.lines.push(`- \`${name}\`: ${r.ok ? 'pass' : '**FAIL**'} (${r.secs}s). ${summaryLine(r.out)}`);
        if (!r.ok) g.lines.push('```\n' + tail(r.out).replace(/\x1b\[[0-9;]*m/g, '') + '\n```');
      }
    }
  }

  const taste = tasteScripts();

  // G2. Taste lint on the stylesheets
  {
    const g = gate('G2', 'Taste lint');
    let css = cssArg ? cssArg.split(',') : [];
    let why = cssArg ? 'given with --css' : '';
    if (!css.length) {
      try {
        execFileSync('git', ['fetch', '-q', 'origin', 'main'], { cwd: ROOT, stdio: 'ignore' });
        css = execFileSync('git', ['diff', '--name-only', '--diff-filter=AMR', 'origin/main...HEAD', '--', '*.css'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((f) => f && !f.startsWith('nsc/'));
        css = [...new Set([...css, ...execFileSync('git', ['diff', '--name-only', '--diff-filter=AMR', '--', '*.css'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)])];
        why = 'changed against origin/main';
      } catch {}
    }
    if (!css.length) {
      const found = new Set();
      for (const p of pages) {
        const f = resolveFile(new URL(p, 'http://x').pathname);
        if (!f) continue;
        for (const m of readFileSync(f, 'utf8').matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)) {
          const href = (m[0].match(/href="([^"]+)"/) || [])[1];
          if (href && href.startsWith('/') && !href.startsWith('//')) found.add(href.split('?')[0].slice(1));
        }
      }
      css = [...found];
      why = 'no stylesheet changed against origin/main, so every local stylesheet the listed pages load';
    }
    if (skip.has('g2')) notRun(g, 'skipped with --skip g2.');
    else if (!taste) notRun(g, 'the taste skill scripts were not found (set FG_TASTE_SCRIPTS).');
    else if (!css.length) notRun(g, 'no stylesheets to lint.');
    else {
      const r = await run('node', [join(taste, 'lint.mjs'), ...css, '--json']);
      let data = null; try { data = JSON.parse(r.stdout); } catch {}
      if (!data) { g.status = 'fail'; g.lines.push('Lint did not return a report:', '```\n' + tail(r.out) + '\n```'); }
      else {
        // The known false positive: the shadow rule matches `box-shadow: none` (the reset itself).
        const isReset = (f) => f.id === 'shadow' && /box-shadow\s*:\s*none\b/.test(readFileSync(join(ROOT, f.file), 'utf8').split('\n')[f.line - 1] || '');
        const fails = data.findings.filter((f) => f.level === 'FAIL' && !isReset(f));
        const known = data.findings.filter(isReset);
        const warns = data.findings.filter((f) => f.level === 'WARN');
        if (fails.length) g.status = 'fail';
        g.lines.push(`Files (${why}): ${css.map((c) => '`' + c + '`').join(', ')}`, '', `Result: ${fails.length} FAIL, ${warns.length} WARN${known.length ? `, ${known.length} known false positive(s) (the shadow rule matching \`box-shadow: none\`)` : ''}.`);
        for (const f of [...fails, ...warns]) g.lines.push(`- ${f.level} \`${f.id}\` ${f.file}:${f.line} \`${f.match}\` ${f.message}`);
      }
    }
  }

  // G3. Taste inspector at three widths
  {
    const g = gate('G3', `Taste inspector at ${widths.join(', ')}`);
    if (skip.has('g3')) notRun(g, 'skipped with --skip g3.');
    else if (!taste) notRun(g, 'the taste skill scripts were not found (set FG_TASTE_SCRIPTS).');
    else {
      for (const p of pages) {
        log(`G3: inspect ${p}`);
        const out = join(workDir, 'inspect', slug(p));
        const r = await run('node', [join(taste, 'inspect.mjs'), urlFor(p), '--widths', widths.join(','), '--out', out, '--json']);
        let data = null; try { data = JSON.parse(r.stdout); } catch {}
        g.lines.push('', `**\`${p}\`**`);
        if (!data) { g.status = 'fail'; g.lines.push('Inspector did not return a report:', '```\n' + tail(r.out) + '\n```'); continue; }
        const fails = data.findings.filter((f) => f.level === 'FAIL');
        const warns = data.findings.filter((f) => f.level === 'WARN');
        if (fails.length) g.status = 'fail';
        g.lines.push(`${fails.length} FAIL, ${warns.length} WARN.`);
        for (const f of [...fails, ...warns]) g.lines.push(`- ${f.level} \`${f.id}\` @${f.width}${f.alsoAt ? ' (+' + f.alsoAt.join(', ') + ')' : ''}: ${f.message}`);
        const errs = (data.viewports || []).flatMap((v) => (v.consoleErrors || []).map((e) => `@${v.width}: ${String(e).slice(0, 160)}`));
        if (errs.length) g.lines.push(`- Console errors: ${errs.slice(0, 4).join('; ')}`);
        inspectImages[p] = (data.images || []).map((im) => rel(im.fold));
      }
      g.lines.push('', 'WARNs are fixed or defended in one sentence in `docs/field-guide/design-critique.md`; the standing defences there carry over.');
    }
  }

  // G6. Function, the automated half
  try {
    const g = gate('G6', 'Function (automated half: axe, no-script, reduced motion, keyboard, tap targets)');
    const pw = skip.has('g6') ? null : loadPlaywright();
    const toolErr = skip.has('g6') ? null : ensureTools();
    const axePath = join(TOOLS, 'node_modules', 'axe-core', 'axe.min.js');
    if (skip.has('g6')) notRun(g, 'skipped with --skip g6.');
    else if (!pw) notRun(g, 'Playwright was not found (install playwright-cli globally or set FG_PLAYWRIGHT).');
    else {
      const { browser, error } = await launchBrowser(pw);
      if (!browser) { notRun(g, `no browser could be launched: ${error}`); throw new Error('skip-g6'); }
      try {
        for (const p of pages) {
          log(`G6: ${p}`);
          g.lines.push('', `**\`${p}\`**`);
          const fail = (s) => { g.status = 'fail'; g.lines.push(`- **FAIL** ${s}`); };
          const pass = (s) => g.lines.push(`- pass: ${s}`);

          // axe at 1440 and 390, WCAG 2.2 A and AA as the gate, best practice reported
          if (!existsSync(axePath)) g.lines.push(`- axe: not run, axe-core could not be installed: ${toolErr || 'unknown error'}`);
          else for (const w of [1440, 390]) {
            const page = await browser.newPage({ viewport: { width: w, height: w > 600 ? 900 : 844 } });
            await page.goto(urlFor(p), { waitUntil: 'networkidle' });
            await page.addScriptTag({ path: axePath });
            const res = await page.evaluate(async () => {
              const strict = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
              const bp = await window.axe.run(document, { runOnly: { type: 'tag', values: ['best-practice'] } });
              const pick = (v) => v.map((x) => ({ id: x.id, impact: x.impact, help: x.help, n: x.nodes.length, target: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
              return { strict: pick(strict.violations), bp: pick(bp.violations) };
            });
            await page.close();
            if (res.strict.length) fail(`axe @${w}: ${res.strict.length} WCAG violation(s): ` + res.strict.map((v) => `\`${v.id}\` (${v.impact}, ${v.n}×: ${v.target.join(', ')})`).join('; '));
            else pass(`axe @${w}: 0 WCAG 2.2 A/AA violations.`);
            if (res.bp.length) g.lines.push(`- advisory, axe best practice @${w}: ` + res.bp.map((v) => `\`${v.id}\` (${v.n}×)`).join('; '));
          }

          // no-script: the text a reader can see with JavaScript off, against JavaScript on
          // Every text node with its state: shown, hidden (in the DOM but not visible), keyed by its text.
          const textStates = () => {
            const out = {};
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const n = walker.currentNode; const t = n.textContent.trim().replace(/\s+/g, ' ').slice(0, 80); if (!t) continue;
              const el = n.parentElement; if (!el || el.closest('script,style,noscript,template')) continue;
              let e = el, gone = !!el.closest('[hidden],[aria-hidden="true"]') || (!!el.closest('details:not([open])') && !el.closest('summary'));
              let overlay = false;
              while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) gone = true; if (cs.position === 'fixed' || cs.position === 'sticky') overlay = true; e = e.parentElement; }
              // A script-only control, or a fixed or sticky bar that repeats what the page says, is not lost content.
              if (out[t] !== 'shown') out[t] = gone ? (overlay || el.closest('button,label,input,select,output,[role=tab],[role=tablist],[role=slider],[data-enroll-bar]') ? 'control' : 'hidden') : 'shown';
            }
            return out;
          };
          {
            const on = await browser.newPage({ viewport: { width: 390, height: 844 } });
            await on.goto(urlFor(p), { waitUntil: 'networkidle' });
            await on.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 600)); });
            const withJs = await on.evaluate(textStates);
            await on.close();
            const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
            const off = await ctx.newPage();
            await off.goto(urlFor(p), { waitUntil: 'load' });
            const noJs = await off.evaluate(textStates);
            const needScript = await off.evaluate(() => [...document.querySelectorAll('button[aria-controls]')].filter((b) => { const t = document.getElementById(b.getAttribute('aria-controls')); return t && b.getClientRects().length && getComputedStyle(t).display === 'none'; }).map((b) => (b.getAttribute('aria-label') || b.textContent).trim()));
            await ctx.close();
            const shownOn = Object.keys(withJs).filter((t) => withJs[t] === 'shown');
            const lost = shownOn.filter((t) => noJs[t] === 'hidden');
            const controls = shownOn.filter((t) => noJs[t] === 'control');
            const injected = shownOn.filter((t) => !(t in noJs));
            const msg = (l) => l.slice(0, 5).map((t) => `"${t.slice(0, 50)}"`).join(', ') + (l.length > 5 ? `, and ${l.length - 5} more` : '');
            if (lost.length) fail(`no-script @390: ${lost.length} text(s) visible with script are hidden without it: ${msg(lost)}.`);
            else pass(`no-script @390: everything visible with script is visible without it (${shownOn.length} texts).`);
            if (controls.length) g.lines.push(`- check by hand: ${controls.length} script-only control or overlay text(s) hidden without script (fine when the same content shows without it): ${msg(controls)}.`);
            if (injected.length) g.lines.push(`- check by hand: ${injected.length} text(s) exist only when script runs (injected): ${msg(injected)}.`);
            if (needScript.length) g.lines.push(`- check by hand: control(s) that open nothing without script: ${needScript.map((n) => `"${n}"`).join(', ')}. Acceptable only if the same links are reachable without it (the footer carries the site links).`);
          }

          // reduced motion: after load and a scroll, nothing with text is left invisible or displaced
          {
            const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
            const page = await ctx.newPage();
            await page.goto(urlFor(p), { waitUntil: 'networkidle' });
            const stuck = await page.evaluate(async () => {
              for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
              await new Promise((r) => setTimeout(r, 400));
              const bad = [];
              for (const el of document.querySelectorAll('body *')) {
                if (!el.textContent.trim() && !['IMG', 'SVG', 'PICTURE', 'VIDEO'].includes(el.tagName.toUpperCase())) continue;
                if (el.closest('[hidden],[aria-hidden="true"],details:not([open]) > :not(summary),template,noscript,dialog:not([open])')) continue;
                // Skip links wait off-screen until focused, and SVG labels carry their own transforms.
                if (el.closest('.skip-link,.sr-only,.u-visually-hidden,.visually-hidden') || (el.closest('svg') && el.tagName.toLowerCase() !== 'svg')) continue;
                const cs = getComputedStyle(el);
                if (cs.display === 'none') continue;
                const tf = cs.transform;
                const moved = tf && tf !== 'none' && (() => { const m = tf.match(/matrix\(([^)]+)\)/); if (!m) return false; const v = m[1].split(',').map(Number); return Math.abs(v[4]) > 4 || Math.abs(v[5]) > 4; })();
                if ((parseFloat(cs.opacity) < 0.05 && cs.visibility !== 'hidden') || moved) bad.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}`);
              }
              return bad;
            });
            await ctx.close();
            const uniq = [...new Set(stuck)];
            if (uniq.length) fail(`reduced motion @1440: ${uniq.length} element type(s) still invisible or displaced after load and scroll: ${uniq.slice(0, 6).map((s) => '`' + s + '`').join(', ')}.`);
            else pass('reduced motion @1440: every element in place after load and scroll.');
          }

          // keyboard: tab walk in reading order with visible focus; Escape closes what opens
          {
            const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
            await page.goto(urlFor(p), { waitUntil: 'networkidle' });
            const total = await page.evaluate(() => [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').length);
            const seen = []; let invisible = []; let backwards = 0; let lastPos = -1;
            for (let i = 0; i < Math.min(total + 5, 250); i++) {
              await page.keyboard.press('Tab');
              const info = await page.evaluate(() => {
                const a = document.activeElement; if (!a || a === document.body) return null;
                const all = [...document.querySelectorAll('*')];
                const cs = getComputedStyle(a);
                const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
                return { pos: all.indexOf(a), name: (a.getAttribute('aria-label') || a.textContent || a.name || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 40), ring };
              });
              if (!info) break;
              if (seen.length && info.pos === seen[0].pos) break;
              seen.push(info);
              if (!info.ring) invisible.push(info.name);
              if (info.pos < lastPos) backwards++;
              lastPos = info.pos;
            }
            invisible = [...new Set(invisible)];
            const reached = `keyboard @1440: ${seen.length} tab stop(s) for ${total} visible control(s), ${backwards} step(s) against document order`;
            if (invisible.length) fail(`${reached}; no visible focus ring on: ${invisible.slice(0, 6).map((n) => `"${n}"`).join(', ')}.`);
            else if (backwards || seen.length < total) g.lines.push(`- check by hand: ${reached}. Off-screen or hidden-until-open controls can explain a shortfall.`);
            else pass(`${reached}; every stop shows a focus ring.`);

            // Escape closes anything that opens (disclosure buttons and details)
            const openers = await page.evaluate(() => [...document.querySelectorAll('button[aria-expanded], details > summary')].filter((e) => e.getClientRects().length).map((e, i) => { e.setAttribute('data-fg-gate', String(i)); return { i, name: (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 30) }; }));
            const stayOpen = [];
            for (const o of openers) {
              const loc = page.locator(`[data-fg-gate="${o.i}"]`);
              await loc.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
              const opened = await loc.evaluate((e) => (e.tagName === 'SUMMARY' ? e.parentElement.open : e.getAttribute('aria-expanded') === 'true'));
              if (!opened) continue;
              await page.keyboard.press('Escape'); await page.waitForTimeout(150);
              const still = await loc.evaluate((e) => (e.tagName === 'SUMMARY' ? e.parentElement.open : e.getAttribute('aria-expanded') === 'true'));
              if (still) { stayOpen.push(o.name); await loc.evaluate((e) => { if (e.tagName === 'SUMMARY') e.parentElement.open = false; else e.click(); }); }
            }
            if (stayOpen.length) g.lines.push(`- check by hand: Escape left open: ${stayOpen.map((n) => `"${n}"`).join(', ')}. In-page details rows are content, not overlays, and may stay open; a menu or dialog may not.`);
            else if (openers.length) pass(`Escape closes all ${openers.length} disclosure(s) at 1440.`);
            await page.close();
          }

          // tap targets at 390: 44px at least, inline links inside running text reported apart
          {
            const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
            await page.goto(urlFor(p), { waitUntil: 'networkidle' });
            const small = await page.evaluate(() => {
              const out = { block: [], inline: 0 };
              for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button]')) {
                const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
                if (!r.width || !r.height || cs.visibility === 'hidden' || e.closest('[hidden],[aria-hidden="true"]')) continue;
                if (Math.min(r.width, r.height) >= 44) continue;
                const inText = e.tagName === 'A' && cs.display === 'inline' && e.closest('p,li,dd,td,figcaption,blockquote') && e.parentElement.textContent.trim().length > e.textContent.trim().length + 20;
                if (inText) { out.inline++; continue; }
                out.block.push(`${(e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`);
              }
              return out;
            });
            await page.close();
            if (small.block.length) fail(`tap targets @390: ${small.block.length} under 44px: ${small.block.slice(0, 8).map((s) => `"${s}"`).join(', ')}${small.block.length > 8 ? ', …' : ''}.`);
            else pass('tap targets @390: every control is 44px or more.');
            if (small.inline) g.lines.push(`- advisory: ${small.inline} inline link(s) in running text are under 44px tall (WCAG 2.5.8 exempts inline links; the brief's 44px rule is read here as controls).`);
          }
        }
      } finally { await browser.close(); }
      g.lines.push('', 'Still by hand: read the keyboard walk on screen, and confirm the no-script render looks complete, not only that its text is present.');
    }
  } catch (e) { if (e.message !== 'skip-g6') throw e; }

  // G8. Lighthouse mobile on the three standing pages
  {
    const g = gate('G8', 'Lighthouse mobile (homepage, Lens, classes hub)');
    const err = skip.has('g8') ? null : ensureTools();
    const lhBin = join(TOOLS, 'node_modules', '.bin', 'lighthouse');
    if (skip.has('g8')) notRun(g, 'skipped with --skip g8.');
    else if (!existsSync(lhBin)) notRun(g, `Lighthouse could not be installed: ${err || 'unknown error'}`);
    else {
      if (!base) g.lines.push('Run against the local server: no CDN, no HTTP/2, no cache headers. Indicative only; the definitive numbers come from a `--base <preview URL>` run.', '');
      g.lines.push('| Page | Performance | LCP | CLS | TBT | Accessibility | Best practices | SEO |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
      for (const p of G8_PAGES) {
        log(`G8: lighthouse ${p}`);
        const out = join(workDir, 'lighthouse', slug(p) + '.json');
        mkdirSync(dirname(out), { recursive: true });
        const r = await run(lhBin, [urlFor(p), '--quiet', '--output=json', `--output-path=${out}`, '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox'], ROOT, 240000);
        if (!r.ok || !existsSync(out)) { g.status = 'fail'; g.lines.push(`| \`${p}\` | did not run: ${tail(r.stderr, 1).slice(0, 120)} | | | | | | |`); continue; }
        const lh = JSON.parse(readFileSync(out, 'utf8'));
        const s = (k) => Math.round((lh.categories[k]?.score ?? 0) * 100);
        const a = lh.audits;
        const perf = s('performance'), lcp = a['largest-contentful-paint'].numericValue, cls = a['cumulative-layout-shift'].numericValue;
        const ok = perf >= G8_MIN.performance && cls < G8_MIN.cls && lcp < G8_MIN.lcp;
        if (!ok) g.status = 'fail';
        g.lines.push(`| \`${p}\` | ${perf}${perf < G8_MIN.performance ? ' **below 90**' : ''} | ${(lcp / 1000).toFixed(2)}s${lcp >= G8_MIN.lcp ? ' **over 2.5s**' : ''} | ${cls.toFixed(3)}${cls >= G8_MIN.cls ? ' **over 0.1**' : ''} | ${Math.round(a['total-blocking-time'].numericValue)}ms | ${s('accessibility')} | ${s('best-practices')} | ${s('seo')} |`);
      }
      g.lines.push('', `Lighthouse ${PINS.lighthouse}, default mobile emulation and simulated throttling. Raw reports: \`${rel(join(workDir, 'lighthouse'))}/\` (not committed).`);
    }
  }
} finally {
  if (server) server.close();
}

// ---------- the report ----------
let head = '';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() + ' on ' + execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch {}
const MANUAL = [
  ['G4', 'Eyes on the page', 'Fresh playwright-cli screenshots of every changed page at 1440 and 390, full height. Critique in the `references/critique.md` format with scores, fix the top three, one confirming round, three rounds at most.'],
  ['G5', 'Figures', 'Every drawn figure alone at 2x against the proportion sheet (adult about 7.5 heads, toddler about 4, infant about 3.5; arm 3 heads; leg 4 heads). Name the action in one sentence from the picture, or redraw from parts.'],
  ['G7', 'Brand', 'The guidelines\' approval checklist item by item, plus: no em dashes, no stock photography, no clay or ochre larger than an annotation mark, no eyebrows or kickers, one lead message per surface.'],
  ['G9', 'Phone preview', 'Open the PR\'s Vercel preview with playwright-cli at phone width: first screen, header, footer, every control, on the deployed build. Matthew opens it on his own phone before saying merge. If the Hobby throttle blocks the git deploy, deploy with the CLI and say so.'],
];
const md = [
  `# Gate report: ${label}, ${today}`,
  '',
  `Generated by \`node scripts/fg-gate.mjs\`. Commit ${head}. Pages: ${pages.map((p) => '`' + p + '`').join(', ')}. Served from ${base ? origin : 'the local server (vercel.json rewrites, brotli)'}.`,
  '',
  '| Gate | Result |',
  '| --- | --- |',
  ...results.map((g) => `| ${g.id} ${g.title} | ${g.status === 'fail' ? '**fail**' : g.status} |`),
  ...MANUAL.map(([id, t]) => `| ${id} ${t} | manual, see checklist |`),
  '',
  ...results.flatMap((g) => [`## ${g.id}. ${g.title}`, '', ...g.lines, '']),
  Object.keys(inspectImages).length ? '## Inspector screenshots (not committed)' : '',
  '',
  ...Object.entries(inspectImages).map(([p, ims]) => `- \`${p}\`: ${ims.map((i) => '`' + i + '`').join(', ')}`),
  '',
  '## Manual checklist',
  '',
  ...MANUAL.map(([id, t, d]) => `- [ ] **${id}. ${t}.** ${d}`),
  '',
].join('\n');
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, md.replace(/\n{3,}/g, '\n\n'));

console.log(`\nfg-gate: report written to ${rel(reportPath)}`);
for (const g of results) console.log(`  ${g.id} ${g.title.padEnd(40).slice(0, 40)} ${g.status}`);
console.log('\nManual gates, not done until done by hand:');
for (const [id, t, d] of MANUAL) console.log(`  [ ] ${id} ${t}: ${d}`);
process.exit(results.some((g) => g.status === 'fail') ? 1 : 0);
