alter table public.students
  add column if not exists event_hb_fes_date date,
  add column if not exists event_himeji_tour_date date,
  add column if not exists event_real_talk_date date,
  add column if not exists event_company_session_date date,
  add column if not exists event_employee_exchange_date date;

comment on column public.students.event_hb_fes_date is 'Participation date for H&B fair.';
comment on column public.students.event_himeji_tour_date is 'Participation date for Himeji day tour.';
comment on column public.students.event_real_talk_date is 'Participation date for real talk stream.';
comment on column public.students.event_company_session_date is 'Participation date for individual company information session.';
comment on column public.students.event_employee_exchange_date is 'Participation date for employee exchange event.';

with matched as (
  select ep.student_id, min(re.starts_at::date) as event_date
  from public.event_participants ep
  join public.recruiting_events re on re.id = ep.event_id
  where coalesce(ep.status, '') not in ('欠席','キャンセル','cancelled','canceled','absent')
    and (coalesce(re.title, '') || ' ' || coalesce(re.event_type, '')) ~* '(H&B|Ｈ＆Ｂ|H＆B|フェス)'
  group by ep.student_id
)
update public.students s
set event_hb_fes_date = coalesce(s.event_hb_fes_date, matched.event_date)
from matched
where s.id = matched.student_id;

with matched as (
  select ep.student_id, min(re.starts_at::date) as event_date
  from public.event_participants ep
  join public.recruiting_events re on re.id = ep.event_id
  where coalesce(ep.status, '') not in ('欠席','キャンセル','cancelled','canceled','absent')
    and (coalesce(re.title, '') || ' ' || coalesce(re.event_type, '')) ~* '(姫路|日帰り|ツアー)'
  group by ep.student_id
)
update public.students s
set event_himeji_tour_date = coalesce(s.event_himeji_tour_date, matched.event_date)
from matched
where s.id = matched.student_id;

with matched as (
  select ep.student_id, min(re.starts_at::date) as event_date
  from public.event_participants ep
  join public.recruiting_events re on re.id = ep.event_id
  where coalesce(ep.status, '') not in ('欠席','キャンセル','cancelled','canceled','absent')
    and (coalesce(re.title, '') || ' ' || coalesce(re.event_type, '')) ~* '(リアルトーク)'
  group by ep.student_id
)
update public.students s
set event_real_talk_date = coalesce(s.event_real_talk_date, matched.event_date)
from matched
where s.id = matched.student_id;

with matched as (
  select ep.student_id, min(re.starts_at::date) as event_date
  from public.event_participants ep
  join public.recruiting_events re on re.id = ep.event_id
  where coalesce(ep.status, '') not in ('欠席','キャンセル','cancelled','canceled','absent')
    and (coalesce(re.title, '') || ' ' || coalesce(re.event_type, '')) ~* '(個別会社説明会|会社説明会|説明会)'
  group by ep.student_id
)
update public.students s
set event_company_session_date = coalesce(s.event_company_session_date, matched.event_date)
from matched
where s.id = matched.student_id;

with matched as (
  select ep.student_id, min(re.starts_at::date) as event_date
  from public.event_participants ep
  join public.recruiting_events re on re.id = ep.event_id
  where coalesce(ep.status, '') not in ('欠席','キャンセル','cancelled','canceled','absent')
    and (coalesce(re.title, '') || ' ' || coalesce(re.event_type, '')) ~* '(社員交流会|交流会)'
  group by ep.student_id
)
update public.students s
set event_employee_exchange_date = coalesce(s.event_employee_exchange_date, matched.event_date)
from matched
where s.id = matched.student_id;

update public.students
set funnel_is = true,
    funnel_next = true
where event_hb_fes_date is not null
   or event_himeji_tour_date is not null
   or event_real_talk_date is not null
   or event_company_session_date is not null
   or event_employee_exchange_date is not null;
