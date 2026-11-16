-- Two bundles are sold side by side: 'bundle' is the three age classes ($119)
-- and 'all-four' adds Family systems and stress ($159). One order row each.
alter table public.class_orders
  drop constraint class_orders_course_slug_check;

alter table public.class_orders
  add constraint class_orders_course_slug_check
    check (course_slug in ('toddlerhood', 'infant', 'preschool', 'family', 'bundle', 'all-four'));
