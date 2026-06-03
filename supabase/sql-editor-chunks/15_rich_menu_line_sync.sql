alter table public.rich_menus
  add column if not exists line_rich_menu_id text,
  add column if not exists line_synced_at timestamptz,
  add column if not exists line_sync_status text not null default 'not_synced',
  add column if not exists line_sync_error text;

