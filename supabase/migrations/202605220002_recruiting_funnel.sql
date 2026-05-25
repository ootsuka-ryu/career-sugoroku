alter table public.students
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

create table if not exists public.recruiting_monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  graduation_year integer not null,
  snapshot_month date not null,
  metrics_jsonb jsonb not null default '{}'::jsonb,
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (graduation_year, snapshot_month)
);

alter table public.recruiting_monthly_snapshots enable row level security;

drop policy if exists "staff can read recruiting monthly snapshots" on public.recruiting_monthly_snapshots;
create policy "staff can read recruiting monthly snapshots" on public.recruiting_monthly_snapshots
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage recruiting monthly snapshots" on public.recruiting_monthly_snapshots;
create policy "staff can manage recruiting monthly snapshots" on public.recruiting_monthly_snapshots
  for all to authenticated using (app.is_authenticated_staff()) with check (app.is_authenticated_staff());
