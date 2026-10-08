-- Verified Thinkific orders for the toddler class, recorded by
-- scripts/import-thinkific-buyers.mjs. A buyer with a confirmed account is
-- granted at import; anyone else is granted the first time they sign in with
-- that confirmed email (lib/legacy-class-claims.ts), and the order is marked
-- with the account that claimed it so it never unlocks a second account.
-- Holds customer emails: service role only, so RLS is on with no policies.
create table if not exists public.class_legacy_purchases (
  source_ref text primary key check (source_ref ~ '^thinkific:\S'),
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  course_slug text not null default 'toddlerhood' check (course_slug = 'toddlerhood'),
  imported_at timestamptz not null default now(),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz
);
create index if not exists class_legacy_purchases_email
  on public.class_legacy_purchases (email);
alter table public.class_legacy_purchases enable row level security;
-- No RLS policies: only the server's service role can read or write orders.
