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

import { GoalContributionModal } from '@/components/savings-goals/GoalContributionModal';
import { GoalForm } from '@/components/savings-goals/GoalForm';
import { AppButton } from '@/components/ui/AppButton';
import {
  calculateDaysRemaining,
  calculateGoalProgress,
  calculateRemainingAmount,
  calculateSavingsNeeded,
  getGoalContributions,
  getSavingsGoalById,
  registerGoalContribution,
  updateExpiredGoalsIfNeeded,
  updateSavingsGoal,
} from '@/features/savings-goals/savings-goals.service';
import {
  AbonoMetaAhorro,
  SavingsGoal,
} from '@/features/savings-goals/savings-goals.types';
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
  const [contributions, setContributions] = useState<AbonoMetaAhorro[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

      const [goalData, account, userAccounts, goalContributions] = await Promise.all([
        getSavingsGoalById(supabase, userId, id),
        getPersonalAccount(supabase, userId),
        getUserAccounts(supabase, userId),
        getGoalContributions(supabase, userId, id),
      ]);

      if (!goalData) {
        Alert.alert('Meta no encontrada', 'La meta ya no esta disponible');
        router.back();
        return;
      }

      setGoal(goalData);
      setPersonalAccount(account);
      setAccounts(userAccounts);
      setContributions(goalContributions);
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
      router.back();
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

      const [freshContributions, freshAccounts] = await Promise.all([
        getGoalContributions(supabase, userId, id),
        getUserAccounts(supabase, userId),
      ]);

      setGoal(updatedGoal);
      setContributions(freshContributions);
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

            <ContributionsHistory contributions={contributions} />

            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                Puedes editar los datos principales de la meta. El monto actual no se modifica en HU-15.
              </Text>
            </View>
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
  const isExpired = goal.estado === 'vencida' || (!isCompleted && daysRemaining < 0);
  const canContribute = !isCompleted && !isExpired;

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
            {isCompleted ? 'Completada' : isExpired ? 'Vencida' : 'Activa'}
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
          value={isCompleted ? 'Completada' : daysRemaining > 0 ? `${daysRemaining} dias` : 'Vencida'}
        />
      </View>

      <View style={styles.savingsNeededBox}>
        <Text style={styles.savingsNeededTitle}>Para llegar a tiempo</Text>
        <Text style={styles.savingsNeededText}>Dia: {money(savingsNeeded.daily)}</Text>
        <Text style={styles.savingsNeededText}>Semana: {money(savingsNeeded.weekly)}</Text>
        <Text style={styles.savingsNeededText}>Mes: {money(savingsNeeded.monthly)}</Text>
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

function ContributionsHistory({ contributions }: { contributions: AbonoMetaAhorro[] }) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.historyCard}>
      <Text style={styles.historyTitle}>Historial de abonos</Text>
      {contributions.length === 0 ? (
        <Text style={styles.emptyHistory}>Aun no registraste abonos para esta meta.</Text>
      ) : (
        contributions.map((contribution) => (
          <View key={contribution.id_abono} style={styles.historyItem}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyAmount}>{money(contribution.monto)}</Text>
              <Text style={styles.historyMeta}>
                {formatDate(contribution.fecha_abono)}
                {contribution.account?.name ? ` · ${contribution.account.name}` : ''}
              </Text>
              {contribution.nota ? (
                <Text style={styles.historyNote}>{contribution.nota}</Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
    historyCard: {
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 16,
    },
    historyTitle: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 12,
    },
    emptyHistory: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18,
    },
    historyItem: {
      minHeight: 62,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingVertical: 10,
    },
    historyInfo: {
      gap: 4,
    },
    historyAmount: {
      color: colors.secondary,
      fontSize: 15,
      fontWeight: '900',
    },
    historyMeta: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    historyNote: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: '700',
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
