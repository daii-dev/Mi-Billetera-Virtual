import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { router } from 'expo-router';
import { Alert } from 'react-native';

import {
  getCompletedSavingsGoals,
} from '@/features/savings-goals/savings-goals.service';
import { SavingsGoal } from '@/features/savings-goals/savings-goals.types';
import {
  getMovementsByType,
  getUserAccounts,
} from '@/features/wallet/wallet.service';
import {
  Account,
  ManualMovementType,
  Movement,
} from '@/features/wallet/wallet.types';
import { useSupabase } from '@/lib/useSupabase';
import { useAuth } from '@clerk/expo';

type UseMovementManagerDataParams = {
  type: ManualMovementType;
};

export function useMovementManagerData({
  type,
}: UseMovementManagerDataParams) {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const supabase = useSupabase();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [completedGoals, setCompletedGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(
    async (showFullLoader = false) => {
      if (!isLoaded) return;

      if (!isSignedIn || !userId) {
        router.replace('/sign-in');
        return;
      }

      try {
        if (showFullLoader) {
          setLoading(true);
        }

        const [
          userAccounts,
          userMovements,
          userCompletedGoals,
        ] = await Promise.all([
          getUserAccounts(supabase, userId),
          getMovementsByType(supabase, userId, type),
          type === 'expense'
            ? getCompletedSavingsGoals(supabase, userId)
            : Promise.resolve([]),
        ]);

        setAccounts(userAccounts);
        setMovements(userMovements);
        setCompletedGoals(userCompletedGoals);
      } catch (error: any) {
        Alert.alert(
          'Error',
          error?.message || 'No se pudieron cargar los movimientos'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isLoaded, isSignedIn, userId, supabase, type]
  );

  useEffect(() => {
    if (isLoaded) {
      loadData(true);
    }
  }, [isLoaded, loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData(false);
  }

  return {
    userId,
    supabase,
    accounts,
    movements,
    completedGoals,
    loading,
    refreshing,
    loadData,
    handleRefresh,
  };
}