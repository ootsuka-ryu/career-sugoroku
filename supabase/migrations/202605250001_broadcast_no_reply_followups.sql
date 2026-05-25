alter table public.messages
  add column if not exists broadcast_id uuid references public.broadcasts(id) on delete set null,
  add column if not exists broadcast_followup_job_id uuid;

create table if not exists public.broadcast_followup_steps (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  step_order integer not null,
  delay_days integer not null check (delay_days between 1 and 60),
  condition_mode text not null default 'or' check (condition_mode in ('and', 'or')),
  require_no_reply boolean not null default true,
  require_survey_unanswered boolean not null default false,
  survey_id uuid references public.surveys(id) on delete set null,
  body_jsonb jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (broadcast_id, step_order)
);

alter table public.broadcast_followup_steps
  add column if not exists condition_mode text not null default 'or',
  add column if not exists require_no_reply boolean not null default true,
  add column if not exists require_survey_unanswered boolean not null default false,
  add column if not exists survey_id uuid references public.surveys(id) on delete set null;

create table if not exists public.broadcast_followup_jobs (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  step_id uuid not null references public.broadcast_followup_steps(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed', 'cancelled')),
  sent_at timestamptz,
  skipped_reason text,
  error_message text,
  created_at timestamptz not null default now(),
  unique (step_id, student_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_broadcast_followup_job_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_broadcast_followup_job_id_fkey
      foreign key (broadcast_followup_job_id)
      references public.broadcast_followup_jobs(id)
      on delete set null;
  end if;
end $$;

create index if not exists messages_broadcast_id_idx on public.messages(broadcast_id);
create index if not exists broadcast_followup_steps_broadcast_idx on public.broadcast_followup_steps(broadcast_id, step_order);
create index if not exists broadcast_followup_jobs_due_idx on public.broadcast_followup_jobs(status, due_at);
create index if not exists broadcast_followup_jobs_student_idx on public.broadcast_followup_jobs(student_id, status);

alter table public.broadcast_followup_steps enable row level security;
alter table public.broadcast_followup_jobs enable row level security;

drop policy if exists "staff can read broadcast followup steps" on public.broadcast_followup_steps;
create policy "staff can read broadcast followup steps" on public.broadcast_followup_steps
for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage broadcast followup steps" on public.broadcast_followup_steps;
create policy "staff can manage broadcast followup steps" on public.broadcast_followup_steps
for all to authenticated using (
  app.is_admin()
  or exists (
    select 1 from public.broadcasts
    where broadcasts.id = broadcast_followup_steps.broadcast_id
      and broadcasts.sent_by = auth.uid()
  )
) with check (
  app.is_admin()
  or exists (
    select 1 from public.broadcasts
    where broadcasts.id = broadcast_followup_steps.broadcast_id
      and broadcasts.sent_by = auth.uid()
  )
);

drop policy if exists "staff can read broadcast followup jobs" on public.broadcast_followup_jobs;
create policy "staff can read broadcast followup jobs" on public.broadcast_followup_jobs
for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can update broadcast followup jobs" on public.broadcast_followup_jobs;
create policy "staff can update broadcast followup jobs" on public.broadcast_followup_jobs
for update to authenticated using (app.is_authenticated_staff())
with check (app.is_authenticated_staff());
