insert into public.messages (id, student_id, direction, type, payload, sent_at, staff_id)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'in', 'text', '{"text":"I am interested in a store visit"}', now() - interval '1 day', null),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'out', 'text', '{"text":"Thank you. We will check candidate dates."}', now() - interval '20 hours', '00000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'out', 'text', '{"text":"How was the material we sent?"}', now() - interval '3 days', '00000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;