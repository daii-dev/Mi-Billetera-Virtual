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
