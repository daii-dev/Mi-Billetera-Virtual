export type Profile = {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: string;
  clerk_user_id: string;
  name: string;
  currency: string;
  initial_balance: number | string;
  current_balance: number | string;
  initial_balance_configured: boolean;
  created_at: string;
  updated_at: string;
};

export type WalletStatus = {
  account: Account;
  initialBalanceConfigured: boolean;
};

export type MovementType = 'income' | 'expense' | 'ahorro';

export type ManualMovementType = 'income' | 'expense';

export type MovementSource = 'initial_balance' | 'manual' | 'savings_goal';

export type Movement = {
  id: string;
  clerk_user_id: string;
  account_id: string;
  meta_id?: string | null;
  type: MovementType;
  title: string;
  description?: string | null;
  amount: number;
  category_name: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  movement_date: string;
  created_at: string;
  updated_at: string;
  source: MovementSource;
  account?: Account;
};
export type Category = {
  id: string;
  clerk_user_id: string;
  type: ManualMovementType;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
};
export type Budget = {
  id: string;
  clerk_user_id: string;
  category_name: string;
  amount: number;
  period_type: 'monthly' | 'weekly';
  period_year: number;
  period_month: number | null;
  period_week: number | null;
  account_id: string | null;
  created_at: string;
};

export interface BudgetWithProgress extends Budget {
  spent: number;
  progress: number; // Porcentaje 0-100
  color: string; // 'green' | 'yellow' | 'red'
}
