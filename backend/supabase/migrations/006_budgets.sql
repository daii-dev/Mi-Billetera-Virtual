create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null default (auth.jwt() ->> 'sub'),
  category_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  period_type text not null check (period_type in ('monthly', 'weekly')),
  period_year int not null,
  period_month int null check (period_month between 1 and 12),
  period_week int null check (period_week between 1 and 53),
  account_id uuid null references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clerk_user_id, category_name, period_type, period_year, period_month, period_week)
);

create index if not exists idx_budgets_user_period on public.budgets (clerk_user_id, period_type, period_year, period_month, period_week);

alter table public.budgets enable row level security;

drop policy if exists "budgets_select_own" on public.budgets;
drop policy if exists "budgets_insert_own" on public.budgets;
drop policy if exists "budgets_update_own" on public.budgets;
drop policy if exists "budgets_delete_own" on public.budgets;

create policy "budgets_select_own" on public.budgets
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "budgets_insert_own" on public.budgets
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "budgets_update_own" on public.budgets
  for update to authenticated
  using ((select auth.jwt() ->> 'sub') = clerk_user_id)
  with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "budgets_delete_own" on public.budgets
  for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = clerk_user_id);