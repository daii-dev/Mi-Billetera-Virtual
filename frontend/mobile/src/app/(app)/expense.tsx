import { expenseCategories } from '@/features/wallet/movement.constants';
import { MovementManagerScreen } from '@/features/wallet/MovementManagerScreen';
import { colors } from '@/theme/colors';

export default function ExpenseScreen() {
  return (
    <MovementManagerScreen
      type="expense"
      title="Gastos"
      listTitle="Gastos recientes"
      registerButtonText="Registrar gasto"
      registerTitle="Registrar Gasto"
      editTitle="Editar Gasto"
      deleteTitle="Eliminar gasto"
      deleteMessage="¿Estas seguro que quieres eliminar este gasto?"
      successTitle="Nuevo Gasto"
      successMessage="Gasto guardado correctamente"
      headerColor="#9B241B"
      buttonColor={colors.expense}
      placeholder="Ej. Compra de viveres"
      categories={expenseCategories}
    />
  );
}