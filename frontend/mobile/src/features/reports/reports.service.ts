import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ReportAccount,
  ReportFilters,
  ReportMovement,
} from './report.types';
import {
  formatDateValue,
  getPreviousPeriodRange,
} from './reportPeriods';
import { enrichMovementsWithCategories } from '@/features/wallet/wallet.service';

type ReportMovementQueryFilters = ReportFilters & {
  clerkUserId: string;
};

function applyMovementFilters(
  query: any,
  filters: ReportMovementQueryFilters
) {
  let filteredQuery = query
    .eq('clerk_user_id', filters.clerkUserId)
    .gte('movement_date', filters.dateRange.startDate)
    .lte('movement_date', filters.dateRange.endDate);

  if (filters.accountId) {
    filteredQuery = filteredQuery.eq('account_id', filters.accountId);
  }

  if (filters.type !== 'all') {
    filteredQuery = filteredQuery.eq('type', filters.type);
  } else {
    filteredQuery = filteredQuery.in('type', ['income', 'expense']);
  }

  return filteredQuery;
}

export async function getReportAccounts(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<ReportAccount[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, currency, clerk_user_id, visible')
    .eq('clerk_user_id', clerkUserId)
    .eq('visible', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ReportAccount[];
}

export async function getReportMinimumDate(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<string> {
  const [accountResult, movementResult] = await Promise.all([
    supabase
      .from('accounts')
      .select('created_at')
      .eq('clerk_user_id', clerkUserId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('movements')
      .select('movement_date')
      .eq('clerk_user_id', clerkUserId)
      .order('movement_date', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (accountResult.error) {
    throw new Error(accountResult.error.message);
  }

  if (movementResult.error) {
    throw new Error(movementResult.error.message);
  }

  const accountDate = accountResult.data?.created_at
    ? formatDateValue(new Date(accountResult.data.created_at))
    : null;
  const movementDate = movementResult.data?.movement_date ?? null;
  const dates = [accountDate, movementDate].filter(Boolean) as string[];

  if (dates.length === 0) {
    return formatDateValue(new Date());
  }

  return dates.sort()[0];
}

export async function getReportMovements(
  supabase: SupabaseClient,
  clerkUserId: string,
  filters: ReportFilters
): Promise<ReportMovement[]> {
  const query = supabase
    .from('movements')
    .select(`
      *,
      account:accounts (
        name
      )
    `)
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false });

  const { data, error } = await applyMovementFilters(query, {
    ...filters,
    clerkUserId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return enrichMovementsWithCategories(
    supabase,
    clerkUserId,
    (data ?? []) as ReportMovement[]
  );
}

export async function getPreviousPeriodMovements(
  supabase: SupabaseClient,
  clerkUserId: string,
  filters: ReportFilters
): Promise<ReportMovement[]> {
  const previousRange = getPreviousPeriodRange(filters);

  return getReportMovements(supabase, clerkUserId, {
    ...filters,
    dateRange: previousRange,
  });
}
