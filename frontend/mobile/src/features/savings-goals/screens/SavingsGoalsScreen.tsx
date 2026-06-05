import {
  useCallback,
  useState,
} from 'react';

import {
  router,
  useFocusEffect,
} from 'expo-router';
import { Target } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppEmptyState } from '@/components/empty-state/AppEmptyState';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { GoalCard } from '@/features/savings-goals/components/GoalCard';
import {
  GoalContributionModal,
} from '@/features/savings-goals/components/GoalContributionModal';
import {
  GoalDeleteRefundModal,
} from '@/features/savings-goals/components/GoalDeleteRefundModal';
import {
  deleteSavingsGoal,
  getGoalDeletionRefundSummary,
  getSavingsGoals,
  registerGoalContribution,
  updateExpiredGoalsIfNeeded,
} from '@/features/savings-goals/savings-goals.service';
import {
  GoalDeletionRefundSummary,
  SavingsGoal,
} from '@/features/savings-goals/savings-goals.types';
import {
  getUserAccounts,
  money,
} from '@/features/wallet/wallet.service';
import { Account } from '@/features/wallet/wallet.types';
import {
  PrivateScreenLayout,
} from '@/layouts/private-screen/PrivateScreenLayout';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';
import { useAuth } from '@clerk/expo';

export default function GoalsScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const supabase = useSupabase();
  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(theme);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [contributionModalVisible, setContributionModalVisible] = useState(false);
  const [savingContribution, setSavingContribution] = useState(false);
  const [deleteRefundModalVisible, setDeleteRefundModalVisible] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [deleteRefundSummary, setDeleteRefundSummary] =
    useState<GoalDeletionRefundSummary | null>(null);
  const [selectedRefundAccountId, setSelectedRefundAccountId] = useState('');
  const [refundAccountOptionsVisible, setRefundAccountOptionsVisible] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState(false);

  const loadGoals = useCallback(async (showFullLoader = false) => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace('/sign-in');
      return;
    }

    try {
      if (showFullLoader) {
        setLoading(true);
      }

      await updateExpiredGoalsIfNeeded(supabase, userId);

      const [goalsData, userAccounts] = await Promise.all([
        getSavingsGoals(supabase, userId),
        getUserAccounts(supabase, userId),
      ]);

      setAccounts(userAccounts);
      setGoals(goalsData);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudieron cargar tus metas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isLoaded, isSignedIn, userId, supabase]);

  useFocusEffect(
    useCallback(() => {
      loadGoals(true);
    }, [loadGoals])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadGoals(false);
  }

  async function handleDelete(goal: SavingsGoal) {
    if (!userId) return;

    try {
      const refundSummary = await getGoalDeletionRefundSummary(supabase, userId, goal.id_meta);

      if (refundSummary.requiresRefundAccount) {
        if (accounts.length === 0) {
          Alert.alert(
            'Cuenta activa requerida',
            'Crea una cuenta activa para recibir el reembolso antes de eliminar esta meta.'
          );
          return;
        }

        setGoalToDelete(goal);
        setDeleteRefundSummary(refundSummary);
        setSelectedRefundAccountId(accounts[0]?.id ?? '');
        setRefundAccountOptionsVisible(false);
        setDeleteRefundModalVisible(true);
        return;
      }

      const message = buildDeleteConfirmationMessage(goal, refundSummary);

      Alert.alert(
        'Eliminar meta',
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar y devolver',
            style: 'destructive',
            onPress: async () => {
              await confirmDeleteGoal(goal.id_meta);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo preparar la eliminacion de la meta');
    }
  }

  async function confirmDeleteGoal(goalId: string, refundAccountId?: string | null) {
    if (!userId) return;

    try {
      setDeletingGoal(true);

      await deleteSavingsGoal(supabase, goalId, refundAccountId);

      const [freshGoals, freshAccounts] = await Promise.all([
        getSavingsGoals(supabase, userId),
        getUserAccounts(supabase, userId),
      ]);

      setGoals(freshGoals);
      setAccounts(freshAccounts);
      closeDeleteRefundModal();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo eliminar la meta');
    } finally {
      setDeletingGoal(false);
    }
  }

  function closeDeleteRefundModal() {
    if (deletingGoal) return;

    setDeleteRefundModalVisible(false);
    setGoalToDelete(null);
    setDeleteRefundSummary(null);
    setSelectedRefundAccountId('');
    setRefundAccountOptionsVisible(false);
  }

  function handleConfirmRefundAccountDelete() {
    if (!goalToDelete) return;

    if (!selectedRefundAccountId) {
      Alert.alert(
        'Cuenta requerida',
        'Selecciona una cuenta activa para recibir el reembolso.'
      );
      return;
    }

    confirmDeleteGoal(goalToDelete.id_meta, selectedRefundAccountId);
  }

  function openContributionModal(goal: SavingsGoal) {
    setSelectedGoal(goal);
    setContributionModalVisible(true);
  }

  function closeContributionModal() {
    if (savingContribution) return;

    setContributionModalVisible(false);
    setSelectedGoal(null);
  }

  function openHistoryScreen(goal: SavingsGoal) {
    router.push(`/goals/history/${goal.id_meta}`);
  }

  async function handleRegisterContribution(params: {
    cuentaId: string;
    monto: number;
    nota: string | null;
  }) {
    if (!selectedGoal) return;

    try {
      setSavingContribution(true);
      const updatedGoal = await registerGoalContribution(supabase, {
        meta_id: selectedGoal.id_meta,
        cuenta_id: params.cuentaId,
        monto: params.monto,
        nota: params.nota,
      });

      setGoals((current) => current.map((goal) => {
        return goal.id_meta === updatedGoal.id_meta ? updatedGoal : goal;
      }));

      if (userId) {
        const [freshGoals, freshAccounts] = await Promise.all([
          getSavingsGoals(supabase, userId),
          getUserAccounts(supabase, userId),
        ]);
        setGoals(freshGoals);
        setAccounts(freshAccounts);
      }

      setContributionModalVisible(false);
      setSelectedGoal(null);

      Alert.alert(
        updatedGoal.estado === 'completada' ? '¡Meta alcanzada!' : 'Abono registrado',
        updatedGoal.estado === 'completada'
          ? 'Tu meta de ahorro fue completada.'
          : 'El abono se guardo correctamente.'
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo registrar el abono');
    } finally {
      setSavingContribution(false);
    }
  }

  const totalObjective = goals.reduce((sum, goal) => sum + Number(goal.monto_objetivo ?? 0), 0);
  const totalSaved = goals.reduce((sum, goal) => sum + Number(goal.monto_actual ?? 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando metas...</Text>
      </View>
    );
  }

  return (
    <PrivateScreenLayout
      title="Metas de Ahorro"
      currentKey="goals"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Ahorrado</Text>
            <Text style={styles.summaryAmount}>{money(totalSaved)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRight}>
            <Text style={styles.summaryLabel}>Objetivo total</Text>
            <Text style={styles.summaryAmount}>{money(totalObjective)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tus metas activas</Text>
        </View>

        {goals.length === 0 ? (
          <AppEmptyState
            icon={Target}
            title="Aun no tienes metas"
            description="Crea una meta de ahorro con nombre, monto objetivo y fecha limite."
            iconBackgroundColor={theme.colors.primary}
            iconSize={34}
            minHeight={300}
            marginTop={0}
          />
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id_meta}
              goal={goal}
              onEdit={(selectedGoal) => router.push(`/goals/${selectedGoal.id_meta}`)}
              onDelete={handleDelete}
              onContribute={openContributionModal}
              onViewHistory={openHistoryScreen}
            />
          ))
        )}
      </ScrollView>

      <FloatingActionButton
        color={colors.secondary}
        onPress={() => router.push('/goals/create')}
      />
      <GoalContributionModal
        visible={contributionModalVisible}
        goal={selectedGoal}
        accounts={accounts}
        loading={savingContribution}
        onClose={closeContributionModal}
        onConfirm={handleRegisterContribution}
      />
      <GoalDeleteRefundModal
        visible={deleteRefundModalVisible}
        refundSummary={deleteRefundSummary}
        accounts={accounts}
        selectedAccountId={selectedRefundAccountId}
        accountOptionsVisible={refundAccountOptionsVisible}
        loading={deletingGoal}
        onSelectAccount={(accountId) => {
          setSelectedRefundAccountId(accountId);
          setRefundAccountOptionsVisible(false);
        }}
        onToggleAccountOptions={() =>
          setRefundAccountOptionsVisible(!refundAccountOptionsVisible)
        }
        onCancel={closeDeleteRefundModal}
        onConfirm={handleConfirmRefundAccountDelete}
      />
    </PrivateScreenLayout>
  );
}

function buildDeleteConfirmationMessage(
  goal: SavingsGoal,
  refundSummary: GoalDeletionRefundSummary
) {
  const currentAmount = Number(goal.monto_actual ?? 0);

  if (currentAmount <= 0) {
    return '¿Deseas eliminar esta meta de ahorro?';
  }

  if (refundSummary.accounts.length === 1) {
    return `Al eliminar esta meta, se te devolverán ${money(currentAmount)} a tu cuenta ${refundSummary.accounts[0].accountName}. ¿Deseas continuar?`;
  }

  if (refundSummary.accounts.length > 1) {
    return 'Al eliminar esta meta, se devolverán los abonos a las cuentas desde las que fueron realizados. ¿Deseas continuar?';
  }

  return `Al eliminar esta meta, se te devolverán ${money(currentAmount)} a tu(s) cuenta(s). ¿Deseas continuar?`;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      padding: 16,
      paddingBottom: 120,
    },
    summaryCard: {
      minHeight: 100,
      backgroundColor: theme.mode === 'dark' ? '#172554' : '#082B8C',
      borderRadius: 16,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 5,
      elevation: 5,
    },
    summaryLabel: {
      color: '#C7D2FE',
      fontSize: 12,
      fontWeight: '800',
    },
    summaryAmount: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
      marginTop: 6,
    },
    summaryDivider: {
      width: 1,
      height: 48,
      backgroundColor: 'rgba(255,255,255,0.25)',
      marginHorizontal: 16,
    },
    summaryRight: {
      flex: 1,
      alignItems: 'flex-end',
    },
    sectionHeader: {
      marginTop: 22,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 14,
      color: theme.colors.text,
      fontWeight: '800',
    },
  });
}
