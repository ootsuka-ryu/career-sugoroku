insert into public.notification_preferences (staff_id, type, via_line, via_email, is_enabled)
values
  ('00000000-0000-4000-8000-000000000001', 'survey_response', true, true, true),
  ('00000000-0000-4000-8000-000000000001', 'urgent_ai_action', true, true, true),
  ('00000000-0000-4000-8000-000000000002', 'survey_response', true, true, true),
  ('00000000-0000-4000-8000-000000000002', 'chat_reply', true, true, true)
on conflict (staff_id, type) do update
set via_line = excluded.via_line, via_email = excluded.via_email, is_enabled = excluded.is_enabled;