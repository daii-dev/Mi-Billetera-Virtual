import type { SupabaseClient } from '@supabase/supabase-js';

import {
  PlannedPayment,
  PlannedPaymentPayload,
} from './planned-payments.types';

function validatePaymentDate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const date = new Date(`${dateString}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

export async function processDuePlannedPayments(
  supabase: SupabaseClient
): Promise<number> {
  const { data, error } = await supabase.rpc('process_due_planned_payments');

  if (error) {
    throw new Error(error.message);
  }

  return Number(data ?? 0);
}

export async function getPlannedPayments(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<PlannedPayment[]> {
  const { data, error } = await supabase
    .from('planned_payments')
    .select(`
      *,
      account:accounts (
        name
      )
    `)
    .eq('clerk_user_id', clerkUserId)
    .eq('is_active', true)
    .order('next_payment_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PlannedPayment[];
}

export async function createPlannedPayment(
  supabase: SupabaseClient,
  payload: PlannedPaymentPayload
): Promise<PlannedPayment> {
  const cleanName = payload.name.trim();
  const cleanCategory = payload.categoryName.trim();

  if (!cleanName) {
    throw new Error('Ingresa el nombre del pago');
  }

  if (payload.amount <= 0) {
    throw new Error('El monto debe ser mayor a cero');
  }

  if (!payload.accountId) {
    throw new Error('Selecciona una cuenta');
  }

  if (!cleanCategory) {
    throw new Error('Selecciona una categoría');
  }

  if (!validatePaymentDate(payload.nextPaymentDate)) {
    throw new Error('Ingresa una fecha válida con formato YYYY-MM-DD');
  }

  const { data, error } = await supabase
    .from('planned_payments')
    .insert({
      clerk_user_id: payload.clerkUserId,
      account_id: payload.accountId,
      name: cleanName,
      amount: payload.amount,
      category_name: cleanCategory,
      next_payment_date: payload.nextPaymentDate,
      recurrence: 'monthly',
      is_active: true,
    })
    .select(`
      *,
      account:accounts (
        name
      )
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PlannedPayment;
}

export async function updatePlannedPayment(
  supabase: SupabaseClient,
  paymentId: string,
  payload: PlannedPaymentPayload
): Promise<PlannedPayment> {
  const cleanName = payload.name.trim();
  const cleanCategory = payload.categoryName.trim();

  if (!cleanName) {
    throw new Error('Ingresa el nombre del pago');
  }

  if (payload.amount <= 0) {
    throw new Error('El monto debe ser mayor a cero');
  }

  if (!payload.accountId) {
    throw new Error('Selecciona una cuenta');
  }

  if (!cleanCategory) {
    throw new Error('Selecciona una categoría');
  }

  if (!validatePaymentDate(payload.nextPaymentDate)) {
    throw new Error('Ingresa una fecha válida con formato YYYY-MM-DD');
  }

  const { data, error } = await supabase
    .from('planned_payments')
    .update({
      account_id: payload.accountId,
      name: cleanName,
      amount: payload.amount,
      category_name: cleanCategory,
      next_payment_date: payload.nextPaymentDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('clerk_user_id', payload.clerkUserId)
    .select(`
      *,
      account:accounts (
        name
      )
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PlannedPayment;
}

export async function deletePlannedPayment(
  supabase: SupabaseClient,
  paymentId: string,
  clerkUserId: string
): Promise<void> {
  const { error } = await supabase
    .from('planned_payments')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    throw new Error(error.message);
  }
}