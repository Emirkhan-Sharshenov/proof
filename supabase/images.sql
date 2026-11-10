-- Folioseen: plans (free / pro) and images in case studies. Run after telegram.sql. Safe to re-run.
-- Image limits per case study: free 0, pro 20. To change, edit image_limit() below and FREE/PRO limits in src/lib/plan.ts.

-- ---------- Plans ----------

alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan in ('free', 'pro'));
-- Users can read their profile (policy in telegram.sql) but never update it: plan changes only via SQL / payments later.

create or replace function public.user_plan(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select plan from public.profiles where user_id = p_user), 'free')
$$;

create or replace function public.image_limit(p_user uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case public.user_plan(p_user) when 'pro' then 20 else 0 end
$$;

-- ---------- Image records ----------

create table if not exists public.case_study_images (
  id uuid primary key default gen_random_uuid(),
  case_study_id uuid not null references public.case_studies on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  path text not null unique,
  width int,
  height int,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists case_study_images_cs_idx on public.case_study_images (case_study_id, position);

alter table public.case_study_images enable row level security;

drop policy if exists "read own images" on public.case_study_images;
create policy "read own images" on public.case_study_images for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "delete own images" on public.case_study_images;
create policy "delete own images" on public.case_study_images for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "add images within plan" on public.case_study_images;
create policy "add images within plan" on public.case_study_images for insert to authenticated
  with check (
    owner_id = auth.uid()
    and path like auth.uid()::text || '/%'
    and exists (select 1 from public.case_studies c where c.id = case_study_id and c.owner_id = auth.uid())
    and (select count(*) from public.case_study_images i where i.case_study_id = case_study_images.case_study_id)
        < public.image_limit(auth.uid())
  );

-- ---------- Storage bucket ----------
-- Public read (paths contain random ids, so they can't be guessed); 3 MB max; images only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-images', 'case-images', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Uploads only into your own folder (<user id>/...), and only on a plan that allows images.
drop policy if exists "case images upload" on storage.objects;
create policy "case images upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'case-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.image_limit(auth.uid()) > 0
  );

drop policy if exists "case images delete" on storage.objects;
create policy "case images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'case-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Shared page: include images ----------

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
grant execute on function public.user_plan(uuid) to authenticated;
grant execute on function public.image_limit(uuid) to authenticated;

-- ---------- Give one account Pro by hand (until payments exist) ----------
-- insert into public.profiles (user_id, plan)
-- select id, 'pro' from auth.users where email = 'you@example.com'
-- on conflict (user_id) do update set plan = 'pro';
