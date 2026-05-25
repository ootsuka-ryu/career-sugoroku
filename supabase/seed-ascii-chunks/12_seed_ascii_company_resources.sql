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