import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { getUserProfile } from '@/features/wallet/wallet.service';
import { useSupabase } from '@/lib/useSupabase';
import {
  useAuth,
  useUser,
} from '@clerk/expo';

export function useProfileName() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const supabase = useSupabase();

  const [profileName, setProfileName] = useState('Usuario');
  const [loadingProfileName, setLoadingProfileName] = useState(false);

  const loadProfileName = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      setProfileName('Usuario');
      return;
    }

    const fallbackName =
      user?.fullName ||
      user?.primaryEmailAddress?.emailAddress ||
      'Usuario';

    setProfileName(fallbackName);

    try {
      setLoadingProfileName(true);

      const profile = await getUserProfile(supabase, userId);

      const supabaseFullName = profile?.full_name?.trim();

      setProfileName(supabaseFullName || fallbackName);
    } catch (error) {
      console.log('ERROR LOAD PROFILE NAME:', error);
      setProfileName(fallbackName);
    } finally {
      setLoadingProfileName(false);
    }
  }, [
    isLoaded,
    isSignedIn,
    userId,
    user?.fullName,
    user?.primaryEmailAddress?.emailAddress,
    supabase,
  ]);

  useEffect(() => {
    loadProfileName();
  }, [loadProfileName]);

  return {
    profileName,
    loadingProfileName,
    reloadProfileName: loadProfileName,
  };
}