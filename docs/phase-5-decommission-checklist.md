# Phase 5: decommission the legacy commerce/auth layer

Once Phases 1 and 3 are live and verified, the parent site's own commerce and
auth machinery becomes redundant — everything routes through the shared Stripe
account, the nsc webhook, the `entitlements` spine, and Supabase Auth. This is
the checklist to retire the old layer safely. **Do not start until the
preconditions pass.** Every step is reversible; do them one at a time and watch
for a day between the destructive ones.

## Preconditions (all must be true)
- [ ] Phase 1 done: the Stripe webhook points at `/nsc/api/stripe-webhook` and
      real purchases write `entitlements` rows (verified per the Phase 1 runbook).
- [ ] Phase 3 merged and verified: signed-in unlock works, the account page
      shows entitlements, the backfill has run for at least a few real accounts.
- [ ] The nsc webhook has taken over the parent webhook's side effects (next
      section) — otherwise retiring the parent webhook drops them.

## Step 1 — Move the parent webhook's side effects into nsc *(do first)*
The parent `api/stripe-webhook.js` does three things on `checkout.session.completed`
that the nsc webhook does not yet do:
1. writes a `purchases` row (email + session id + product) in the **legacy**
   Supabase project `xtepkichenvvyewqpolg`;
2. subscribes the buyer to ConvertKit (`KIT_API_KEY` / `KIT_PAID_FORM_ID`);
3. emails the owner a purchase notification (Web3Forms).

Decide per item:
- **(1) purchases table** — likely obsolete: `nsc_purchases` + `entitlements`
  now hold purchase truth, keyed to a real user. Drop it unless you want the
  denormalized email log. If keeping, port the write into the nsc webhook.
- **(2) ConvertKit** — port into `nsc/app/api/stripe-webhook/route.ts` (add the
  subscribe call after a paid checkout). Move `KIT_API_KEY` / `KIT_PAID_FORM_ID`
  env to the nsc project. **User-only:** set those env vars on nsc-lake.
- **(3) owner notification** — port the Web3Forms call (or switch to the Resend
  path nsc already uses via `sendEmail`, which is cleaner). Move
  `WEB3FORMS_ACCESS_KEY` if you keep Web3Forms.

Gate: only proceed to Step 2 once a test purchase confirms the nsc webhook fires
these.

## Step 2 — Retire the parent Stripe webhook
- [ ] Stripe dashboard → Developers → Webhooks → disable, then (after a quiet
      day) delete the `…/api/stripe-webhook` endpoint.
- [ ] Delete `api/stripe-webhook.js`.
- [ ] Remove its `vercel.json` rewrite (`/api/stripe-webhook`).
- [ ] Remove now-unused parent env: `KIT_*`, `WEB3FORMS_ACCESS_KEY`, and the
      legacy `SUPABASE_*` (the `xtepki…` project) **if** nothing else on the
      parent uses them (grep `api/` first — `contact.js`, `waitlist.js` may).

## Step 3 — Retire the parent HMAC auth *(after login redirect is confirmed)*
`login.html` / `account.html` now redirect into nsc auth, and the site nav reads
the nsc session. The parent HMAC stack is only still referenced by
`api/verify-subscription.js`'s bare-email path (a fallback) and Matthew's admin
login.
- [ ] Decide the admin door: either expose the env-user login at an explicit
      `/admin` route, or drop it. If dropping, you also drop Google OAuth on the
      parent (`api/auth/google/*`).
- [ ] Once the AI tool's session-based unlock is confirmed as the primary path,
      retire `api/verify-subscription.js`'s **bare-email** branch (keep the
      session-id and token-refresh branches — they need no HMAC session). Then
      `api/session.js`, `api/login.js`, `api/logout.js`, `api/_auth.js`, and
      `api/auth/google/*` can go.
- [ ] Delete the now-dead `login.html` / `account.html` stubs and their
      `vercel.json` rewrites, replacing with `redirects` to `/nsc/login` and
      `/nsc/app/account` (cleaner 308s than the meta-refresh stubs).
- [ ] Remove parent env: `GMS_LOGIN_EMAIL`, `GMS_LOGIN_PASSWORD_HASH`,
      `GMS_LOGIN_PASSWORD_SALT`, `GOOGLE_CLIENT_ID/SECRET`. **Keep
      `GMS_SESSION_SECRET`** while any subscriber-token path remains (it signs
      those tokens) — it is shared with the nsc token check.

## Step 4 — Collapse AI Pro checkout (optional, tidy)
Today AI Pro checkout is initiated on the parent (`api/create-checkout-session.js`)
and the subscription is granted by the nsc webhook via `LEGACY_AI_PRO_PRICE`.
That works and can stay. If you'd rather have one checkout home, move AI Pro
checkout into nsc alongside the membership SKU when membership launches, and
delete `api/create-checkout-session.js`. Not required.

## Step 5 — Final sweep
- [ ] grep the repo for the retired endpoints and env names; remove dead refs.
- [ ] Update `CLAUDE.md` / `PRODUCT.md`: the parent site no longer owns auth or
      the commerce DB; identity + entitlements live in the nsc Supabase project.
- [ ] Delete the legacy `xtepki…` Supabase project's commerce tables (or the
      project) only after confirming nothing reads them (`contact`, `waitlist`
      may still use it — check first).

## What NEVER gets deleted
- The shared Stripe account and its single webhook (now nsc's).
- `entitlements`, `subscriptions`, `nsc_purchases`, `nsc_gift_codes` in the nsc
  Supabase project — these are the source of truth.
- `GMS_SESSION_SECRET` while any subscriber-token unlock path is still live.

## Rollback
Each step is independently reversible: re-enable the Stripe endpoint, restore a
deleted file from git, or re-add an env var and redeploy. Because grants are
additive and idempotent, nothing here can revoke access a user already has —
the worst case of a mistake is a paused side effect (an email not sent), not a
locked-out customer.
