alter table public.students
  add column if not exists notes text;

comment on column public.students.notes is 'Free-form internal notes shown on the student profile. Recording AI summaries are appended here.';
