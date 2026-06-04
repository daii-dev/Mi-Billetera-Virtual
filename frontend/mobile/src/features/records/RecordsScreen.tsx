import {
  useEffect,
  useState,
} from 'react';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { RecordTypeTabs } from '@/features/records/components/RecordTypeTabs';
import {
  MovementManagerScreen,
} from '@/features/records/MovementManagerScreen';
import { recordsConfig } from '@/features/records/records.config';
import { getCategoriesByType } from '@/features/wallet/wallet.service';
import {
  Category,
  ManualMovementType,
} from '@/features/wallet/wallet.types';
import {
  PrivateScreenLayout,
} from '@/layouts/private-screen/PrivateScreenLayout';
import { useSupabase } from '@/lib/useSupabase';
import { useAuth } from '@clerk/expo';

export default function RecordsScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const supabase = useSupabase();
  const params = useLocalSearchParams<{ type?: string }>();

  const [selectedType, setSelectedType] = useState<ManualMovementType>('income');
  useEffect(() => {
    if (params.type === 'income' || params.type === 'expense') {
        setSelectedType(params.type);
    }
  }, [params.type]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    async function loadCategories() {
      if (!userId) return;

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

  const currentConfig = recordsConfig[selectedType];

  return (
    <PrivateScreenLayout
      title="Registros"
      currentKey="records"
    >
      <MovementManagerScreen
        key={selectedType}
        type={selectedType}
        title="Registros"
        listTitle={currentConfig.listTitle}
        registerButtonText={currentConfig.registerButtonText}
        registerTitle={currentConfig.registerTitle}
        editTitle={currentConfig.editTitle}
        deleteTitle={currentConfig.deleteTitle}
        deleteMessage={currentConfig.deleteMessage}
        successTitle={currentConfig.successTitle}
        successMessage={currentConfig.successMessage}
        headerColor={currentConfig.headerColor}
        buttonColor={currentConfig.buttonColor}
        placeholder={currentConfig.placeholder}
        categories={categories}
        showHeader={false}
        showRegisterButton={false}
        showFloatingButton
        contentHeader={
          <RecordTypeTabs
            selectedType={selectedType}
            onSelectType={setSelectedType}
          />
        }
      />
    </PrivateScreenLayout>
  );
}