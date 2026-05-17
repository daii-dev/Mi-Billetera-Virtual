import { incomeCategories } from '@/features/wallet/movement.constants';
import { MovementManagerScreen } from '@/features/wallet/MovementManagerScreen';
import { colors } from '@/theme/colors';

export default function IncomeScreen() {
  return (
    <MovementManagerScreen
      type="income"
      title="Ingresos"
      listTitle="Ingresos recientes"
      registerButtonText="Registrar ingreso"
      registerTitle="Registrar Ingreso"
      editTitle="Editar Ingreso"
      deleteTitle="Eliminar Ingreso"
      deleteMessage="¿Estas seguro que quieres eliminar este ingreso?"
      successTitle="Nuevo Ingreso"
      successMessage="Ingreso guardado correctamente"
      headerColor="#058A32"
      buttonColor={colors.secondary}
      placeholder="Ej. Sueldo"
      categories={incomeCategories}
    />
  );
}