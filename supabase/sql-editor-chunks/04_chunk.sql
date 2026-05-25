create index students_line_user_id_idx on public.students(line_user_id);
create index students_real_name_university_idx on public.students(real_name, university);
create index students_last_contact_idx on public.students(greatest(coalesce(last_inbound_at, '-infinity'::timestamptz), coalesce(last_outbound_at, '-infinity'::timestamptz)));
create index student_assignees_staff_id_idx on public.student_assignees(staff_id);
create index student_actions_student_id_executed_at_idx on public.student_actions(student_id, executed_at desc);
create index student_tags_tag_id_idx on public.student_tags(tag_id);
create index messages_student_id_sent_at_idx on public.messages(student_id, sent_at desc);
create index messages_staff_id_idx on public.messages(staff_id);
create index broadcasts_status_scheduled_at_idx on public.broadcasts(status, scheduled_at);
create index survey_questions_survey_id_order_idx on public.survey_questions(survey_id, "order");
create index survey_responses_student_id_idx on public.survey_responses(student_id);
create index recordings_student_id_recorded_at_idx on public.recordings(student_id, recorded_at desc);
create index notifications_staff_id_created_at_idx on public.notifications(staff_id, created_at desc);
create index line_usage_events_event_month_idx on public.line_usage_events(event_month);

create trigger set_staff_users_updated_at before update on public.staff_users
  for each row execute function app.set_updated_at();
create trigger set_students_updated_at before update on public.students
  for each row execute function app.set_updated_at();
create trigger set_tags_updated_at before update on public.tags
  for each row execute function app.set_updated_at();
create trigger set_broadcasts_updated_at before update on public.broadcasts
  for each row execute function app.set_updated_at();
create trigger set_surveys_updated_at before update on public.surveys
  for each row execute function app.set_updated_at();
create trigger set_survey_questions_updated_at before update on public.survey_questions
  for each row execute function app.set_updated_at();
create trigger set_auto_replies_updated_at before update on public.auto_replies
  for each row execute function app.set_updated_at();
create trigger set_rich_menus_updated_at before update on public.rich_menus
  for each row execute function app.set_updated_at();
create trigger set_recordings_updated_at before update on public.recordings
  for each row execute function app.set_updated_at();
create trigger set_company_resources_updated_at before update on public.company_resources
  for each row execute function app.set_updated_at();
create trigger set_notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function app.set_updated_at();
