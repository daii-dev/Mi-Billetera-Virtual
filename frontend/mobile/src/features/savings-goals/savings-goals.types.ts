export type SavingsGoal = {
  id_meta: string;
  usuario_clerk_id: string;
  nombre: string;
  monto_objetivo: number | string;
  monto_actual: number | string;
  fecha_limite: string;
  cuenta_id: string | null;
  icono: string | null;
  color: string | null;
  estado: SavingsGoalStatus;
  visible: boolean;
  creado_en: string;
  actualizado_en: string;
};

export type CreateSavingsGoalParams = {
  nombre: string;
  monto_objetivo: number;
  fecha_limite: string;
  cuenta_id?: string;
  icono?: string;
  color?: string;
};

export type UpdateSavingsGoalParams = {
  nombre?: string;
  fecha_limite?: string;
  icono?: string | null;
  color?: string | null;
};

export type SavingsGoalStatus = 'activa' | 'completada' | 'vencida' | 'gastada';

export type AbonoMetaAhorro = {
  id_abono: string;
  meta_id: string;
  cuenta_id: string;
  movimiento_id: string | null;
  usuario_clerk_id: string;
  monto: number | string;
  fecha_abono: string;
  nota: string | null;
  creado_en: string;
  account?: {
    name: string;
  } | null;
};

export type RegisterGoalContributionParams = {
  meta_id: string;
  cuenta_id: string;
  monto: number;
  nota?: string | null;
};

export type GoalSavingsNeeded = {
  remainingAmount: number;
  daysRemaining: number;
  daily: number;
  weekly: number;
  monthly: number;
};

export type GoalDeletionRefundSummary = {
  totalAmount: number;
  accounts: Array<{
    accountId: string;
    accountName: string;
    amount: number;
  }>;
};
