# Phase 0: current state

Snapshot of branch `redesign/field-guide`, read on 2026-10-14. Facts come from reading the source. Nothing was built, tested or deployed.

## Stack and deploy

- Static HTML, no build step, no root `package.json`. Styles in `assets/css`, scripts in `assets/js`.
- `api/*.js` are Vercel Edge functions (`runtime: "edge"`). Files starting with `_` are helpers, not routes. `api/_knowledge-data.js` is generated.
- `vercel.json` governs routing: 37 redirects (`.html` URLs to clean URLs, 301), 43 rewrites and 5 header rules. `/nsc` and `/nsc/:path*` proxy to `nsc-lake.vercel.app`. `/api/stripe-webhook` maps to the root function. `_redirects` is a legacy Netlify file that `vercel.json` does not reference.
- Site-wide CSP: `script-src 'self' 'unsafe-inline'` (the theme script is inline in each page head), `connect-src 'self'`, Google Fonts for styles and fonts, `frame-ancestors 'none'`. `/nsc` has its own CSP.
- `/assets/css/*` and `/assets/js/*` are `immutable` for one year, so every reference needs a `?v=` hash. `scripts/stamp-assets.mjs` writes the hashes and `--check` runs in CI.

CI gates in `.github/workflows/gates.yml`. Every script they call exists on this ref, so none skip.

- Job `nsc`: nsc tests (vitest), typecheck (`tsc --noEmit`), cert harness.
- Job `gates`: API functions unit tests (`node --test`, mocked fetch); eval harness deterministic checks (planted-violation gate); safety keel floors selftest; claims pages drift gate (`build-claims --check`); CSS/JS cache-bust gate (`stamp-assets --check`); library grader selftest; corpus certification; canonicals are absolute; library compile cert gate (`build-library`, report mode).

## Route inventory

| Path | File | What it is |
|---|---|---|
| `/` | `index.html` | Homepage: Terrain survey map and age explorer |
| `/classes` | `classes/index.html` | Class catalogue |
| `/classes/birth-to-12-months` | `classes/birth-to-12-months.html` | Class 1, Stripe checkout |
| `/classes/toddlerhood` | `classes/toddlerhood.html` | Class 2, checkout on Thinkific (off-site) |
| `/classes/preschool` | `classes/preschool.html` | Class 3, Stripe checkout |
| `/classes/family-systems` | `classes/family-systems.html` | Class 4, waitlist only |
| `/pricing` | `pricing.html` | Plans and pricing |
| `/tools` | `tools/index.html` | Tools hub |
| `/tools/growing-minds-ai` | `tools/growing-minds-ai.html` | AI tutor page |
| Interactive tools (5) | `tools/milestone-navigator`, `communication-snapshot`, `activity-library`, `reading-prompt-cards`, `right-now` (`.html`) | Tools; `right-now` loads no shared chrome |
| Topic guides (9) | `tools/beyond-less-is-better`, `co-regulation-primer`, `limits-without-escalation`, `regulating-yourself-first`, `repair-after-the-hard-moment`, `routines-transitions-night-waking`, `screens-language-attention`, `whats-typical-by-stage`, `whats-underneath-the-meltdown` (`.html`) | Parent guides |
| `/milestones` | `milestones.html` | Milestone tracker, one file with inline CSS and JS |
| `/nsc` | proxied | Number Path and the class app (separate Next.js deploy) |
| `/arcade` | `arcade/index.html` | Ten games |
| `/claims` | `claims/index.html` plus 10 claim pages | Evidence-Graded Claims Library |
| `/articles` | `articles/index.html` plus 8 pages | Articles |
| `/about`, `/faq`, `/contact` | `about/index.html`, `faq/index.html`, `contact/index.html` | Company and support |
| `/login`, `/account`, `/thank-you` | `login.html`, `account.html`, `thank-you.html` | Sign-in, account (no shared header), post-purchase |

Article titles, from each page's `<title>`:

- The cliff at three: what happens when early intervention ends
- The counting ladder: what happens between 'one, two, three' and actually counting
- What to do with milestone worry
- When your own nervous system is the variable
- A short, honest take on screen time
- Self-regulation, briefly
- What "serve and return" actually means
- The toddler "no" is not the war you think it is

## Shared UI

- **Header and footer:** the markup is pasted into each page, not injected. `assets/css/chrome.css` styles it and `assets/js/chrome.js` handles the menu, theme toggle and scroll state. The header holds Classes, a Free tools menu (Growing Minds AI, Number Path, Milestone tracker, Communication Snapshot, Arcade), Articles, About and My classes.
- **Stylesheets:** `home.css` (homepage), `styles.css` with `refresh.css` (most pages), `seminar.css` (classes, pricing), `tools.css` (tools hub, guides, claims), `arcade.css`, `arcade-page.css`, `pong.css`.
- **Scripts:** `home.js`, `terrain.js` (age explorer), `main.js` (forms, theme), `gms-tools.js` (child profile, shelf, print), `decor.js`, `animate.js`, `arcade-core.js` and the game files.
- **Theme:** `localStorage` key `gms-theme`; an inline head script sets `data-theme="dark"` before paint.
- **Age explorer:** `index.html` has the range input `#age-range` (0 to 59 months, default 27) and five `[data-stage-panel]` panels. `terrain.js` draws the route and waymarks and maps months to a stage with `floor(months / 12)`, capped at 4.

## Workflows that must not break

- **Stripe:** `api/create-checkout-session.js` (AI Pro subscription), `api/stripe-webhook.js` (fulfils on `checkout.session.completed` and `async_payment_succeeded`), `api/verify-subscription.js` (signed subscriber tokens bound to the Stripe subscription). Class purchases run in nsc server actions. nsc has its own `stripe-webhook` route, so two webhook handlers exist.
- **Login and session:** `api/login.js` (one configured account, per-IP throttle), `api/session.js`, `api/logout.js`, `api/auth/google/` (allow-listed emails or domain only), signed cookie in `api/_auth.js`.
- **Growing Minds AI:** `api/growing-minds-ai.js` with `_ai-chat.js` (1,200-character questions, 5 free questions a day), `_retrieval.js` (lexical search over `_knowledge-data.js`), `_ratelimit.js` (per-isolate soft limits: 10 a minute, 8 wrong access codes an hour) and `_pii-guard.js` (output redaction).
- **Waitlist and contact:** `api/waitlist.js` (Kit) and `api/contact.js` (Web3Forms).
- **Builds:** `scripts/build-knowledge.mjs` regenerates `api/_knowledge-data.js` from milestones, curated cards and the 22 files in `knowledge/sources/`. `scripts/build-claims.mjs --check`, `scripts/build-library.mjs` (writes `answers/`, which is gitignored and has no route), `scripts/check-canonicals.mjs`, `scripts/build-og-cards.mjs` (committed PNGs in `assets/img/og/`) and `scripts/build-structured-data.mjs` (JSON-LD between markers in the 8 articles).

## Design-system conflicts

- Three lineages coexist: Seminar names (`seminar.css`, parts of `styles.css`), Terrain tokens (`tokens-terrain.css`) and legacy aliases such as `--amber` (the teal route colour).
- `tokens-field-guide.css` is untracked and imported nowhere yet. It reuses Terrain names (`--bg`, `--ink`, `--primary`, `--font-display`, `--font-body`) with different values and fonts. A page that loads both sheets gets the later value.
- `chrome.css` reads shared names through fallbacks, so any new token file must keep those names.
- The nsc app still uses Seminar: Besley and Atkinson Hyperlegible Next, an amber highlighter, 10px radii.
