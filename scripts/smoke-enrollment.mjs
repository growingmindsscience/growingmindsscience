/* Read-only production smoke test for class enrollment.
   Usage: node scripts/smoke-enrollment.mjs [--origin <url>] [--timeout <ms>] [--concurrency <n>]
          node scripts/smoke-enrollment.mjs --help
   Needs Node 24 and no packages. Sends only unauthenticated GET requests: no account, email,
   Stripe, or Mux requests, and no video is streamed. Signed playback tokens and playback ids are
   never printed. Exits 0 when every check passes, 1 when any fails, 2 on a usage error. */
import { parseArgs } from 'node:util';
import { SITE_ORIGIN } from './site.mjs';

const USAGE = `Usage: node scripts/smoke-enrollment.mjs [options]

Checks the public class pages, the $119 three-age-class bundle on /pricing#all-three, the four
free preview pages and their playback endpoints, class sign-up and sign-in, the protected enroll
and checkout-return redirects, and that paid lesson playback rejects signed-out requests. GET requests only.

Options:
  -o, --origin <url>      Site to check (default ${SITE_ORIGIN})
      --timeout <ms>      Per-request timeout, 1000 to 60000 (default 10000)
      --concurrency <n>   Parallel requests, 1 to 8 (default 4)
  -h, --help              Show this help`;

let args;
try {
  args = parseArgs({ allowPositionals: false, options: {
    origin: { type: 'string', short: 'o', default: SITE_ORIGIN },
    timeout: { type: 'string', default: '10000' },
    concurrency: { type: 'string', default: '4' },
    help: { type: 'boolean', short: 'h' },
  } }).values;
} catch (e) { usageError(e.message); }
if (args.help) { console.log(USAGE); process.exit(0); }

const timeout = Number(args.timeout);
const concurrency = Number(args.concurrency);
if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 60000) usageError('--timeout must be a whole number from 1000 to 60000');
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) usageError('--concurrency must be a whole number from 1 to 8');
let origin;
try {
  const url = new URL(args.origin);
  if (!/^https?:$/.test(url.protocol)) throw new Error();
  origin = url.origin;
} catch { usageError(`--origin must be an http(s) URL, got "${args.origin}"`); }

function usageError(message) {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(2);
}

/* ---- Route facts. Sources: nsc/lib/class-paths.ts (enroll paths), nsc/lib/class-preview.ts
   (preview pages), nsc/app/api/classes/<course>/... (playback), vercel.json (/nsc rewrite and the
   public class pages), pricing.html (#all-three). The class app lives under the /nsc base path. ---- */
const NSC = '/nsc';
const CLASSES = [
  { name: 'Birth to 12 months', page: '/classes/birth-to-12-months', course: 'infant' },
  { name: 'Toddler years', page: '/classes/toddlerhood', course: 'toddlerhood' },
  { name: 'Preschool years', page: '/classes/preschool', course: 'preschool' },
  { name: 'Family Systems', page: '/classes/family-systems', course: 'family' },
].map((c) => ({
  ...c,
  enroll: `/app/classes/${c.course}/enroll`,
  previewPage: `${NSC}/classes/${c.course}/preview`,
  previewPlayback: `${NSC}/api/classes/${c.course}/preview/playback`,
  // Not a real lesson id: a signed-out request is refused before any lesson is looked up.
  paidPlayback: `${NSC}/api/classes/${c.course}/lessons/00000000-0000-4000-8000-000000000000/playback`,
}));
const BUNDLE = { name: 'Three age-based classes', price: '$119', enroll: '/app/classes/bundle/enroll' };
const ENROLL_PATHS = [...CLASSES.map((c) => c.enroll), BUNDLE.enroll];
const CLASS_HOME = '/app/classes'; // where an unsafe or non-class `next` falls back (classDestination)
const PAGES_LINKING_TO_BUNDLE = ['/', '/classes', '/faq'];
const MIN_TOKEN_MINUTES = 50; // mux.server.ts signs for at least 60 minutes
const REDIRECTS = [301, 302, 303, 307, 308];

/* ---- Requests: GET only, no cookies, redirects not followed, one request per path. ---- */
const cache = new Map();
const get = (path) => {
  if (!cache.has(path)) cache.set(path, request(path));
  return cache.get(path);
};

async function request(path) {
  try {
    const res = await fetch(new URL(path, origin), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(timeout), // covers reading the body too
      headers: { 'user-agent': 'from-little-onward-smoke-enrollment/1', accept: 'text/html,application/json' },
    });
    return { status: res.status, headers: res.headers, body: await res.text(), error: null };
  } catch (e) {
    const error = e.name === 'TimeoutError' ? `timed out after ${timeout} ms` : (e.cause?.code || e.message);
    return { status: 0, headers: new Headers(), body: '', error };
  }
}

/* True when `res` is the expected status and content type; otherwise records why in `fails`. */
function expect(res, status, fails, type) {
  if (res.error) fails.push(`request failed: ${res.error}`);
  else if (res.status !== status) fails.push(`status ${res.status}, expected ${status}`);
  else if (type && !(res.headers.get('content-type') || '').includes(type)) fails.push(`content-type is "${res.headers.get('content-type')}", expected ${type}`);
  else return true;
  return false;
}

/* ---- Reading HTML: every opening tag's attributes, with entities undone. Enough for links and
   hidden inputs; query order and &amp; escaping do not matter because links are compared as URLs. ---- */
const ENTITIES = { amp: '&', quot: '"', lt: '<', gt: '>', '#x27': "'", '#39': "'" };
const unescapeHtml = (s) => s.replace(/&(amp|quot|lt|gt|#x27|#39);/g, (_, e) => ENTITIES[e]);

function elements(html, name = '[a-z][a-z0-9-]*') {
  const found = [];
  for (const tag of html.matchAll(new RegExp(`<(${name})\\b([^>]*)>`, 'gi'))) {
    const attrs = {};
    for (const a of tag[2].matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
      attrs[a[1].toLowerCase()] = unescapeHtml(a[2] ?? a[3] ?? a[4] ?? '');
    }
    found.push({ index: tag.index, attrs });
  }
  return found;
}

function links(html) {
  return elements(html, 'a').flatMap((el) => {
    try { return [{ index: el.index, url: new URL(el.attrs.href, origin) }]; } catch { return []; }
  });
}

/* A link on this site to `path` (query and hash ignored unless given). `next` compares the next param. */
const findLink = (list, path, { next, hash } = {}) => list.find(({ url }) =>
  url.origin === origin && url.pathname === path &&
  (next === undefined || url.searchParams.get('next') === next) &&
  (hash === undefined || url.hash === hash));

const hiddenInputs = (html) => Object.fromEntries(elements(html, 'input')
  .filter((el) => el.attrs.type === 'hidden').map((el) => [el.attrs.name, el.attrs.value]));

const parseJson = (text) => { try { return JSON.parse(text); } catch { return null; } };

/* ---- Checks. Each returns a list of failure lines (empty means it passed). ---- */
const checks = [];
const check = (name, run) => checks.push({ name, run });

for (const c of CLASSES) {
  check(`class page ${c.page}: enroll and free-lesson links`, async () => {
    const fails = [];
    const res = await get(c.page);
    if (!expect(res, 200, fails, 'text/html')) return fails;
    const list = links(res.body);
    if (!findLink(list, `${NSC}/class-signup`, { next: c.enroll })) fails.push(`no link to ${NSC}/class-signup?next=${c.enroll}`);
    if (!findLink(list, c.previewPage)) fails.push(`no link to ${c.previewPage}`);
    return fails;
  });
}

check(`/pricing#all-three: ${BUNDLE.name} ${BUNDLE.price} bundle`, async () => {
  const fails = [];
  const res = await get('/pricing');
  if (!expect(res, 200, fails, 'text/html')) return fails;
  const anchor = elements(res.body).find((el) => el.attrs.id === 'all-three');
  if (!anchor) return ['no element with id="all-three"'];
  // The first sign-up link after the anchor is the bundle's own Enroll button.
  const rest = res.body.slice(anchor.index);
  const enroll = links(rest).find(({ url }) => url.pathname === `${NSC}/class-signup`);
  if (!enroll) return ['no sign-up link after #all-three'];
  if (enroll.url.searchParams.get('next') !== BUNDLE.enroll) fails.push(`first sign-up link after #all-three goes to next=${enroll.url.searchParams.get('next')}, expected ${BUNDLE.enroll}`);
  if (!rest.slice(0, enroll.index).includes(BUNDLE.price)) fails.push(`${BUNDLE.price} not shown before the bundle's Enroll link`);
  return fails;
});

for (const page of PAGES_LINKING_TO_BUNDLE) {
  check(`bundle link on ${page} reaches /pricing#all-three`, async () => {
    const fails = [];
    const res = await get(page);
    if (!expect(res, 200, fails, 'text/html')) return fails;
    if (!findLink(links(res.body), '/pricing', { hash: '#all-three' })) fails.push('no link to /pricing#all-three');
    return fails;
  });
}

for (const c of CLASSES) {
  check(`free preview page ${c.previewPage}`, async () => {
    const fails = [];
    const res = await get(c.previewPage);
    if (!expect(res, 200, fails, 'text/html')) return fails;
    if (!findLink(links(res.body), `${NSC}/class-signup`, { next: c.enroll })) fails.push(`no link to ${NSC}/class-signup?next=${c.enroll}`);
    if (/eyJ[\w-]+\.eyJ[\w-]+\./.test(res.body)) fails.push('page HTML contains a signed token; playback should come only from the endpoint');
    return fails;
  });

  check(`free preview playback ${c.previewPlayback}`, async () => {
    const fails = [];
    const res = await get(c.previewPlayback);
    if (!expect(res, 200, fails, 'application/json')) return fails;
    if (!/no-store/i.test(res.headers.get('cache-control') || '')) fails.push('Cache-Control does not include no-store');
    const data = parseJson(res.body);
    if (!data) return [...fails, 'body is not JSON'];
    const { playbackId, token, expiresAt } = data;
    if (typeof playbackId !== 'string' || !playbackId) fails.push('playbackId missing');
    if (typeof token !== 'string' || !token) fails.push('token missing');
    if (!Number.isInteger(expiresAt)) fails.push('expiresAt missing or not whole seconds');
    if (fails.length) return fails;
    const minutes = Math.round((expiresAt * 1000 - Date.now()) / 60000);
    if (minutes < MIN_TOKEN_MINUTES) fails.push(`token expires in ${minutes} min, expected at least ${MIN_TOKEN_MINUTES}`);
    const parts = token.split('.');
    const claims = parts.length === 3 ? parseJson(Buffer.from(parts[1], 'base64url').toString()) : null;
    if (!claims) fails.push('token is not a JWT');
    else {
      if (claims.sub !== playbackId) fails.push('token subject does not match playbackId');
      if (claims.exp !== expiresAt) fails.push('token exp does not match expiresAt');
    }
    return fails;
  });
}

for (const enroll of ENROLL_PATHS) {
  check(`class sign-up with next=${enroll}`, async () => {
    const fails = [];
    const res = await get(`${NSC}/class-signup?next=${encodeURIComponent(enroll)}`);
    if (!expect(res, 200, fails, 'text/html')) return fails;
    const hidden = hiddenInputs(res.body);
    if (hidden.flow !== 'class') fails.push(`hidden flow is "${hidden.flow}", expected "class"`);
    if (hidden.next !== enroll) fails.push(`hidden next is "${hidden.next}", expected "${enroll}"`);
    if (!findLink(links(res.body), `${NSC}/class-login`, { next: enroll })) fails.push(`no "Sign in" link to ${NSC}/class-login with the same next`);
    return fails;
  });

  check(`signed-out ${enroll} keeps the selected class`, () => checkClassLogin(enroll));
  // The request is anonymous. A correctly protected route redirects before this placeholder
  // can reach the Stripe lookup on the success page.
  const success = `${enroll.replace(/\/enroll$/, '/success')}?session_id=cs_test_launch_smoke_placeholder`;
  check(`signed-out ${success.split('?')[0]} keeps the checkout reference`, () => checkClassLogin(success));
}

async function checkClassLogin(next) {
  const fails = [];
  const res = await get(`${NSC}${next}`);
  if (res.error) return [`request failed: ${res.error}`];
  if (!REDIRECTS.includes(res.status)) return [`status ${res.status}, expected a redirect to class login`];
  const location = res.headers.get('location');
  if (!location) return ['redirect has no Location header'];
  let to;
  try { to = new URL(location, origin); } catch { return ['redirect has no usable Location header']; }
  if (to.origin !== origin || to.pathname !== `${NSC}/class-login`) return ['redirect does not go to this site’s class login'];
  if (to.searchParams.get('next') !== next || to.searchParams.has('session_id')) return ['redirect did not preserve the destination only in next'];
  const login = await get(to.pathname + to.search);
  if (!expect(login, 200, fails, 'text/html')) return fails.map((f) => `class login: ${f}`);
  const hidden = hiddenInputs(login.body);
  if (hidden.flow !== 'class') fails.push('class login form did not preserve the class flow');
  if (hidden.next !== next) fails.push('class login form did not preserve the destination');
  return fails;
}

check('class sign-up ignores an unsafe next', async () => {
  const fails = [];
  for (const next of ['//evil.example/x', 'https://evil.example', '/app']) {
    const res = await get(`${NSC}/class-signup?next=${encodeURIComponent(next)}`);
    if (!expect(res, 200, fails, 'text/html')) continue;
    const got = hiddenInputs(res.body).next;
    if (got !== CLASS_HOME) fails.push(`next=${next} became "${got}", expected "${CLASS_HOME}"`);
  }
  return fails;
});

for (const c of CLASSES) {
  check(`paid lesson playback ${c.course} rejects signed-out requests`, async () => {
    const fails = [];
    const res = await get(c.paidPlayback);
    if (res.error) return [`request failed: ${res.error}`];
    if (res.status !== 401) fails.push(`status ${res.status}, expected 401${res.status === 200 ? ' (serves playback without sign-in)' : ''}`);
    const data = parseJson(res.body);
    if (data && ('token' in data || 'playbackId' in data)) fails.push('response includes playback fields');
    return fails;
  });
}

/* ---- Run with capped parallelism; print in definition order. ---- */
async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i]); }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

console.log(`Enrollment smoke test: ${origin} (GET only, timeout ${timeout} ms, ${concurrency} at a time)\n`);
const results = await pool(checks, concurrency, async ({ run }) => {
  try { return await run(); } catch (e) { return [`unexpected error: ${e.message}`]; }
});

let failed = 0;
checks.forEach(({ name }, i) => {
  const fails = results[i];
  console.log(`${fails.length ? '✗' : '✓'} ${name}`);
  fails.forEach((f) => console.log(`   ! ${f}`));
  if (fails.length) failed++;
});
console.log(failed ? `\nFAILED (${failed} of ${checks.length} checks)` : `\nALL PASSED (${checks.length} checks)`);
process.exit(failed ? 1 : 0);
