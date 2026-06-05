import type { SupabaseClient } from '@supabase/supabase-js';

import {
  PlannedPayment,
  PlannedPaymentPayload,
} from './planned-payments.types';

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function validatePaymentDate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split('-').map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function addOneMonthKeepingDay(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);

  const nextMonthIndex = month;
  const lastDayOfNextMonth = new Date(year, nextMonthIndex + 1, 0).getDate();
  const finalDay = Math.min(day, lastDayOfNextMonth);

  const nextDate = new Date(year, nextMonthIndex, finalDay);

  return formatDateInput(nextDate);
}

function normalizePlannedPaymentDate(dateString: string): string {
  if (!validatePaymentDate(dateString)) {
    throw new Error('Ingresa una fecha válida con formato YYYY-MM-DD');
  }

  const today = formatDateInput(new Date());

  if (dateString < today) {
    throw new Error('La fecha programada no puede ser anterior a hoy');
  }

  if (dateString === today) {
    return addOneMonthKeepingDay(dateString);
  }

  return dateString;
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

  const scheduledPaymentDate = normalizePlannedPaymentDate(
    payload.nextPaymentDate
  );

  const { data, error } = await supabase
    .from('planned_payments')
    .insert({
      clerk_user_id: payload.clerkUserId,
      account_id: payload.accountId,
      name: cleanName,
      amount: payload.amount,
      category_name: cleanCategory,
      next_payment_date: scheduledPaymentDate,
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

  const scheduledPaymentDate = normalizePlannedPaymentDate(
    payload.nextPaymentDate
  );

  const { data, error } = await supabase
    .from('planned_payments')
    .update({
      account_id: payload.accountId,
      name: cleanName,
      amount: payload.amount,
      category_name: cleanCategory,
      next_payment_date: scheduledPaymentDate,
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