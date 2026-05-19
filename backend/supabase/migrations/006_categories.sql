create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),

  clerk_user_id text not null
    default (auth.jwt() ->> 'sub'),

  type text not null
    check (type in ('income', 'expense')),

  name text not null,

  icon text,
  color text,

  created_at timestamptz not null default now(),

  unique (clerk_user_id, type, name)
);

alter table public.categories enable row level security;

drop policy if exists "categories_select_own" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;

create policy "categories_select_own"
on public.categories
for select
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "categories_insert_own"
on public.categories
for insert
to authenticated
with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "categories_delete_own"
on public.categories
for delete
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);