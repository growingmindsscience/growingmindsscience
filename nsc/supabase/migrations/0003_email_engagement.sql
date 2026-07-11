-- Email engagement: per-account preferences + an idempotency log for the
-- daily cron. Both default-on with a one-click unsubscribe; the cron sends
-- nothing for an owner whose prefs row says no.

create table nsc_email_prefs (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  weekly_plan_emails boolean not null default true,
  checkin_emails boolean not null default true,
  unsub_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table nsc_email_prefs enable row level security;

create policy "own prefs read" on nsc_email_prefs
  for select using (auth.uid() = owner_id);
create policy "own prefs insert" on nsc_email_prefs
  for insert with check (auth.uid() = owner_id);
create policy "own prefs update" on nsc_email_prefs
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- One row per (owner, child, kind, period) — the unique index is what makes
-- the cron idempotent across retries and overlapping runs. Service-role only
-- (RLS enabled, no policies).
create table nsc_email_log (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references nsc_children(id) on delete cascade,
  kind text not null check (kind in ('weekly_plan', 'checkin_ready')),
  period_key text not null,
  sent_at timestamptz not null default now()
);

-- Idempotency. Two indexes because unique() treats NULLs as distinct and
-- the weekly digest is logged per-owner (child_id null).
create unique index nsc_email_log_child_key
  on nsc_email_log (owner_id, child_id, kind, period_key)
  where child_id is not null;
create unique index nsc_email_log_owner_key
  on nsc_email_log (owner_id, kind, period_key)
  where child_id is null;

alter table nsc_email_log enable row level security;
