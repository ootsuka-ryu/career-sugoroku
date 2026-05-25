insert into public.survey_questions (id, survey_id, "order", type, label, options_jsonb, is_required)
values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 1, 'radio', 'Current motivation level', '["1","2","3","4","5"]', true),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 2, 'checkbox', 'Interested topics', '["Store visit","Training","Benefits","Community medicine"]', false),
  ('51000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', 3, 'text', 'Questions or concerns', '[]', false)
on conflict (id) do update
set label = excluded.label, options_jsonb = excluded.options_jsonb, is_required = excluded.is_required;