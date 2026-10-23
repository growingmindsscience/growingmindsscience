-- One order row for the all-classes bundle; its grants cover all three classes.
alter table public.class_orders
  drop constraint class_orders_course_slug_check;

alter table public.class_orders
  add constraint class_orders_course_slug_check
    check (course_slug in ('toddlerhood', 'infant', 'preschool', 'bundle'));
