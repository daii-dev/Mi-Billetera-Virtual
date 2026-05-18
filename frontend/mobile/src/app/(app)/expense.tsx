import { useEffect, useState } from 'react';

import { useAuth } from '@clerk/expo';

import { MovementManagerScreen } from '@/features/wallet/MovementManagerScreen';

import {
  Category,
} from '@/features/wallet/wallet.types';

import { getCategoriesByType } from '@/features/wallet/wallet.service';

import { useSupabase } from '@/lib/useSupabase';

import { colors } from '@/theme/colors';

export default function ExpenseScreen() {
  const supabase = useSupabase();

  const { userId } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function loadCategories() {
      if (!userId) return;

      try {
        const data = await getCategoriesByType(
          supabase,
          userId,
          'expense'
        );

        setCategories(data);
      } catch (error) {
        console.log(error);
      }
    }

    loadCategories();
  }, [supabase, userId]);

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
      categories={categories}
    />
  );
}