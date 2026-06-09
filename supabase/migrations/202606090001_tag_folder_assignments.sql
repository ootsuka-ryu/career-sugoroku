-- Enable manual tag folder assignment.

alter table public.tags
  add column if not exists folder_id uuid references public.tag_folders(id) on delete set null;

create index if not exists tags_folder_id_idx on public.tags(folder_id);
