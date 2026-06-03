alter table public.recruiting_events
  add column if not exists signup_message_enabled boolean not null default false,
  add column if not exists signup_message_template text,
  add column if not exists reminder_enabled boolean not null default false,
  add column if not exists reminder_message_template text;

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

create index if not exists event_reminders_status_send_at_idx
  on public.event_reminders(status, send_at);
create index if not exists event_reminders_student_id_idx
  on public.event_reminders(student_id);

drop trigger if exists set_event_reminders_updated_at on public.event_reminders;
create trigger set_event_reminders_updated_at before update on public.event_reminders
  for each row execute function app.set_updated_at();

alter table public.event_reminders enable row level security;

drop policy if exists "staff can read event reminders" on public.event_reminders;
create policy "staff can read event reminders" on public.event_reminders
for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage event reminders" on public.event_reminders;
create policy "staff can manage event reminders" on public.event_reminders
for all to authenticated using (app.is_authenticated_staff()) with check (app.is_authenticated_staff());
