insert into public.survey_questions (id, survey_id, "order", type, label, options_jsonb, is_required)
values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 1, 'radio', '迴ｾ蝨ｨ縺ｮ蠢玲悍蠎ｦ繧呈蕗縺医※縺上□縺輔＞', '["1","2","3","4","5"]', true),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 2, 'checkbox', '闊亥袖縺ｮ縺ゅｋ繝・・繝槭ｒ驕ｸ繧薙〒縺上□縺輔＞', '["蠎苓・隕句ｭｦ","遐比ｿｮ蛻ｶ蠎ｦ","邨ｦ荳弱・遖丞茜蜴夂函","蝨ｰ蝓溷現逋・]', false),
  ('51000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', 3, 'text', '逶ｸ隲・＠縺溘＞縺薙→縺後≠繧後・蜈･蜉帙＠縺ｦ縺上□縺輔＞', '[]', false)
on conflict (id) do update
set label = excluded.label, options_jsonb = excluded.options_jsonb, is_required = excluded.is_required;