export type MovementModalMode = 'form' | 'edit' | 'delete' | 'success' | null;

export type MovementSuccessAction = 'create' | 'edit';

export type ValidMovementForm = {
  cleanDescription: string;
  amount: number;
  accountId: string;
  category: string;
  goalId: string | null;
};