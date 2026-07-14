-- Gift codes: a giftable one-time purchase. The buyer (often a grandparent,
-- no account) pays, the webhook mints a code, and the recipient redeems it
-- for the full-access entitlement — reusing the original Stripe session id on
-- their nsc_purchases row, so no change to that table.
--
-- Service-role only: minted by the Stripe webhook, redeemed by a server
-- action using the service client. RLS on, no policies (no browser access),
-- same posture as nsc_email_log.

create table nsc_gift_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                        -- e.g. NP-7Q4K-2M8P
  product text not null default 'numberpath_full'
    check (product in ('numberpath_full')),
  stripe_checkout_session_id text not null unique,  -- idempotency + ties to payment
  purchaser_email text,
  amount_cents int,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table nsc_gift_codes enable row level security;
