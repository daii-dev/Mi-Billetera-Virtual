import type { SupabaseClient } from '@supabase/supabase-js';

import {
  AbonoMetaAhorro,
  CreateSavingsGoalParams,
  GoalDeletionRefundSummary,
  GoalSavingsNeeded,
  RegisterGoalContributionParams,
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

export async function getCompletedSavingsGoals(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('metas_ahorro')
    .select('*')
    .eq('usuario_clerk_id', clerkUserId)
    .eq('visible', true)
    .eq('estado', 'completada')
    .order('actualizado_en', { ascending: false });

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

export async function getGoalContributions(
  supabase: SupabaseClient,
  clerkUserId: string,
  metaId: string
): Promise<AbonoMetaAhorro[]> {
  const { data, error } = await supabase
    .from('abonos_metas_ahorro')
    .select(`
      *,
      account:accounts (
        name
      )
    `)
    .eq('meta_id', metaId)
    .eq('usuario_clerk_id', clerkUserId)
    .order('fecha_abono', { ascending: false })
    .order('creado_en', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as AbonoMetaAhorro[];
}

export async function registerGoalContribution(
  supabase: SupabaseClient,
  params: RegisterGoalContributionParams
): Promise<SavingsGoal> {
  if (params.monto <= 0) {
    throw new Error('El monto del abono debe ser mayor a 0');
  }

  const { data, error } = await supabase.rpc('registrar_abono_meta', {
    p_meta_id: params.meta_id,
    p_cuenta_id: params.cuenta_id,
    p_monto: params.monto,
    p_nota: params.nota || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as SavingsGoal;
}

export async function getGoalDeletionRefundSummary(
  supabase: SupabaseClient,
  clerkUserId: string,
  goalId: string
): Promise<GoalDeletionRefundSummary> {
  const { data, error } = await supabase
    .from('abonos_metas_ahorro')
    .select(`
      cuenta_id,
      monto,
      account:accounts (
        name
      )
    `)
    .eq('meta_id', goalId)
    .eq('usuario_clerk_id', clerkUserId);

  if (error) {
    throw new Error(error.message);
  }

  const accountsById = new Map<string, { accountId: string; accountName: string; amount: number }>();

  (data || []).forEach((contribution: any) => {
    const accountId = contribution.cuenta_id as string;
    const current = accountsById.get(accountId);
    const amount = Number(contribution.monto ?? 0);
    const accountName = contribution.account?.name || 'Cuenta';

    accountsById.set(accountId, {
      accountId,
      accountName: current?.accountName ?? accountName,
      amount: (current?.amount ?? 0) + amount,
    });
  });

  const accounts = Array.from(accountsById.values());

  return {
    totalAmount: accounts.reduce((sum, account) => sum + account.amount, 0),
    accounts,
  };
}

export async function updateExpiredGoalsIfNeeded(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<SavingsGoal[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('metas_ahorro')
    .update({
      estado: 'vencida',
      actualizado_en: new Date().toISOString(),
    })
    .eq('usuario_clerk_id', clerkUserId)
    .eq('visible', true)
    .eq('estado', 'activa')
    .lt('fecha_limite', today)
    .select('*');

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as SavingsGoal[];
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

  if (params.nombre !== undefined && params.nombre.length > 50) {
    throw new Error('El nombre debe tener máximo 50 caracteres');
  }

  const updateData: Record<string, unknown> = {
    actualizado_en: new Date().toISOString(),
  };

  if (params.nombre !== undefined) {
    updateData.nombre = params.nombre.trim();
  }
  if (params.fecha_limite !== undefined) {
    updateData.fecha_limite = params.fecha_limite;
  }
  if (params.icono !== undefined) {
    updateData.icono = params.icono;
  }
  if (params.color !== undefined) {
    updateData.color = params.color;
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
  goalId: string
): Promise<SavingsGoal> {
  const { data, error } = await supabase.rpc('eliminar_meta_ahorro', {
    p_meta_id: goalId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as SavingsGoal;
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

export function calculateGoalProgress(goal: SavingsGoal): number {
  return calculateProgress(goal.monto_actual, goal.monto_objetivo);
}

export function calculateRemainingAmount(goal: SavingsGoal): number {
  const current = Number(goal.monto_actual ?? 0);
  const target = Number(goal.monto_objetivo ?? 0);

  return Math.max(target - current, 0);
}

export function calculateSavingsNeeded(goal: SavingsGoal): GoalSavingsNeeded {
  const remainingAmount = calculateRemainingAmount(goal);
  const daysRemaining = Math.max(calculateDaysRemaining(goal.fecha_limite), 0);

  if (remainingAmount <= 0 || daysRemaining <= 0) {
    return {
      remainingAmount,
      daysRemaining,
      daily: remainingAmount,
      weekly: remainingAmount,
      monthly: remainingAmount,
    };
  }

  const daily = remainingAmount / daysRemaining;

  return {
    remainingAmount,
    daysRemaining,
    daily,
    weekly: daily * 7,
    monthly: daily * 30,
  };
}
