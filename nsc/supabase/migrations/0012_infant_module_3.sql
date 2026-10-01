-- Module 3 videos were provided on 2026-10-01. Keep these lessons private
-- until captions and written content have been reviewed.
insert into public.class_lessons (course_slug, module_number, position, slug, title, status)
values
  ('infant', 3, 1, 'what-secure-attachment-is-and-isn-t', 'What Secure Attachment Is, and Isn''t', 'draft'),
  ('infant', 3, 2, 'many-hands', 'Many Hands', 'draft'),
  ('infant', 3, 3, 'separation-and-stranger-wariness', 'Separation and Stranger Wariness', 'draft')
on conflict (course_slug, slug) do nothing;
