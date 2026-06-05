import {
  useEffect,
  useState,
} from 'react';

import { getCategoriesByType } from '@/features/wallet/wallet.service';
import {
  Category,
  ManualMovementType,
} from '@/features/wallet/wallet.types';
import { useSupabase } from '@/lib/useSupabase';

type UseRecordCategoriesParams = {
  userId: string | null | undefined;
  selectedType: ManualMovementType;
};

export function useRecordCategories({
  userId,
  selectedType,
}: UseRecordCategoriesParams) {
  const supabase = useSupabase();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function loadCategories() {
      if (!userId) {
        setCategories([]);
        return;
      }

      try {
        const data = await getCategoriesByType(
          supabase,
          userId,
          selectedType
        );

        setCategories(data);
      } catch (error) {
        console.log('ERROR RECORDS CATEGORIES:', error);
        setCategories([]);
      }
    }

    loadCategories();
  }, [supabase, userId, selectedType]);

  return {
    categories,
  };
}