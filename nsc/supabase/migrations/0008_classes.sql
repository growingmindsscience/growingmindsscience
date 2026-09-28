-- On-site classes. Apply after 0005_spine_entitlements.sql.
-- Lessons are never readable through the public/anon Supabase API. The app
-- reads them with a service client only after it verifies session + ownership.
create table if not exists class_lessons (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null check (course_slug = 'toddlerhood'),
  module_number int not null check (module_number between 1 and 5),
  position int not null check (position > 0),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '',
  transcript text not null default '',
  mux_upload_id text,
  mux_asset_id text,
  mux_playback_id text,
  duration_seconds int,
  captions_ready boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_slug, slug),
  unique (course_slug, module_number, position),
  constraint published_lesson_ready check (
    status <> 'published' or
    (mux_playback_id is not null and captions_ready and char_length(trim(transcript)) > 0)
  )
);
alter table class_lessons enable row level security;
-- No RLS policies: only the server's service role can access lesson content.

create table if not exists class_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references class_lessons(id) on delete cascade,
  position_seconds int not null default 0 check (position_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table class_progress enable row level security;
create policy "class_progress: read own" on class_progress for select
  using (auth.uid() = user_id);
create policy "class_progress: insert own" on class_progress for insert
  with check (auth.uid() = user_id);
create policy "class_progress: update own" on class_progress for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists class_orders (
  stripe_checkout_session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_slug text not null check (course_slug = 'toddlerhood'),
  stripe_payment_intent_id text,
  amount_cents int,
  status text not null check (status in ('paid', 'refunded', 'disputed')),
  purchased_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists class_orders_payment_intent
  on class_orders (stripe_payment_intent_id);
alter table class_orders enable row level security;
create policy "class_orders: read own" on class_orders for select
  using (auth.uid() = user_id);
-- Webhook/import writes use the service role. No customer write policy.
