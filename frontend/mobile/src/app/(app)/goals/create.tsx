import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { router } from 'expo-router';
import {
  ArrowLeft,
  Target,
} from 'lucide-react-native';
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

import { GoalForm } from '@/components/savings-goals/GoalForm';
import { createSavingsGoal } from '@/features/savings-goals/savings-goals.service';
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

export default function CreateGoalScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const supabase = useSupabase();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [personalAccount, setPersonalAccount] = useState<Account | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace('/sign-in');
      return;
    }

    try {
      const account = await getPersonalAccount(supabase, userId);
      setPersonalAccount(account);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cargar la cuenta');
    } finally {
      setLoadingAccount(false);
    }
  }, [isLoaded, isSignedIn, userId, supabase]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  async function handleSubmit(values: FormSubmitValues) {
    if (!userId) return;

    try {
      if (!values.monto_objetivo) {
        throw new Error('El monto objetivo debe ser mayor a 0');
      }

      setSaving(true);
      await createSavingsGoal(supabase, userId, {
        nombre: values.nombre,
        monto_objetivo: values.monto_objetivo,
        fecha_limite: values.fecha_limite,
        cuenta_id: values.cuenta_id || undefined,
        icono: values.icono || undefined,
        color: values.color || undefined,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo crear la meta');
    } finally {
      setSaving(false);
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
        <Text style={styles.topTitle}>Nueva Meta</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Target size={30} color="#FFFFFF" />
          </View>
          <View style={styles.heroTextBox}>
            <Text style={styles.heroTitle}>Define tu objetivo</Text>
            <Text style={styles.heroText}>
              Registra nombre, monto objetivo y fecha limite para empezar con Bs. 0,00 ahorrados.
            </Text>
          </View>
        </View>

        {loadingAccount ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loaderText}>Preparando formulario...</Text>
          </View>
        ) : (
          <GoalForm
            personalAccount={personalAccount}
            submitLabel="Guardar Meta"
            loading={saving}
            onSubmit={handleSubmit}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    hero: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: theme.mode === 'dark' ? '#172554' : '#082B8C',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    heroTextBox: {
      flex: 1,
      marginLeft: 14,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '900',
    },
    heroText: {
      color: '#DDE7FF',
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
      marginTop: 5,
    },
    loaderBox: {
      minHeight: 160,
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
