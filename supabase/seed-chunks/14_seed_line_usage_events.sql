insert into public.line_usage_events (event_month, message_count, source)
select date_trunc('month', now())::date, 3, 'seed'
where not exists (
  select 1
  from public.line_usage_events
  where event_month = date_trunc('month', now())::date
    and source = 'seed'
);