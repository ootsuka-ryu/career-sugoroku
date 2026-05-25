drop table if exists public.line_usage_events cascade;
drop table if exists public.csv_import_rows cascade;
drop table if exists public.csv_imports cascade;
drop table if exists public.notification_preferences cascade;
drop table if exists public.notifications cascade;
drop table if exists public.company_resources cascade;
drop table if exists public.recordings cascade;
drop table if exists public.rich_menus cascade;
drop table if exists public.auto_replies cascade;
drop table if exists public.survey_responses cascade;
drop table if exists public.survey_question_tags cascade;
drop table if exists public.survey_questions cascade;
drop table if exists public.surveys cascade;

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  is_active boolean not null default false,
  require_signin boolean not null default false,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  "order" integer not null default 0,
  type public.survey_question_type not null,
  label text not null,
  options_jsonb jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  attached_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.survey_question_tags (
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  when_answer_matches_jsonb jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (question_id, tag_id)
);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  submitted_at timestamptz not null default now(),
  raw_answers_jsonb jsonb not null default '{}'::jsonb,
  respondent_name text,
  respondent_line_user_id text,
  needs_manual_merge boolean not null default false
);

create table public.auto_replies (
  id uuid primary key default gen_random_uuid(),
  trigger_keyword text not null,
  match_type public.match_type not null default 'contains',
  reply_payload_jsonb jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rich_menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  layout_jsonb jsonb not null default '{}'::jsonb,
  image_url text,
  is_default boolean not null default false,
  target_tag_ids jsonb not null default '[]'::jsonb,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  source public.recording_source not null,
  audio_url text not null,
  duration_sec integer,
  transcript text,
  ai_summary text,
  ai_next_action text,
  ai_tag_candidates jsonb not null default '[]'::jsonb,
  recorded_at timestamptz not null default now(),
  uploaded_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_markdown text not null,
  kind public.resource_kind not null default 'other',
  is_ai_context boolean not null default false,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_users(id) on delete cascade,
  type text not null,
  payload_jsonb jsonb not null default '{}'::jsonb,
  sent_via public.notification_channel not null default 'both',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.notification_preferences (
  staff_id uuid not null references public.staff_users(id) on delete cascade,
  type text not null,
  via_line boolean not null default true,
  via_email boolean not null default true,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (staff_id, type)
);

create table public.csv_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  column_mapping jsonb not null default '{}'::jsonb,
  status public.import_status not null default 'pending',
  total_rows integer not null default 0,
  success_rows integer not null default 0,
  failed_rows integer not null default 0,
  skipped_rows integer not null default 0,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.csv_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.csv_imports(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null default '{}'::jsonb,
  status public.import_row_status not null,
  student_id uuid references public.students(id) on delete set null,
  error_message text,
  duplicate_candidate_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.line_usage_events (
  id uuid primary key default gen_random_uuid(),
  event_month date not null,
  message_count integer not null default 0,
  source text not null,
  broadcast_id uuid references public.broadcasts(id) on delete set null,
  created_at timestamptz not null default now()
);
