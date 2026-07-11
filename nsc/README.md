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

Migration `0003_email_engagement.sql` (⚠ apply to the project) adds
`nsc_email_prefs` (per-account toggles + unsubscribe token, read/update-own)
and `nsc_email_log` (service-role-only send ledger that makes the engagement
cron idempotent).

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
CRON_SECRET                        # server-only; Vercel sends it as the cron Bearer token
RESEND_API_KEY                     # server-only; without it the engagement cron logs + skips sends
NSC_EMAIL_FROM                     # optional; default "Number Path <hello@growingmindsscience.com>"
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

Password reset: `/reset` → email link → `/auth/callback?next=/reset/update`.
⚠ In the Supabase dashboard (Auth → URL Configuration) add
`https://growingmindsscience.com/nsc/auth/callback` to the redirect allowlist
or the recovery links will bounce.

## Engagement emails (`app/api/cron/engagement`)

`vercel.json` schedules a daily cron (15:00 UTC) that sends, via Resend:
Mondays a "fresh week of games" note per account, and a one-time "six weeks
are up" re-check-in reminder per completed placement. Idempotent through
`nsc_email_log`; per-account opt-out via the unsubscribe link in every email
(`/api/email/unsubscribe?token=…`). Human steps before it goes live:

1. Apply `supabase/migrations/0003_email_engagement.sql`.
2. `vercel env add CRON_SECRET` (any long random string; Vercel crons send it
   automatically as `Authorization: Bearer …`).
3. Create a Resend API key on a verified growingmindsscience.com domain and
   `vercel env add RESEND_API_KEY`. Until then the cron runs and logs but
   sends nothing.

Zero-infra fallback that already works: every plan/progress page offers an
"Add to calendar" `.ics` for the next six-week check-in.

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
