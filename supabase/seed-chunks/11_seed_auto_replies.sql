insert into public.auto_replies (id, trigger_keyword, match_type, reply_payload_jsonb, is_active, created_by)
values
  ('60000000-0000-4000-8000-000000000001', '隕句ｭｦ', 'contains', '{"type":"text","text":"蠎苓・隕句ｭｦ縺ｫ縺碑・蜻ｳ繧偵♀謖√■縺・◆縺縺阪≠繧翫′縺ｨ縺・＃縺悶＞縺ｾ縺吶よ球蠖楢・°繧牙呵｣懈律繧偵＃騾｣邨｡縺励∪縺吶・}', true, '00000000-0000-4000-8000-000000000001')
on conflict (id) do update
set trigger_keyword = excluded.trigger_keyword, reply_payload_jsonb = excluded.reply_payload_jsonb, is_active = excluded.is_active;