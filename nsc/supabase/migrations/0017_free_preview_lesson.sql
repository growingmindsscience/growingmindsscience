-- One lesson per class can be watched free, before buying, as a sample.
-- No RLS policy is added: lessons stay unreadable through the anon and
-- authenticated Supabase API. The public preview page and its playback
-- route read only the row flagged here, with the service client, and only
-- while it is published.
-- Numbered 0017 because 0016 is taken on an unmerged branch (Thinkific buyers).
alter table public.class_lessons
  add column if not exists is_free_preview boolean not null default false;

-- At most one free lesson per class, so a stray update cannot open a second.
create unique index if not exists class_lessons_one_free_preview
  on public.class_lessons (course_slug) where is_free_preview;

update public.class_lessons
  set is_free_preview = true
  where course_slug = 'infant' and slug = 'serve-and-return';
