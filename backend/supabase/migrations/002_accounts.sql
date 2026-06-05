create extension if not exists "pgcrypto";

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null default (auth.jwt() ->> 'sub'),
  name text not null default 'Personal',
  currency text not null default 'BOB',
  initial_balance numeric(12,2) not null default 0,
  current_balance numeric(12,2) not null default 0,
  initial_balance_configured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_user_id, name)
);

alter table public.accounts enable row level security;

drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_insert_own" on public.accounts;
drop policy if exists "accounts_update_own" on public.accounts;
drop policy if exists "accounts_delete_own" on public.accounts;

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