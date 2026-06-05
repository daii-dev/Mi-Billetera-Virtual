alter table public.accounts
add column if not exists visible boolean not null default true;

update public.accounts
set visible = true
where visible is distinct from true;

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
      and visible = true
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
    where id = v_payment.account_id
      and visible = true;

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
