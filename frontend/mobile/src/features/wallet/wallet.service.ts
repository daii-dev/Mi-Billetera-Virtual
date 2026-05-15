import type { SupabaseClient } from '@supabase/supabase-js';

import {
  Account,
  Profile,
  WalletStatus,
} from './wallet.types';

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

  const { data: existingAccount, error: accountQueryError } = await supabase
    .from('accounts')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('name', 'Personal')
    .maybeSingle();

  if (accountQueryError) {
    throw new Error(accountQueryError.message);
  }

  if (existingAccount) {
    return {
      account: existingAccount as Account,
      initialBalanceConfigured: Boolean(existingAccount.initial_balance_configured),
    };
  }

  const { data: newAccount, error: insertError } = await supabase
    .from('accounts')
    .insert({
      clerk_user_id: clerkUserId,
      name: 'Personal',
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

export async function getPersonalAccount(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<Account | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('name', 'Personal')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Account | null;
}

export async function setInitialBalance(
  supabase: SupabaseClient,
  clerkUserId: string,
  amount: number
): Promise<Account> {
  const { data: existingAccount, error: queryError } = await supabase
    .from('accounts')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('name', 'Personal')
    .maybeSingle();

  if (queryError) {
    throw new Error(queryError.message);
  }

  if (!existingAccount) {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        clerk_user_id: clerkUserId,
        name: 'Personal',
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

export function money(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  return `Bs. ${amount.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}