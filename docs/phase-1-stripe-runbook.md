# Phase 1 runbook: turn on the commerce spine

Human steps to route Stripe events into the nsc entitlements spine. Everything
here is dashboard work; no code changes required. Migrations 0005/0006/0007 are
already applied to `kxljngtmnqarvsawakmf`, so the database side is ready.

**Reference values**

| Thing | Value |
|---|---|
| Stripe account | `acct_1Tgtk3LIy3W5wQUy` (Growing minds science, live) |
| nsc webhook URL | `https://growingmindsscience.com/nsc/api/stripe-webhook` |
| Parent webhook URL | `https://growingmindsscience.com/api/stripe-webhook` |
| Legacy AI Pro price | `price_1Tgu9yLIy3W5wQUyOw1FYEPA` ($9/mo subscription) |
| Number Path price | `price_1Tqh56LIy3W5wQUy3yLbcd6r` ($34 one-time) |
| nsc Vercel project | nsc-lake |
| Membership prices | deferred; leave `MEMBERSHIP_PRICE_MONTHLY` / `MEMBERSHIP_PRICE_ANNUAL` unset |

---

## Step 1: inventory existing webhook endpoints (5 min)

1. Open [dashboard.stripe.com](https://dashboard.stripe.com), make sure the
   account picker (top left) shows Growing minds science and the mode toggle
   (top right) shows **Live**.
2. Go to **Developers → Webhooks** (Developers is in the left sidebar footer,
   or press `~` and type "webhooks").
3. Write down every endpoint listed, its URL, and its enabled events.
   - If `https://growingmindsscience.com/api/stripe-webhook` is there: leave it.
     It still handles the ConvertKit subscribe and your purchase notification
     email. It stays until Phase 5.
   - If an endpoint points at a URL that no longer exists (for example the old
     `/api/checkout` era), disable it now: click the endpoint, then the `...`
     menu, then **Disable**.

## Step 2: add the nsc webhook endpoint (5 min)

1. Still in **Developers → Webhooks**, click **+ Add endpoint**.
2. Endpoint URL: `https://growingmindsscience.com/nsc/api/stripe-webhook`
3. Click **+ Select events** and pick exactly these four:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **Add endpoint**.
5. On the endpoint page, under **Signing secret**, click **Reveal** and copy
   the `whsec_...` value. This secret is unique to this endpoint; it is NOT the
   same as the parent site's webhook secret.

## Step 3: set nsc environment variables (5 min)

1. Open [vercel.com](https://vercel.com), team Growing Minds, project **nsc-lake**.
2. **Settings → Environment Variables**. Add for the Production environment:
   - `STRIPE_SECRET_KEY` = your live secret key (Stripe **Developers → API keys
     → Secret key**). If it's already set, leave it.
   - `STRIPE_WEBHOOK_SECRET` = the `whsec_...` from Step 2.5.
   - `LEGACY_AI_PRO_PRICE` = `price_1Tgu9yLIy3W5wQUyOw1FYEPA`
     (this is what makes existing AI Pro subscriptions mint membership grants).
   - Do NOT set `MEMBERSHIP_PRICE_MONTHLY` or `MEMBERSHIP_PRICE_ANNUAL`.
     Unset means the membership handling stays a safe no-op.
3. Redeploy: **Deployments → latest → `...` → Redeploy** (env changes only
   apply to new deployments).

## Step 4: optional parent-site env (2 min)

In the Vercel project for growingmindsscience.com, add:

- `AI_PRO_PRICE_ID` = `price_1Tgu9yLIy3W5wQUyOw1FYEPA`

The code falls back to this same value if unset, so this is just making the
config explicit. While you're there, confirm `STRIPE_WEBHOOK_SECRET` on THIS
project is the signing secret of the PARENT endpoint from Step 1, not the new
nsc one. Redeploy if you changed anything.

## Step 5: verify with one purchase per product (15 min)

Test mode would need duplicate endpoints and test prices, so the pragmatic
check is one real purchase of each, then refund:

1. **Number Path ($34):** buy it at `/nsc/app/upgrade` with a real card.
   - Stripe: **Developers → Webhooks → (nsc endpoint) → Recent deliveries**
     should show `checkout.session.completed` with response `200`.
   - Supabase (`kxljngtmnqarvsawakmf`) **Table Editor**: a new row in
     `nsc_purchases` AND a matching row in `entitlements` with
     `product_scope = numberpath_full`.
   - The app should show paid content (printables) unlocked.
2. **AI Pro ($9/mo):** subscribe from `/pricing`.
   - After checkout you should land on the AI tool and see
     "Unlimited access unlocked" without entering your email (the new
     session-id unlock).
   - Stripe: BOTH endpoints show deliveries; the nsc endpoint should show
     `customer.subscription.created` with `200`, and Supabase should have a
     `subscriptions` row plus an `entitlements` row with
     `product_scope = membership` (via `LEGACY_AI_PRO_PRICE`).
   - Your notification email should say `Product: ai_pro` (not toddlerhood-class).
3. **Refund both:** Stripe **Payments → (payment) → Refund**, and cancel the
   test subscription under **Customers → (you) → Subscriptions → Cancel
   immediately**. Grants are additive with expiry, so the membership
   entitlement will lapse at period end; that's expected.

## If something fails

- Delivery shows `400 Invalid signature`: the `STRIPE_WEBHOOK_SECRET` on that
  Vercel project doesn't match that endpoint's signing secret. Each endpoint
  has its own.
- Delivery shows `200` but no Supabase rows: check the nsc deployment logs
  (Vercel → nsc-lake → Logs) around the delivery time.
- Rollback is always safe: disable the nsc endpoint in Stripe. Purchases still
  complete; only the automatic grants pause. Stripe retries failed deliveries
  for 3 days, and you can click **Resend** on any delivery once fixed.
