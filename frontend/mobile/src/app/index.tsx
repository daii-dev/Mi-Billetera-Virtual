import {
  useEffect,
  useState,
} from 'react';

import { router } from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ensureUserWallet } from '@/features/wallet/wallet.service';
import {
  clearPendingFullName,
  getHasSeenOnboarding,
  getPendingFullName,
} from '@/lib/storage';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import {
  useAuth,
  useUser,
} from '@clerk/expo';

export default function IndexScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const supabase = useSupabase();

  const [message, setMessage] = useState('Cargando...');

  useEffect(() => {
    async function checkFlow() {
      if (!isLoaded) return;

      try {
        const hasSeenOnboarding = await getHasSeenOnboarding();

        if (!hasSeenOnboarding) {
          router.replace('/onboarding');
          return;
        }

        if (!isSignedIn || !user) {
          router.replace('/sign-in');
          return;
        }

        setMessage('Preparando tu billetera...');

        const pendingFullName = await getPendingFullName();

        const email =
          user.primaryEmailAddress?.emailAddress ??
          user.emailAddresses[0]?.emailAddress ??
          '';

        const fullName =
          user.fullName ||
          pendingFullName ||
          email;

        const wallet = await ensureUserWallet(supabase, {
          clerkUserId: user.id,
          email,
          fullName,
        });

        await clearPendingFullName();

        if (wallet.initialBalanceConfigured) {
          router.replace('/home');
        } else {
          router.replace('/initial-balance');
        }
      } catch (error) {
        console.log('ERROR INDEX FLOW:', error);
        setMessage('Ocurrió un error al preparar la app');
      }
    }

    checkFlow();
  }, [isLoaded, isSignedIn, user, supabase]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>💰</Text>
      <Text style={styles.title}>Mi Billetera Virtual</Text>
      <Text style={styles.subtitle}>{message}</Text>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});