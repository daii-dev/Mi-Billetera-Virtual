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
  user_id: string;
  account_id: string;
  type: MovementType;
  title: string;
  amount: number;
  category_name: string | null;
  category_icon: string | null;  // ← AGREGAR ESTA LÍNEA
  category_color: string | null; // ← AGREGAR ESTA LÍNEA
  movement_date: string;
  created_at: string;
  source: 'manual' | 'system';
  account?: Account;
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
export async function getCategoriesByType(
  supabase: any,
  clerkUserId: string,
  type: 'income' | 'expense'
) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('type', type)
    .order('created_at', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data;
}