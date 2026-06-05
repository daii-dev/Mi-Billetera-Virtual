export type StatisticsPeriodKey = 'daily' | 'monthly' | 'yearly';

export type StatisticsMovementType = 'income' | 'expense';

export type CategoryStatistic = {
  categoryName: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  amount: number;
  percentage: number;
  movementCount: number;
};

export type PeriodData = {
  date: string;
  label: string;
  amount: number;
  movementCount: number;
};

export type TrendData = PeriodData[];

export type TopCategoryData = {
  rank: number;
  categoryName: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  amount: number;
  percentage: number;
  movementCount: number;
};

export type StatisticsData = {
  period: StatisticsPeriodKey;
  type: StatisticsMovementType;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  total: number;
  categories: CategoryStatistic[];
  trend: TrendData;
  topCategories: TopCategoryData[];
  movementCount: number;
  averagePerDay?: number;
};

export type StatisticsFilters = {
  period: StatisticsPeriodKey;
  type: StatisticsMovementType;
  accountId?: string | null;
  dateRange: {
    startDate: string;
    endDate: string;
  };
};
