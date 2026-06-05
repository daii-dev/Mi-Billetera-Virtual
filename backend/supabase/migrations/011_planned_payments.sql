create extension if not exists "pgcrypto";

create table if not exists public.planned_payments (
  id uuid primary key default gen_random_uuid(),

  clerk_user_id text not null default (auth.jwt() ->> 'sub'),

  account_id uuid not null
    references public.accounts(id)
    on delete cascade,

  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  category_name text not null,

  next_payment_date date not null,

  recurrence text not null default 'monthly'
    check (recurrence in ('monthly')),

  is_active boolean not null default true,

  last_executed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planned_payments enable row level security;

drop policy if exists "planned_payments_select_own" on public.planned_payments;
drop policy if exists "planned_payments_insert_own" on public.planned_payments;
drop policy if exists "planned_payments_update_own" on public.planned_payments;
drop policy if exists "planned_payments_delete_own" on public.planned_payments;

create policy "planned_payments_select_own"
on public.planned_payments
for select
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "planned_payments_insert_own"
on public.planned_payments
for insert
to authenticated
with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "planned_payments_update_own"
on public.planned_payments
for update
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id)
with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "planned_payments_delete_own"
on public.planned_payments
for delete
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);

alter table public.movements
add column if not exists planned_payment_id uuid null;

alter table public.movements
drop constraint if exists movements_planned_payment_id_fkey;

alter table public.movements
add constraint movements_planned_payment_id_fkey
foreign key (planned_payment_id)
references public.planned_payments(id)
on delete set null;

create index if not exists idx_movements_planned_payment_id
on public.movements(planned_payment_id);

create index if not exists idx_planned_payments_due
on public.planned_payments(clerk_user_id, next_payment_date, is_active);

create or replace function public.process_due_planned_payments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_clerk_id text := auth.jwt() ->> 'sub';
  v_payment public.planned_payments%rowtype;
  v_account public.accounts%rowtype;
  v_processed_count integer := 0;
begin
  if v_usuario_clerk_id is null or length(v_usuario_clerk_id) = 0 then
    raise exception 'Usuario no autenticado';
  end if;

  for v_payment in
    select *
    from public.planned_payments
    where clerk_user_id = v_usuario_clerk_id
      and is_active = true
      and next_payment_date <= current_date
    order by next_payment_date asc
    for update
  loop
    select *
    into v_account
    from public.accounts
    where id = v_payment.account_id
      and clerk_user_id = v_usuario_clerk_id
    for update;

    if not found then
      update public.planned_payments
      set
        is_active = false,
        updated_at = now()
      where id = v_payment.id;

      continue;
    end if;

    if v_account.current_balance < v_payment.amount then
      continue;
    end if;

    update public.accounts
    set
      current_balance = current_balance - v_payment.amount,
      updated_at = now()
    where id = v_payment.account_id;

    insert into public.movements (
      clerk_user_id,
      account_id,
      planned_payment_id,
      amount,
      type,
      title,
      description,
      movement_date,
      category_name,
      currency,
      source
    )
    values (
      v_usuario_clerk_id,
      v_payment.account_id,
      v_payment.id,
      v_payment.amount,
      'expense',
      v_payment.name,
      'Pago planificado generado automáticamente',
      current_date,
      v_payment.category_name,
      coalesce(v_account.currency, 'BOB'),
      'manual'
    );

    update public.planned_payments
    set
      next_payment_date = (v_payment.next_payment_date + interval '1 month')::date,
      last_executed_at = now(),
      updated_at = now()
    where id = v_payment.id;

    v_processed_count := v_processed_count + 1;
  end loop;

  return v_processed_count;
end;
$$;

grant execute on function public.process_due_planned_payments() to authenticated;