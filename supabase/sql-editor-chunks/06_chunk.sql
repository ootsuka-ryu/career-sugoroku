alter table public.staff_users enable row level security;
alter table public.students enable row level security;
alter table public.student_assignees enable row level security;
alter table public.student_actions enable row level security;
alter table public.tags enable row level security;
alter table public.student_tags enable row level security;
alter table public.messages enable row level security;
alter table public.broadcasts enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_question_tags enable row level security;
alter table public.survey_responses enable row level security;
alter table public.auto_replies enable row level security;
alter table public.rich_menus enable row level security;
alter table public.recordings enable row level security;
alter table public.company_resources enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.csv_imports enable row level security;
alter table public.csv_import_rows enable row level security;
alter table public.line_usage_events enable row level security;

create policy "staff can read staff users" on public.staff_users
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins can insert staff users" on public.staff_users
  for insert to authenticated with check (app.is_admin());
create policy "admins can update staff users" on public.staff_users
  for update to authenticated using (app.is_admin()) with check (app.is_admin());
create policy "staff can update own profile fields" on public.staff_users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins can delete staff users" on public.staff_users
  for delete to authenticated using (app.is_admin());

create policy "staff can read students" on public.students
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins can insert students" on public.students
  for insert to authenticated with check (app.is_admin());
create policy "assigned staff can update students" on public.students
  for update to authenticated using (app.can_edit_student(id)) with check (app.can_edit_student(id));
create policy "admins can delete students" on public.students
  for delete to authenticated using (app.is_admin());

create policy "staff can read student assignees" on public.student_assignees
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins manage student assignees" on public.student_assignees
  for all to authenticated using (app.is_admin()) with check (app.is_admin());
create policy "assigned staff can add co-assignees" on public.student_assignees
  for insert to authenticated with check (app.can_edit_student(student_id));

create policy "staff can read actions" on public.student_actions
  for select to authenticated using (app.is_authenticated_staff());
create policy "assigned staff can insert actions" on public.student_actions
  for insert to authenticated with check (app.can_edit_student(student_id) and staff_id = auth.uid());
create policy "owners and admins update actions" on public.student_actions
  for update to authenticated using (app.is_admin() or staff_id = auth.uid()) with check (app.is_admin() or staff_id = auth.uid());
create policy "owners and admins delete actions" on public.student_actions
  for delete to authenticated using (app.is_admin() or staff_id = auth.uid());

create policy "staff can read tags" on public.tags
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can create tags" on public.tags
  for insert to authenticated with check (app.is_authenticated_staff() and created_by = auth.uid());
create policy "tag creators and admins update tags" on public.tags
  for update to authenticated using (app.is_admin() or created_by = auth.uid()) with check (app.is_admin() or created_by = auth.uid());
create policy "tag creators and admins delete tags" on public.tags
  for delete to authenticated using (app.is_admin() or created_by = auth.uid());

create policy "staff can read student tags" on public.student_tags
  for select to authenticated using (app.is_authenticated_staff());
create policy "assigned staff can tag students" on public.student_tags
  for insert to authenticated with check (app.can_edit_student(student_id) and created_by = auth.uid());
create policy "assigned staff can untag students" on public.student_tags
  for delete to authenticated using (app.can_edit_student(student_id) or app.is_admin());

create policy "staff can read messages" on public.messages
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can insert outbound messages as self" on public.messages
  for insert to authenticated with check (
    app.is_authenticated_staff()
    and (
      (direction = 'out' and staff_id = auth.uid())
      or (direction = 'in' and app.is_admin())
    )
  );
create policy "staff can update own outbound messages" on public.messages
  for update to authenticated using (app.is_admin() or staff_id = auth.uid()) with check (app.is_admin() or staff_id = auth.uid());
create policy "admins can delete messages" on public.messages
  for delete to authenticated using (app.is_admin());

create policy "staff can read broadcasts" on public.broadcasts
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can create own broadcasts" on public.broadcasts
  for insert to authenticated with check (app.is_authenticated_staff() and sent_by = auth.uid());
create policy "broadcast owners and admins update broadcasts" on public.broadcasts
  for update to authenticated using (app.is_admin() or sent_by = auth.uid()) with check (app.is_admin() or sent_by = auth.uid());
create policy "broadcast owners and admins delete broadcasts" on public.broadcasts
  for delete to authenticated using (app.is_admin() or sent_by = auth.uid());

create policy "staff can read surveys" on public.surveys
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can create own surveys" on public.surveys
  for insert to authenticated with check (app.is_authenticated_staff() and created_by = auth.uid());
create policy "survey owners and admins update surveys" on public.surveys
  for update to authenticated using (app.is_admin() or created_by = auth.uid()) with check (app.is_admin() or created_by = auth.uid());
create policy "survey owners and admins delete surveys" on public.surveys
  for delete to authenticated using (app.is_admin() or created_by = auth.uid());
