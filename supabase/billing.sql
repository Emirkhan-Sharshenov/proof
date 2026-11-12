-- Folioseen: Pro subscriptions via Dodo Payments. Run after testimonials.sql. Safe to re-run.
-- The Cloudflare Worker receives Dodo webhooks, fetches the current subscription from Dodo,
-- and calls apply_subscription() with the secret key. Users can read but never change these fields.

alter table public.profiles add column if not exists dodo_customer_id text;
alter table public.profiles add column if not exists dodo_subscription_id text;
alter table public.profiles add column if not exists subscription_status text;
alter table public.profiles add column if not exists current_period_end timestamptz;
alter table public.profiles add column if not exists cancel_at_period_end boolean not null default false;
alter table public.profiles add column if not exists billing_updated_at timestamptz;

create unique index if not exists profiles_dodo_subscription_idx on public.profiles (dodo_subscription_id)
  where dodo_subscription_id is not null;
create index if not exists profiles_dodo_customer_idx on public.profiles (dodo_customer_id);

-- Server only. Finds the account (metadata user id → subscription id → customer id → email),
-- stores the subscription and sets the plan. Returns the user id, or null if no account matched.
create or replace function public.apply_subscription(
  p_user_id text,
  p_email text,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_next_billing timestamptz,
  p_cancel_at_period_end boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if p_user_id ~ '^[0-9a-f-]{36}$' then
    select id into v_user from auth.users where id = p_user_id::uuid;
  end if;
  if v_user is null and p_subscription_id is not null then
    select user_id into v_user from public.profiles where dodo_subscription_id = p_subscription_id;
  end if;
  if v_user is null and p_customer_id is not null then
    select user_id into v_user from public.profiles where dodo_customer_id = p_customer_id limit 1;
  end if;
  if v_user is null and p_email is not null then
    select id into v_user from auth.users where lower(email) = lower(p_email) limit 1;
  end if;
  if v_user is null then
    return null;
  end if;

  insert into public.profiles (user_id) values (v_user) on conflict (user_id) do nothing;

  -- An old subscription ending must not downgrade a different subscription that is still active.
  if p_status not in ('active', 'past_due') and exists (
    select 1 from public.profiles
    where user_id = v_user
      and dodo_subscription_id is not null
      and dodo_subscription_id <> p_subscription_id
      and subscription_status in ('active', 'past_due')
  ) then
    return v_user;
  end if;

  update public.profiles set
    dodo_customer_id = coalesce(p_customer_id, dodo_customer_id),
    dodo_subscription_id = p_subscription_id,
    subscription_status = p_status,
    current_period_end = p_next_billing,
    cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
    plan = case when p_status in ('active', 'past_due') then 'pro' else 'free' end,
    billing_updated_at = now()
  where user_id = v_user;

  return v_user;
end;
$$;

revoke execute on function public.apply_subscription(text, text, text, text, text, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.apply_subscription(text, text, text, text, text, timestamptz, boolean)
  to service_role;
