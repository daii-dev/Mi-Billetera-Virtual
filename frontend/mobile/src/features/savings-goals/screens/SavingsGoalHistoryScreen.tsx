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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  GoalContributionsHistory,
} from '@/features/savings-goals/components/GoalContributionsHistory';
import {
  getGoalContributions,
  getSavingsGoalById,
} from '@/features/savings-goals/savings-goals.service';
import {
  AbonoMetaAhorro,
  SavingsGoal,
} from '@/features/savings-goals/savings-goals.types';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';
import { useAuth } from '@clerk/expo';

export default function SavingsGoalHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, isLoaded, isSignedIn } = useAuth();
  const supabase = useSupabase();

  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [contributions, setContributions] = useState<AbonoMetaAhorro[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
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
      setLoading(true);

      const [goalData, contributionData] = await Promise.all([
        getSavingsGoalById(supabase, userId, id),
        getGoalContributions(supabase, userId, id),
      ]);

      if (!goalData) {
        Alert.alert('Meta no encontrada', 'La meta ya no esta disponible');
        router.back();
        return;
      }

      setGoal(goalData);
      setContributions(contributionData);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo cargar el historial de abonos'
      );
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, userId, id, supabase]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={26} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.topTitle}>Historial de Abonos</Text>

        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loaderText}>Cargando historial...</Text>
          </View>
        ) : (
          <>
            <View style={styles.goalHeaderCard}>
              <Text style={styles.goalLabel}>Meta de ahorro</Text>
              <Text style={styles.goalName}>
                {goal?.nombre}
              </Text>
            </View>

            <GoalContributionsHistory contributions={contributions} />
          </>
        )}
      </ScrollView>
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
      fontSize: 23,
      fontWeight: '900',
    },
    topSpacer: {
      width: 26,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    goalHeaderCard: {
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 16,
    },
    goalLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 6,
    },
    goalName: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '900',
    },
    loaderBox: {
      minHeight: 240,
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