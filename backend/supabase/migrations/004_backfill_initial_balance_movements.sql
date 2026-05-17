insert into public.movements (
  clerk_user_id,
  account_id,
  type,
  source,
  title,
  description,
  amount,
  currency,
  movement_date,
  created_at,
  updated_at
)
select
  a.clerk_user_id,
  a.id,
  'income',
  'initial_balance',
  'Saldo inicial',
  'Movimiento generado automáticamente al crear la cuenta',
  coalesce(a.initial_balance, a.current_balance, 0),
  a.currency,
  a.created_at::date,
  a.created_at,
  now()
from public.accounts a
where not exists (
  select 1
  from public.movements m
  where m.account_id = a.id
  and m.source = 'initial_balance'
)
and (
  a.initial_balance_configured = true
  or a.initial_balance > 0
  or a.current_balance > 0
);