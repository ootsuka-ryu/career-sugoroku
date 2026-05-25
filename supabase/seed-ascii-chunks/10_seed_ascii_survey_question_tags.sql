insert into public.survey_question_tags (question_id, tag_id, when_answer_matches_jsonb)
values
  ('51000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '{"equals":"5"}'),
  ('51000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', '{"contains":"Store visit"}')
on conflict do nothing;