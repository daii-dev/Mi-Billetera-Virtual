import {
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { useAuth } from '@clerk/expo';

import { createSupabaseClient } from './supabase';

export function useSupabase() {
  const { getToken } = useAuth();

  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const supabase = useMemo(() => {
    return createSupabaseClient(async () => {
      return await getTokenRef.current();
    });
  }, []);

  return supabase;
}