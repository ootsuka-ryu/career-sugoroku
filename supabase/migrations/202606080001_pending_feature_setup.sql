-- Consolidates small production setup changes used by the admin UI.
-- This migration mirrors supabase/sql-editor-chunks/20_pending_feature_setup.sql.

alter table public.students
  add column if not exists motivation_rank text,
  add column if not exists candidate_stage text not null default 'friend_added',
  add column if not exists decline_reason text,
  add column if not exists last_stage_changed_at timestamptz not null default now(),
  add column if not exists photo_url text,
  add column if not exists funnel_entry boolean not null default true,
  add column if not exists funnel_uncontacted boolean not null default true,
  add column if not exists funnel_pool boolean not null default false,
  add column if not exists funnel_next boolean not null default false,
  add column if not exists funnel_is boolean not null default false,
  add column if not exists funnel_pharmacist_interview boolean not null default false,
  add column if not exists funnel_selection boolean not null default false,
  add column if not exists funnel_offer boolean not null default false,
  add column if not exists funnel_offer_accepted boolean not null default false,
  add column if not exists funnel_hired boolean not null default false;

alter table public.notifications
  add column if not exists priority text not null default 'normal';

alter table public.broadcasts
  add column if not exists precheck_jsonb jsonb not null default '{}'::jsonb,
  add column if not exists approval_status text not null default 'draft';

alter table public.rich_menus
  add column if not exists line_rich_menu_id text,
  add column if not exists line_synced_at timestamptz,
  add column if not exists line_sync_status text not null default 'not_synced',
  add column if not exists line_sync_error text;

create table if not exists public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  staff_id uuid references public.staff_users(id) on delete set null,
  title text not null,
  reason text,
  source text not null default 'manual',
  due_date date,
  completed_at timestamptz,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_dismissals (
  task_key text not null,
  staff_id uuid not null references public.staff_users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (task_key, staff_id)
);

create table if not exists public.recruiting_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default '説明会',
  starts_at timestamptz,
  location text,
  description text,
  survey_id uuid references public.surveys(id) on delete set null,
  next_action text,
  signup_message_enabled boolean not null default false,
  signup_message_template text,
  reminder_enabled boolean not null default false,
  reminder_message_template text,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recruiting_events
  add column if not exists signup_message_enabled boolean not null default false,
  add column if not exists signup_message_template text,
  add column if not exists reminder_enabled boolean not null default false,
  add column if not exists reminder_message_template text;

create table if not exists public.event_participants (
  event_id uuid not null references public.recruiting_events(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default '申込',
  source text not null default 'manual',
  memo text,
  created_at timestamptz not null default now(),
  primary key (event_id, student_id)
);

create table if not exists public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.recruiting_events(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  send_at timestamptz not null,
  message text not null,
  status text not null default 'scheduled',
  error_message text,
  sent_at timestamptz,
  line_response_jsonb jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, student_id)
);

create table if not exists public.message_template_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.message_template_folders(id) on delete set null,
  title text not null,
  body text not null,
  kind text not null default 'チャット返信',
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_staff_id uuid references public.staff_users(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  before_jsonb jsonb,
  after_jsonb jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.survey_link_clicks (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references public.surveys(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  source text,
  user_agent text,
  clicked_at timestamptz not null default now()
);

create table if not exists public.recruiting_monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  graduation_year integer not null,
  snapshot_month date not null,
  metrics_jsonb jsonb not null default '{}'::jsonb,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (graduation_year, snapshot_month)
);

create index if not exists staff_tasks_staff_completed_idx on public.staff_tasks(staff_id, completed_at, due_date);
create index if not exists students_motivation_rank_idx on public.students(motivation_rank);
create index if not exists students_candidate_stage_idx on public.students(candidate_stage);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists survey_link_clicks_survey_id_idx on public.survey_link_clicks(survey_id);
create index if not exists event_reminders_status_send_at_idx on public.event_reminders(status, send_at);
create index if not exists event_reminders_student_id_idx on public.event_reminders(student_id);

alter table public.staff_tasks enable row level security;
alter table public.task_dismissals enable row level security;
alter table public.recruiting_events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_reminders enable row level security;
alter table public.message_template_folders enable row level security;
alter table public.message_templates enable row level security;
alter table public.audit_logs enable row level security;
alter table public.survey_link_clicks enable row level security;
alter table public.recruiting_monthly_snapshots enable row level security;

drop trigger if exists set_event_reminders_updated_at on public.event_reminders;
create trigger set_event_reminders_updated_at before update on public.event_reminders
  for each row execute function app.set_updated_at();

drop policy if exists "staff can read staff tasks" on public.staff_tasks;
create policy "staff can read staff tasks" on public.staff_tasks
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage own tasks" on public.staff_tasks;
create policy "staff can manage own tasks" on public.staff_tasks
  for all to authenticated
  using (app.is_admin() or staff_id = auth.uid() or created_by = auth.uid())
  with check (app.is_admin() or staff_id = auth.uid() or created_by = auth.uid());

drop policy if exists "staff can manage own task dismissals" on public.task_dismissals;
create policy "staff can manage own task dismissals" on public.task_dismissals
  for all to authenticated using (staff_id = auth.uid()) with check (staff_id = auth.uid());

drop policy if exists "staff can read recruiting events" on public.recruiting_events;
create policy "staff can read recruiting events" on public.recruiting_events
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage recruiting events" on public.recruiting_events;
create policy "staff can manage recruiting events" on public.recruiting_events
  for all to authenticated
  using (app.is_admin() or created_by = auth.uid())
  with check (app.is_admin() or created_by = auth.uid());

drop policy if exists "staff can read event participants" on public.event_participants;
create policy "staff can read event participants" on public.event_participants
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage event participants" on public.event_participants;
create policy "staff can manage event participants" on public.event_participants
  for all to authenticated using (app.is_authenticated_staff()) with check (app.is_authenticated_staff());

drop policy if exists "staff can read event reminders" on public.event_reminders;
create policy "staff can read event reminders" on public.event_reminders
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage event reminders" on public.event_reminders;
create policy "staff can manage event reminders" on public.event_reminders
  for all to authenticated using (app.is_authenticated_staff()) with check (app.is_authenticated_staff());

drop policy if exists "staff can read message templates" on public.message_templates;
create policy "staff can read message templates" on public.message_templates
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage message templates" on public.message_templates;
create policy "staff can manage message templates" on public.message_templates
  for all to authenticated using (app.is_authenticated_staff()) with check (app.is_authenticated_staff());

drop policy if exists "staff can read message template folders" on public.message_template_folders;
create policy "staff can read message template folders" on public.message_template_folders
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage message template folders" on public.message_template_folders;
create policy "staff can manage message template folders" on public.message_template_folders
  for all to authenticated using (app.is_authenticated_staff()) with check (app.is_authenticated_staff());

drop policy if exists "staff can read audit logs" on public.audit_logs;
create policy "staff can read audit logs" on public.audit_logs
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "system and admins create audit logs" on public.audit_logs;
create policy "system and admins create audit logs" on public.audit_logs
  for insert to authenticated with check (app.is_authenticated_staff());

drop policy if exists "staff can read survey clicks" on public.survey_link_clicks;
create policy "staff can read survey clicks" on public.survey_link_clicks
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "anyone can create survey clicks" on public.survey_link_clicks;
create policy "anyone can create survey clicks" on public.survey_link_clicks
  for insert to anon, authenticated with check (true);

drop policy if exists "staff can read recruiting monthly snapshots" on public.recruiting_monthly_snapshots;
create policy "staff can read recruiting monthly snapshots" on public.recruiting_monthly_snapshots
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage recruiting monthly snapshots" on public.recruiting_monthly_snapshots;
create policy "staff can manage recruiting monthly snapshots" on public.recruiting_monthly_snapshots
  for all to authenticated using (app.is_authenticated_staff()) with check (app.is_authenticated_staff());

create table if not exists public.tag_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tag_folders_name_idx on public.tag_folders(name);

alter table public.tag_folders enable row level security;

drop policy if exists "staff can read tag folders" on public.tag_folders;
create policy "staff can read tag folders" on public.tag_folders
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage tag folders" on public.tag_folders;
create policy "staff can manage tag folders" on public.tag_folders
  for all to authenticated
  using (app.is_authenticated_staff())
  with check (app.is_authenticated_staff() and created_by = auth.uid());

drop trigger if exists set_tag_folders_updated_at on public.tag_folders;
create trigger set_tag_folders_updated_at before update on public.tag_folders
  for each row execute function app.set_updated_at();

alter table public.tags
  add column if not exists folder_id uuid references public.tag_folders(id) on delete set null;

create index if not exists tags_folder_id_idx on public.tags(folder_id);

alter table public.students
  add column if not exists photo_position_x integer not null default 50,
  add column if not exists photo_position_y integer not null default 50,
  add column if not exists photo_scale integer not null default 100,
  add column if not exists line_picture_url text;

update public.students
set
  photo_position_x = coalesce(photo_position_x, 50),
  photo_position_y = coalesce(photo_position_y, 50),
  photo_scale = coalesce(photo_scale, 100);
