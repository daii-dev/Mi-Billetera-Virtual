create extension if not exists "pgcrypto";

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),

  clerk_user_id text not null default (auth.jwt() ->> 'sub'),

  account_id uuid not null
    references public.accounts(id)
    on delete cascade,

  type text not null
    check (type in ('income', 'expense')),

  source text not null default 'manual'
    check (source in ('initial_balance', 'manual')),

  title text not null,
  description text,

  amount numeric(12,2) not null
    check (amount >= 0),

  currency text not null default 'BOB',

  movement_date date not null default current_date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists movements_one_initial_balance_per_account
on public.movements(account_id)
where source = 'initial_balance';

alter table public.movements enable row level security;

drop policy if exists "movements_select_own" on public.movements;
drop policy if exists "movements_insert_own" on public.movements;
drop policy if exists "movements_update_own" on public.movements;
drop policy if exists "movements_delete_own" on public.movements;

create policy "movements_select_own"
on public.movements
for select
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "movements_insert_own"
on public.movements
for insert
to authenticated
with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "movements_update_own"
on public.movements
for update
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id)
with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "movements_delete_own"
on public.movements
for delete
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);