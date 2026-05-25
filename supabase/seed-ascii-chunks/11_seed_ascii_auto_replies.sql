insert into public.auto_replies (id, trigger_keyword, match_type, reply_payload_jsonb, is_active, created_by)
values
  ('60000000-0000-4000-8000-000000000001', 'visit', 'contains', '{"type":"text","text":"Thank you for your interest in a store visit. A staff member will contact you with candidate dates."}', true, '00000000-0000-4000-8000-000000000001')
on conflict (id) do update
set trigger_keyword = excluded.trigger_keyword, reply_payload_jsonb = excluded.reply_payload_jsonb, is_active = excluded.is_active;