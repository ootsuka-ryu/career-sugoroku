alter table public.students replica identity full;
alter table public.messages replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'students'
  ) then
    alter publication supabase_realtime add table public.students;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

comment on table public.staff_users is 'Application staff profiles. id should match auth.users.id in production.';
comment on column public.students.optimistic_lock_version is 'Incremented on update and used with updated_at for optimistic locking in the profile edit UI.';
comment on column public.students.phone_encrypted is 'Optional pgcrypto output column for future phone encryption.';
comment on column public.students.email_encrypted is 'Optional pgcrypto output column for future email encryption.';
