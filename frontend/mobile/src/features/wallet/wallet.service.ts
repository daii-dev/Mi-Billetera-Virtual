import type { SupabaseClient } from '@supabase/supabase-js';
import {
  Account,
  Category,
  Movement,
  Profile,
  WalletStatus,
} from './wallet.types';

const INITIAL_ACCOUNT_NAME = 'Personal';

type EnsureWalletParams = {
  clerkUserId: string;
  email: string;
  fullName?: string | null;
};

// --- SERVICIOS DE CONFIGURACIÓN INICIAL Y PERFIL ---

export async function ensureUserWallet(
  supabase: SupabaseClient,
  params: EnsureWalletParams
): Promise<WalletStatus> {
  const { clerkUserId, email, fullName } = params;

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  const cleanFullName = fullName?.trim() ?? '';
  const cleanEmail = email.trim().toLowerCase();

  const isRealName =
    cleanFullName.length > 0 &&
    cleanFullName.toLowerCase() !== cleanEmail;

  const finalFullName =
    isRealName
      ? cleanFullName
      : existingProfile?.full_name ?? '';

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        clerk_user_id: clerkUserId,
        email,
        full_name: finalFullName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'clerk_user_id',
      }
    );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const accounts = await getUserAccounts(supabase, clerkUserId);

  if (accounts.length > 0) {
    const personalAccount = await getPersonalAccount(supabase, clerkUserId);
    const firstAccount = personalAccount ?? accounts[0];

    const initialBalanceConfigured = accounts.some((account) => {
      const hasConfiguredInitialBalance = Boolean(account.initial_balance_configured);
      const hasInitialBalance = Number(account.initial_balance ?? 0) > 0;
      const hasCurrentBalance = Number(account.current_balance ?? 0) > 0;

      return hasConfiguredInitialBalance || hasInitialBalance || hasCurrentBalance;
    });

    return {
      account: firstAccount,
      initialBalanceConfigured,
    };
  }

  const { data: newAccount, error: insertError } = await supabase
    .from('accounts')
    .insert({
      clerk_user_id: clerkUserId,
      name: INITIAL_ACCOUNT_NAME,
      currency: 'BOB',
      initial_balance: 0,
      current_balance: 0,
      initial_balance_configured: false,
    })
    .select('*')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    account: newAccount as Account,
    initialBalanceConfigured: false,
  };
}

export async function getUserProfile(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile | null;
}

// --- SERVICIOS DE CUENTAS BANCARIAS ---

export async function getUserAccounts(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Account[];
}

export async function getPersonalAccount(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<Account | null> {
  const accounts = await getUserAccounts(supabase, clerkUserId);

  if (accounts.length === 0) {
    return null;
  }

  const configuredAccount = accounts.find((account) => {
    const hasConfiguredInitialBalance = Boolean(account.initial_balance_configured);
    const hasInitialBalance = Number(account.initial_balance ?? 0) > 0;
    const hasCurrentBalance = Number(account.current_balance ?? 0) > 0;

    return hasConfiguredInitialBalance || hasInitialBalance || hasCurrentBalance;
  });

  return configuredAccount ?? accounts[0];
}

export async function getPrincipalAccount(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<Account | null> {
  return await getPersonalAccount(supabase, clerkUserId);
}

export async function setInitialBalance(
  supabase: SupabaseClient,
  clerkUserId: string,
  amount: number
): Promise<Account> {
  const accounts = await getUserAccounts(supabase, clerkUserId);
  const existingAccount = accounts[0] ?? null;

  if (!existingAccount) {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        clerk_user_id: clerkUserId,
        name: INITIAL_ACCOUNT_NAME,
        currency: 'BOB',
        initial_balance: amount,
        current_balance: amount,
        initial_balance_configured: true,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const createdAccount = data as Account;
    await createInitialBalanceMovement(supabase, createdAccount);
    return createdAccount;
  }

  const { data, error } = await supabase
    .from('accounts')
    .update({
      initial_balance: amount,
      current_balance: amount,
      initial_balance_configured: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingAccount.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const updatedAccount = data as Account;
  await createInitialBalanceMovement(supabase, updatedAccount);
  return updatedAccount;
}

export async function createAccount(
  supabase: SupabaseClient,
  clerkUserId: string,
  name: string,
  initialBalance: number
): Promise<Account> {
  const cleanName = name.trim();

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      clerk_user_id: clerkUserId,
      name: cleanName,
      currency: 'BOB',
      initial_balance: initialBalance,
      current_balance: initialBalance,
      initial_balance_configured: true,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const createdAccount = data as Account;
  await createInitialBalanceMovement(supabase, createdAccount);
  return createdAccount;
}

export async function updateAccountName(
  supabase: SupabaseClient,
  accountId: string,
  newName: string
): Promise<Account> {
  const cleanName = newName.trim();

  const { data, error } = await supabase
    .from('accounts')
    .update({
      name: cleanName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Account;
}

export async function deleteAccount(
  supabase: SupabaseClient,
  accountId: string
): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId);

  if (error) {
    throw new Error(error.message);
  }
}

export function getAccountsTotal(accounts: Account[]): number {
  return accounts.reduce((total, account) => {
    return total + Number(account.current_balance ?? 0);
  }, 0);
}

// --- UTILITARIOS FORMATO DINERO BO ---

export function money(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `Bs. ${amount.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// --- SERVICIOS DE MOVIMIENTOS / TRANSACCIONES (ÚNICA COPIA SANEADA) ---

export async function getRecentMovements(
  supabase: SupabaseClient,
  clerkUserId: string,
  limit = 10
): Promise<Movement[]> {
  const { data, error } = await supabase
    .from('movements')
    .select(`
      *,
      account:accounts (
        name
      )
    `)
    .eq('clerk_user_id', clerkUserId)
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return enrichSavingsGoalMovementAccounts(
    supabase,
    clerkUserId,
    (data ?? []) as Movement[]
  );
}

async function enrichSavingsGoalMovementAccounts(
  supabase: SupabaseClient,
  clerkUserId: string,
  movements: Movement[]
): Promise<Movement[]> {
  const metaIds = Array.from(new Set(
    movements
      .filter((movement) => movement.source === 'savings_goal' && movement.meta_id)
      .map((movement) => movement.meta_id as string)
  ));

  if (metaIds.length === 0) {
    return movements;
  }

  const { data, error } = await supabase
    .from('abonos_metas_ahorro')
    .select(`
      meta_id,
      cuenta_id,
      account:accounts (
        name
      )
    `)
    .eq('usuario_clerk_id', clerkUserId)
    .in('meta_id', metaIds);

  if (error) {
    throw new Error(error.message);
  }

  const accountNamesByMeta = new Map<string, string[]>();

  (data ?? []).forEach((contribution: any) => {
    const metaId = contribution.meta_id as string;
    const accountName = contribution.account?.name as string | undefined;

    if (!accountName) {
      return;
    }

    const currentNames = accountNamesByMeta.get(metaId) ?? [];

    if (!currentNames.includes(accountName)) {
      accountNamesByMeta.set(metaId, [...currentNames, accountName]);
    }
  });

  return movements.map((movement) => {
    if (movement.source !== 'savings_goal' || !movement.meta_id) {
      return movement;
    }

    const accountNames = accountNamesByMeta.get(movement.meta_id);

    if (!accountNames || accountNames.length === 0) {
      return movement;
    }

    return {
      ...movement,
      savings_goal_account_names: accountNames.join(', '),
    };
  });
}

async function createInitialBalanceMovement(
  supabase: SupabaseClient,
  account: Account
): Promise<void> {
  const { data: existingMovement, error: existingMovementError } = await supabase
    .from('movements')
    .select('id')
    .eq('account_id', account.id)
    .eq('source', 'initial_balance')
    .maybeSingle();

  if (existingMovementError) {
    throw new Error(existingMovementError.message);
  }

  if (existingMovement) {
    return;
  }

  const amount = Number(account.initial_balance ?? account.current_balance ?? 0);

  const { error } = await supabase
    .from('movements')
    .insert({
      clerk_user_id: account.clerk_user_id,
      account_id: account.id,
      type: 'income',
      source: 'initial_balance',
      title: 'Saldo inicial',
      description: 'Movimiento generado automáticamente al crear la cuenta',
      amount,
      currency: account.currency ?? 'BOB',
      movement_date: new Date().toISOString().slice(0, 10),
    });

  if (error) {
    throw new Error(error.message);
  }
}

type ManualMovementPayload = {
  clerkUserId: string;
  accountId: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  categoryName: string;
};

type GoalExpensePayload = {
  metaId: string;
  accountId: string;
  amount: number;
  description: string;
  categoryName: string;
};

function getMovementDelta(type: 'income' | 'expense', amount: number): number {
  return type === 'income' ? amount : -amount;
}

async function adjustAccountBalance(
  supabase: SupabaseClient,
  accountId: string,
  delta: number
): Promise<void> {
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, current_balance')
    .eq('id', accountId)
    .single();

  if (accountError) {
    throw new Error(accountError.message);
  }

  const currentBalance = Number(account.current_balance ?? 0);
  const newBalance = currentBalance + delta;

  const { error: updateError } = await supabase
    .from('accounts')
    .update({
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function getMovementsByType(
  supabase: SupabaseClient,
  clerkUserId: string,
  type: 'income' | 'expense'
): Promise<Movement[]> {
  const { data, error } = await supabase
    .from('movements')
    .select(`
      *,
      account:accounts (
        name
      )
    `)
    .eq('clerk_user_id', clerkUserId)
    .eq('type', type)
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return enrichSavingsGoalMovementAccounts(
    supabase,
    clerkUserId,
    (data ?? []) as Movement[]
  );
}

export async function createManualMovement(
  supabase: SupabaseClient,
  payload: ManualMovementPayload
): Promise<Movement> {
  const cleanTitle = payload.title.trim();
  const cleanCategory = payload.categoryName.trim();

  const { data, error } = await supabase
    .from('movements')
    .insert({
      clerk_user_id: payload.clerkUserId,
      account_id: payload.accountId,
      type: payload.type,
      source: 'manual',
      title: cleanTitle,
      description: null,
      amount: payload.amount,
      currency: 'BOB',
      category_name: cleanCategory,
      movement_date: new Date().toISOString().slice(0, 10),
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

  const delta = getMovementDelta(payload.type, payload.amount);
  await adjustAccountBalance(supabase, payload.accountId, delta);

  return data as Movement;
}

export async function registerExpenseFromGoal(
  supabase: SupabaseClient,
  payload: GoalExpensePayload
): Promise<Movement> {
  const { data, error } = await supabase.rpc('registrar_gasto_desde_meta', {
    p_meta_id: payload.metaId,
    p_cuenta_id: payload.accountId,
    p_monto: payload.amount,
    p_descripcion: payload.description,
    p_categoria: payload.categoryName,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Movement;
}

export async function updateManualMovement(
  supabase: SupabaseClient,
  movementId: string,
  payload: ManualMovementPayload
): Promise<Movement> {
  const { data: existingMovement, error: existingError } = await supabase
    .from('movements')
    .select('*')
    .eq('id', movementId)
    .single();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingMovement.source !== 'manual') {
    throw new Error('Los movimientos de saldo inicial no se pueden modificar.');
  }

  const oldAccountId = existingMovement.account_id as string;
  const oldType = existingMovement.type as 'income' | 'expense';
  const oldAmount = Number(existingMovement.amount ?? 0);
  const oldDelta = getMovementDelta(oldType, oldAmount);

  const newDelta = getMovementDelta(payload.type, payload.amount);

  const { data, error } = await supabase
    .from('movements')
    .update({
      account_id: payload.accountId,
      type: payload.type,
      title: payload.title.trim(),
      amount: payload.amount,
      category_name: payload.categoryName.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', movementId)
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

  if (oldAccountId === payload.accountId) {
    await adjustAccountBalance(supabase, payload.accountId, newDelta - oldDelta);
  } else {
    await adjustAccountBalance(supabase, oldAccountId, -oldDelta);
    await adjustAccountBalance(supabase, payload.accountId, newDelta);
  }

  return data as Movement;
}

export async function deleteManualMovement(
  supabase: SupabaseClient,
  movementId: string
): Promise<void> {
  const { data: existingMovement, error: existingError } = await supabase
    .from('movements')
    .select('*')
    .eq('id', movementId)
    .single();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingMovement.source !== 'manual') {
    throw new Error('Los movimientos de saldo inicial no se pueden eliminar.');
  }

  const movementType = existingMovement.type as 'income' | 'expense';
  const amount = Number(existingMovement.amount ?? 0);
  const delta = getMovementDelta(movementType, amount);

  const { error } = await supabase
    .from('movements')
    .delete()
    .eq('id', movementId);

  if (error) {
    throw new Error(error.message);
  }

  await adjustAccountBalance(
    supabase,
    existingMovement.account_id,
    -delta
  );
}

// --- SERVICIOS DE GESTIÓN DE CATEGORÍAS (DINÁMICAS SUPABASE) ---

export async function getCategoriesByType(
  supabase: SupabaseClient,
  clerkUserId: string,
  type: 'income' | 'expense'
): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('type', type)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Category[];
}

type CreateCategoryPayload = {
  clerkUserId: string;
  type: 'income' | 'expense';
  name: string;
  icon?: string;
  color?: string;
};

export async function createCategory(
  supabase: SupabaseClient,
  payload: CreateCategoryPayload
): Promise<Category> {
  const cleanName = payload.name.trim();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      clerk_user_id: payload.clerkUserId,
      type: payload.type,
      name: cleanName,
      icon: payload.icon ?? null,
      color: payload.color ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Category;
}

export async function updateCategory(
  supabase: SupabaseClient,
  categoryId: string,
  payload: {
    name: string;
    icon?: string | null;
    color?: string | null;
  }
): Promise<Category> {
  const cleanName = payload.name.trim();

  const { data, error } = await supabase
    .from('categories')
    .update({
      name: cleanName,
      icon: payload.icon ?? null,
      color: payload.color ?? null,
    })
    .eq('id', categoryId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Category;
}

export async function deleteCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<void> {
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  const { data: movementUsingCategory } = await supabase
    .from('movements')
    .select('id')
    .eq('category_name', category.name)
    .eq('type', category.type)
    .eq('clerk_user_id', category.clerk_user_id)
    .limit(1)
    .maybeSingle();

  if (movementUsingCategory) {
    throw new Error(
      'No puedes eliminar una categoría que ya está siendo utilizada.'
    );
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    throw new Error(error.message);
  }
}

// --- NUEVA LÓGICA DE PRESUPUESTOS (TIPADOS CORRECTAMENTE) ---

export async function getBudgets(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('budgets')
    .select(`
      *,
      account:accounts (
        name,
        current_balance
      )
    `)
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getBudgetAccountSpent(
  supabase: SupabaseClient,
  params: {
    userId: string;
    accountId: string;
    categoryName: string;
    startDate: string;
    endDate: string;
  }
): Promise<number> {
  const { userId, accountId, categoryName, startDate, endDate } = params;

  const { data, error } = await supabase
    .from('movements')
    .select('amount')
    .eq('clerk_user_id', userId)
    .eq('account_id', accountId)
    .eq('category_name', categoryName)
    .eq('type', 'expense')
    .gte('movement_date', startDate)
    .lte('movement_date', endDate);

  if (error) {
    console.error("Error en consulta híbrida de presupuesto:", error);
    throw new Error(error.message);
  }

  return data?.reduce((acc: number, m: any) => acc + Number(m.amount), 0) || 0;
}

export async function saveAccountBudget(supabase: SupabaseClient, budgetData: any) {
  const { data: existing } = await supabase
    .from('budgets')
    .select('id')
    .eq('clerk_user_id', budgetData.clerk_user_id)
    .eq('account_id', budgetData.account_id)
    .gte('start_date', budgetData.start_date)
    .lte('end_date', budgetData.end_date)
    .maybeSingle();

  if (existing) {
    throw new Error('Ya existe un presupuesto configurado para esta cuenta en este rango de fechas.');
  }

  const { error } = await supabase
    .from('budgets')
    .insert(budgetData);

  if (error) throw new Error(error.message);
}

export async function deleteBudget(supabase: SupabaseClient, budgetId: string) {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetId);

  if (error) throw new Error(error.message);
}