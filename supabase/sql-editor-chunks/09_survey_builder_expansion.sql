alter type public.survey_question_type add value if not exists 'heading';
alter type public.survey_question_type add value if not exists 'select';
alter type public.survey_question_type add value if not exists 'file_upload';

create table if not exists public.survey_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.surveys
  add column if not exists admin_title text,
  add column if not exists public_title text,
  add column if not exists folder_id uuid references public.survey_folders(id) on delete set null,
  add column if not exists one_response_per_student boolean not null default false,
  add column if not exists redirect_url text,
  add column if not exists thank_you_message text not null default '回答を送信しました。ありがとうございました。',
  add column if not exists custom_css text,
  add column if not exists is_visible boolean not null default true,
  add column if not exists settings_jsonb jsonb not null default '{}'::jsonb;

update public.surveys
  set admin_title = coalesce(admin_title, title),
      public_title = coalesce(public_title, title)
  where admin_title is null or public_title is null;

create table if not exists public.survey_sections (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  "order" integer not null default 0,
  title text not null,
  description text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.survey_questions
  add column if not exists section_id uuid references public.survey_sections(id) on delete set null,
  add column if not exists description text,
  add column if not exists placeholder text,
  add column if not exists validation_type text not null default 'none'
    check (validation_type in ('none', 'email', 'phone')),
  add column if not exists is_visible boolean not null default true,
  add column if not exists branch_rules_jsonb jsonb not null default '[]'::jsonb,
  add column if not exists option_tag_rules_jsonb jsonb not null default '{}'::jsonb,
  add column if not exists settings_jsonb jsonb not null default '{}'::jsonb;

create index if not exists survey_folders_name_idx on public.survey_folders(name);
create index if not exists surveys_folder_id_idx on public.surveys(folder_id);
create index if not exists survey_sections_survey_id_order_idx on public.survey_sections(survey_id, "order");
create index if not exists survey_questions_section_id_order_idx on public.survey_questions(section_id, "order");

alter table public.survey_folders enable row level security;
alter table public.survey_sections enable row level security;

drop policy if exists "staff can read survey folders" on public.survey_folders;
create policy "staff can read survey folders" on public.survey_folders
for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "folder owners and admins manage folders" on public.survey_folders;
create policy "folder owners and admins manage folders" on public.survey_folders
for all to authenticated using (app.is_admin() or created_by = auth.uid())
with check (app.is_admin() or created_by = auth.uid());

drop policy if exists "staff can read survey sections" on public.survey_sections;
create policy "staff can read survey sections" on public.survey_sections
for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "survey owners and admins manage sections" on public.survey_sections;
create policy "survey owners and admins manage sections" on public.survey_sections
for all to authenticated using (
  app.is_admin() or exists (
    select 1 from public.surveys
    where surveys.id = survey_id and surveys.created_by = auth.uid()
  )
) with check (
  app.is_admin() or exists (
    select 1 from public.surveys
    where surveys.id = survey_id and surveys.created_by = auth.uid()
  )
);
