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
