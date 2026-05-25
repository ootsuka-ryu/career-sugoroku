create extension if not exists "pgcrypto";

create schema if not exists app;

create type public.staff_role as enum ('admin', 'staff');
create type public.practical_period as enum ('P1_2', 'P2_3', 'P3_4', 'undecided');
create type public.action_type as enum ('call', 'line', 'zoom', 'email', 'event', 'note', 'ai');
create type public.message_direction as enum ('in', 'out');
create type public.message_type as enum ('text', 'image', 'sticker', 'flex', 'file', 'audio', 'video', 'location', 'unknown');
create type public.broadcast_status as enum ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');
create type public.survey_question_type as enum ('text', 'radio', 'checkbox', 'image_upload');
create type public.match_type as enum ('exact', 'contains', 'regex');
create type public.recording_source as enum ('zoom', 'upload', 'browser');
create type public.resource_kind as enum ('approach_policy', 'talk_script', 'event_info', 'faq', 'other');
create type public.notification_channel as enum ('line', 'email', 'both');
create type public.import_status as enum ('pending', 'processing', 'completed', 'failed');
create type public.import_row_status as enum ('success', 'failed', 'skipped', 'duplicate_pending');

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.staff_users (
  id uuid primary key,
  email text not null unique,
  name text not null,
  role public.staff_role not null default 'staff',
  line_user_id text unique,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique,
  display_name text,
  real_name text,
  kana text,
  university text,
  grade text,
  graduation_year integer,
  practical_period public.practical_period not null default 'undecided',
  phone text,
  email text,
  phone_encrypted bytea,
  email_encrypted bytea,
  desired_job_type text,
  desired_area text,
  motivation_level integer check (motivation_level between 1 and 5),
  first_contact_method text,
  first_contact_date date,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  ai_next_action text,
  manual_next_action text,
  status text not null default 'active',
  optimistic_lock_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_assignees (
  student_id uuid not null references public.students(id) on delete cascade,
  staff_id uuid not null references public.staff_users(id) on delete cascade,
  assigned_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (student_id, staff_id)
);

create table public.student_actions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  staff_id uuid references public.staff_users(id) on delete set null,
  action_type public.action_type not null,
  title text not null,
  body text,
  executed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#2563eb',
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_tags (
  student_id uuid not null references public.students(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (student_id, tag_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  direction public.message_direction not null,
  type public.message_type not null default 'text',
  payload jsonb not null default '{}'::jsonb,
  line_message_id text,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  staff_id uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_jsonb jsonb not null default '{}'::jsonb,
  target_tag_ids jsonb not null default '[]'::jsonb,
  excluded_tag_ids jsonb not null default '[]'::jsonb,
  target_mode text not null default 'or' check (target_mode in ('and', 'or')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_by uuid references public.staff_users(id) on delete set null,
  status public.broadcast_status not null default 'draft',
  test_sent_to uuid references public.staff_users(id) on delete set null,
  estimated_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  read_at timestamptz,
  created_at timestamptz not null default now()
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

create index students_line_user_id_idx on public.students(line_user_id);
create index students_real_name_university_idx on public.students(real_name, university);
create index students_last_contact_idx on public.students(greatest(coalesce(last_inbound_at, '-infinity'::timestamptz), coalesce(last_outbound_at, '-infinity'::timestamptz)));
create index student_assignees_staff_id_idx on public.student_assignees(staff_id);
create index student_actions_student_id_executed_at_idx on public.student_actions(student_id, executed_at desc);
create index student_tags_tag_id_idx on public.student_tags(tag_id);
create index messages_student_id_sent_at_idx on public.messages(student_id, sent_at desc);
create index messages_staff_id_idx on public.messages(staff_id);
create index broadcasts_status_scheduled_at_idx on public.broadcasts(status, scheduled_at);
create index survey_questions_survey_id_order_idx on public.survey_questions(survey_id, "order");
create index survey_responses_student_id_idx on public.survey_responses(student_id);
create index recordings_student_id_recorded_at_idx on public.recordings(student_id, recorded_at desc);
create index notifications_staff_id_created_at_idx on public.notifications(staff_id, created_at desc);
create index line_usage_events_event_month_idx on public.line_usage_events(event_month);

create trigger set_staff_users_updated_at before update on public.staff_users
  for each row execute function app.set_updated_at();
create trigger set_students_updated_at before update on public.students
  for each row execute function app.set_updated_at();
create trigger set_tags_updated_at before update on public.tags
  for each row execute function app.set_updated_at();
create trigger set_broadcasts_updated_at before update on public.broadcasts
  for each row execute function app.set_updated_at();
create trigger set_surveys_updated_at before update on public.surveys
  for each row execute function app.set_updated_at();
create trigger set_survey_questions_updated_at before update on public.survey_questions
  for each row execute function app.set_updated_at();
create trigger set_auto_replies_updated_at before update on public.auto_replies
  for each row execute function app.set_updated_at();
create trigger set_rich_menus_updated_at before update on public.rich_menus
  for each row execute function app.set_updated_at();
create trigger set_recordings_updated_at before update on public.recordings
  for each row execute function app.set_updated_at();
create trigger set_company_resources_updated_at before update on public.company_resources
  for each row execute function app.set_updated_at();
create trigger set_notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function app.set_updated_at();

create or replace function app.current_staff_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create or replace function app.is_authenticated_staff()
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.staff_users
    where id = auth.uid()
      and is_active = true
  )
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.staff_users
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  )
$$;

create or replace function app.is_student_assignee(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.student_assignees
    where student_id = target_student_id
      and staff_id = auth.uid()
  )
$$;

create or replace function app.can_edit_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.is_admin() or app.is_student_assignee(target_student_id)
$$;

create or replace function app.touch_student_contact()
returns trigger
language plpgsql
as $$
begin
  if new.direction = 'in' then
    update public.students
      set last_inbound_at = greatest(coalesce(last_inbound_at, '-infinity'::timestamptz), new.sent_at)
      where id = new.student_id;
  else
    update public.students
      set last_outbound_at = greatest(coalesce(last_outbound_at, '-infinity'::timestamptz), new.sent_at)
      where id = new.student_id;
  end if;

  return new;
end;
$$;

create trigger touch_student_contact_after_message
  after insert on public.messages
  for each row execute function app.touch_student_contact();

create or replace function app.prevent_staff_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.id and not app.is_admin() then
    if old.role is distinct from new.role or old.is_active is distinct from new.is_active then
      raise exception 'staff users cannot change their own role or active status';
    end if;
  end if;

  return new;
end;
$$;

create trigger prevent_staff_privilege_escalation_before_update
  before update on public.staff_users
  for each row execute function app.prevent_staff_privilege_escalation();

create or replace function app.bump_student_lock_version()
returns trigger
language plpgsql
as $$
begin
  new.optimistic_lock_version = old.optimistic_lock_version + 1;
  return new;
end;
$$;

create trigger bump_student_lock_version_before_update
  before update on public.students
  for each row execute function app.bump_student_lock_version();

alter table public.staff_users enable row level security;
alter table public.students enable row level security;
alter table public.student_assignees enable row level security;
alter table public.student_actions enable row level security;
alter table public.tags enable row level security;
alter table public.student_tags enable row level security;
alter table public.messages enable row level security;
alter table public.broadcasts enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_question_tags enable row level security;
alter table public.survey_responses enable row level security;
alter table public.auto_replies enable row level security;
alter table public.rich_menus enable row level security;
alter table public.recordings enable row level security;
alter table public.company_resources enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.csv_imports enable row level security;
alter table public.csv_import_rows enable row level security;
alter table public.line_usage_events enable row level security;

create policy "staff can read staff users" on public.staff_users
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins can insert staff users" on public.staff_users
  for insert to authenticated with check (app.is_admin());
create policy "admins can update staff users" on public.staff_users
  for update to authenticated using (app.is_admin()) with check (app.is_admin());
create policy "staff can update own profile fields" on public.staff_users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins can delete staff users" on public.staff_users
  for delete to authenticated using (app.is_admin());

create policy "staff can read students" on public.students
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins can insert students" on public.students
  for insert to authenticated with check (app.is_admin());
create policy "assigned staff can update students" on public.students
  for update to authenticated using (app.can_edit_student(id)) with check (app.can_edit_student(id));
create policy "admins can delete students" on public.students
  for delete to authenticated using (app.is_admin());

create policy "staff can read student assignees" on public.student_assignees
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins manage student assignees" on public.student_assignees
  for all to authenticated using (app.is_admin()) with check (app.is_admin());
create policy "assigned staff can add co-assignees" on public.student_assignees
  for insert to authenticated with check (app.can_edit_student(student_id));

create policy "staff can read actions" on public.student_actions
  for select to authenticated using (app.is_authenticated_staff());
create policy "assigned staff can insert actions" on public.student_actions
  for insert to authenticated with check (app.can_edit_student(student_id) and staff_id = auth.uid());
create policy "owners and admins update actions" on public.student_actions
  for update to authenticated using (app.is_admin() or staff_id = auth.uid()) with check (app.is_admin() or staff_id = auth.uid());
create policy "owners and admins delete actions" on public.student_actions
  for delete to authenticated using (app.is_admin() or staff_id = auth.uid());

create policy "staff can read tags" on public.tags
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can create tags" on public.tags
  for insert to authenticated with check (app.is_authenticated_staff() and created_by = auth.uid());
create policy "tag creators and admins update tags" on public.tags
  for update to authenticated using (app.is_admin() or created_by = auth.uid()) with check (app.is_admin() or created_by = auth.uid());
create policy "tag creators and admins delete tags" on public.tags
  for delete to authenticated using (app.is_admin() or created_by = auth.uid());

create policy "staff can read student tags" on public.student_tags
  for select to authenticated using (app.is_authenticated_staff());
create policy "assigned staff can tag students" on public.student_tags
  for insert to authenticated with check (app.can_edit_student(student_id) and created_by = auth.uid());
create policy "assigned staff can untag students" on public.student_tags
  for delete to authenticated using (app.can_edit_student(student_id) or app.is_admin());

create policy "staff can read messages" on public.messages
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can insert outbound messages as self" on public.messages
  for insert to authenticated with check (
    app.is_authenticated_staff()
    and (
      (direction = 'out' and staff_id = auth.uid())
      or (direction = 'in' and app.is_admin())
    )
  );
create policy "staff can update own outbound messages" on public.messages
  for update to authenticated using (app.is_admin() or staff_id = auth.uid()) with check (app.is_admin() or staff_id = auth.uid());
create policy "admins can delete messages" on public.messages
  for delete to authenticated using (app.is_admin());

create policy "staff can read broadcasts" on public.broadcasts
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can create own broadcasts" on public.broadcasts
  for insert to authenticated with check (app.is_authenticated_staff() and sent_by = auth.uid());
create policy "broadcast owners and admins update broadcasts" on public.broadcasts
  for update to authenticated using (app.is_admin() or sent_by = auth.uid()) with check (app.is_admin() or sent_by = auth.uid());
create policy "broadcast owners and admins delete broadcasts" on public.broadcasts
  for delete to authenticated using (app.is_admin() or sent_by = auth.uid());

create policy "staff can read surveys" on public.surveys
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can create own surveys" on public.surveys
  for insert to authenticated with check (app.is_authenticated_staff() and created_by = auth.uid());
create policy "survey owners and admins update surveys" on public.surveys
  for update to authenticated using (app.is_admin() or created_by = auth.uid()) with check (app.is_admin() or created_by = auth.uid());
create policy "survey owners and admins delete surveys" on public.surveys
  for delete to authenticated using (app.is_admin() or created_by = auth.uid());

create policy "staff can read survey questions" on public.survey_questions
  for select to authenticated using (app.is_authenticated_staff());
create policy "survey owners and admins manage questions" on public.survey_questions
  for all to authenticated using (
    app.is_admin() or exists (
      select 1 from public.surveys where surveys.id = survey_id and surveys.created_by = auth.uid()
    )
  ) with check (
    app.is_admin() or exists (
      select 1 from public.surveys where surveys.id = survey_id and surveys.created_by = auth.uid()
    )
  );

create policy "staff can read survey question tags" on public.survey_question_tags
  for select to authenticated using (app.is_authenticated_staff());
create policy "survey owners and admins manage question tag rules" on public.survey_question_tags
  for all to authenticated using (
    app.is_admin() or exists (
      select 1
      from public.survey_questions q
      join public.surveys s on s.id = q.survey_id
      where q.id = question_id and s.created_by = auth.uid()
    )
  ) with check (
    app.is_admin() or exists (
      select 1
      from public.survey_questions q
      join public.surveys s on s.id = q.survey_id
      where q.id = question_id and s.created_by = auth.uid()
    )
  );

create policy "staff can read survey responses" on public.survey_responses
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can insert survey responses" on public.survey_responses
  for insert to authenticated with check (app.is_authenticated_staff());
create policy "admins can update survey responses" on public.survey_responses
  for update to authenticated using (app.is_admin()) with check (app.is_admin());
create policy "admins can delete survey responses" on public.survey_responses
  for delete to authenticated using (app.is_admin());

create policy "staff can read auto replies" on public.auto_replies
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins manage auto replies" on public.auto_replies
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy "staff can read rich menus" on public.rich_menus
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins manage rich menus" on public.rich_menus
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy "staff can read recordings" on public.recordings
  for select to authenticated using (app.is_authenticated_staff());
create policy "assigned staff can create recordings" on public.recordings
  for insert to authenticated with check (app.can_edit_student(student_id) and uploaded_by = auth.uid());
create policy "assigned staff and admins update recordings" on public.recordings
  for update to authenticated using (app.can_edit_student(student_id) or app.is_admin()) with check (app.can_edit_student(student_id) or app.is_admin());
create policy "admins delete recordings" on public.recordings
  for delete to authenticated using (app.is_admin());

create policy "staff can read resources" on public.company_resources
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins manage resources" on public.company_resources
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy "staff can read own notifications" on public.notifications
  for select to authenticated using (staff_id = auth.uid() or app.is_admin());
create policy "system and admins create notifications" on public.notifications
  for insert to authenticated with check (app.is_admin() or staff_id = auth.uid());
create policy "staff can update own notifications" on public.notifications
  for update to authenticated using (staff_id = auth.uid() or app.is_admin()) with check (staff_id = auth.uid() or app.is_admin());
create policy "admins delete notifications" on public.notifications
  for delete to authenticated using (app.is_admin());

create policy "staff can read own notification preferences" on public.notification_preferences
  for select to authenticated using (staff_id = auth.uid() or app.is_admin());
create policy "staff manage own notification preferences" on public.notification_preferences
  for all to authenticated using (staff_id = auth.uid() or app.is_admin()) with check (staff_id = auth.uid() or app.is_admin());

create policy "staff can read csv imports" on public.csv_imports
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can create own csv imports" on public.csv_imports
  for insert to authenticated with check (app.is_authenticated_staff() and created_by = auth.uid());
create policy "csv import owners and admins update imports" on public.csv_imports
  for update to authenticated using (app.is_admin() or created_by = auth.uid()) with check (app.is_admin() or created_by = auth.uid());
create policy "csv import owners and admins delete imports" on public.csv_imports
  for delete to authenticated using (app.is_admin() or created_by = auth.uid());

create policy "staff can read csv import rows" on public.csv_import_rows
  for select to authenticated using (app.is_authenticated_staff());
create policy "csv import owners and admins manage rows" on public.csv_import_rows
  for all to authenticated using (
    app.is_admin() or exists (
      select 1 from public.csv_imports where csv_imports.id = import_id and csv_imports.created_by = auth.uid()
    )
  ) with check (
    app.is_admin() or exists (
      select 1 from public.csv_imports where csv_imports.id = import_id and csv_imports.created_by = auth.uid()
    )
  );

create policy "staff can read line usage events" on public.line_usage_events
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins manage line usage events" on public.line_usage_events
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

alter table public.students replica identity full;
alter table public.messages replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'students'
  ) then
    alter publication supabase_realtime add table public.students;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

comment on table public.staff_users is 'Application staff profiles. id should match auth.users.id in production.';
comment on column public.students.optimistic_lock_version is 'Incremented on update and used with updated_at for optimistic locking in the profile edit UI.';
comment on column public.students.phone_encrypted is 'Optional pgcrypto output column for future phone encryption.';
comment on column public.students.email_encrypted is 'Optional pgcrypto output column for future email encryption.';
