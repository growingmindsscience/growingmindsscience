-- Module 4 videos were provided on 2026-10-03. Keep these lessons private
-- until captions and written content have been reviewed.
insert into public.class_lessons (course_slug, module_number, position, slug, title, status)
values
  ('infant', 4, 1, 'language-before-words', 'Language Before Words', 'draft'),
  ('infant', 4, 2, 'on-the-move', 'On the Move', 'draft'),
  ('infant', 4, 3, 'play-and-the-hidden-toy', 'Play and the Hidden Toy', 'draft'),
  ('infant', 4, 4, 'screens-and-the-year-ahead', 'Screens, and the Year Ahead', 'draft')
on conflict (course_slug, slug) do nothing;
