-- Keep infant checkout orders separate from the existing toddler class orders.
alter table public.class_orders
  drop constraint class_orders_course_slug_check;

alter table public.class_orders
  add constraint class_orders_course_slug_check
    check (course_slug in ('toddlerhood', 'infant'));
