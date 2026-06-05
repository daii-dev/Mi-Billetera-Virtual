create or replace function public.registrar_gasto_desde_meta(
  p_meta_id uuid,
  p_cuenta_id uuid,
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

  if v_meta.monto_actual <= 0 then
    raise exception 'La meta seleccionada no tiene monto ahorrado';
  end if;

  select *
  into v_cuenta
  from public.accounts
  where id = p_cuenta_id
    and clerk_user_id = v_usuario_clerk_id;

  if not found then
    raise exception 'La cuenta no existe o no pertenece al usuario';
  end if;

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
    v_meta.monto_actual,
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
    estado = 'gastada',
    actualizado_en = now()
  where id_meta = p_meta_id;

  return v_movimiento;
end;
$$;

grant execute on function public.registrar_gasto_desde_meta(uuid, uuid, text, text) to authenticated;
