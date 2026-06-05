import {
  useEffect,
  useState,
} from 'react';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { AppLoadingScreen } from '@/components/loading/AppLoadingScreen';
import { ensureUserWallet } from '@/features/wallet/wallet.service';
import {
  clearPendingSignupData,
  getHasSeenOnboarding,
  getPendingSignupData,
} from '@/lib/storage';
import { useSupabase } from '@/lib/useSupabase';
import {
  useAuth,
  useUser,
} from '@clerk/expo';

const DEMO = true;
// Para la defensa del proyecto se deja en true para que el carrusel se muestre cada vez que un usuario sin sesion abre la app
// Si el usuario ya tiene sesion iniciada, se omite el onboarding y se envaa directamente al homepage
// En produccion debería estar en false para que solo se pueda ver una sola vez el onboarding (la primera vez abriendo la app)
export default function IndexScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const supabase = useSupabase();

  const { skipOnboarding } = useLocalSearchParams<{
    skipOnboarding?: string;
  }>();

  const shouldSkipOnboardingThisTime = skipOnboarding === 'true';

  const [message, setMessage] = useState('Cargando...');

  useEffect(() => {
    async function checkFlow() {
      if (!isLoaded) return;

      try {
        if (isSignedIn && user) {
          setMessage('Preparando tu billetera...');

          const pendingSignupData = await getPendingSignupData();

          const email =
            user.primaryEmailAddress?.emailAddress ??
            user.emailAddresses[0]?.emailAddress ??
            '';

          const normalizedEmail = email.toLowerCase();

          const pendingFullName =
            pendingSignupData?.email === normalizedEmail
              ? pendingSignupData.fullName
              : null;

          const clerkFullName = user.fullName?.trim();

          const fullName =
            pendingFullName ||
            clerkFullName ||
            email;

          const wallet = await ensureUserWallet(supabase, {
            clerkUserId: user.id,
            email,
            fullName,
          });

          if (pendingSignupData?.email === normalizedEmail) {
            await clearPendingSignupData();
          }

          if (wallet.initialBalanceConfigured) {
            router.replace('/home');
          } else {
            router.replace('/initial-balance');
          }

          return;
        }

        const hasSeenOnboarding = await getHasSeenOnboarding();

        if (
          !shouldSkipOnboardingThisTime &&
          (DEMO || !hasSeenOnboarding)
        ) {
          router.replace('/onboarding');
          return;
        }

        router.replace('/sign-in');
      } catch (error) {
        console.log('ERROR INDEX FLOW:', error);
        setMessage('Ocurrió un error al preparar la app');
      }
    }

    checkFlow();
  }, [isLoaded, isSignedIn, user, supabase, shouldSkipOnboardingThisTime]);

  return (
    <AppLoadingScreen message={message} />
  );
}