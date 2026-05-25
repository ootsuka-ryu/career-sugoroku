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

insert into public.tags (id, name, color, created_by)
values
  ('10000000-0000-4000-8000-000000000001', 'High Motivation', '#0f766e', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', 'Practical P2-P3', '#2563eb', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000003', 'Waiting Reply', '#dc2626', '00000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000004', 'Event Attended', '#7c3aed', '00000000-0000-4000-8000-000000000001')
on conflict (id) do update
set name = excluded.name, color = excluded.color;

insert into public.students (
  id,
  line_user_id,
  display_name,
  real_name,
  kana,
  university,
  grade,
  graduation_year,
  practical_period,
  phone,
  email,
  desired_job_type,
  desired_area,
  motivation_level,
  first_contact_method,
  first_contact_date,
  last_inbound_at,
  last_outbound_at,
  ai_next_action,
  manual_next_action,
  status
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'UstudentDemo001',
    'Hana Sato',
    'Hana Sato',
    'SATO HANA',
    'Tokyo Pharmacy University',
    '5',
    2027,
    'P2_3',
    '090-1111-2222',
    'hana.sato@example.jp',
    'Community pharmacy',
    'Tokyo / Kanagawa',
    5,
    'Career fair',
    '2026-04-12',
    now() - interval '1 day',
    now() - interval '4 days',
    'Send three store visit date options this week',
    'Check visit date candidates by LINE on 2026-05-20',
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'UstudentDemo002',
    'Ryo Suzuki',
    'Ryo Suzuki',
    'SUZUKI RYO',
    'Meiji Pharmaceutical University',
    '4',
    2028,
    'undecided',
    '090-3333-4444',
    'ryo.suzuki@example.jp',
    'Hospital pharmacist also considered',
    'Saitama',
    3,
    'LINE follow',
    '2026-05-01',
    now() - interval '8 days',
    now() - interval '3 days',
    'Send a light reminder because there is no reply',
    null,
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'UstudentDemo003',
    'Misaki Tanaka',
    'Misaki Tanaka',
    'TANAKA MISAKI',
    'Kitasato University',
    '6',
    2026,
    'P3_4',
    '090-5555-6666',
    'misaki.tanaka@example.jp',
    'Drugstore pharmacist',
    'Chiba',
    4,
    'Campus seminar',
    '2026-03-20',
    now() - interval '2 days',
    now() - interval '2 days',
    'Ask about concerns before interview',
    'Schedule next Zoom interview',
    'active'
  )
on conflict (id) do update
set
  line_user_id = excluded.line_user_id,
  display_name = excluded.display_name,
  real_name = excluded.real_name,
  kana = excluded.kana,
  university = excluded.university,
  grade = excluded.grade,
  graduation_year = excluded.graduation_year,
  practical_period = excluded.practical_period,
  phone = excluded.phone,
  email = excluded.email,
  desired_job_type = excluded.desired_job_type,
  desired_area = excluded.desired_area,
  motivation_level = excluded.motivation_level,
  first_contact_method = excluded.first_contact_method,
  first_contact_date = excluded.first_contact_date,
  last_inbound_at = excluded.last_inbound_at,
  last_outbound_at = excluded.last_outbound_at,
  ai_next_action = excluded.ai_next_action,
  manual_next_action = excluded.manual_next_action,
  status = excluded.status;

insert into public.student_assignees (student_id, staff_id, assigned_by)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into public.student_tags (student_id, tag_id, created_by)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into public.student_actions (id, student_id, staff_id, action_type, title, body, executed_at)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'event', 'Spring seminar attended', 'Interested in community-based pharmacy work.', now() - interval '14 days'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'line', 'Sent company material', 'Sent company overview and short survey.', now() - interval '3 days'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'zoom', 'Zoom interview', 'Discussed work location and training system.', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.messages (id, student_id, direction, type, payload, sent_at, staff_id)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'in', 'text', '{"text":"I am interested in a store visit"}', now() - interval '1 day', null),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'out', 'text', '{"text":"Thank you. We will check candidate dates."}', now() - interval '20 hours', '00000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'out', 'text', '{"text":"How was the material we sent?"}', now() - interval '3 days', '00000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into public.surveys (id, title, description, is_active, require_signin, created_by)
values
  ('50000000-0000-4000-8000-000000000001', 'One minute survey', 'Initial survey sent after LINE follow.', true, false, '00000000-0000-4000-8000-000000000001')
on conflict (id) do update
set title = excluded.title, description = excluded.description, is_active = excluded.is_active;

insert into public.survey_questions (id, survey_id, "order", type, label, options_jsonb, is_required)
values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 1, 'radio', 'Current motivation level', '["1","2","3","4","5"]', true),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 2, 'checkbox', 'Interested topics', '["Store visit","Training","Benefits","Community medicine"]', false),
  ('51000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', 3, 'text', 'Questions or concerns', '[]', false)
on conflict (id) do update
set label = excluded.label, options_jsonb = excluded.options_jsonb, is_required = excluded.is_required;

insert into public.survey_question_tags (question_id, tag_id, when_answer_matches_jsonb)
values
  ('51000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '{"equals":"5"}'),
  ('51000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', '{"contains":"Store visit"}')
on conflict do nothing;

insert into public.auto_replies (id, trigger_keyword, match_type, reply_payload_jsonb, is_active, created_by)
values
  ('60000000-0000-4000-8000-000000000001', 'visit', 'contains', '{"type":"text","text":"Thank you for your interest in a store visit. A staff member will contact you with candidate dates."}', true, '00000000-0000-4000-8000-000000000001')
on conflict (id) do update
set trigger_keyword = excluded.trigger_keyword, reply_payload_jsonb = excluded.reply_payload_jsonb, is_active = excluded.is_active;

insert into public.company_resources (id, title, body_markdown, kind, is_ai_context, created_by)
values
  (
    '70000000-0000-4000-8000-000000000001',
    'Recruiting policy sample',
    '# Recruiting Policy\n\nConfirm preferred work location, practice period, and concerns. Suggest a store visit or young pharmacist interview. Avoid pushy recruiting and prioritize the student schedule.',
    'approach_policy',
    true,
    '00000000-0000-4000-8000-000000000001'
  )
on conflict (id) do update
set body_markdown = excluded.body_markdown, is_ai_context = excluded.is_ai_context;

insert into public.notification_preferences (staff_id, type, via_line, via_email, is_enabled)
values
  ('00000000-0000-4000-8000-000000000001', 'survey_response', true, true, true),
  ('00000000-0000-4000-8000-000000000001', 'urgent_ai_action', true, true, true),
  ('00000000-0000-4000-8000-000000000002', 'survey_response', true, true, true),
  ('00000000-0000-4000-8000-000000000002', 'chat_reply', true, true, true)
on conflict (staff_id, type) do update
set via_line = excluded.via_line, via_email = excluded.via_email, is_enabled = excluded.is_enabled;

insert into public.line_usage_events (event_month, message_count, source)
select date_trunc('month', now())::date, 3, 'seed'
where not exists (
  select 1
  from public.line_usage_events
  where event_month = date_trunc('month', now())::date
    and source = 'seed'
);
