create or replace function app.current_staff_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create or replace function app.is_authenticated_staff()
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.staff_users
    where id = auth.uid()
      and is_active = true
  )
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.staff_users
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  )
$$;

create or replace function app.is_student_assignee(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.student_assignees
    where student_id = target_student_id
      and staff_id = auth.uid()
  )
$$;

create or replace function app.can_edit_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.is_admin() or app.is_student_assignee(target_student_id)
$$;

create or replace function app.touch_student_contact()
returns trigger
language plpgsql
as $$
begin
  if new.direction = 'in' then
    update public.students
      set last_inbound_at = greatest(coalesce(last_inbound_at, '-infinity'::timestamptz), new.sent_at)
      where id = new.student_id;
  else
    update public.students
      set last_outbound_at = greatest(coalesce(last_outbound_at, '-infinity'::timestamptz), new.sent_at)
      where id = new.student_id;
  end if;

  return new;
end;
$$;

create trigger touch_student_contact_after_message
  after insert on public.messages
  for each row execute function app.touch_student_contact();

create or replace function app.prevent_staff_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.id and not app.is_admin() then
    if old.role is distinct from new.role or old.is_active is distinct from new.is_active then
      raise exception 'staff users cannot change their own role or active status';
    end if;
  end if;

  return new;
end;
$$;

create trigger prevent_staff_privilege_escalation_before_update
  before update on public.staff_users
  for each row execute function app.prevent_staff_privilege_escalation();

create or replace function app.bump_student_lock_version()
returns trigger
language plpgsql
as $$
begin
  new.optimistic_lock_version = old.optimistic_lock_version + 1;
  return new;
end;
$$;

create trigger bump_student_lock_version_before_update
  before update on public.students
  for each row execute function app.bump_student_lock_version();
