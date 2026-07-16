-- Activity Library PR1 + the shared admin review queue (portfolio plan 2.1,
-- 5.1). The queue is generic over content types so claims, tree nodes,
-- guidance blocks, and prompt cards reuse it later — build once, reuse six
-- times.

-- ── Shared review queue ────────────────────────────────────────────────────
-- Service-role only (RLS on, no policies): admin routes verify the signed-in
-- user against the ADMIN_EMAILS allowlist server-side, then use the service
-- client — the same posture as nsc_gift_codes.

create table if not exists review_items (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in
    ('activity', 'claim', 'navigator_node', 'guidance_block', 'prompt_card')),
  batch_id text not null default '',
  payload jsonb not null,
  grader_report jsonb, -- mechanical grader output at enqueue time
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  published_id uuid, -- row created on approval (e.g. activities.id)
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text -- admin email
);

alter table review_items enable row level security;

create index if not exists review_items_status
  on review_items (status, content_type, created_at);

-- ── Activities ─────────────────────────────────────────────────────────────
-- Public content: anyone can read published rows (they are SEO surfaces);
-- writes are service-role only, through the review queue.

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  months_min int not null check (months_min >= 0 and months_min <= 60),
  months_max int not null check (months_max > months_min and months_max <= 60),
  themes text[] not null default '{}',
  domains text[] not null,
  intention text not null,      -- the one-line developmental "why"
  mechanism_tags text[] not null, -- controlled vocabulary, grader-checked
  materials jsonb not null,     -- [{item, household_common, note?}]
  steps jsonb not null,         -- ordered string array
  adapt_down text not null,
  adapt_up text not null,
  evidence_note text not null,
  duration_min int not null check (duration_min between 1 and 60),
  mess_level int not null check (mess_level between 1 and 3),
  setting text[] not null,      -- indoor | outdoor | on_the_go
  safety_notes text not null default '',
  locale text not null default 'en',
  is_free boolean not null default false,
  status text not null default 'published'
    check (status in ('draft', 'published', 'retired')),
  version int not null default 1,
  review_item_id uuid references review_items (id),
  published_at timestamptz not null default now()
);

alter table activities enable row level security;

create policy "activities: public read of published"
  on activities for select
  using (status = 'published');

create index if not exists activities_months
  on activities (months_min, months_max) where status = 'published';

-- ── Completions ────────────────────────────────────────────────────────────

create table if not exists activity_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid not null references nsc_children (id) on delete cascade,
  activity_id uuid not null references activities (id) on delete cascade,
  completed_on date not null default current_date,
  rating int check (rating between 1 and 3),
  created_at timestamptz not null default now(),
  unique (child_id, activity_id, completed_on)
);

alter table activity_completions enable row level security;

create policy "completions: read own"
  on activity_completions for select
  using (auth.uid() = user_id);

create policy "completions: insert own"
  on activity_completions for insert
  with check (auth.uid() = user_id);

create policy "completions: delete own"
  on activity_completions for delete
  using (auth.uid() = user_id);
