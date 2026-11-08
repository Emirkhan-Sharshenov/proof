-- Waitlist table for the Proof landing page.
-- Run in Supabase: SQL Editor → New query → paste → Run.

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Visitors (anon key) may only INSERT. Nobody can read the list with the public key.
drop policy if exists "anon can join waitlist" on public.waitlist;
create policy "anon can join waitlist"
  on public.waitlist for insert
  to anon
  with check (true);
