import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SuccessFeedbackModal,
} from '@/components/feedback/SuccessFeedbackModal';
import { AppButton } from '@/components/ui/AppButton';
import {
  GoalContributionModal,
} from '@/features/savings-goals/components/GoalContributionModal';
import { GoalForm } from '@/features/savings-goals/components/GoalForm';
import {
  calculateDaysRemaining,
  calculateGoalProgress,
  calculateRemainingAmount,
  calculateSavingsNeeded,
  getSavingsGoalById,
  registerGoalContribution,
  updateExpiredGoalsIfNeeded,
  updateSavingsGoal,
} from '@/features/savings-goals/savings-goals.service';
import { SavingsGoal } from '@/features/savings-goals/savings-goals.types';
import {
  getPersonalAccount,
  getUserAccounts,
  money,
} from '@/features/wallet/wallet.service';
import { Account } from '@/features/wallet/wallet.types';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';
import { useAuth } from '@clerk/expo';

type FormSubmitValues = {
  nombre: string;
  monto_objetivo?: number;
  fecha_limite: string;
  cuenta_id: string | null;
  icono: string | null;
  color: string | null;
};

export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, isLoaded, isSignedIn } = useAuth();
  const supabase = useSupabase();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [personalAccount, setPersonalAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [contributionModalVisible, setContributionModalVisible] = useState(false);
  const [savingContribution, setSavingContribution] = useState(false);

  const loadGoal = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace('/sign-in');
      return;
    }

    if (!id) {
      router.back();
      return;
    }

    try {
      await updateExpiredGoalsIfNeeded(supabase, userId);

      const [goalData, account, userAccounts] = await Promise.all([
        getSavingsGoalById(supabase, userId, id),
        getPersonalAccount(supabase, userId),
        getUserAccounts(supabase, userId),
      ]);

      if (!goalData) {
        Alert.alert('Meta no encontrada', 'La meta ya no esta disponible');
        router.back();
        return;
      }

      setGoal(goalData);
      setPersonalAccount(account);
      setAccounts(userAccounts);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cargar la meta');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, userId, id, supabase]);

  useEffect(() => {
    loadGoal();
  }, [loadGoal]);

  async function handleSubmit(values: FormSubmitValues) {
    if (!userId || !id) return;

    try {
      setSaving(true);
      await updateSavingsGoal(supabase, userId, id, {
        nombre: values.nombre,
        fecha_limite: values.fecha_limite,
        icono: values.icono,
        color: values.color,
      });
      setSuccessModalVisible(true);

      setTimeout(() => {
        setSuccessModalVisible(false);
        router.back();
      }, 1200);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo actualizar la meta');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegisterContribution(params: {
    cuentaId: string;
    monto: number;
    nota: string | null;
  }) {
    if (!userId || !id || !goal) return;

    try {
      setSavingContribution(true);
      const updatedGoal = await registerGoalContribution(supabase, {
        meta_id: goal.id_meta,
        cuenta_id: params.cuentaId,
        monto: params.monto,
        nota: params.nota,
      });

      const freshAccounts = await getUserAccounts(supabase, userId);

      setGoal(updatedGoal);
      setAccounts(freshAccounts);
      setContributionModalVisible(false);

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

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topTitle}>Editar Meta</Text>
          <View style={styles.topSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {loading || !goal ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loaderText}>Cargando meta...</Text>
            </View>
          ) : (
            <>
              <GoalProgressDetail
                goal={goal}
                onContribute={() => setContributionModalVisible(true)}
              />

              <GoalForm
                initialGoal={goal}
                personalAccount={personalAccount}
                submitLabel="Actualizar Meta"
                loading={saving}
                onSubmit={handleSubmit}
              />
            </>
          )}
        </ScrollView>

        <GoalContributionModal
          visible={contributionModalVisible}
          goal={goal}
          accounts={accounts}
          loading={savingContribution}
          onClose={() => {
            if (!savingContribution) {
              setContributionModalVisible(false);
            }
          }}
          onConfirm={handleRegisterContribution}
        />
      </KeyboardAvoidingView>
      <SuccessFeedbackModal
      visible={successModalVisible}
      title="Editar Meta de Ahorro"
      message="Meta de ahorro editada correctamente"
      onRequestClose={() => setSuccessModalVisible(false)}
    />
  </>
  );
}

function GoalProgressDetail({
  goal,
  onContribute,
}: {
  goal: SavingsGoal;
  onContribute: () => void;
}) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const progress = calculateGoalProgress(goal);
  const remainingAmount = calculateRemainingAmount(goal);
  const savingsNeeded = calculateSavingsNeeded(goal);
  const daysRemaining = calculateDaysRemaining(goal.fecha_limite);
  const isCompleted = goal.estado === 'completada';
  const isSpent = goal.estado === 'gastada';
  const isExpired = goal.estado === 'vencida' || (!isCompleted && daysRemaining < 0);
  const canContribute = !isCompleted && !isExpired && !isSpent;

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <Text style={styles.goalName}>{goal.nombre}</Text>
        <View style={[
          styles.statusBadge,
          isCompleted && styles.statusCompleted,
          isExpired && styles.statusExpired,
        ]}>
          <Text style={styles.statusText}>
            {isCompleted ? 'Completada' : isSpent ? 'Gastada' : isExpired ? 'Vencida' : 'Activa'}
          </Text>
        </View>
      </View>

      {isCompleted && (
        <Text style={styles.completedText}>¡Meta alcanzada!</Text>
      )}

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>{progress}% de avance</Text>

      <View style={styles.metricsGrid}>
        <Metric label="Ahorrado" value={money(goal.monto_actual)} />
        <Metric label="Objetivo" value={money(goal.monto_objetivo)} />
        <Metric label="Faltante" value={money(remainingAmount)} />
        <Metric
          label="Tiempo"
          value={isSpent ? 'Gastada' : isCompleted ? 'Completada' : daysRemaining > 0 ? `${daysRemaining} dias` : 'Vencida'}
        />
      </View>

      <AppButton
        title={canContribute ? 'Abonar a esta meta' : 'Abonos no disponibles'}
        onPress={onContribute}
        disabled={!canContribute}
      />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topBar: {
      minHeight: 80,
      backgroundColor: theme.colors.sidebarHeader,
      paddingHorizontal: 18,
      paddingTop: 32,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    topTitle: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
    },
    topSpacer: {
      width: 26,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    detailCard: {
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 16,
      gap: 12,
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    goalName: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '900',
    },
    completedText: {
      color: colors.secondary,
      fontSize: 16,
      fontWeight: '900',
    },
    statusBadge: {
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: theme.colors.primary,
    },
    statusCompleted: {
      backgroundColor: colors.secondary,
    },
    statusExpired: {
      backgroundColor: colors.gray,
    },
    statusText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    progressTrack: {
      height: 11,
      borderRadius: 8,
      backgroundColor: theme.mode === 'dark' ? '#334155' : '#E5E7EB',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 8,
      backgroundColor: colors.secondary,
    },
    progressText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '800',
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricBox: {
      width: '48%',
      borderRadius: 12,
      padding: 10,
      backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#F8FAFC',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
    },
    metricValue: {
      marginTop: 5,
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '900',
    },
    savingsNeededBox: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#F8FAFC',
      padding: 12,
      gap: 4,
    },
    savingsNeededTitle: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '900',
      marginBottom: 2,
    },
    savingsNeededText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    noticeBox: {
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#F8FAFC',
      marginBottom: 16,
    },
    noticeText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 18,
    },
    loaderBox: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loaderText: {
      marginTop: 10,
      color: theme.colors.text,
      fontWeight: '800',
    },
  });
}
