-- Preschool Years (3 to 5): allow the course, then record its 15-lesson outline
-- as hidden drafts. No lesson is published and no sale is enabled here.
alter table public.class_lessons
  drop constraint class_lessons_course_slug_check,
  drop constraint class_lessons_module_number_check;

alter table public.class_lessons
  add constraint class_lessons_course_slug_check
    check (course_slug in ('toddlerhood', 'infant', 'preschool')),
  add constraint class_lessons_module_number_check
    check ((course_slug = 'toddlerhood' and module_number between 1 and 5)
        or (course_slug = 'infant' and module_number between 1 and 4)
        or (course_slug = 'preschool' and module_number between 1 and 4));

alter table public.class_orders
  drop constraint class_orders_course_slug_check;

alter table public.class_orders
  add constraint class_orders_course_slug_check
    check (course_slug in ('toddlerhood', 'infant', 'preschool'));

insert into public.class_lessons (course_slug, module_number, position, slug, title, status)
values
  ('preschool', 1, 1, 'the-preschool-brain', 'The Preschool Brain', 'draft'),
  ('preschool', 1, 2, 'how-self-regulation-grows', 'How Self-Regulation Grows', 'draft'),
  ('preschool', 1, 3, 'minds-and-feelings', 'Minds and Feelings', 'draft'),
  ('preschool', 1, 4, 'behavior-at-3-4-and-5', 'Behavior at 3, 4, and 5', 'draft'),
  ('preschool', 2, 1, 'pretend-play', 'Pretend Play', 'draft'),
  ('preschool', 2, 2, 'rough-and-tumble-and-risky-play', 'Rough-and-Tumble and Risky Play', 'draft'),
  ('preschool', 2, 3, 'free-play-guided-play-and-teaching', 'Free Play, Guided Play, and Teaching', 'draft'),
  ('preschool', 2, 4, 'screens-at-3-to-5', 'Screens at 3 to 5', 'draft'),
  ('preschool', 3, 1, 'from-playing-beside-to-playing-together', 'From Playing Beside to Playing Together', 'draft'),
  ('preschool', 3, 2, 'sharing-fairness-and-helping', 'Sharing, Fairness, and Helping', 'draft'),
  ('preschool', 3, 3, 'conflict-exclusion-and-big-feelings-with-others', 'Conflict, Exclusion, and Big Feelings With Others', 'draft'),
  ('preschool', 4, 1, 'talk-that-builds-thinking', 'Talk That Builds Thinking', 'draft'),
  ('preschool', 4, 2, 'early-literacy-without-worksheets', 'Early Literacy Without Worksheets', 'draft'),
  ('preschool', 4, 3, 'early-math-the-counting-ladder', 'Early Math: The Counting Ladder', 'draft'),
  ('preschool', 4, 4, 'what-readiness-really-means-and-the-year-ahead', 'What Readiness Really Means, and the Year Ahead', 'draft')
on conflict (course_slug, slug) do nothing;
