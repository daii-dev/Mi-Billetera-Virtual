import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  StatisticsData,
  StatisticsFilters,
  StatisticsMovementType,
  CategoryStatistic,
  TopCategoryData,
  PeriodData,
} from './statistics.types';
import type { ReportMovement } from '@/features/reports/report.types';
import { enrichMovementsWithCategories } from '@/features/wallet/wallet.service';
import {
  generateDailyTrendDates,
  generateMonthlyTrendDates,
  generateYearlyTrendDates,
  getDateLabel,
  getMonthLabel,
  getYearLabel,
} from './statisticsPeriods';

type ReportMovementQueryFilters = StatisticsFilters & {
  clerkUserId: string;
};

function applyMovementFilters(
  query: any,
  filters: ReportMovementQueryFilters
) {
  let filteredQuery = query
    .eq('clerk_user_id', filters.clerkUserId)
    .gte('movement_date', filters.dateRange.startDate)
    .lte('movement_date', filters.dateRange.endDate)
    .eq('type', filters.type);

  if (filters.accountId) {
    filteredQuery = filteredQuery.eq('account_id', filters.accountId);
  }

  return filteredQuery;
}

export async function getStatisticsMovements(
  supabase: SupabaseClient,
  clerkUserId: string,
  filters: StatisticsFilters
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

function toAmount(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function calculateCategoryStatistics(
  movements: ReportMovement[]
): CategoryStatistic[] {
  const categoryMap = new Map<string, CategoryStatistic>();
  const total = movements.reduce((sum, m) => sum + toAmount(m.amount), 0);

  movements.forEach((movement) => {
    const categoryName = movement.category_name || 'Sin categoría';
    const existing = categoryMap.get(categoryName) || {
      categoryName,
      categoryIcon: movement.category_icon,
      categoryColor: movement.category_color,
      amount: 0,
      percentage: 0,
      movementCount: 0,
    };

    categoryMap.set(categoryName, {
      ...existing,
      amount: existing.amount + toAmount(movement.amount),
      movementCount: existing.movementCount + 1,
    });
  });

  return Array.from(categoryMap.values())
    .map((cat) => ({
      ...cat,
      percentage: total > 0 ? (cat.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function getTopCategories(
  categories: CategoryStatistic[]
): TopCategoryData[] {
  return categories.slice(0, 5).map((cat, index) => ({
    rank: index + 1,
    categoryName: cat.categoryName,
    categoryIcon: cat.categoryIcon,
    categoryColor: cat.categoryColor,
    amount: cat.amount,
    percentage: cat.percentage,
    movementCount: cat.movementCount,
  }));
}

function calculateTrendData(
  movements: ReportMovement[],
  trendDates: string[],
  period: 'daily' | 'monthly' | 'yearly'
): PeriodData[] {
  const movementsByPeriod = new Map<string, ReportMovement[]>();

  // Group movements by period
  movements.forEach((movement) => {
    let periodKey = movement.movement_date;

    if (period === 'monthly') {
      const parts = periodKey.split('-');
      periodKey = `${parts[0]}-${parts[1]}-01`;
    } else if (period === 'yearly') {
      const year = movement.movement_date.split('-')[0];
      periodKey = `${year}-01-01`;
    }

    const existing = movementsByPeriod.get(periodKey) || [];
    movementsByPeriod.set(periodKey, [...existing, movement]);
  });

  // Create trend data for each date
  return trendDates
    .map((date) => {
      const periodMovements = movementsByPeriod.get(date) || [];
      const amount = periodMovements.reduce(
        (sum, m) => sum + toAmount(m.amount),
        0
      );

      let label = '';
      if (period === 'daily') {
        label = getDateLabel(date);
      } else if (period === 'monthly') {
        label = getMonthLabel(date);
      } else {
        label = getYearLabel(date);
      }

      return {
        date,
        label,
        amount,
        movementCount: periodMovements.length,
      };
    })
    .filter((d) => d.movementCount > 0);
}

export async function getStatisticsData(
  supabase: SupabaseClient,
  clerkUserId: string,
  filters: StatisticsFilters
): Promise<StatisticsData> {
  const movements = await getStatisticsMovements(supabase, clerkUserId, filters);

  const categories = calculateCategoryStatistics(movements);
  const topCategories = getTopCategories(categories);
  const total = movements.reduce((sum, m) => sum + toAmount(m.amount), 0);

  // Generate trend dates based on period
  let trendDates: string[] = [];
  if (filters.period === 'daily') {
    trendDates = generateDailyTrendDates(
      filters.dateRange.startDate,
      filters.dateRange.endDate
    );
  } else if (filters.period === 'monthly') {
    trendDates = generateMonthlyTrendDates(
      filters.dateRange.startDate,
      filters.dateRange.endDate
    );
  } else {
    trendDates = generateYearlyTrendDates(
      filters.dateRange.startDate,
      filters.dateRange.endDate
    );
  }

  const trend = calculateTrendData(movements, trendDates, filters.period);

  // Calculate average per day
  let averagePerDay = 0;
  if (movements.length > 0) {
    const movementDates = movements.map((m) => new Date(m.movement_date).getTime());
    const maxDate = Math.max(...movementDates);
    const minDate = Math.min(...movementDates);
    const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    averagePerDay = total / daysDiff;
  }

  return {
    period: filters.period,
    type: filters.type,
    dateRange: filters.dateRange,
    total,
    categories,
    trend,
    topCategories,
    movementCount: movements.length,
    averagePerDay,
  };
}
