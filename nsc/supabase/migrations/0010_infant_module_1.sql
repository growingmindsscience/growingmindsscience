-- Module 1 video files were provided on 2026-09-27. These lessons stay draft
-- until their video, captions, and written version have been reviewed.
insert into public.class_lessons (course_slug, module_number, position, slug, title, status)
values
  ('infant', 1, 1, 'born-ready-to-connect', 'Born Ready to Connect', 'draft'),
  ('infant', 1, 2, 'a-brain-built-by-experience', 'A Brain Built by Experience', 'draft'),
  ('infant', 1, 3, 'serve-and-return', 'Serve and Return', 'draft'),
  ('infant', 1, 4, 'states-crying-and-the-borrowed-nervous-system', 'States, Crying, and the Borrowed Nervous System', 'draft'),
  ('infant', 1, 5, 'capable-and-fragile-at-once', 'Capable and Fragile at Once', 'draft')
on conflict (course_slug, slug) do nothing;
