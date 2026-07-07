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

## Deploy (multi-zone)

1. Deploy this dir as its own Vercel project (root = `nsc/`). `basePath: /nsc`,
   so it serves at `https://<nsc-project>.vercel.app/nsc/*`.
2. Add all env vars above in the Vercel project.
3. In the **static site's root `vercel.json`**, add rewrites so
   growingmindsscience.com/nsc proxies to the app:
   ```json
   { "source": "/nsc", "destination": "https://<nsc-project>.vercel.app/nsc" },
   { "source": "/nsc/:path*", "destination": "https://<nsc-project>.vercel.app/nsc/:path*" }
   ```

## Stripe setup (one-time SKU, pricing option B)

1. Create a product ("Number Path — full access") with a one-time price in the
   growingmindsscience Stripe account. Put the price id in `NSC_PRICE_ID`.
2. Add a webhook endpoint → `https://growingmindsscience.com/nsc/api/stripe-webhook`,
   event `checkout.session.completed`. Put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.
3. Final price is Matthew's call ($29–39); set `NEXT_PUBLIC_NSC_PRICE_DISPLAY`
   to match.

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
| Stripe product/price + webhook secret | ⚠ human step (keys are Matthew's) |
| Final price point ($29–39) | ⚠ open |
| Production deploy + root rewrite | ⚠ human step |

## Commands

```bash
npm run dev        # local dev at localhost:3000/nsc
npm test           # vitest — titration, routing, cert (52 tests)
npm run build      # production build
npm run cert:gold  # cert harness against gold artifacts
npm run cert:full  # cert against full compiled artifacts
```
