# Number Path (`nsc`)

Parent-run early-math check-in for ages ~2–5. Places a child on the
counting-development ladder (knower-levels → cardinal principle) via a guided
Give-N assessment ("The Feed-the-Bear Game"), then serves a personalized,
evidence-tagged plan of household games and daily number-talk prompts.

Full app: assessment → placement → weekly plan → paywall → printables.

## Architecture

- **Zero runtime model calls.** All content is compiled offline into frozen,
  versioned, hash-certified JSON artifacts. Runtime is a pure TypeScript
  state-machine walk plus artifact lookups.
- **Titration protocol** = pure TS FSM in `lib/titration.ts`, exhaustively
  property-tested. Copy lives in compiled artifacts, keyed by machine state.
- **Compiler + cert harness** in `tools/nsc-compiler/`. Artifacts ship only on a
  green cert report; `lib/artifacts.ts` refuses any artifact whose hash lacks a
  matching passing report. `next.config.ts` force-includes `content/**` in the
  serverless bundle so raw-byte hashing works in prod.
- **App**: Next.js 15 App Router + Supabase (auth + Postgres, RLS per-user) +
  Stripe (one-time SKU). Content flow: `lib/content.server.ts` (certified load)
  → `lib/routing.ts` (placement → plan) → screens.

## Data model (`supabase/migrations/0001_nsc_core.sql`, applied)

`nsc_children`, `nsc_assessments` (holds the serialized engine state for
pause/resume), `nsc_trials`, `nsc_game_plays`, `nsc_purchases`. RLS on every
table; trials scope through their assessment; purchases are read-own,
service-role-write.

Supabase project: **dedicated free project `kxljngtmnqarvsawakmf`** (personal
org, us-west-1).

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL           # dedicated project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY      # publishable key
SUPABASE_SERVICE_ROLE_KEY          # server-only; used by the Stripe webhook
STRIPE_SECRET_KEY                  # server-only
STRIPE_WEBHOOK_SECRET              # server-only; from the webhook endpoint
NSC_PRICE_ID                       # the one-time price id
NEXT_PUBLIC_SITE_URL               # https://growingmindsscience.com (for redirects)
NEXT_PUBLIC_NSC_PRICE_DISPLAY      # e.g. "$34" (display only)
```

`.env.local` is gitignored and holds the two public Supabase values for local
dev. Set the server-only secrets via `vercel env add`.

## Deployment (multi-zone) — READ THIS BEFORE TOUCHING VERCEL

This one GitHub repo (`growingmindsscience/growingmindsscience`) ships **two
separate Vercel projects**, both on team `growingmindssciences-projects`
(`team_0gvjTk1SedmFDSuFgvAk9qZp`). They are a multi-zone pair, not a monorepo
build:

| Vercel project | Root Directory | Framework | Serves | Domain |
|---|---|---|---|---|
| `growingmindsscience` | repo root (none) | static | the marketing site | `growingmindsscience.com` |
| `nsc` | **`nsc`** | Next.js | this app (`basePath: /nsc`) | `nsc-lake.vercel.app` |

The static site's root `vercel.json` rewrites the `/nsc` path to the app's zone:

```json
{ "source": "/nsc",        "destination": "https://nsc-lake.vercel.app/nsc" },
{ "source": "/nsc/:path*", "destination": "https://nsc-lake.vercel.app/nsc/:path*" }
```

So `growingmindsscience.com/nsc/*` is proxied to the `nsc` project. (The root
`vercel.json` also gives `/nsc` its own CSP that permits the Supabase origin;
the site's strict `connect-src 'self'` would otherwise block the app.)

### The rule that keeps this from breaking

**BOTH projects must stay git-connected to this repo with Production Branch =
`main`.** If either loses its git connection, `main` merges silently stop
deploying to that half and the live product drifts behind the repo (this is
exactly what happened once when `nsc` was only ever `vercel --prod`'d from a
laptop — the static site kept auto-deploying while `/nsc` served a stale build).

Verify both connections any time the product looks out of date:

```bash
# each should show a github link + productionBranch "main"
vercel git connect            # run inside the repo root  → growingmindsscience
cd nsc && vercel git connect  # run inside nsc/           → nsc  (Root Directory must be "nsc")
```

The `nsc` project's **Root Directory** must be `nsc` (Project → Settings →
Build & Deployment → Root Directory), or Vercel tries to build the static repo
root as a Next.js app and fails. New `nsc` env vars are added with
`cd nsc && vercel env add <NAME> production`.

## Stripe setup (one-time SKU, pricing option B)

Account: **Growing minds science** (`acct_1Tgtk3LIy3W5wQUy`), LIVE.

- ✅ Product created: **Number Path — full access** (`prod_UqNqkOL2xt8fWK`)
- ✅ Price created: **$34 one-time** → `NSC_PRICE_ID=price_1Tqh56LIy3W5wQUy3yLbcd6r`
- ⚠ **Webhook** (do in the Stripe dashboard): add an endpoint →
  `https://growingmindsscience.com/nsc/api/stripe-webhook`, event
  `checkout.session.completed`. Reveal its signing secret and set
  `STRIPE_WEBHOOK_SECRET` via `vercel env add`.
- ⚠ **Secret key**: set `STRIPE_SECRET_KEY` (live `sk_live_…`) via `vercel env add`.

## Supabase auth notes

Email/password via Supabase Auth (12-char minimum enforced in the signup
action). For a frictionless first run, either disable email confirmation in the
Supabase dashboard or wire a confirmation redirect. Leaked-password protection
recommended ON.

## Telemetry

The funnel is observable from the core tables — no separate analytics store in
v1: `nsc_assessments` (started/completed, placement, confidence),
`nsc_game_plays` (engagement + reactions), `nsc_purchases` (conversion).

## Gates

| Gate | Status |
|---|---|
| DDL apply | ✅ applied to `kxljngtmnqarvsawakmf` |
| G1 citation verification | ✅ all 8 verified (see `content/citations.v1.json` notes) |
| G2 full compile | ✅ done — all artifacts full-mode cert-green |
| Stripe product + price | ✅ created live ($34, `price_1Tqh56LIy3W5wQUy3yLbcd6r`) |
| Stripe webhook + secret key env | ⚠ dashboard webhook + `vercel env add` |
| Final price point | ✅ $34 |
| Production deploy + root rewrite | ⚠ human step |

## Commands

```bash
npm run dev        # local dev at localhost:3000/nsc
npm test           # vitest — titration, routing, cert (52 tests)
npm run build      # production build
npm run cert:gold  # cert harness against gold artifacts
npm run cert:full  # cert against full compiled artifacts
```
