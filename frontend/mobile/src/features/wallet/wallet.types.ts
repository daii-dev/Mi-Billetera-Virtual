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

export type MovementType = 'income' | 'expense';

export type MovementSource = 'initial_balance' | 'manual';

export type Movement = {
  id: string;
  clerk_user_id: string;
  account_id: string;
  type: MovementType;
  source: MovementSource;
  title: string;
  description: string | null;
  amount: number | string;
  currency: string;
  category_name: string | null;
  movement_date: string;
  created_at: string;
  updated_at: string;
  account?: {
    name: string;
  } | null;
};
export type Category = {
  id: string;
  clerk_user_id: string;
  type: MovementType;
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
