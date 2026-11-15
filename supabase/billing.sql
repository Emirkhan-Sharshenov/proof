-- Folioseen: Pro subscriptions via Freemius (merchant of record). Run after testimonials.sql. Safe to re-run.
-- The Cloudflare Worker receives Freemius license webhooks, re-reads the license from the Freemius API,
-- and calls apply_license() with the secret key. Users can read but never change these fields.
-- Pro = a Freemius license that is not cancelled and not expired (null expiration = lifetime).

alter table public.profiles add column if not exists fs_user_id text;
alter table public.profiles add column if not exists fs_license_id text;
alter table public.profiles add column if not exists subscription_status text;   -- active | cancelled | expired | deleted
alter table public.profiles add column if not exists current_period_end timestamptz; -- Freemius license expiration
alter table public.profiles add column if not exists cancel_at_period_end boolean not null default false;
alter table public.profiles add column if not exists billing_updated_at timestamptz;

create index if not exists profiles_fs_user_idx on public.profiles (fs_user_id);
create index if not exists profiles_fs_license_idx on public.profiles (fs_license_id);

-- Server only. Finds the account (license id → Freemius user id → email; the checkout locks the email
-- to the signed-in user's), stores the license and sets the plan. Returns the user id, or null if no match.
create or replace function public.apply_license(
  p_email text,
  p_fs_user_id text,
  p_license_id text,
  p_expiration timestamptz,
  p_cancelled boolean,
  p_deleted boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_status text;
  v_active boolean;
begin
  select user_id into v_user from public.profiles where fs_license_id = p_license_id limit 1;
  if v_user is null and p_fs_user_id is not null then
    select user_id into v_user from public.profiles where fs_user_id = p_fs_user_id limit 1;
  end if;
  if v_user is null and p_email is not null then
    select id into v_user from auth.users where lower(email) = lower(p_email) limit 1;
  end if;
  if v_user is null then
    return null;
  end if;

  v_active := not coalesce(p_deleted, false)
    and not coalesce(p_cancelled, false)
    and (p_expiration is null or p_expiration > now());
  v_status := case
    when coalesce(p_deleted, false) then 'deleted'
    when coalesce(p_cancelled, false) then 'cancelled'
    when v_active then 'active'
    else 'expired'
  end;

  insert into public.profiles (user_id) values (v_user) on conflict (user_id) do nothing;

  -- An old license ending must not downgrade a different license that is still active.
  if not v_active and exists (
    select 1 from public.profiles
    where user_id = v_user
      and fs_license_id is not null
      and fs_license_id <> p_license_id
      and subscription_status = 'active'
      and (current_period_end is null or current_period_end > now())
  ) then
    return v_user;
  end if;

  update public.profiles set
    fs_user_id = coalesce(p_fs_user_id, fs_user_id),
    fs_license_id = p_license_id,
    subscription_status = v_status,
    current_period_end = p_expiration,
    plan = case when v_active then 'pro' else 'free' end,
    billing_updated_at = now()
  where user_id = v_user;

  return v_user;
end;
$$;

revoke execute on function public.apply_license(text, text, text, timestamptz, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.apply_license(text, text, text, timestamptz, boolean, boolean)
  to service_role;

-- Safety net: if a license expired and no webhook arrived, stop counting the account as Pro
-- 7 days after expiration (Freemius retries failed renewals for a few days before cancelling).
create or replace function public.user_plan(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when plan = 'pro' and fs_license_id is not null and current_period_end is not null
           and current_period_end < now() - interval '7 days' then 'free'
      else plan
    end
    from public.profiles where user_id = p_user
  ), 'free')
$$;
