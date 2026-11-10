-- Folioseen: Telegram alerts. Run after app.sql (SQL Editor → New query → paste → Run). Safe to re-run.

create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  telegram_chat_id bigint,
  telegram_code text unique,
  telegram_code_expires_at timestamptz
);

alter table public.profiles enable row level security;

-- Users can read their own profile; all writes go through the functions below.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated
  using (user_id = auth.uid());

alter table public.visits add column if not exists alerted_at timestamptz;

-- Signed-in user: get a one-time code for t.me/<bot>?start=<code> (valid 15 minutes).
create or replace function public.create_telegram_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.profiles (user_id, telegram_code, telegram_code_expires_at)
  values (auth.uid(), v_code, now() + interval '15 minutes')
  on conflict (user_id) do update
    set telegram_code = excluded.telegram_code, telegram_code_expires_at = excluded.telegram_code_expires_at;
  return v_code;
end;
$$;

create or replace function public.disconnect_telegram()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set telegram_chat_id = null where user_id = auth.uid();
$$;

-- Server only (Cloudflare Worker with the secret key): attach a Telegram chat to the code's owner.
create or replace function public.link_telegram(p_code text, p_chat_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  update public.profiles
  set telegram_chat_id = p_chat_id, telegram_code = null, telegram_code_expires_at = null
  where telegram_code = p_code and telegram_code_expires_at > now()
  returning user_id into v_user;
  return v_user is not null;
end;
$$;

-- Server only: marks a visit as alerted (once) and returns what the alert needs, or nothing.
create or replace function public.claim_visit_alert(p_visit_id uuid)
returns table (chat_id bigint, link_id uuid, client_name text, visit_number bigint, user_agent text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with claimed as (
    update public.visits v set alerted_at = now()
    where v.id = p_visit_id and v.alerted_at is null and v.created_at > now() - interval '10 minutes'
    returning v.link_id, v.user_agent
  )
  select p.telegram_chat_id, l.id, l.client_name,
         (select count(*) from public.visits v2 where v2.link_id = l.id),
         c.user_agent
  from claimed c
  join public.links l on l.id = c.link_id
  join public.profiles p on p.user_id = l.owner_id
  where p.telegram_chat_id is not null;
end;
$$;

revoke execute on function public.create_telegram_code() from public, anon;
revoke execute on function public.disconnect_telegram() from public, anon;
revoke execute on function public.link_telegram(text, bigint) from public, anon, authenticated;
revoke execute on function public.claim_visit_alert(uuid) from public, anon, authenticated;
grant execute on function public.create_telegram_code() to authenticated;
grant execute on function public.disconnect_telegram() to authenticated;
grant execute on function public.link_telegram(text, bigint) to service_role;
grant execute on function public.claim_visit_alert(uuid) to service_role;
