alter table public.students
  add column if not exists photo_position_x integer not null default 50,
  add column if not exists photo_position_y integer not null default 50,
  add column if not exists photo_scale integer not null default 100;

update public.students
set
  photo_position_x = coalesce(photo_position_x, 50),
  photo_position_y = coalesce(photo_position_y, 50),
  photo_scale = coalesce(photo_scale, 100);
