insert into public.surveys (id, title, description, is_active, require_signin, created_by)
values
  ('50000000-0000-4000-8000-000000000001', 'One minute survey', 'Initial survey sent after LINE follow.', true, false, '00000000-0000-4000-8000-000000000001')
on conflict (id) do update
set title = excluded.title, description = excluded.description, is_active = excluded.is_active;