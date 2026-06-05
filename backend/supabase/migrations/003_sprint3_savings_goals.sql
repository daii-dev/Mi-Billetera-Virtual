-- HU-15: Metas de ahorro
create table if not exists public.metas_ahorro (
  id_meta uuid primary key default gen_random_uuid(),
  usuario_clerk_id text not null default (auth.jwt() ->> 'sub'),
  nombre varchar(50) not null,
  monto_objetivo numeric(12,2) not null check (monto_objetivo > 0),
  monto_actual numeric(12,2) not null default 0 check (monto_actual >= 0),
  fecha_limite date not null,
  cuenta_id uuid references public.accounts(id),
  icono text,
  color text,
  estado text not null default 'activa' check (estado in ('activa', 'completada', 'vencida')),
  visible boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint nombre_length check (char_length(nombre) <= 50)
);

alter table public.metas_ahorro enable row level security;

create policy "metas_ahorro_select_own"
on public.metas_ahorro for select
to authenticated
using (
  (select auth.jwt() ->> 'sub') = usuario_clerk_id
  and visible = true
);

create policy "metas_ahorro_insert_own"
on public.metas_ahorro for insert
to authenticated
with check ((select auth.jwt() ->> 'sub') = usuario_clerk_id);

create policy "metas_ahorro_update_own"
on public.metas_ahorro for update
to authenticated
using ((select auth.jwt() ->> 'sub') = usuario_clerk_id)
with check ((select auth.jwt() ->> 'sub') = usuario_clerk_id);