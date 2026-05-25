insert into public.staff_users (id, email, name, role, line_user_id)
values
  ('00000000-0000-4000-8000-000000000001', 'otsuka@example.com', '大塚', 'admin', 'UstaffOtsukaDemo'),
  ('00000000-0000-4000-8000-000000000002', 'nakano@example.com', '中野', 'staff', 'UstaffNakanoDemo')
on conflict (id) do update
set
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  line_user_id = excluded.line_user_id,
  is_active = true;

insert into public.tags (id, name, color, created_by)
values
  ('10000000-0000-4000-8000-000000000001', '志望度高', '#0f766e', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', '実習P2-P3', '#2563eb', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000003', '返信待ち', '#dc2626', '00000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000004', 'イベント参加済', '#7c3aed', '00000000-0000-4000-8000-000000000001')
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
    '佐藤 花',
    '佐藤 花',
    'サトウ ハナ',
    '東京薬科大学',
    '5年',
    2027,
    'P2_3',
    '090-1111-2222',
    'hana.sato@example.jp',
    '薬局薬剤師',
    '東京・神奈川',
    5,
    '合同説明会',
    '2026-04-12',
    now() - interval '1 day',
    now() - interval '4 days',
    '今週中に店舗見学の日程候補を3つ送る',
    '5/20 にLINEで見学候補日を確認',
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'UstudentDemo002',
    '鈴木 亮',
    '鈴木 亮',
    'スズキ リョウ',
    '明治薬科大学',
    '4年',
    2028,
    'undecided',
    '090-3333-4444',
    'ryo.suzuki@example.jp',
    '病院薬剤師も検討',
    '埼玉',
    3,
    'LINE友だち追加',
    '2026-05-01',
    now() - interval '8 days',
    now() - interval '3 days',
    '返信がないため軽いリマインドを送る',
    null,
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'UstudentDemo003',
    '田中 美咲',
    '田中 美咲',
    'タナカ ミサキ',
    '北里大学',
    '6年',
    2026,
    'P3_4',
    '090-5555-6666',
    'misaki.tanaka@example.jp',
    'ドラッグストア',
    '千葉',
    4,
    '学内セミナー',
    '2026-03-20',
    now() - interval '2 days',
    now() - interval '2 days',
    '面接前に不安点をヒアリングする',
    '次回Zoom面談を設定',
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
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'event', '春セミナー参加', '地域密着型薬局への関心が強い。', now() - interval '14 days'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'line', '資料送付', '会社説明資料と1分アンケートを送付。', now() - interval '3 days'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'zoom', 'Zoom面談', '勤務地と研修制度について相談。', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.messages (id, student_id, direction, type, payload, sent_at, staff_id)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'in', 'text', '{"text":"店舗見学に興味があります"}', now() - interval '1 day', null),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'out', 'text', '{"text":"ありがとうございます。候補日を確認してお送りします。"}', now() - interval '20 hours', '00000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'out', 'text', '{"text":"先日お送りした資料はいかがでしたか？"}', now() - interval '3 days', '00000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into public.surveys (id, title, description, is_active, require_signin, created_by)
values
  ('50000000-0000-4000-8000-000000000001', '1分間アンケート', '友だち追加直後に配信する初回ヒアリングです。', true, false, '00000000-0000-4000-8000-000000000001')
on conflict (id) do update
set title = excluded.title, description = excluded.description, is_active = excluded.is_active;

insert into public.survey_questions (id, survey_id, "order", type, label, options_jsonb, is_required)
values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 1, 'radio', '現在の志望度を教えてください', '["1","2","3","4","5"]', true),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 2, 'checkbox', '興味のあるテーマを選んでください', '["店舗見学","研修制度","給与・福利厚生","地域医療"]', false),
  ('51000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', 3, 'text', '相談したいことがあれば入力してください', '[]', false)
on conflict (id) do update
set label = excluded.label, options_jsonb = excluded.options_jsonb, is_required = excluded.is_required;

insert into public.survey_question_tags (question_id, tag_id, when_answer_matches_jsonb)
values
  ('51000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '{"equals":"5"}'),
  ('51000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', '{"contains":"店舗見学"}')
on conflict do nothing;

insert into public.auto_replies (id, trigger_keyword, match_type, reply_payload_jsonb, is_active, created_by)
values
  ('60000000-0000-4000-8000-000000000001', '見学', 'contains', '{"type":"text","text":"店舗見学にご興味をお持ちいただきありがとうございます。担当者から候補日をご連絡します。"}', true, '00000000-0000-4000-8000-000000000001')
on conflict (id) do update
set trigger_keyword = excluded.trigger_keyword, reply_payload_jsonb = excluded.reply_payload_jsonb, is_active = excluded.is_active;

insert into public.company_resources (id, title, body_markdown, kind, is_ai_context, created_by)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '採用方針サンプル',
    '# 採用方針\n\n学生の希望勤務地、実習時期、不安点を確認し、店舗見学または若手薬剤師面談につなげる。強引な勧誘ではなく、学業予定に配慮した提案を優先する。',
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
