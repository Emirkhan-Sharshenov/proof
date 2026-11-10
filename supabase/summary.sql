-- Folioseen: reading summary in Telegram after a visit ends. Run after telegram.sql. Safe to re-run.

alter table public.visits add column if not exists summary_sent_at timestamptz;

-- Server only (Cloudflare Worker cron, every 5 minutes).
-- A visit counts as finished after 10 minutes without activity. Each visit is summarised once,
-- only if something was actually read, and only for visits from the last 24 hours.
create or replace function public.claim_visit_summaries()
returns table (
  chat_id bigint,
  link_id uuid,
  client_name text,
  total_seconds int,
  items json
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    update public.visits v set summary_sent_at = now()
    where v.summary_sent_at is null
      and v.last_seen_at < now() - interval '10 minutes'
      and v.created_at > now() - interval '1 day'
      and exists (select 1 from public.case_study_views cv where cv.visit_id = v.id and cv.seconds > 0)
    returning v.id, v.link_id
  )
  select
    p.telegram_chat_id,
    l.id,
    l.client_name,
    (select coalesce(sum(cv.seconds), 0)::int from public.case_study_views cv where cv.visit_id = d.id),
    (
      select json_agg(json_build_object('title', c.title, 'seconds', cv.seconds) order by lc.position)
      from public.link_case_studies lc
      join public.case_studies c on c.id = lc.case_study_id
      left join public.case_study_views cv on cv.visit_id = d.id and cv.case_study_id = lc.case_study_id
      where lc.link_id = d.link_id
    )
  from due d
  join public.links l on l.id = d.link_id
  join public.profiles p on p.user_id = l.owner_id
  where p.telegram_chat_id is not null;
end;
$$;

revoke execute on function public.claim_visit_summaries() from public, anon, authenticated;
grant execute on function public.claim_visit_summaries() to service_role;
