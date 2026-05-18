import { useEffect, useState } from 'react';

import { useAuth } from '@clerk/expo';

import { MovementManagerScreen } from '@/features/wallet/MovementManagerScreen';

import {
  Category,
} from '@/features/wallet/wallet.types';

import { getCategoriesByType } from '@/features/wallet/wallet.service';

import { useSupabase } from '@/lib/useSupabase';

import { colors } from '@/theme/colors';

export default function IncomeScreen() {
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
          'income'
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
      categories={categories}
    />
  );
}