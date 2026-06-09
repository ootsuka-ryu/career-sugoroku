-- Run this once in Supabase SQL Editor to enable moving tags into folders.
-- It is safe to run again.

alter table public.tags
  add column if not exists folder_id uuid references public.tag_folders(id) on delete set null;

create index if not exists tags_folder_id_idx on public.tags(folder_id);
