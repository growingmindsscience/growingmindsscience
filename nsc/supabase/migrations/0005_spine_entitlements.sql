-- Phase 0 spine (portfolio plan Part 5.1): entitlements + subscriptions
-- mirror, and the children table grows the fields every future product reads
-- (corrected age for Navigator/LMC, languages for LMC/BPG).
--
-- Entitlement rules (plan 2.2): grants are additive-only from enumerated
-- sources; a row is never revoked by buying something else. Subscription
-- lapse is expressed through expires_at, not deletion.

alter table nsc_children
  add column if not exists born_early_weeks int,
  add column if not exists primary_languages text[] not null default '{}';

create table if not exists entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_scope text not null, -- 'membership' | 'numberpath_full' | 'ai:unlimited' | 'class:<slug>' | ...
  source text not null check (
    source in ('stripe_sub', 'stripe_otp', 'stripe_otp_legacy', 'gift', 'comp', 'trial')
  ),
  source_ref text not null default '', -- stripe session/subscription id or gift code id
  expires_at timestamptz, -- null = perpetual
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_scope, source, source_ref)
);

alter table entitlements enable row level security;

create policy "entitlements: read own"
  on entitlements for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies: writes are service-role only (webhook,
-- redemption actions), the same posture as nsc_purchases/nsc_gift_codes.

create index if not exists entitlements_user_scope
  on entitlements (user_id, product_scope);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text,
  price_id text not null,
  status text not null, -- stripe status verbatim
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "subscriptions: read own"
  on subscriptions for select
  using (auth.uid() = user_id);
