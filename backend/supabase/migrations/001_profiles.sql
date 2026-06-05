create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique default (auth.jwt() ->> 'sub'),
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id)
with check ((select auth.jwt() ->> 'sub') = clerk_user_id);