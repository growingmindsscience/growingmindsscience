-- Module 2 videos were provided on 2026-09-28. Keep these lessons private
-- until captions and written content have been reviewed.
insert into public.class_lessons (course_slug, module_number, position, slug, title, status)
values
  ('infant', 2, 1, 'the-cue-vocabulary', 'The Cue Vocabulary', 'draft'),
  ('infant', 2, 2, 'temperament', 'Temperament', 'draft'),
  ('infant', 2, 3, 'feeding-as-a-conversation', 'Feeding as a Conversation', 'draft'),
  ('infant', 2, 4, 'sleep-across-the-first-year', 'Sleep Across the First Year', 'draft')
on conflict (course_slug, slug) do nothing;

-- The current infant class outline has four modules.
alter table public.class_lessons
  drop constraint class_lessons_module_number_check;

alter table public.class_lessons
  add constraint class_lessons_module_number_check
    check ((course_slug = 'toddlerhood' and module_number between 1 and 5)
        or (course_slug = 'infant' and module_number between 1 and 4));
