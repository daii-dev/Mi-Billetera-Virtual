alter table public.metas_ahorro
drop constraint if exists metas_ahorro_estado_check;

alter table public.metas_ahorro
drop constraint if exists metas_ahorro_estado_valido;

alter table public.metas_ahorro
add constraint metas_ahorro_estado_check
check (estado in ('activa', 'completada', 'vencida', 'gastada'));
