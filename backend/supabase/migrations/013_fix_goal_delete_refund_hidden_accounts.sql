drop function if exists public.eliminar_meta_ahorro(uuid);

create or replace function public.eliminar_meta_ahorro(
  p_meta_id uuid,
  p_cuenta_reembolso_id uuid default null
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
  v_cuenta_reembolso public.accounts%rowtype;
  v_devolucion record;
  v_cuenta_receptora public.accounts%rowtype;
  v_total_devuelto numeric(12,2) := 0;
  v_monto_oculto numeric(12,2) := 0;
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
    raise exception 'La meta de ahorro no existe o ya fue eliminada';
  end if;

  if v_meta.monto_actual > 0 then
    select coalesce(sum(ama.monto), 0)::numeric(12,2)
    into v_monto_oculto
    from public.abonos_metas_ahorro ama
    join public.accounts a on a.id = ama.cuenta_id
    where ama.meta_id = p_meta_id
      and ama.usuario_clerk_id = v_usuario_clerk_id
      and a.visible = false;

    if v_monto_oculto > 0 then
      if p_cuenta_reembolso_id is null then
        raise exception 'Selecciona una cuenta activa para recibir el reembolso de cuentas eliminadas';
      end if;

      select *
      into v_cuenta_reembolso
      from public.accounts
      where id = p_cuenta_reembolso_id
        and clerk_user_id = v_usuario_clerk_id
        and visible = true
      for update;

      if not found then
        raise exception 'La cuenta de reembolso no existe, no pertenece al usuario o no está activa';
      end if;
    end if;

    for v_devolucion in
      select
        case
          when a.visible = true then ama.cuenta_id
          else p_cuenta_reembolso_id
        end as cuenta_receptora_id,
        sum(ama.monto)::numeric(12,2) as monto_devuelto,
        bool_or(a.visible = false) as incluye_cuentas_ocultas,
        string_agg(distinct a.name, ', ' order by a.name) as cuentas_origen
      from public.abonos_metas_ahorro ama
      join public.accounts a on a.id = ama.cuenta_id
      where ama.meta_id = p_meta_id
        and ama.usuario_clerk_id = v_usuario_clerk_id
      group by
        case
          when a.visible = true then ama.cuenta_id
          else p_cuenta_reembolso_id
        end
    loop
      if v_devolucion.cuenta_receptora_id is null then
        raise exception 'Selecciona una cuenta activa para recibir el reembolso de cuentas eliminadas';
      end if;

      select *
      into v_cuenta_receptora
      from public.accounts
      where id = v_devolucion.cuenta_receptora_id
        and clerk_user_id = v_usuario_clerk_id
        and visible = true
      for update;

      if not found then
        raise exception 'No se pudo encontrar una cuenta activa para recibir el reembolso';
      end if;

      update public.accounts
      set
        current_balance = current_balance + v_devolucion.monto_devuelto,
        updated_at = now()
      where id = v_devolucion.cuenta_receptora_id
        and visible = true;

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
        v_devolucion.cuenta_receptora_id,
        v_devolucion.monto_devuelto,
        'income',
        'Devolución de meta de ahorro',
        case
          when v_devolucion.incluye_cuentas_ocultas then
            'Devolución por eliminación de la meta: ' || v_meta.nombre ||
            '. Reembolso redirigido desde cuenta(s) eliminada(s): ' ||
            coalesce(v_devolucion.cuentas_origen, 'Cuenta eliminada')
          else
            'Devolución por eliminación de la meta: ' || v_meta.nombre
        end,
        current_date,
        'Metas de ahorro',
        coalesce(v_cuenta_receptora.currency, 'BOB'),
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
    and usuario_clerk_id = v_usuario_clerk_id
    and visible = true
  returning *
  into v_meta_eliminada;

  if not found then
    raise exception 'La meta de ahorro ya fue eliminada';
  end if;

  return v_meta_eliminada;
end;
$$;

grant execute on function public.eliminar_meta_ahorro(uuid, uuid) to authenticated;
