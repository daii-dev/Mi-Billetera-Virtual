-- SPRINT 1 - Mi Billetera Virtual
-- Auth con Clerk + datos financieros en Supabase

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique default (auth.jwt() ->> 'sub'),
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null default (auth.jwt() ->> 'sub'),
  name text not null default 'Principal',
  currency text not null default 'BOB',
  initial_balance numeric(12,2) not null default 0,
  current_balance numeric(12,2) not null default 0,
  initial_balance_configured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_user_id, name)
);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;

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

create policy "accounts_select_own"
on public.accounts
for select
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "accounts_insert_own"
on public.accounts
for insert
to authenticated
with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "accounts_update_own"
on public.accounts
for update
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id)
with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "accounts_delete_own"
on public.accounts
for delete
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);