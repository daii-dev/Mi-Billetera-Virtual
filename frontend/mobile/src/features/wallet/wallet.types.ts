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