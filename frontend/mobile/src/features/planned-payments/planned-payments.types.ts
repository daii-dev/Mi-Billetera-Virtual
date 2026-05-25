export type PlannedPayment = {
  id: string;
  clerk_user_id: string;
  account_id: string;
  name: string;
  amount: number | string;
  category_name: string;
  next_payment_date: string;
  recurrence: 'monthly';
  is_active: boolean;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
  account?: {
    name: string;
  } | null;
};

export type PlannedPaymentPayload = {
  clerkUserId: string;
  accountId: string;
  name: string;
  amount: number;
  categoryName: string;
  nextPaymentDate: string;
};