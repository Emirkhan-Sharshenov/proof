-- Folioseen: client-verified testimonials (Pro). Run after images.sql. Safe to re-run.
-- The freelancer creates a request; the client writes the text on /t/<token>.
-- The freelancer can hide or delete a testimonial but can never edit what the client wrote.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  case_study_id uuid not null references public.case_studies on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  client_name text not null check (char_length(client_name) between 1 and 120),
  status text not null default 'pending' check (status in ('pending', 'submitted')),
  author_name text check (char_length(author_name) <= 120),
  author_role text check (char_length(author_role) <= 160),
  body text check (char_length(body) <= 1200),
  consent boolean not null default false,
  is_visible boolean not null default true,
  submitted_at timestamptz,
  alerted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists testimonials_cs_idx on public.testimonials (case_study_id, submitted_at desc);

alter table public.testimonials enable row level security;

-- Column privileges: owners may only set who it's for (on insert) and show/hide it (on update).
revoke insert, update on public.testimonials from authenticated, anon;
grant select, delete on public.testimonials to authenticated;
grant insert (case_study_id, client_name) on public.testimonials to authenticated;
grant update (is_visible) on public.testimonials to authenticated;

drop policy if exists "read own testimonials" on public.testimonials;
create policy "read own testimonials" on public.testimonials for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "delete own testimonials" on public.testimonials;
create policy "delete own testimonials" on public.testimonials for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "show or hide own testimonials" on public.testimonials;
create policy "show or hide own testimonials" on public.testimonials for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "request testimonials on pro" on public.testimonials;
create policy "request testimonials on pro" on public.testimonials for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.user_plan(auth.uid()) = 'pro'
    and exists (select 1 from public.case_studies c where c.id = case_study_id and c.owner_id = auth.uid())
  );

-- ---------- Public: the client's form ----------

create or replace function public.get_testimonial_request(p_token text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'client_name', t.client_name,
    'case_study_title', c.title,
    'freelancer_name', coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    'status', t.status
  )
  from public.testimonials t
  join public.case_studies c on c.id = t.case_study_id
  join auth.users u on u.id = t.owner_id
  where t.token = p_token
$$;

create or replace function public.submit_testimonial(
  p_token text, p_author_name text, p_author_role text, p_body text, p_consent boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(p_consent, false) = false
     or char_length(trim(coalesce(p_author_name, ''))) not between 1 and 120
     or char_length(trim(coalesce(p_author_role, ''))) > 160
     or char_length(trim(coalesce(p_body, ''))) not between 10 and 1200 then
    return false;
  end if;

  update public.testimonials
  set status = 'submitted',
      author_name = trim(p_author_name),
      author_role = nullif(trim(p_author_role), ''),
      body = trim(p_body),
      consent = true,
      submitted_at = now()
  where token = p_token and status = 'pending'
  returning id into v_id;

  return v_id is not null;
end;
$$;

grant execute on function public.get_testimonial_request(text) to anon, authenticated;
grant execute on function public.submit_testimonial(text, text, text, text, boolean) to anon, authenticated;

-- ---------- Server only: Telegram alert, once per testimonial ----------

create or replace function public.claim_testimonial_alert(p_token text)
returns table (chat_id bigint, case_study_id uuid, case_study_title text, author_name text, body text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with claimed as (
    update public.testimonials t set alerted_at = now()
    where t.token = p_token and t.status = 'submitted' and t.alerted_at is null
    returning t.owner_id, t.case_study_id, t.author_name, t.body
  )
  select p.telegram_chat_id, c.id, c.title, cl.author_name, cl.body
  from claimed cl
  join public.case_studies c on c.id = cl.case_study_id
  join public.profiles p on p.user_id = cl.owner_id
  where p.telegram_chat_id is not null;
end;
$$;

revoke execute on function public.claim_testimonial_alert(text) from public, anon, authenticated;
grant execute on function public.claim_testimonial_alert(text) to service_role;

-- ---------- Shared page: case studies with images and visible testimonials ----------

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
        'id', c.id, 'title', c.title, 'summary', c.summary, 'body', c.body, 'is_nda', c.is_nda,
        'images', coalesce((
          select json_agg(json_build_object('path', i.path, 'width', i.width, 'height', i.height) order by i.position, i.created_at)
          from public.case_study_images i where i.case_study_id = c.id
        ), '[]'::json),
        'testimonials', coalesce((
          select json_agg(json_build_object(
            'author_name', t.author_name, 'author_role', t.author_role, 'body', t.body, 'submitted_at', t.submitted_at
          ) order by t.submitted_at desc)
          from public.testimonials t
          where t.case_study_id = c.id and t.status = 'submitted' and t.is_visible
        ), '[]'::json)
      ) order by lc.position)
      from public.link_case_studies lc
      join public.case_studies c on c.id = lc.case_study_id
      where lc.link_id = l.id
    ), '[]'::json)
  )
  from public.links l
  where l.slug = p_slug and l.is_active
$$;

grant execute on function public.get_shared_link(text) to anon, authenticated;
