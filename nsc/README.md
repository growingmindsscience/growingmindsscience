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
- **Age-referenced standing** (`lib/norms.ts`): pure typical-range table from
  the published Give-N literature (same studies the evidence page cites).
  Powers the "for their age" metric on the Give-N readout and the progress
  page (full detail is paid; free tier sees a teaser). Give-N reads only —
  Point-and-Seek results are soft routing signals and are never compared.

## Data model (`supabase/migrations/0001_nsc_core.sql`, applied)

`nsc_children`, `nsc_assessments` (holds the serialized engine state for
pause/resume), `nsc_trials`, `nsc_game_plays`, `nsc_purchases`. RLS on every
table; trials scope through their assessment; purchases are read-own,
service-role-write.

Migration `0003_email_engagement.sql` (⚠ apply to the project) adds
`nsc_email_prefs` (per-account toggles + unsubscribe token, read/update-own)
and `nsc_email_log` (service-role-only send ledger that makes the engagement
cron idempotent).

Migration `0004_gift_codes.sql` (applied) adds `nsc_gift_codes` — giftable
one-time purchases. Service-role only (RLS on, no policies): the Stripe webhook
mints a code on a `metadata.kind=gift` checkout and emails it to the buyer; the
recipient redeems it at `/redeem`, which grants `numberpath_full` by writing an
`nsc_purchases` row that reuses the gift's Stripe session id (so no change to
that table and the grant stays idempotent). No new Stripe product — gifting
reuses the existing `$34` price; buyer needs no account. Public routes: `/gift`,
`/gift/success`, `/gift/card`, `/redeem` (the redeem action still gates with
`requireAuth`). The gift email needs `RESEND_API_KEY`; without it the code is
minted and shown on the success page but not emailed.

Migration `0005_spine_entitlements.sql` (⚠ apply to the project — the personal
org isn't reachable from the CLI/MCP tokens on this machine, so paste it into
the SQL editor or `supabase link` + `db push` with the personal-org token) is
the Phase 0 spine from the portfolio plan: `entitlements` (additive-only
grants, enumerated sources, read-own / service-role-write), a `subscriptions`
mirror of Stripe state, and `nsc_children.born_early_weeks` +
`primary_languages`. Grant rules live in `lib/grants.ts` (pure, tested — the
plan 2.2 SKU-reconciliation table as code); the webhook now also mirrors
one-time purchases into `entitlements` and handles
`customer.subscription.*` events. `hasFullAccess` checks `nsc_purchases`
first, then live `membership`/`numberpath_full` entitlements, so deploying
this code before the migration is applied degrades safely.

Migration `0006_activity_library.sql` (⚠ apply to the project, after 0005) adds
the shared **admin review queue** (`review_items`, generic over content types:
activities today; claims, navigator nodes, guidance blocks, prompt cards later)
and the **Activity Library** (`activities` public-read-when-published,
`activity_completions` own-row RLS). The pipeline: drafts are graded
mechanically (`tools/activities/grader.ts` — safety lexicon, mechanism
vocabulary in `tools/activities/mechanisms.ts`, FK ≤ 8, banned-language floor,
household-materials rule, duplicate similarity; planted-violation eval in
`tests/activities-grader.test.ts` must reject 12/12), enqueued via the
"Import batch" button on `/admin` (ADMIN_EMAILS-gated), and published only by
an explicit approve in the queue. Public browse/detail at `/activities`
(public in middleware; steps gate on `is_free` or a live membership
entitlement). Batch 001 (18 drafts, 3 per band 0–36m, one free per band) is
committed at `tools/activities/batches/batch-001.json`.

Migration `0007_navigator.sql` (⚠ apply to the project, after 0006) adds
`navigator_sessions` (anonymous, enumerated-answers-only, service-role write;
12-month retention policy, cleanup cron to follow) and `part_c_directory`
(public read; **rows enter only after human verification against the ECTA
directory — never generated**). The Navigator itself: frozen tree artifacts in
`content/navigator/` (Talking shipped as **status "draft"** — invisible in
production until Matthew's review + the D3 attorney read flip it to
"published"; drafts render in dev or with `NAVIGATOR_PREVIEW=1`). Grader in
`tools/navigator/grader.ts` (reachability, ≤8-question depth, loss-of-skills
short-circuit on every branch, not-sure-conservatism, never-diagnostic
lexicon, FK ≤ 7, citations; the publish gate requires G1-verified citations).
Walker is pure TS in `lib/navigator.ts`; public pages at `/worried`.

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
MEMBERSHIP_PRICE_MONTHLY           # optional until membership SKUs exist; $9/mo price id
MEMBERSHIP_PRICE_ANNUAL            # optional; $79/yr price id
LEGACY_AI_PRO_PRICE                # optional; the live AI Pro $9/mo price id (absorbed into membership)
ADMIN_EMAILS                       # comma-separated allowlist for /admin (review queue); unset = no admins
```

The three membership price vars gate the subscription grant path: unset, the
webhook's `customer.subscription.*` handling is a safe no-op, so this code can
ship before the membership SKUs are created in Stripe (D7 sign-off).

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
