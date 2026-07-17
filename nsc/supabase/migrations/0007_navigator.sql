-- Navigator PR1 (plan 3.3): anonymous sessions + the Part C state directory.

-- Sessions are privacy-by-architecture: domain, age in months, the enumerated
-- answer path, and the terminal reached. No names, no free text, no child
-- rows. Service-role only (RLS on, no policies) — writes happen in a server
-- action. Retention: 12 months, then aggregate and purge (cron to follow).

create table if not exists navigator_sessions (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null default '',
  user_id uuid references auth.users (id) on delete set null,
  domain text not null,
  age_months int not null check (age_months >= 0 and age_months <= 120),
  corrected boolean not null default false,
  path jsonb not null, -- [{node, answer}] labels only, enumerated
  terminal_id text not null,
  tier text not null,
  created_at timestamptz not null default now()
);

alter table navigator_sessions enable row level security;

create index if not exists navigator_sessions_domain
  on navigator_sessions (domain, created_at);

-- Part C directory: public reference data, rendered on action sheets.
-- Seed policy: rows enter ONLY after human verification against the ECTA
-- Center's public directory — never generated. Stale rows (>6 months) get a
-- badge in the UI; quarterly verification is a standing calendar task.

create table if not exists part_c_directory (
  state text primary key, -- two-letter code
  state_name text not null,
  agency_name text not null,
  phone text not null default '',
  url text not null default '',
  notes text not null default '',
  last_verified date not null
);

alter table part_c_directory enable row level security;

create policy "part_c: public read"
  on part_c_directory for select
  using (true);
