-- Folioseen MVP: case studies, per-client links, visit tracking.
-- Run once in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.

-- ---------- Tables ----------

create table if not exists public.case_studies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  summary text not null default '' check (char_length(summary) <= 500),
  body text not null default '' check (char_length(body) <= 50000),
  is_nda boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  slug text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  client_name text not null check (char_length(client_name) between 1 and 120),
  note text not null default '' check (char_length(note) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.link_case_studies (
  link_id uuid not null references public.links on delete cascade,
  case_study_id uuid not null references public.case_studies on delete cascade,
  position int not null default 0,
  primary key (link_id, case_study_id)
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links on delete cascade,
  visitor_id text not null check (char_length(visitor_id) <= 64),
  user_agent text check (char_length(user_agent) <= 400),
  referrer text check (char_length(referrer) <= 400),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists visits_link_idx on public.visits (link_id, created_at desc);

create table if not exists public.case_study_views (
  visit_id uuid not null references public.visits on delete cascade,
  case_study_id uuid not null references public.case_studies on delete cascade,
  seconds int not null default 0,
  opened_at timestamptz not null default now(),
  primary key (visit_id, case_study_id)
);

-- ---------- Row level security: owners see only their own data ----------

alter table public.case_studies enable row level security;
alter table public.links enable row level security;
alter table public.link_case_studies enable row level security;
alter table public.visits enable row level security;
alter table public.case_study_views enable row level security;

drop policy if exists "own case studies" on public.case_studies;
create policy "own case studies" on public.case_studies for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "own links" on public.links;
create policy "own links" on public.links for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "own link items" on public.link_case_studies;
create policy "own link items" on public.link_case_studies for all to authenticated
  using (exists (select 1 from public.links l where l.id = link_id and l.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.links l where l.id = link_id and l.owner_id = auth.uid())
    and exists (select 1 from public.case_studies c where c.id = case_study_id and c.owner_id = auth.uid())
  );

-- Visits are written only through the functions below; owners can read and delete them.
drop policy if exists "read own visits" on public.visits;
create policy "read own visits" on public.visits for select to authenticated
  using (exists (select 1 from public.links l where l.id = link_id and l.owner_id = auth.uid()));
drop policy if exists "delete own visits" on public.visits;
create policy "delete own visits" on public.visits for delete to authenticated
  using (exists (select 1 from public.links l where l.id = link_id and l.owner_id = auth.uid()));

drop policy if exists "read own views" on public.case_study_views;
create policy "read own views" on public.case_study_views for select to authenticated
  using (exists (
    select 1 from public.visits v join public.links l on l.id = v.link_id
    where v.id = visit_id and l.owner_id = auth.uid()
  ));

-- ---------- Public functions used by the shared page (/v/<slug>) ----------

-- Returns the page content for an active link, or null.
create or replace function public.get_shared_link(p_slug text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'client_name', l.client_name,
    'is_owner', l.owner_id = auth.uid(),
    'case_studies', coalesce((
      select json_agg(json_build_object(
        'id', c.id, 'title', c.title, 'summary', c.summary, 'body', c.body, 'is_nda', c.is_nda
      ) order by lc.position)
      from public.link_case_studies lc
      join public.case_studies c on c.id = lc.case_study_id
      where lc.link_id = l.id
    ), '[]'::json)
  )
  from public.links l
  where l.slug = p_slug and l.is_active
$$;

-- Starts (or resumes, within 30 minutes) a visit. Returns the visit id, or null for unknown links.
create or replace function public.start_visit(p_slug text, p_visitor_id text, p_user_agent text, p_referrer text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.links;
  v_visit uuid;
begin
  select * into v_link from public.links where slug = p_slug and is_active;
  if v_link.id is null or v_link.owner_id = auth.uid() then
    return null;
  end if;

  select id into v_visit from public.visits
  where link_id = v_link.id and visitor_id = left(p_visitor_id, 64)
    and last_seen_at > now() - interval '30 minutes'
  order by last_seen_at desc limit 1;

  if v_visit is not null then
    update public.visits set last_seen_at = now() where id = v_visit;
    return v_visit;
  end if;

  insert into public.visits (link_id, visitor_id, user_agent, referrer)
  values (v_link.id, left(p_visitor_id, 64), left(p_user_agent, 400), left(p_referrer, 400))
  returning id into v_visit;
  return v_visit;
end;
$$;

-- Adds reading time for one case study in a visit. Seconds are clamped to 0..60 per call.
create or replace function public.track_view(p_visit_id uuid, p_case_study_id uuid, p_seconds int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.visits v
    join public.link_case_studies lc on lc.link_id = v.link_id
    where v.id = p_visit_id and lc.case_study_id = p_case_study_id
      and v.last_seen_at > now() - interval '2 hours'
  ) then
    return;
  end if;

  insert into public.case_study_views (visit_id, case_study_id, seconds)
  values (p_visit_id, p_case_study_id, greatest(0, least(coalesce(p_seconds, 0), 60)))
  on conflict (visit_id, case_study_id)
  do update set seconds = public.case_study_views.seconds + excluded.seconds;

  update public.visits set last_seen_at = now() where id = p_visit_id;
end;
$$;

grant execute on function public.get_shared_link(text) to anon, authenticated;
grant execute on function public.start_visit(text, text, text, text) to anon, authenticated;
grant execute on function public.track_view(uuid, uuid, int) to anon, authenticated;
