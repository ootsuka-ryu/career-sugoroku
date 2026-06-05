alter table public.students
  add column if not exists line_picture_url text;

comment on column public.students.line_picture_url is
  'LINE profile picture URL fetched from the Messaging API profile endpoint.';
