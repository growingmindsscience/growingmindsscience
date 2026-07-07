-- ============================================================
-- NSC (Number Path) core schema — spec §8
-- ⚠ DDL GATE: PROPOSED ONLY. Do not apply without Matthew's
-- explicit go. Target project also unresolved (org free-project
-- limit reached; see PR description).
-- ============================================================

-- children: parent-owned, minimal PII by design.
-- Privacy posture (COPPA-adjacent): nickname + birth month only; no photos,
-- no video, no free-text about the child; deletion cascades.
create table nsc_children (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) <= 30),
  birth_month date not null, -- always day=1; month granularity only
  home_languages text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table nsc_assessments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references nsc_children(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  artifact_version text not null, -- pins assessment.copy version
  status text not null check (status in ('in_progress','paused','complete','abandoned')),
  prescreen jsonb not null default '{}',
  placement text check (placement in ('L0','L1','L2','L3','L4','CP','CPX')),
  near_cp boolean not null default false,
  confidence text check (confidence in ('high','medium','low')),
  trial_count int not null default 0,
  -- serialized titration FSM state for pause/resume (48h window enforced app-side)
  engine_state jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table nsc_trials (
  id bigint generated always as identity primary key,
  assessment_id uuid not null references nsc_assessments(id) on delete cascade,
  seq int not null,
  requested_n int not null check (requested_n between 1 and 6),
  outcome text not null check (outcome in ('correct','incorrect','skip')),
  post_check boolean not null default false, -- outcome recorded after check-question
  is_bonus boolean not null default false,   -- end-on-success "one last one for bear" trial; never affects placement
  created_at timestamptz not null default now(),
  unique (assessment_id, seq)
);

create table nsc_game_plays (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references nsc_children(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  played_at date not null default current_date,
  reaction text check (reaction in ('loved','fine','flopped')) -- v1 analytics only
);

-- FLAGGED ADDITION (spec §8 said "reuse existing GMS paywall tables" — none
-- exist; GMS billing is Stripe-by-email with no DB). Option B pricing (one-time
-- SKU) needs a durable entitlement record. Written by the Stripe webhook via
-- service role only.
create table nsc_purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null check (product in ('numberpath_full','numberpath_printables')),
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_cents int,
  purchased_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS: owner_id = auth.uid() on every table; trials scope through
-- their assessment's ownership. No cross-user reads ever.
-- ------------------------------------------------------------
alter table nsc_children enable row level security;
alter table nsc_assessments enable row level security;
alter table nsc_trials enable row level security;
alter table nsc_game_plays enable row level security;
alter table nsc_purchases enable row level security;

create policy nsc_children_owner on nsc_children
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy nsc_assessments_owner on nsc_assessments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy nsc_trials_owner on nsc_trials
  for all using (
    exists (
      select 1 from nsc_assessments a
      where a.id = assessment_id and a.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from nsc_assessments a
      where a.id = assessment_id and a.owner_id = auth.uid()
    )
  );

create policy nsc_game_plays_owner on nsc_game_plays
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- purchases: parents read their own; writes only via service role (webhook)
create policy nsc_purchases_read_own on nsc_purchases
  for select using (owner_id = auth.uid());

-- ------------------------------------------------------------
create index nsc_children_owner_idx on nsc_children (owner_id);
create index nsc_assessments_child_idx on nsc_assessments (child_id);
create index nsc_assessments_owner_idx on nsc_assessments (owner_id);
create index nsc_trials_assessment_idx on nsc_trials (assessment_id);
create index nsc_game_plays_owner_played_idx on nsc_game_plays (owner_id, played_at);
create index nsc_game_plays_child_idx on nsc_game_plays (child_id);
create index nsc_purchases_owner_idx on nsc_purchases (owner_id);
