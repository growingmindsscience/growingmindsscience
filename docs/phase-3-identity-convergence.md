# Phase 3: identity convergence (branch — hold for review)

Branch: `phase-3-identity-convergence`. **Do not merge without review.** This
makes the shared Supabase account (the nsc app's auth) the single identity that
unlocks unlimited Growing Minds AI, reconciles pre-existing Stripe subscribers
who never had an account, and gives the site one real account page.

Status: the full scope is now built — endpoint, both-ends AI unlock, wired
backfill, account page with billing portal + access-code redemption, and the
parent login/account redirects. What remains is review + preview-environment
verification and a couple of user-only dashboard/env steps (below).

## The seam that makes this work

`/nsc/*` is proxied under `growingmindsscience.com` (root `vercel.json`
rewrite), so a visitor who signs into Number Path gets a Supabase session
cookie scoped to `growingmindsscience.com`. That cookie is therefore
**same-origin** with the parent marketing site — the AI tool can read the
session without any cross-domain cookie or CORS machinery. Phase 3 leans
entirely on this.

## What this branch implements

### 1. Entitlements endpoint — `nsc/app/api/entitlements/me/route.ts`
`GET` returning the signed-in user's live entitlements as JSON:
```json
{ "authenticated": true, "scopes": ["membership"],
  "numberPath": true, "membership": true, "unlimitedAi": true }
```
- Backed by `getEntitlementSummary()` in `lib/entitlements.server.ts` (new),
  which unions the pre-spine `nsc_purchases` row with the `entitlements` table,
  expiry-aware, tolerant of a missing table.
- Self-gating: returns `authenticated: false` for signed-out callers instead of
  redirecting, so a cross-surface fetch gets a clean answer. Added to the
  middleware public allowlist (`lib/supabase/middleware.ts`).
- `Cache-Control: no-store` — entitlements flip the instant a webhook lands.

### 2. Parent AI tool honors the session — both ends
- **Server** (`api/growing-minds-ai.js`): new `hasSessionEntitlement(request)`
  forwards the incoming cookie to `/nsc/api/entitlements/me` and unlocks when
  `unlimitedAi` is true. Only checked when the cheaper access-code / subscriber-
  token checks miss, so already-unlocked callers pay no extra hop. Best-effort
  with a 2.5s timeout: a failure falls back to the free tier, never blocks.
  This is the real gate — the browser counter is only UX.
- **Client** (`tools/growing-minds-ai.html`): `checkSessionEntitlement()` calls
  the endpoint on load; on `unlimitedAi` it flips the tier badge to
  "Signed in · Unlimited" and restores the input if the free limit was hit.
  Additive to the existing access-code / subscriber-token paths.

### 3. Grant-on-signup backfill — `nsc/lib/backfill.server.ts`, wired
`backfillEntitlementsForUser(userId, email)` reconciles legacy AI Pro
subscribers by email: finds their live Stripe subscriptions and writes the
membership grant + subscriptions mirror row, exactly as the webhook would.
Idempotent (upserts) and best-effort. **Now wired** into `login`, `signup`
(via `safeBackfill(data.user)` in `app/auth/actions.ts`) and the email-confirm
`auth/callback` route. Runs on every sign-in; idempotency makes that safe and
self-healing (a renewal that lands later is picked up next login).

### 4. Real account page — `nsc/app/app/account/page.tsx`
Signed-in page (matches the app's Tailwind/`components/ui` conventions):
- **What you have** — the live entitlement scopes, human-labeled, plus a
  **Manage billing** button when the user has a Stripe customer id.
- **Number Path** — full vs free, link into the app.
- **Class & AI** — Thinkific class link + AI tool link, and, for users without
  `ai:unlimited`, an **access-code redemption** form.
- Sign-out via the existing `signout` action.

### 5. Stripe billing portal + access-code redemption — `nsc/app/app/account/actions.ts`
- `openBillingPortal()` — looks up the user's `stripe_customer_id` from
  `subscriptions`, creates a `billingPortal.sessions.create` session, redirects.
  Bounces back with `?billing=none` when there's no subscription to manage.
- `redeemAccessCode(formData)` — grandfathers legacy $49 class buyers whose
  purchase lives on Thinkific (not Stripe, so the email backfill can't see it).
  Constant-time match against `GMS_AI_ACCESS_CODE`; a correct code writes
  perpetual `comp` grants for `ai:unlimited` + `class:toddlerhood`. `source_ref`
  is constant, so re-redeeming is a no-op.

### 6. Parent login/account → nsc auth
- `login.html` / `account.html` are now redirect stubs (JS `location.replace`
  + `<meta refresh>` + a manual link) to `/nsc/login` and `/nsc/app/account`.
- The site nav's auth link (`assets/js/main.js`) now reads
  `/nsc/api/entitlements/me` instead of the parent `/api/session`, so the whole
  site reflects the one Supabase identity; signed-out shows "Log in" →
  `/nsc/login`.
- The parent HMAC auth backend (`api/_auth.js`, `api/login.js`,
  `api/auth/google/*`) is left **intact** — nothing deletes it here. Retiring it
  is sequenced in `docs/phase-5-decommission-checklist.md`.

## User-only items (I can't do these; flag)
- **nsc env — `GMS_AI_ACCESS_CODE`**: set it on the nsc-lake Vercel project so
  `redeemAccessCode` can validate. Same value as the parent's access code.
- **Stripe Customer Portal**: activate/configure it once in the Stripe
  dashboard (Settings → Billing → Customer portal), or
  `billingPortal.sessions.create` throws. One-time.
- **Migrations**: 0005/0006/0007 already applied to `kxljngtmnqarvsawakmf`
  (done), so `entitlements`/`subscriptions` exist. No action.
- **Decision still open**: whether to keep the parent env-user login as an
  `/admin` door or retire it (Phase 5, Step 3). Not blocking.

## Class-bundle ($49) AI unlock — resolved two ways
The Thinkific class has no Stripe record, so the email backfill can't recover
it. Covered now by the **access-code redemption** on the account page. When the
class later moves to on-site Stripe checkout (Phase 4 Option B),
`grantsForOneTimePurchase` already maps `class_bundle_toddlerhood` →
`class:toddlerhood` + `ai:unlimited` and it becomes fully automatic.

## Verification before merge

Local checks done on this branch: `tsc --noEmit` clean; all 137 nsc tests pass;
parent redirect stubs resolve to the nsc surfaces; the site nav reads the nsc
session and shows "Log in → /nsc/login" when signed out with no console errors;
parent AI tool degrades gracefully when the endpoint is unreachable. Still
required in a real (preview) environment where the nsc app actually runs:
1. Confirm `/nsc/api/entitlements/me` returns the right JSON for signed-in vs
   signed-out.
2. With a Supabase account holding a `membership`/`ai:unlimited` grant, open the
   parent AI tool and confirm "Signed in · Unlimited" **and** that the server
   allows a 6th question in one day.
3. Sign up with the email of an existing test AI Pro subscription and confirm
   the membership grant appears (backfill).
4. On the account page: **Manage billing** opens the Stripe portal; the
   access-code form links `ai:unlimited` + `class:toddlerhood`.
5. `/login` and `/account` on the parent bounce to the nsc surfaces.

## Files in this branch
- `nsc/app/api/entitlements/me/route.ts` (new) — entitlements JSON
- `nsc/lib/entitlements.server.ts` — `getEntitlementSummary` + types
- `nsc/lib/supabase/middleware.ts` — allowlist `/api/entitlements`
- `nsc/lib/backfill.server.ts` (new) — Stripe-subscription backfill
- `nsc/app/auth/actions.ts` — wire backfill into login/signup
- `nsc/app/auth/callback/route.ts` — wire backfill into email-confirm
- `nsc/app/app/account/page.tsx` (new) — account page
- `nsc/app/app/account/actions.ts` (new) — billing portal + code redemption
- `api/growing-minds-ai.js` — session entitlement gate
- `tools/growing-minds-ai.html` — session unlock UI
- `login.html`, `account.html` — redirect stubs to nsc auth
- `assets/js/main.js` — nav auth link reads the nsc session
- `docs/phase-3-identity-convergence.md` (this file)
- `docs/phase-5-decommission-checklist.md` (new)
