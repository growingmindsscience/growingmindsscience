# Growing Minds Science — site

Static site for **Growing Minds Science**, currently deployed on Vercel.

The site sells research-based, self-paced, asynchronous parent classes for
families of children ages 0–5. The homepage is structured as a sales-oriented
landing page; the milestone tracker remains a standalone static tool; the
first flagship class (Toddlerhood) has a dedicated detail page.

- Marketing homepage at `/` (`index.html`) — pure HTML/CSS/JS, no build step
- Flagship class page at `/classes/toddlerhood.html` (pretty URL: `/classes/toddlerhood`)
- Standalone milestone tracker at `/milestones.html` (pretty URL: `/milestones`)
- Brand: warm off-white, dark ink, teal CTAs, muted gold/brown accents
- Type: Instrument Serif (display) + Work Sans (body) via Google Fonts

## File tree

High-level shape (not every file — see the directories for the full set):

```
growing-minds-science/
├─ index.html                      # Sales homepage
├─ about/ contact/ faq/            # Supporting marketing pages
├─ classes/                        # 5 class pages (toddlerhood live; others waitlist)
├─ articles/                       # Articles hub + 8 research/practical explainers
├─ tools/                          # Tools-for-parents hub + Growing Minds AI + decoders
├─ milestones.html                 # Standalone tracker; no framework bundle
├─ thank-you.html                  # Waitlist success page
├─ api/                            # Vercel functions (AI, waitlist, contact, auth, Stripe)
│  ├─ growing-minds-ai.js          #   Claude-backed chat (see "Growing Minds AI" below)
│  ├─ _retrieval.js _knowledge-data.js   # Local grounding corpus + lexical retrieval
│  └─ …                            #   waitlist, contact, login/session, stripe-webhook, …
├─ nsc/                            # Number Path — self-contained Next.js app (own README)
├─ knowledge/                      # Sources + curated cards compiled into _knowledge-data.js
├─ scripts/                        # build-knowledge, build-structured-data, build-og-cards, …
├─ vercel.json                     # Vercel redirects + security headers (authoritative)
├─ robots.txt  sitemap.xml  README.md
└─ assets/
   ├─ css/  js/
   └─ img/
      ├─ original-logo-mark-no-words-512.png   # Logo mark (header, OG, apple-touch-icon)
      ├─ favicon.svg                            # Tab icon
      ├─ og/                                    # Generated per-article social cards (1200x630)
      └─ site/                                  # Editorial photography
```

> **Legacy code:** `netlify/functions/` is dead code from the pre-Vercel era
> (`netlify.toml` is already gone). `vercel.json` governs and `api/*.js` are the
> live functions. In particular `netlify/functions/growing-minds-ai.mjs` still
> references OpenAI/gpt-5.5/vector-store — it is **not** how the AI works today
> (see below) and is safe to delete.
>
> ⚠️ **Netlify is still connected to this repo**, despite the config being gone —
> it builds on every PR and publishes at least two live, crawlable mirrors
> (`growingmindsscience.netlify.app`, and `growing-minds-science.netlify.app`
> serving *stale* content). Because these serve the same pages from a different
> host, every page now declares an **absolute** canonical so the mirrors
> consolidate to growingmindsscience.com instead of competing with it
> (`scripts/check-canonicals.mjs` enforces this). The real fix is to disconnect
> or unpublish those Netlify sites — that has to be done in the Netlify
> dashboard, not here.

## Site imagery

Six editorial photographs ship in `assets/img/site/` and each one is used once
on the homepage in the role described below:

| File                  | Role                                                          |
| --------------------- | ------------------------------------------------------------- |
| `hero-parent-baby.jpg`| Homepage hero (right column desktop / under hero on mobile)   |
| `baby-hands.jpg`      | Birth to 12 months class card thumbnail                       |
| `learning-blocks.jpg` | Toddler class card thumbnail                                  |
| `child-learning.jpg`  | Preschool class card thumbnail                                |
| `family-reading.jpg`  | Family systems class card thumbnail                           |
| `notebook-coffee.jpg` | "Why parents trust this" supporting image                     |

The About Matthew section is intentionally text-first so no stock image can be
mistaken for a portrait or visually block the biography. If a real portrait
becomes available, it can be added later with a clear caption.

## Deploy

Deploy the repository on Vercel. The domain can still be managed in Netlify DNS,
but page hosting and API routes are expected to run on Vercel.

## Forms

The waitlist posts to the Vercel API route at `/api/waitlist`, which forwards
validated submissions to Web3Forms without exposing the Web3Forms access key in
browser HTML.

Required Vercel environment variable:

- `WEB3FORMS_ACCESS_KEY`

Successful browser form submissions redirect to `/thank-you.html`.

## Login

The `/login` and `/account` pages use Vercel Edge API routes:

- `POST /api/login` verifies one configured account and sets a signed,
  `HttpOnly`, `SameSite=Lax` session cookie.
- `GET /api/auth/google/start` starts Google OAuth sign-in.
- `GET /api/auth/google/callback` completes Google OAuth sign-in.
- `GET /api/session` returns the current session state.
- `POST /api/logout` clears the session cookie.

Required Vercel environment variables:

- `GMS_LOGIN_EMAIL`
- `GMS_LOGIN_NAME`
- `GMS_LOGIN_PASSWORD_SALT`
- `GMS_LOGIN_PASSWORD_HASH`
- `GMS_SESSION_SECRET`

Optional Google sign-in environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_ALLOWED_EMAILS` — comma-separated allowlist, optional
- `GOOGLE_ALLOWED_DOMAIN` — single allowed email domain, optional

Use this authorized redirect URI in Google Cloud for the OAuth client:

```text
https://growingmindsscience.com/api/auth/google/callback
```

Generate the password salt and hash locally:

```bash
node scripts/hash-password.mjs 'replace-with-a-strong-password'
```

Generate a session secret:

```bash
openssl rand -base64 32
```

This is a single-account login for member access on a static site. Use a real
identity provider or database-backed auth before adding public self-service
registration, password reset, or per-customer entitlements.

## Class CTA / waitlist preselection

The class product cards on the homepage preselect the class-of-interest in the
waitlist signup form before scrolling to it. The class detail page also
includes a hidden `interest=Toddlerhood` field, and the homepage form
respects an `?interest=...` query string for cross-page preselection.

## Growing Minds AI

The Growing Minds AI page at `/tools/growing-minds-ai` includes a working chat
backed by a Vercel API route:

- API route: `api/growing-minds-ai.js`
- Browser endpoint: `/api/growing-minds-ai`
- Model provider: **Anthropic Claude** (streamed; the SSE is transformed to an
  OpenAI-compatible shape so the browser needs no change).
- Required Vercel environment variable: `ANTHROPIC_API_KEY`
- Optional Vercel environment variable: `ANTHROPIC_MODEL` (defaults to
  `claude-sonnet-4-6`; set `claude-opus-4-8` for depth or a Haiku id to cut cost)
- Required Vercel environment variable: `GMS_AI_ACCESS_CODE`
- Optional Vercel environment variable: `GMS_SESSION_SECRET` (verifies AI Pro
  subscriber tokens; also used elsewhere for the parent-site session cookie)

Set environment variables in Vercel. The API key must never be placed in
browser JavaScript or committed to the repository.

**Grounding is local — no external vector store.** Retrieval runs in-repo:
`api/_retrieval.js` scores the question against `api/_knowledge-data.js` with
lexical overlap + light stemming and passes the top cards to the model as
context. That knowledge base is compiled offline by
`scripts/build-knowledge.mjs` from three inputs (the 42 milestones in
`milestones.html`, curated cards in `knowledge/curated.mjs`, and your uploaded
material in `knowledge/sources/`). Rebuild after changing any input:

```bash
node scripts/build-knowledge.mjs
```

There is no embeddings service and no OpenAI dependency; the corpus is small and
curated, so lexical scoring is a good fit (upgradable to embeddings later
without touching callers).

**Access tiers.** The server gates every call: unlimited for a matching
`GMS_AI_ACCESS_CODE` (share only with enrolled class families), for a valid AI
Pro subscriber token, or for a signed-in account whose Number Path / membership
session carries an unlimited-AI entitlement; otherwise a per-IP daily free
allowance applies. The browser counter is UX only — the server is the real gate.

## Milestone tracker

The tracker is intentionally a single static `milestones.html` file with inline
CSS, inline JavaScript, and embedded milestone data. It does not use React,
Vite, hashed bundles, or a `milestones/assets/` folder. This avoids Netlify
manual-deploy edge cases where subdirectory app assets can be served as HTML
(which previously caused infinite reload loops).

## Parent-tools engagement layer

A small shared layer makes the tools meet a parent in the moment and remember
their context — with no account, no build step, and no growth-hacking mechanics
(deliberately no streaks, badges, or notifications, per `PRODUCT.md`).

Shared files:

- `assets/js/gms-tools.js` — a single `window.GMS` namespace: a local child
  profile, a saved "shelf", the decoder enhancer, `speechSynthesis` narration,
  a print helper, and the age-aware hub reordering. It mirrors the
  `main.js` safe-storage pattern (localStorage with an in-memory fallback) and
  namespaces its keys `gms-*`.
- `assets/css/tools.css` — styles for the decoder widget, profile chip/editor,
  shelf, Save/Listen/Ask action row, the right-now page, and the print pocket
  card. Built on existing tokens, so light/dark and reduced-motion come for free.

Local storage keys (device-only, never sent to any server):

- `gms-child-v1` — `{activeId, children:[{id, name, birthdate|null, band|null}]}`.
  A child has a birthdate (primary) **or** an age band (fallback). Age maps to
  the same seven bands as the milestone tracker.
- `gms-shelf-v1` — `{items:[{id, key, toolSlug, toolTitle, toolUrl, title, body,
  tryLine, savedAt}]}` for the "Saved for you" shelf.

Features:

- **Child profile** (`tools/index.html`): an optional, local profile. When set,
  age-relevant tool cards float to the front of their grid (`data-age-min` /
  `data-age-max` in months on each `.tool-card`), and the milestone tracker
  auto-opens to the child's band (via `#band=` hash or the profile).
- **It's hard right now** (`tools/right-now.html`, pretty URL `/tools/right-now`):
  a calm, one-tap crisis guide. Situation → short answer data lives in the page's
  `#router-data` JSON. Each answer offers Save / Listen / Ask about this / Print.
- **Decoders**: five pages share the `gms-tools.js` toggle enhancer; the three
  variant choosers (`.scenario-*`, `.stage-*`, `.pattern-*`) keep their own
  toggle but receive the Save/Listen/Ask action row. All output articles are
  saveable and narratable.
- **Saved shelf**: "Save this" persists a card to `gms-shelf-v1`; the hub renders
  it under "Saved for you".
- **Print pocket card**: `GMS.printCard()` (wired to `[data-print-card]`) prints
  only the `.pocket-card` block by toggling `body.printing-pocket`, leaving normal
  Ctrl+P untouched.
- **Growing Minds AI prefill**: `/tools/growing-minds-ai?q=<question>` prefills
  the chat box (prefill only — it never auto-sends, so the free-question limit is
  respected). "Ask about this" links use `GMS.askUrl()`, which prepends a coarse
  age phrase (never the name or birthdate) when a profile exists.

Smoke test: `npm i -D playwright-core` once, then `node scripts/smoke-tools.mjs`.
It serves the repo and drives Chromium through the profile, reorder, milestones
deep-link, all three decoder variants, the right-now router, the shelf, the print
card, and the AI prefill. The npm artifacts are gitignored so the static site
carries no `package.json`.

## Accessibility notes

- Skip link, semantic landmarks, single `<h1>` per page.
- All interactive controls have `aria-label` or visible label.
- Color contrast meets WCAG AA in both light and dark themes.
- Honors `prefers-reduced-motion`.
- Theme toggle persists via `localStorage` and respects system preference on first visit.
- Mobile nav is fully hidden (visibility, opacity, transform offscreen) until the
  toggle is opened, and is closed automatically on link click and on Escape.
