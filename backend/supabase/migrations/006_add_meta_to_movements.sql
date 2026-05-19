alter table public.movements
add column if not exists meta_id uuid null;

alter table public.movements
drop constraint if exists movements_meta_id_fkey;

alter table public.movements
add constraint movements_meta_id_fkey
foreign key (meta_id)
references public.metas_ahorro(id_meta)
on delete set null;

create index if not exists idx_movements_meta_id
on public.movements(meta_id);

alter table public.metas_ahorro
drop constraint if exists metas_ahorro_estado_valido;

alter table public.metas_ahorro
add constraint metas_ahorro_estado_valido
check (estado in ('activa', 'completada', 'vencida', 'gastada'));