-- Infant lessons can be prepared privately while the course is still in production.
-- No infant purchase scope or customer-facing course is enabled by this migration.
alter table public.class_lessons
  drop constraint class_lessons_course_slug_check,
  drop constraint class_lessons_module_number_check;

alter table public.class_lessons
  add constraint class_lessons_course_slug_check
    check (course_slug in ('toddlerhood', 'infant')),
  add constraint class_lessons_module_number_check
    check ((course_slug = 'toddlerhood' and module_number between 1 and 5)
        or (course_slug = 'infant' and module_number between 1 and 6));
