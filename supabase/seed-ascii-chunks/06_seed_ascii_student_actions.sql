insert into public.student_actions (id, student_id, staff_id, action_type, title, body, executed_at)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'event', 'Spring seminar attended', 'Interested in community-based pharmacy work.', now() - interval '14 days'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'line', 'Sent company material', 'Sent company overview and short survey.', now() - interval '3 days'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'zoom', 'Zoom interview', 'Discussed work location and training system.', now() - interval '2 days')
on conflict (id) do nothing;