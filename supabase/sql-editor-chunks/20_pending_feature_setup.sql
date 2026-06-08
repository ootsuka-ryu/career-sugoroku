-- Run this once in Supabase SQL Editor when the app shows
-- "DB setup required" or asks for one of these files:
-- 15_rich_menu_line_sync.sql
-- 16_tag_folders.sql
-- 18_student_photo_position.sql
-- 19_student_line_picture.sql
--
-- This file is intentionally idempotent. It is safe to run again.

alter table public.rich_menus
  add column if not exists line_rich_menu_id text,
  add column if not exists line_synced_at timestamptz,
  add column if not exists line_sync_status text not null default 'not_synced',
  add column if not exists line_sync_error text;

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
