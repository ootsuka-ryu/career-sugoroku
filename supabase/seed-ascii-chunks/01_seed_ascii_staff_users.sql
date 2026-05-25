insert into public.staff_users (id, email, name, role, line_user_id)
values
  ('00000000-0000-4000-8000-000000000001', 'otsuka@example.com', 'Otsuka', 'admin', 'UstaffOtsukaDemo'),
  ('00000000-0000-4000-8000-000000000002', 'nakano@example.com', 'Nakano', 'staff', 'UstaffNakanoDemo')
on conflict (id) do update
set
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  line_user_id = excluded.line_user_id,
  is_active = true;