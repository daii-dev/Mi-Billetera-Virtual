import { ManualMovementType } from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';

type RecordsConfigItem = {
  listTitle: string;
  registerButtonText: string;
  registerTitle: string;
  editTitle: string;
  deleteTitle: string;
  deleteMessage: string;
  successTitle: string;
  successMessage: string;
  headerColor: string;
  buttonColor: string;
  placeholder: string;
};

export const recordsConfig: Record<ManualMovementType, RecordsConfigItem> = {
  income: {
    listTitle: 'Ingresos recientes',
    registerButtonText: 'Registrar ingreso',
    registerTitle: 'Registrar Ingreso',
    editTitle: 'Editar Ingreso',
    deleteTitle: 'Eliminar Ingreso',
    deleteMessage: '¿Estas seguro que quieres eliminar este ingreso?',
    successTitle: 'Nuevo Ingreso',
    successMessage: 'Ingreso guardado correctamente',
    headerColor: '#058A32',
    buttonColor: colors.secondary,
    placeholder: 'Ej. Sueldo',
  },
  expense: {
    listTitle: 'Gastos recientes',
    registerButtonText: 'Registrar gasto',
    registerTitle: 'Registrar Gasto',
    editTitle: 'Editar Gasto',
    deleteTitle: 'Eliminar gasto',
    deleteMessage: '¿Estas seguro que quieres eliminar este gasto?',
    successTitle: 'Nuevo Gasto',
    successMessage: 'Gasto guardado correctamente',
    headerColor: '#9B241B',
    buttonColor: colors.expense,
    placeholder: 'Ej. Compra de víveres',
  },
};