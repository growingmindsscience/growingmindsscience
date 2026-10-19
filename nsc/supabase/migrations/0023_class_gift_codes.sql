-- Class gift codes: codes an admin makes at /admin/classes/gift-codes and
-- gives away. Each one unlocks every class, plus Growing Minds AI (which the
-- toddler class includes), for the account that redeems it. Unlike
-- nsc_gift_codes they are not tied to a Stripe payment.
--
-- Service-role only: minted and redeemed by server actions using the service
-- client. RLS on, no policies (no browser access), same posture as
-- nsc_gift_codes.

create table if not exists class_gift_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,            -- e.g. GM-7Q4K-2M8P
  note text not null default '',        -- who it was made for, for the admin list
  created_by uuid references auth.users(id) on delete set null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table class_gift_codes enable row level security;
