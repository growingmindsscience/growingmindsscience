# Phase 3: identity convergence (branch — hold for review)

Branch: `phase-3-identity-convergence`. **Do not merge without review.** This
makes the shared Supabase account (the nsc app's auth) the single identity that
unlocks unlimited Growing Minds AI, and reconciles pre-existing Stripe
subscribers who never had an account.

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

### 3. Grant-on-signup backfill — `nsc/lib/backfill.server.ts`
`backfillEntitlementsForUser(userId, email)` reconciles legacy AI Pro
subscribers by email: finds their live Stripe subscriptions and writes the
membership grant + subscriptions mirror row, exactly as the webhook would.
Idempotent (upserts) and best-effort. **Not yet wired to a call site** — see
open decision below.

## What is deliberately NOT done (needs your decision)

### A. Where to call the backfill
Options, in order of recommendation:
1. **Post-auth, once per account.** Call it right after the first successful
   sign-in/sign-up in `app/auth/callback/route.ts` (and the password
   sign-in action), guarded by a per-user "backfilled" flag so it runs once,
   not on every login. Cleanest UX (access just appears), one Stripe call per
   new account. *Recommended.*
2. **On the upgrade page load,** only when the user currently holds no
   entitlements. Zero new auth-flow surface, but adds a Stripe call for
   genuinely-free users who visit upgrade.
3. **Explicit "I already subscribed" button** on upgrade/account. Most
   conservative, but asks the user to know they need it.

I held this for review because option 1 edits the live auth callback, which is
the highest-blast-radius file in the app.

### B. Parent `login.html` / `account.html`
Today the parent site has its own single-env-user HMAC login
(`GMS_LOGIN_EMAIL`, used by Matthew as an admin door) separate from Supabase.
Recommended end state:
- Point the parent "Log in" at the Supabase auth flow (`/nsc/login`) so there's
  one account system, and make `account.html` show real entitlements (via the
  same `/api/entitlements/me`) plus a Stripe billing-portal link for
  cancel/upgrade (a small new nsc route).
- Keep the env-user login as an explicit `/admin`-only door, or retire it.

I did **not** rip out the existing login in this branch — it's how you sign in
today, and the replacement is a product/UX decision.

### C. Class-bundle ($49) AI unlock
The Thinkific class has no Stripe record, so the backfill can't recover it. Two
paths: keep the emailed `GMS_AI_ACCESS_CODE` (works today), or move the class
to on-site Stripe checkout per Phase 4 Option B — at which point
`grantsForOneTimePurchase` already maps `class_bundle_toddlerhood` →
`class:toddlerhood` + `ai:unlimited` and the unlock becomes automatic.

## Verification before merge

Local checks done on this branch: `tsc --noEmit` clean; all 137 nsc tests pass;
parent AI tool loads and degrades gracefully when the endpoint is unreachable
(no console errors, free tier intact). Still required in a real environment:
1. Deploy the branch to a preview; confirm `/nsc/api/entitlements/me` returns
   the right JSON for a signed-in vs signed-out session.
2. With a Supabase account holding a `membership` (or `ai:unlimited`) grant,
   open the parent AI tool and confirm it shows "Signed in · Unlimited" and the
   server actually allows a 6th question in one day.
3. If wiring the backfill (decision A): sign up with the email of an existing
   test AI Pro subscription and confirm the membership grant appears.

## Files in this branch
- `nsc/app/api/entitlements/me/route.ts` (new)
- `nsc/lib/entitlements.server.ts` (added `getEntitlementSummary` + types)
- `nsc/lib/supabase/middleware.ts` (allowlist `/api/entitlements`)
- `nsc/lib/backfill.server.ts` (new; not yet called)
- `api/growing-minds-ai.js` (session entitlement gate)
- `tools/growing-minds-ai.html` (session unlock UI)
- `docs/phase-3-identity-convergence.md` (this file)
