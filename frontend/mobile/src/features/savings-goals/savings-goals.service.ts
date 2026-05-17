import type { SupabaseClient } from '@supabase/supabase-js';

import {
  CreateSavingsGoalParams,
  SavingsGoal,
  UpdateSavingsGoalParams,
} from './savings-goals.types';

export function validateFutureDate(dateString: string): boolean {
  const inputDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate > today;
}

export async function createSavingsGoal(
  supabase: SupabaseClient,
  clerkUserId: string,
  params: CreateSavingsGoalParams
): Promise<SavingsGoal> {
  if (!validateFutureDate(params.fecha_limite)) {
    throw new Error('La fecha límite debe ser una fecha futura');
  }

  if (params.monto_objetivo <= 0) {
    throw new Error('El monto objetivo debe ser mayor a 0');
  }

  if (params.nombre.length > 50) {
    throw new Error('El nombre debe tener máximo 50 caracteres');
  }

  const { data, error } = await supabase
    .from('metas_ahorro')
    .insert({
      usuario_clerk_id: clerkUserId,
      nombre: params.nombre.trim(),
      monto_objetivo: params.monto_objetivo,
      monto_actual: 0,
      fecha_limite: params.fecha_limite,
      cuenta_id: params.cuenta_id || null,
      icono: params.icono || null,
      color: params.color || null,
      estado: 'activa',
      visible: true,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SavingsGoal;
}

export async function getSavingsGoals(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('metas_ahorro')
    .select('*')
    .eq('usuario_clerk_id', clerkUserId)
    .eq('visible', true)
    .order('creado_en', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as SavingsGoal[];
}

export async function getSavingsGoalById(
  supabase: SupabaseClient,
  clerkUserId: string,
  goalId: string
): Promise<SavingsGoal | null> {
  const { data, error } = await supabase
    .from('metas_ahorro')
    .select('*')
    .eq('id_meta', goalId)
    .eq('usuario_clerk_id', clerkUserId)
    .eq('visible', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as SavingsGoal | null;
}

export async function updateSavingsGoal(
  supabase: SupabaseClient,
  clerkUserId: string,
  goalId: string,
  params: UpdateSavingsGoalParams
): Promise<SavingsGoal> {
  if (params.fecha_limite && !validateFutureDate(params.fecha_limite)) {
    throw new Error('La fecha límite debe ser una fecha futura');
  }

  if (params.monto_objetivo !== undefined && params.monto_objetivo <= 0) {
    throw new Error('El monto objetivo debe ser mayor a 0');
  }

  if (params.nombre !== undefined && params.nombre.length > 50) {
    throw new Error('El nombre debe tener máximo 50 caracteres');
  }

  const updateData: Record<string, unknown> = {
    actualizado_en: new Date().toISOString(),
  };

  if (params.nombre !== undefined) {
    updateData.nombre = params.nombre.trim();
  }
  if (params.monto_objetivo !== undefined) {
    updateData.monto_objetivo = params.monto_objetivo;
  }
  if (params.fecha_limite !== undefined) {
    updateData.fecha_limite = params.fecha_limite;
  }
  if (params.cuenta_id !== undefined) {
    updateData.cuenta_id = params.cuenta_id;
  }
  if (params.icono !== undefined) {
    updateData.icono = params.icono;
  }
  if (params.color !== undefined) {
    updateData.color = params.color;
  }
  if (params.estado !== undefined) {
    updateData.estado = params.estado;
  }

  const { data, error } = await supabase
    .from('metas_ahorro')
    .update(updateData)
    .eq('id_meta', goalId)
    .eq('usuario_clerk_id', clerkUserId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SavingsGoal;
}

export async function deleteSavingsGoal(
  supabase: SupabaseClient,
  clerkUserId: string,
  goalId: string
): Promise<void> {
  const { error } = await supabase
    .from('metas_ahorro')
    .update({
      visible: false,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id_meta', goalId)
    .eq('usuario_clerk_id', clerkUserId);

  if (error) {
    throw new Error(error.message);
  }
}

export function calculateDaysRemaining(fechaLimite: string): number {
  const target = new Date(fechaLimite);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

export function calculateProgress(
  montoActual: number | string,
  montoObjetivo: number | string
): number {
  const current = Number(montoActual ?? 0);
  const target = Number(montoObjetivo ?? 0);

  if (target <= 0) return 0;

  const progress = (current / target) * 100;
  return Math.min(Math.round(progress), 100);
}