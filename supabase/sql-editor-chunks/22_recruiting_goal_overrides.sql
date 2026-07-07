create table if not exists public.recruiting_goal_overrides (
  graduation_year integer not null,
  row_key text not null,
  target_value integer,
  actual_value integer,
  updated_by uuid references public.staff_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (graduation_year, row_key)
);

alter table public.recruiting_goal_overrides enable row level security;

drop policy if exists "staff can read recruiting goal overrides" on public.recruiting_goal_overrides;
create policy "staff can read recruiting goal overrides" on public.recruiting_goal_overrides
  for select to authenticated using (app.is_authenticated_staff());

drop policy if exists "staff can manage recruiting goal overrides" on public.recruiting_goal_overrides;
create policy "staff can manage recruiting goal overrides" on public.recruiting_goal_overrides
  for all to authenticated using (app.is_authenticated_staff()) with check (app.is_authenticated_staff());
