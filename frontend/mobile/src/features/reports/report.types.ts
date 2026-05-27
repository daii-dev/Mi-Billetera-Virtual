export type ReportPeriodKey =
  | 'last7days'
  | 'last30days'
  | 'currentMonth'
  | 'previousMonth'
  | 'custom';

export type ReportMovementTypeFilter = 'all' | 'income' | 'expense';

export type ReportFileType = 'pdf' | 'xlsx' | 'csv';

export type ReportSectionKey =
  | 'summary'
  | 'movements'
  | 'statistics'
  | 'charts';

export type ReportDateRange = {
  startDate: string;
  endDate: string;
};

export type ReportFilters = {
  period: ReportPeriodKey;
  dateRange: ReportDateRange;
  accountId?: string | null;
  type: ReportMovementTypeFilter;
  search?: string;
};

export type ReportMovementType = 'income' | 'expense' | 'ahorro';

export type ReportMovementSource =
  | 'initial_balance'
  | 'manual'
  | 'savings_goal';

export type ReportMovement = {
  id: string;
  clerk_user_id: string;
  account_id: string;
  meta_id?: string | null;
  type: ReportMovementType;
  source: ReportMovementSource;
  title: string;
  description?: string | null;
  amount: number | string;
  currency: string | null;
  category_name: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  movement_date: string;
  created_at: string;
  updated_at?: string | null;
  account?: {
    name: string;
  } | null;
  savings_goal_account_names?: string | null;
};

export type ReportAccount = {
  id: string;
  clerk_user_id: string;
  name: string;
  currency: string;
};

export type ReportSummary = {
  totalIncome: number;
  totalExpense: number;
  netTotal: number;
  movementCount: number;
  incomeComparisonPercentage: number | null;
  expenseComparisonPercentage: number | null;
  netComparisonPercentage: number | null;
};

export type ReportMovementGroup = {
  date: string;
  label: string;
  movements: ReportMovement[];
};
