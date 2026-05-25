insert into public.surveys (id, title, description, is_active, require_signin, created_by)
values
  ('50000000-0000-4000-8000-000000000001', '1蛻・俣繧｢繝ｳ繧ｱ繝ｼ繝・, '蜿九□縺｡霑ｽ蜉逶ｴ蠕後↓驟堺ｿ｡縺吶ｋ蛻晏屓繝偵い繝ｪ繝ｳ繧ｰ縺ｧ縺吶・, true, false, '00000000-0000-4000-8000-000000000001')
on conflict (id) do update
set title = excluded.title, description = excluded.description, is_active = excluded.is_active;