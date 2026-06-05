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
import { GoalForm } from '@/features/savings-goals/components/GoalForm';
import {
  getSavingsGoalById,
  updateExpiredGoalsIfNeeded,
  updateSavingsGoal,
} from '@/features/savings-goals/savings-goals.service';
import { SavingsGoal } from '@/features/savings-goals/savings-goals.types';
import { getPersonalAccount } from '@/features/wallet/wallet.service';
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
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadGoal = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace("/sign-in");
      return;
    }

    if (!id) {
      router.back();
      return;
    }

    try {
      await updateExpiredGoalsIfNeeded(supabase, userId);

      const [goalData, account] = await Promise.all([
        getSavingsGoalById(supabase, userId, id),
        getPersonalAccount(supabase, userId),
      ]);

      if (!goalData) {
        Alert.alert("Meta no encontrada", "La meta ya no esta disponible");
        router.back();
        return;
      }

      setGoal(goalData);
      setPersonalAccount(account);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo cargar la meta");
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
      Alert.alert("Error", error?.message || "No se pudo actualizar la meta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            <GoalForm
              initialGoal={goal}
              personalAccount={personalAccount}
              submitLabel="Actualizar Meta"
              loading={saving}
              onSubmit={handleSubmit}
            />
          )}
        </ScrollView>
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    topTitle: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "900",
    },
    topSpacer: {
      width: 26,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    loaderBox: {
      minHeight: 220,
      alignItems: "center",
      justifyContent: "center",
    },
    loaderText: {
      marginTop: 10,
      color: theme.colors.text,
      fontWeight: "800",
    },
  });
}
