create policy "staff can read survey questions" on public.survey_questions
  for select to authenticated using (app.is_authenticated_staff());
create policy "survey owners and admins manage questions" on public.survey_questions
  for all to authenticated using (
    app.is_admin() or exists (
      select 1 from public.surveys where surveys.id = survey_id and surveys.created_by = auth.uid()
    )
  ) with check (
    app.is_admin() or exists (
      select 1 from public.surveys where surveys.id = survey_id and surveys.created_by = auth.uid()
    )
  );

create policy "staff can read survey question tags" on public.survey_question_tags
  for select to authenticated using (app.is_authenticated_staff());
create policy "survey owners and admins manage question tag rules" on public.survey_question_tags
  for all to authenticated using (
    app.is_admin() or exists (
      select 1
      from public.survey_questions q
      join public.surveys s on s.id = q.survey_id
      where q.id = question_id and s.created_by = auth.uid()
    )
  ) with check (
    app.is_admin() or exists (
      select 1
      from public.survey_questions q
      join public.surveys s on s.id = q.survey_id
      where q.id = question_id and s.created_by = auth.uid()
    )
  );

create policy "staff can read survey responses" on public.survey_responses
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can insert survey responses" on public.survey_responses
  for insert to authenticated with check (app.is_authenticated_staff());
create policy "admins can update survey responses" on public.survey_responses
  for update to authenticated using (app.is_admin()) with check (app.is_admin());
create policy "admins can delete survey responses" on public.survey_responses
  for delete to authenticated using (app.is_admin());

create policy "staff can read auto replies" on public.auto_replies
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins manage auto replies" on public.auto_replies
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy "staff can read rich menus" on public.rich_menus
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins manage rich menus" on public.rich_menus
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy "staff can read recordings" on public.recordings
  for select to authenticated using (app.is_authenticated_staff());
create policy "assigned staff can create recordings" on public.recordings
  for insert to authenticated with check (app.can_edit_student(student_id) and uploaded_by = auth.uid());
create policy "assigned staff and admins update recordings" on public.recordings
  for update to authenticated using (app.can_edit_student(student_id) or app.is_admin()) with check (app.can_edit_student(student_id) or app.is_admin());
create policy "admins delete recordings" on public.recordings
  for delete to authenticated using (app.is_admin());

create policy "staff can read resources" on public.company_resources
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins manage resources" on public.company_resources
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy "staff can read own notifications" on public.notifications
  for select to authenticated using (staff_id = auth.uid() or app.is_admin());
create policy "system and admins create notifications" on public.notifications
  for insert to authenticated with check (app.is_admin() or staff_id = auth.uid());
create policy "staff can update own notifications" on public.notifications
  for update to authenticated using (staff_id = auth.uid() or app.is_admin()) with check (staff_id = auth.uid() or app.is_admin());
create policy "admins delete notifications" on public.notifications
  for delete to authenticated using (app.is_admin());

create policy "staff can read own notification preferences" on public.notification_preferences
  for select to authenticated using (staff_id = auth.uid() or app.is_admin());
create policy "staff manage own notification preferences" on public.notification_preferences
  for all to authenticated using (staff_id = auth.uid() or app.is_admin()) with check (staff_id = auth.uid() or app.is_admin());

create policy "staff can read csv imports" on public.csv_imports
  for select to authenticated using (app.is_authenticated_staff());
create policy "staff can create own csv imports" on public.csv_imports
  for insert to authenticated with check (app.is_authenticated_staff() and created_by = auth.uid());
create policy "csv import owners and admins update imports" on public.csv_imports
  for update to authenticated using (app.is_admin() or created_by = auth.uid()) with check (app.is_admin() or created_by = auth.uid());
create policy "csv import owners and admins delete imports" on public.csv_imports
  for delete to authenticated using (app.is_admin() or created_by = auth.uid());

create policy "staff can read csv import rows" on public.csv_import_rows
  for select to authenticated using (app.is_authenticated_staff());
create policy "csv import owners and admins manage rows" on public.csv_import_rows
  for all to authenticated using (
    app.is_admin() or exists (
      select 1 from public.csv_imports where csv_imports.id = import_id and csv_imports.created_by = auth.uid()
    )
  ) with check (
    app.is_admin() or exists (
      select 1 from public.csv_imports where csv_imports.id = import_id and csv_imports.created_by = auth.uid()
    )
  );

create policy "staff can read line usage events" on public.line_usage_events
  for select to authenticated using (app.is_authenticated_staff());
create policy "admins manage line usage events" on public.line_usage_events
  for all to authenticated using (app.is_admin()) with check (app.is_admin());
