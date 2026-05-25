# Database Schema

Step 2 adds the initial Supabase schema in `supabase/migrations/202605180001_initial_schema.sql`.

## Core Tables

- `staff_users`: staff profiles and operation roles
- `students`: student profile, contact timestamps, AI/manual next action
- `student_assignees`: many-to-many assignment between students and staff
- `student_actions`: call, LINE, Zoom, email, event, note, AI action history
- `tags` / `student_tags`: tagging and many-to-many assignment
- `messages`: LINE 1:1 chat history
- `broadcasts`: draft, scheduled, and sent broadcast messages
- `surveys`, `survey_questions`, `survey_question_tags`, `survey_responses`
- `auto_replies`
- `rich_menus`
- `recordings`
- `company_resources`
- `notifications`, `notification_preferences`
- `csv_imports`, `csv_import_rows`
- `line_usage_events`

## RLS Policy Model

All business tables have RLS enabled.

- SELECT: authenticated active staff can read shared team data.
- Students UPDATE: admin or assigned staff only.
- Messages INSERT: outbound messages must use `staff_id = auth.uid()`.
- Broadcasts/Surveys/Tags: creator or admin can update/delete.
- Admin-only settings: auto replies, rich menus, company resources, staff management.

The first admin should be bootstrapped via SQL or service role because normal users cannot grant themselves admin privileges.

## Realtime

Realtime is enabled for:

- `students`
- `messages`
- `notifications`

These tables use `replica identity full` so clients can safely merge realtime updates.

## Optimistic Locking

`students.optimistic_lock_version` increments on every update. The UI should submit the last seen `updated_at` and/or lock version and show a merge dialog when the row has changed.
