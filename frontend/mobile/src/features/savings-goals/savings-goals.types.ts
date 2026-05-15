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
  estado: string;
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
  monto_objetivo?: number;
  fecha_limite?: string;
  cuenta_id?: string | null;
  icono?: string | null;
  color?: string | null;
  estado?: string;
};

export type SavingsGoalStatus = 'activa' | 'completada' | 'vencida';