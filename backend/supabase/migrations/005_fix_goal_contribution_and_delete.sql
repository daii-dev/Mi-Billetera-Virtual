create or replace function public.registrar_abono_meta(
  p_meta_id uuid,
  p_cuenta_id uuid,
  p_monto numeric,
  p_nota text default null
)
returns public.metas_ahorro
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_clerk_id text := auth.jwt() ->> 'sub';
  v_meta public.metas_ahorro%rowtype;
  v_cuenta public.accounts%rowtype;
  v_movimiento_id uuid;
  v_monto_faltante numeric(12,2);
  v_monto_actualizado numeric(12,2);
  v_estado_actualizado text;
  v_meta_actualizada public.metas_ahorro%rowtype;
begin
  if v_usuario_clerk_id is null or length(v_usuario_clerk_id) = 0 then
    raise exception 'Usuario no autenticado';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto del abono debe ser mayor a 0';
  end if;

  select *
  into v_meta
  from public.metas_ahorro
  where id_meta = p_meta_id
    and usuario_clerk_id = v_usuario_clerk_id
    and visible = true
  for update;

  if not found then
    raise exception 'La meta de ahorro no existe o no pertenece al usuario';
  end if;

  if v_meta.estado <> 'activa' then
    raise exception 'No se pueden registrar abonos en metas completadas o vencidas';
  end if;

  if v_meta.fecha_limite < current_date then
    raise exception 'No se pueden registrar abonos en metas vencidas';
  end if;

  v_monto_faltante := v_meta.monto_objetivo - v_meta.monto_actual;

  if v_monto_faltante <= 0 then
    raise exception 'No se pueden registrar abonos en metas completadas';
  end if;

  if p_monto > v_monto_faltante then
    raise exception 'El abono no puede superar el monto faltante de la meta';
  end if;

  select *
  into v_cuenta
  from public.accounts
  where id = p_cuenta_id
    and clerk_user_id = v_usuario_clerk_id
  for update;

  if not found then
    raise exception 'La cuenta no existe o no pertenece al usuario';
  end if;

  if v_cuenta.current_balance < p_monto then
    raise exception 'Saldo insuficiente en la cuenta seleccionada';
  end if;

  update public.accounts
  set
    current_balance = current_balance - p_monto,
    updated_at = now()
  where id = p_cuenta_id;

  v_monto_actualizado := v_meta.monto_actual + p_monto;
  v_estado_actualizado := case
    when v_monto_actualizado = v_meta.monto_objetivo then 'completada'
    else v_meta.estado
  end;

  update public.metas_ahorro
  set
    monto_actual = v_monto_actualizado,
    estado = v_estado_actualizado,
    actualizado_en = now()
  where id_meta = p_meta_id
  returning *
  into v_meta_actualizada;

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
    source
  )
  values (
    v_usuario_clerk_id,
    p_cuenta_id,
    p_monto,
    'ahorro',
    'Abono a meta de ahorro',
    coalesce(nullif(trim(p_nota), ''), v_meta.nombre),
    current_date,
    'Metas de ahorro',
    coalesce(v_cuenta.currency, 'BOB'),
    'savings_goal'
  )
  returning id into v_movimiento_id;

  insert into public.abonos_metas_ahorro (
    meta_id,
    cuenta_id,
    movimiento_id,
    usuario_clerk_id,
    monto,
    fecha_abono,
    nota
  )
  values (
    p_meta_id,
    p_cuenta_id,
    v_movimiento_id,
    v_usuario_clerk_id,
    p_monto,
    current_date,
    nullif(trim(p_nota), '')
  );

  return v_meta_actualizada;
end;
$$;

create or replace function public.eliminar_meta_ahorro(
  p_meta_id uuid
)
returns public.metas_ahorro
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_clerk_id text := auth.jwt() ->> 'sub';
  v_meta public.metas_ahorro%rowtype;
  v_meta_eliminada public.metas_ahorro%rowtype;
  v_devolucion record;
  v_cuenta public.accounts%rowtype;
  v_total_devuelto numeric(12,2) := 0;
begin
  if v_usuario_clerk_id is null or length(v_usuario_clerk_id) = 0 then
    raise exception 'Usuario no autenticado';
  end if;

  select *
  into v_meta
  from public.metas_ahorro
  where id_meta = p_meta_id
    and usuario_clerk_id = v_usuario_clerk_id
    and visible = true
  for update;

  if not found then
    raise exception 'La meta de ahorro no existe o no pertenece al usuario';
  end if;

  if v_meta.monto_actual > 0 then
    for v_devolucion in
      select
        cuenta_id,
        sum(monto)::numeric(12,2) as monto_devuelto
      from public.abonos_metas_ahorro
      where meta_id = p_meta_id
        and usuario_clerk_id = v_usuario_clerk_id
      group by cuenta_id
    loop
      select *
      into v_cuenta
      from public.accounts
      where id = v_devolucion.cuenta_id
        and clerk_user_id = v_usuario_clerk_id
      for update;

      if not found then
        raise exception 'No se pudo encontrar una cuenta asociada a los abonos de la meta';
      end if;

      update public.accounts
      set
        current_balance = current_balance + v_devolucion.monto_devuelto,
        updated_at = now()
      where id = v_devolucion.cuenta_id;

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
        source
      )
      values (
        v_usuario_clerk_id,
        v_devolucion.cuenta_id,
        v_devolucion.monto_devuelto,
        'income',
        'Devolución de meta de ahorro',
        'Devolución por eliminación de la meta: ' || v_meta.nombre,
        current_date,
        'Metas de ahorro',
        coalesce(v_cuenta.currency, 'BOB'),
        'savings_goal'
      );

      v_total_devuelto := v_total_devuelto + v_devolucion.monto_devuelto;
    end loop;

    if v_total_devuelto <= 0 then
      raise exception 'No se encontraron abonos para devolver el dinero de la meta';
    end if;

    if v_total_devuelto <> v_meta.monto_actual then
      raise exception 'El historial de abonos no coincide con el monto actual de la meta';
    end if;
  end if;

  update public.metas_ahorro
  set
    visible = false,
    actualizado_en = now()
  where id_meta = p_meta_id
  returning *
  into v_meta_eliminada;

  return v_meta_eliminada;
end;
$$;

grant execute on function public.registrar_abono_meta(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.eliminar_meta_ahorro(uuid) to authenticated;
