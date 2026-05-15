import type { SupabaseClient } from '@supabase/supabase-js';

import {
  Account,
  Profile,
  WalletStatus,
} from './wallet.types';

const INITIAL_ACCOUNT_NAME = 'Personal';

type EnsureWalletParams = {
  clerkUserId: string;
  email: string;
  fullName?: string | null;
};

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

    return data as Account;
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

  return data as Account;
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

  return data as Account;
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

export function money(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  return `Bs. ${amount.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}