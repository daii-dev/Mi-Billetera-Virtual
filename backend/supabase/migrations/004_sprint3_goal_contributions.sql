alter table public.movements
add column if not exists category_name text;

alter table public.movements
drop constraint if exists movements_type_check;

alter table public.movements
add constraint movements_type_check
check (type in ('income', 'expense', 'ahorro'));

alter table public.movements
drop constraint if exists movements_source_check;

alter table public.movements
add constraint movements_source_check
check (source in ('initial_balance', 'manual', 'savings_goal'));

create table if not exists public.abonos_metas_ahorro (
  id_abono uuid primary key default gen_random_uuid(),
  meta_id uuid not null
    references public.metas_ahorro(id_meta)
    on delete cascade,
  cuenta_id uuid not null
    references public.accounts(id),
  movimiento_id uuid null
    references public.movements(id)
    on delete set null,
  usuario_clerk_id text not null default (auth.jwt() ->> 'sub'),
  monto numeric(12,2) not null
    check (monto > 0),
  fecha_abono date not null default current_date,
  nota text null,
  creado_en timestamptz not null default now()
);

alter table public.abonos_metas_ahorro enable row level security;

drop policy if exists "abonos_metas_ahorro_select_own" on public.abonos_metas_ahorro;
drop policy if exists "abonos_metas_ahorro_insert_own" on public.abonos_metas_ahorro;

create policy "abonos_metas_ahorro_select_own"
on public.abonos_metas_ahorro
for select
to authenticated
using ((select auth.jwt() ->> 'sub') = usuario_clerk_id);

create policy "abonos_metas_ahorro_insert_own"
on public.abonos_metas_ahorro
for insert
to authenticated
with check ((select auth.jwt() ->> 'sub') = usuario_clerk_id);

create or replace function public.registrar_abono_meta(
  p_meta_id uuid,
  p_cuenta_id uuid,
  p_monto numeric,
  p_nota text default null
)
returns public.metas_ahorro
language plpgsql
set search_path = public
as $$
declare
  v_usuario_clerk_id text := auth.jwt() ->> 'sub';
  v_meta public.metas_ahorro%rowtype;
  v_cuenta public.accounts%rowtype;
  v_movimiento_id uuid;
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
    when v_monto_actualizado >= v_meta.monto_objetivo then 'completada'
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
