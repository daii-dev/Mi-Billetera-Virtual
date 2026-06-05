drop function if exists public.registrar_gasto_desde_meta(uuid, uuid, text, text);

create or replace function public.registrar_gasto_desde_meta(
  p_meta_id uuid,
  p_cuenta_id uuid,
  p_monto numeric,
  p_descripcion text,
  p_categoria text
)
returns public.movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_clerk_id text := auth.jwt() ->> 'sub';
  v_meta public.metas_ahorro%rowtype;
  v_cuenta public.accounts%rowtype;
  v_movimiento public.movements%rowtype;
  v_descripcion text := nullif(trim(coalesce(p_descripcion, '')), '');
  v_categoria text := nullif(trim(coalesce(p_categoria, '')), '');
  v_monto_restante numeric(12,2);
begin
  if v_usuario_clerk_id is null or length(v_usuario_clerk_id) = 0 then
    raise exception 'Usuario no autenticado';
  end if;

  if p_meta_id is null then
    raise exception 'Selecciona una meta de ahorro completada';
  end if;

  if p_cuenta_id is null then
    raise exception 'Selecciona una cuenta de referencia';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto del gasto debe ser mayor a 0';
  end if;

  if v_categoria is null then
    raise exception 'Selecciona una categoría';
  end if;

  select *
  into v_meta
  from public.metas_ahorro
  where id_meta = p_meta_id
    and usuario_clerk_id = v_usuario_clerk_id
    and visible = true
    and estado = 'completada'
  for update;

  if not found then
    raise exception 'La meta de ahorro no existe, no está completada o no pertenece al usuario';
  end if;

  if p_monto > v_meta.monto_actual then
    raise exception 'Saldo insuficiente en la meta de ahorro';
  end if;

  select *
  into v_cuenta
  from public.accounts
  where id = p_cuenta_id
    and clerk_user_id = v_usuario_clerk_id;

  if not found then
    raise exception 'La cuenta no existe o no pertenece al usuario';
  end if;

  v_monto_restante := v_meta.monto_actual - p_monto;

  insert into public.movements (
    clerk_user_id,
    account_id,
    amount,
    type,
    title,
    description,
    movement_date,
    category_name,
    currency,
    source,
    meta_id
  )
  values (
    v_usuario_clerk_id,
    p_cuenta_id,
    p_monto,
    'expense',
    coalesce(v_descripcion, 'Gasto desde meta de ahorro'),
    v_descripcion,
    current_date,
    v_categoria,
    coalesce(v_cuenta.currency, 'BOB'),
    'savings_goal',
    p_meta_id
  )
  returning *
  into v_movimiento;

  update public.metas_ahorro
  set
    monto_actual = v_monto_restante,
    estado = case
      when v_monto_restante = 0 then 'gastada'
      else estado
    end,
    actualizado_en = now()
  where id_meta = p_meta_id;

  return v_movimiento;
end;
$$;

grant execute on function public.registrar_gasto_desde_meta(uuid, uuid, numeric, text, text) to authenticated;
