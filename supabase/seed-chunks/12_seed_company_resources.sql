insert into public.company_resources (id, title, body_markdown, kind, is_ai_context, created_by)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '謗｡逕ｨ譁ｹ驥昴し繝ｳ繝励Ν',
    '# 謗｡逕ｨ譁ｹ驥拿n\n蟄ｦ逕溘・蟶梧悍蜍､蜍吝慍縲∝ｮ溽ｿ呈凾譛溘∽ｸ榊ｮ臥せ繧堤｢ｺ隱阪＠縲∝ｺ苓・隕句ｭｦ縺ｾ縺溘・闍･謇玖脈蜑､蟶ｫ髱｢隲・↓縺､縺ｪ縺偵ｋ縲ょｼｷ蠑輔↑蜍ｧ隱倥〒縺ｯ縺ｪ縺上∝ｭｦ讌ｭ莠亥ｮ壹↓驟肴・縺励◆謠先｡医ｒ蜆ｪ蜈医☆繧九・,
    'approach_policy',
    true,
    '00000000-0000-4000-8000-000000000001'
  )
on conflict (id) do update
set body_markdown = excluded.body_markdown, is_ai_context = excluded.is_ai_context;